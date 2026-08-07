import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export const groqModel = 'llama-3.1-8b-instant';

export async function groqChat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
  const completion = await groq.chat.completions.create({
    model: groqModel,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content || '';
}

export async function groqGenerate(prompt: string) {
  const completion = await groq.chat.completions.create({
    model: groqModel,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content || '';
}

export default groq;
