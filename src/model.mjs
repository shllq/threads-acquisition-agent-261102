import OpenAI from 'openai';

export function createModel({ apiKey, getApiKey, model = 'gpt-4.1-mini', client } = {}) {
  let sdk = client;
  return async request => {
    if (!sdk) {
      const key = apiKey ?? await getApiKey?.();
      if (!key?.trim()) throw new Error('An OpenAI API key is required.');
      sdk = new OpenAI({ apiKey: key, baseURL: 'https://api.openai.com/v1', timeout: 30_000, maxRetries: 0,
        logLevel: 'off', fetchOptions: { redirect: 'error' } });
    }
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
