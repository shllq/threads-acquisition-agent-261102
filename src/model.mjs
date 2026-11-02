import OpenAI from 'openai';

export function createModel({ apiKey, model = 'gpt-4.1-mini', client } = {}) {
  return async request => {
    const sdk = client ?? new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
    const response = await sdk.chat.completions.create({
      model, ...request, response_format: { type: 'json_object' }, max_completion_tokens: 2000
    });
    const content = response.choices?.[0]?.message?.content;
    if (response.choices?.[0]?.finish_reason !== 'stop' || !content) throw new Error('Model response was refused, truncated or empty.');
    const usage = response.usage;
    return {
      content,
      usage: usage ? { status: 'known', input_tokens: usage.prompt_tokens, output_tokens: usage.completion_tokens, total_tokens: usage.total_tokens }
        : { status: 'unknown', reason: 'Provider did not return token usage.' }
    };
  };
}
