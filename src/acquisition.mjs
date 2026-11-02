import { EvidenceSchema, FollowerCountSchema, PostUrlSchema, ProfileUrlSchema } from './contracts.mjs';
import { observeConversation, observeProfile } from './dom.mjs';

function emptyEvidence(url) {
  return {
    source_url: url, captured_at: new Date().toISOString(), http_status: null,
    conversation_complete: false, limitations: [], posts: [], profile: null
  };
}

function identifyPost({ parent_url, ...post }) {
  const valid = PostUrlSchema.safeParse(post.url);
  if (!valid.success) return null;
  const match = new URL(valid.data).pathname.match(/^\/@([^/]+)\/post\/([^/]+)\/?$/);
  if (!match) return null;
  const parent = PostUrlSchema.safeParse(parent_url);
  const parentId = parent.success ? new URL(parent.data).pathname.match(/^\/@[^/]+\/post\/([^/]+)\/?$/)?.[1] : null;
  return { ...post, id: match[2], author: match[1], parent_id: parentId ?? null };
}

function samePost(a, b) {
  return new URL(a).pathname.replace(/\/$/, '') === new URL(b).pathname.replace(/\/$/, '');
}

async function readConversation(page, evidence) {
  const observed = await page.evaluate(observeConversation, evidence.source_url);
  evidence.limitations.push(...observed.problems,
    'Public rendered view only; parent IDs record recognized connector edges, not complete reply relationships.',
    'Rendered text may be truncated; no expansion or additional loading was attempted.');
  if (observed.login_prompt) evidence.limitations.push('A login/sign-in prompt is present; no login or access-limit bypass was attempted.');
  let posts = observed.posts.map(identifyPost).filter(Boolean);
  const target = posts.find(post => samePost(post.url, evidence.source_url));
  if (!target) {
    evidence.limitations.push('The target post could not be identified with an unambiguous text block and permalink.');
    return;
  }
  if (!observed.boundary_found) {
    evidence.limitations.push('Recommendation boundary not recognized; only the target post was retained to avoid unrelated candidates.');
    posts = [target];
  }
  // Readers and author replies remain as context; this layer does not classify continuations.
  const unique = new Map();
  for (const post of posts.filter(post => !post.is_recommendation)) {
    if (unique.has(post.id)) {
      const existing = unique.get(post.id);
      if (!existing || existing.text !== post.text || existing.author !== post.author || existing.parent_id !== post.parent_id) {
        unique.set(post.id, null);
        evidence.limitations.push(`Conflicting versions of post ${post.id}; omitted rather than choosing one.`);
      } else {
        evidence.limitations.push(`Duplicate post ${post.id} omitted; identity is not sufficient to establish completeness.`);
      }
      continue;
    }
    unique.set(post.id, post);
  }
  if (!unique.get(target.id)) {
    evidence.limitations.push('The target post has conflicting evidence; conversation candidates were withheld.');
    return;
  }
  evidence.posts = [...unique.values()].filter(Boolean);
}

function followerValue(raw) {
  if (!raw) return null;
  const exactPattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;
  const titles = [...new Set(raw.titles.filter(title => exactPattern.test(title)))];
  const display = titles.length === 1 ? titles[0] : raw.display;
  if (exactPattern.test(display)) {
    return FollowerCountSchema.parse({ display, precision: 'exact', count: Number(display.replaceAll(',', '')) });
  }
  if (/^\d+(?:\.\d+)?[KMB萬億]$/i.test(display)) {
    return FollowerCountSchema.parse({ display, precision: 'rounded', count: null });
  }
  return null;
}

async function readProfile(page, evidence) {
  const observed = await page.evaluate(observeProfile);
  const names = [...new Set(observed.names.map(name => name.trim()).filter(Boolean))];
  const displayName = names.length === 1 ? names[0] : null;
  const followers = observed.followers.length === 1 ? followerValue(observed.followers[0]) : null;
  evidence.profile = { url: evidence.source_url, display_name: displayName, follower_count: followers };
  evidence.limitations.push('Public profile observation only; no conversation was acquired from this page.');
  if (displayName === null) evidence.limitations.push('Profile display name is missing or ambiguous.');
  if (followers === null) evidence.limitations.push('Follower count is missing, ambiguous or in an unsupported format.');
}

async function acquire(page, url, urlSchema, read, { settleMs = 6000, timeoutMs = 45000 } = {}) {
  urlSchema.parse(url);
  const evidence = emptyEvidence(url);
  const trackNavigation = response => {
    const request = response.request();
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) evidence.http_status = response.status();
  };
  page.on('response', trackNavigation);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(settleMs);
    await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
    // Check the final document, including client-side redirects during observation.
    evidence.source_url = urlSchema.parse(page.url());
    if (evidence.http_status === null || evidence.http_status >= 300 || evidence.http_status < 200) {
      evidence.limitations.push(`HTTP ${evidence.http_status ?? 'unknown'}; error-page content was not parsed.`);
    } else {
      await read(page, evidence);
    }
  } catch (error) {
    evidence.limitations.push(`Acquisition failed: ${error.message}`);
  } finally {
    page.off('response', trackNavigation);
  }
  evidence.captured_at = new Date().toISOString();
  return EvidenceSchema.parse(evidence);
}

export async function acquirePost(page, url, options) {
  return acquire(page, url, PostUrlSchema, readConversation, options);
}

export async function acquireProfile(page, url, options) {
  return acquire(page, url, ProfileUrlSchema, readProfile, options);
}
