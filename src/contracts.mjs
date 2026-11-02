import { z } from 'zod';

export const FIELDS = ['profile_name', 'follower_count', 'post_content', 'author_continuations'];
const nonempty = z.string().trim().min(1);
const timestamp = z.iso.datetime({ offset: true });
const hosts = new Set(['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net']);

export const ThreadsUrlSchema = z.string().url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && hosts.has(url.hostname) && !url.port && !url.username && !url.password;
}, 'Expected a public HTTPS Threads URL without credentials or a custom port.');

export const PostUrlSchema = ThreadsUrlSchema.refine(value => {
  return /^\/(?:@[A-Za-z0-9._]+\/post|share)\/[A-Za-z0-9_-]+\/?$/.test(new URL(value).pathname);
}, 'Expected a Threads post or share URL.');

const fieldsSchema = z.array(z.enum(FIELDS)).min(1).refine(fields => new Set(fields).size === fields.length, 'Duplicate fields.');
export const RequestSchema = z.strictObject({ message: nonempty, url: PostUrlSchema, fields: fieldsSchema });

// The model selects fields later; URL cardinality and host validation stay deterministic.
export function parseRequest(message, fields) {
  const text = nonempty.parse(message);
  const urls = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  if (urls.length !== 1) throw new Error('Provide exactly one URL per task.');
  const url = urls[0].replace(/[。，、；！？）】」』.,;!?)}\]]+$/u, '');
  return RequestSchema.parse({ message: text, url, fields });
}

export const FollowerCountSchema = z.discriminatedUnion('precision', [
  z.strictObject({ display: nonempty, precision: z.literal('rounded'), count: z.null() }),
  z.strictObject({ display: nonempty, precision: z.literal('exact'), count: z.number().int().nonnegative() }).refine(value => {
    return /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value.display) && Number(value.display.replaceAll(',', '')) === value.count;
  }, 'An exact count requires a matching full numeric display, not a rounded abbreviation.')
]);

export const PostEvidenceSchema = z.strictObject({
  id: nonempty,
  url: PostUrlSchema,
  author: nonempty,
  text: z.string(),
  position: z.number().int().nonnegative(),
  // null means unknown, not a proven root or direct continuation.
  parent_id: nonempty.nullable(),
  author_marker: z.boolean(),
  is_recommendation: z.boolean()
});

export const EvidenceSchema = z.strictObject({
  source_url: ThreadsUrlSchema,
  captured_at: timestamp,
  http_status: z.number().int().min(100).max(599).nullable(),
  conversation_complete: z.boolean(),
  limitations: z.array(nonempty),
  posts: z.array(PostEvidenceSchema),
  profile: z.strictObject({
    url: ThreadsUrlSchema,
    display_name: nonempty.nullable(),
    follower_count: FollowerCountSchema.nullable()
  }).nullable()
}).refine(value => new Set(value.posts.map(post => post.id)).size === value.posts.length, 'Duplicate evidence IDs.')
  .refine(value => new Set(value.posts.map(post => post.position)).size === value.posts.length, 'Duplicate evidence positions.')
  .refine(value => value.conversation_complete || value.limitations.length > 0, 'Incomplete observations need a limitation.');

function fieldSchema(valueSchema) {
  return z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('ok'), value: valueSchema }),
    z.strictObject({ status: z.literal('partial'), value: valueSchema, reason: nonempty }),
    z.strictObject({ status: z.literal('uncertain'), value: valueSchema.nullable(), reason: nonempty }),
    z.strictObject({ status: z.literal('unavailable'), value: z.null(), reason: nonempty })
  ]);
}

const continuationSchema = z.strictObject({ id: nonempty, url: PostUrlSchema, text: z.string() });
const continuationListSchema = z.array(continuationSchema).refine(items => new Set(items.map(item => item.id)).size === items.length, 'Duplicate continuation IDs.');
const dataSchema = z.strictObject({
  profile_name: fieldSchema(nonempty).optional(),
  follower_count: fieldSchema(FollowerCountSchema).optional(),
  post_content: fieldSchema(z.string()).optional(),
  author_continuations: fieldSchema(continuationListSchema).optional()
});

export const UsageSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('known'),
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative()
  }).refine(value => value.input_tokens + value.output_tokens === value.total_tokens, 'Token total must equal input plus output.'),
  z.strictObject({ status: z.literal('unknown'), reason: nonempty })
]);

const resultStatusSchema = z.enum(['complete', 'partial', 'unavailable', 'uncertain']);
function summarize(data) {
  const states = Object.values(data).map(field => field.status);
  if (states.every(state => state === 'ok')) return 'complete';
  if (states.every(state => state === 'unavailable')) return 'unavailable';
  if (states.every(state => state === 'uncertain' || state === 'unavailable')) return 'uncertain';
  return 'partial';
}

export const ResultSchema = z.strictObject({
  status: resultStatusSchema,
  source: z.strictObject({ input_url: PostUrlSchema, resolved_url: PostUrlSchema.nullable() }),
  extracted_at: timestamp,
  requested_fields: fieldsSchema,
  data: dataSchema,
  usage: UsageSchema
}).refine(value => {
  const keys = Object.keys(value.data);
  return keys.length === value.requested_fields.length && value.requested_fields.every(field => value.data[field] !== undefined);
}, 'Output fields must match requested fields exactly.')
  .refine(value => value.status === summarize(value.data), 'Task status must reflect field completeness.');

export function buildResult({ request, resolved_url = null, extracted_at, values, usage }) {
  const validated = RequestSchema.parse(request);
  const data = Object.fromEntries(validated.fields.map(field => [field, values[field] ?? {
    status: 'unavailable', value: null, reason: 'No verified evidence was acquired for this field.'
  }]));
  // Validate field values before computing the summary; untrusted fields must not crash summary logic.
  const parsedData = dataSchema.parse(data);
  return ResultSchema.parse({
    status: summarize(parsedData),
    source: { input_url: validated.url, resolved_url },
    extracted_at,
    requested_fields: validated.fields,
    data: parsedData,
    usage
  });
}

const callShape = {
  event_id: nonempty,
  timestamp,
  call_id: nonempty,
  name: nonempty,
  request: z.json(),
  response: z.json(),
  status: z.enum(['succeeded', 'failed']),
  error: nonempty.nullable()
};
export const TraceEventSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('model_call'), ...callShape, usage: UsageSchema }),
  z.strictObject({ type: z.literal('tool_call'), ...callShape }),
  z.strictObject({
    type: z.literal('run_end'), event_id: nonempty, timestamp,
    status: z.enum(['completed', 'blocked', 'timeout', 'failed', 'step_limit']),
    result_status: resultStatusSchema.nullable(), reason: nonempty.nullable()
  })
]).refine(event => {
  if (event.type === 'run_end') return event.status === 'completed' || event.reason !== null;
  return event.status === 'failed' ? event.error !== null : event.error === null;
}, 'Failed calls require an error; unsuccessful termination requires a reason.');

export const TraceSchema = z.strictObject({ run_id: nonempty, events: z.array(TraceEventSchema).min(1) })
  .refine(value => value.events.at(-1).type === 'run_end' && value.events.filter(event => event.type === 'run_end').length === 1, 'Trace must end with exactly one terminal event.')
  .refine(value => new Set(value.events.map(event => event.event_id)).size === value.events.length, 'Duplicate trace event IDs.');
