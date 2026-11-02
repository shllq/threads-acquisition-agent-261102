// These functions run in the browser realm through page.evaluate; keep them self-contained.
export function observeConversation(sourceUrl) {
  const selector = '[data-pressable-container]';
  const containers = [...document.querySelectorAll(selector)].filter(element => element.checkVisibility());
  const boundary = [...document.querySelectorAll('span,div,h2,h3')].find(element => {
    return !element.closest(selector) && element.children.length === 0 && element.checkVisibility() &&
      /^(Related threads|相關串文|相關貼文)$/i.test(element.innerText.trim());
  });
  const problems = [];
  const posts = [];
  for (const [position, container] of containers.entries()) {
    const permalinks = [...container.querySelectorAll('a[href]')].filter(anchor => {
      return anchor.querySelector('time') && anchor.closest(selector) === container;
    }).map(anchor => new URL(anchor.getAttribute('href'), sourceUrl).href);
    const urls = [...new Set(permalinks)];
    if (urls.length !== 1) {
      problems.push(`Container ${position} has no unique timestamp permalink; skipped.`);
      continue;
    }
    const languageBlocks = [...container.querySelectorAll('[lang]')].filter(element => {
      const parentLanguage = element.parentElement.closest('[lang]');
      return element.checkVisibility() && element.closest(selector) === container && !container.contains(parentLanguage);
    });
    if (languageBlocks.length !== 1 || languageBlocks[0].querySelector(selector)) {
      problems.push(`Post ${urls[0]} has no unambiguous text block; skipped.`);
      continue;
    }
    const authorMarker = [...container.querySelectorAll('span')].some(element => {
      return element.children.length === 0 && element.closest(selector) === container &&
        !container.contains(element.closest('[lang]')) && /^(Author|作者)$/.test(element.innerText.trim());
    });
    posts.push({
      url: urls[0], text: languageBlocks[0].innerText, position, author_marker: authorMarker,
      is_recommendation: Boolean(boundary && (boundary.compareDocumentPosition(container) & Node.DOCUMENT_POSITION_FOLLOWING))
    });
  }
  return {
    posts, problems, boundary_found: Boolean(boundary),
    login_prompt: [...document.querySelectorAll('[role="dialog"]')].some(element => /log in|sign|登入|註冊|Continue with Instagram/i.test(element.innerText))
  };
}

export function observeProfile() {
  const outsidePosts = element => !element.closest('[data-pressable-container]') && element.checkVisibility();
  const names = [...document.querySelectorAll('h1[translate="no"]')].filter(outsidePosts).map(element => element.innerText);
  const followerLinks = [...document.querySelectorAll('a')].filter(element => {
    return outsidePosts(element) && /(?:followers|追蹤者)\s*$/i.test(element.innerText.trim());
  });
  return {
    names,
    followers: followerLinks.map(element => ({
      display: element.innerText.trim().replace(/\s*(?:followers|位?追蹤者)\s*$/i, '').trim(),
      titles: [...element.querySelectorAll('[title]')].map(node => node.getAttribute('title'))
    }))
  };
}
