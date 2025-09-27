export interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  EMBEDDING_DIMENSIONS: string;
}

export async function getEmbedding(text: string, env: Env): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'text-embedding-3-large',
      input: text,
      dimensions: parseInt(env.EMBEDDING_DIMENSIONS || '1536')
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: any = await response.json();
  return data.data[0].embedding;
}

export async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  env: Env,
  options: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  } = {}
): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4o',
      messages,
      max_tokens: options.max_tokens || 4000,
      temperature: options.temperature !== undefined ? options.temperature : 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}