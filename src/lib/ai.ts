import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Hardcoded verified models
export const MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral 24B' },
  { id: 'stepfun/step-3.5-flash:free', name: 'Step 3.5' },
  { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large' }
] as const;

export type Model = typeof MODELS[number];

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://winner.vercel.app',
    'X-Title': 'Winner'
  }
});

export const PROMPT_TEMPLATE = `
Analyze the following political topic: {topic}

Argue strongly for the {side} side. You MUST "steelman" your position by providing the most intellectually serious, logically rigorous, and charitable defense of this perspective possible, regardless of public consensus. Output ONLY your argument—no introductory remarks, no meta-commentary, just the substantive debate text. Keep it to one clear, concise paragraph.
`;

export async function callGenerateArgument(modelId: string, topic: string, side: 'PRO' | 'ANTI'): Promise<string> {
  try {
    const prompt = PROMPT_TEMPLATE.replace('{topic}', topic).replace('{side}', side);

    const { text } = await generateText({
      model: openrouter.chat(modelId),
      prompt,
    });

    return text.trim();
  } catch (error: any) {
    console.error(`Error generating argument for ${modelId}:`, error?.message || error);
    return `[System: The AI model ${modelId} failed to generate a response. This is likely because your OpenRouter API key has reached its USD spend limit or free tier rate limit. Please check your OpenRouter billing dashboard.]`;
  }
}

export async function callVote(voterId: string, topic: string, proArg: string, antiArg: string): Promise<'PRO' | 'ANTI'> {
  try {
    const { text } = await generateText({
      model: openrouter.chat(voterId),
      system: `You are an impartial judge in a rigorous academic debate. You are presented with a topic and two opposing arguments (PRO and ANTI). Evaluate which argument is stronger based purely on logic, evidence, and rhetorical force. Do not favor simply stating the consensus view; evaluate the structure of the argument itself.

You MUST respond with exactly the word "PRO" or "ANTI" — nothing else.`,
      prompt: `Topic: "${topic}"\n\nPRO Argument: "${proArg}"\n\nANTI Argument: "${antiArg}"\n\nWhich argument is stronger? Reply with just PRO or ANTI.`,
    });

    const cleaned = text.trim().toUpperCase();
    if (cleaned.includes('PRO')) return 'PRO';
    if (cleaned.includes('ANTI')) return 'ANTI';
    
    return Math.random() > 0.5 ? 'PRO' : 'ANTI';
  } catch (error: any) {
    console.error(`Error casting vote for ${voterId}:`, error?.message || error);
    // Fallback if model fails due to API limits
    return Math.random() > 0.5 ? 'PRO' : 'ANTI';
  }
}
