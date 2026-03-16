# Winner

AI debate simulator. Pick a political topic, watch multiple LLMs steelman both sides, then have other models vote on which argument is stronger.

**Live:** [winner-simulation.vercel.app](https://winner-simulation.vercel.app)

## How it works

1. Enter any political topic (e.g. "Should university tuition be abolished?")
2. Four LLMs each write a PRO argument and an ANTI argument, steelmanning their side as rigorously as possible
3. A separate set of models acts as judges and votes on which side won
4. Results show the vote breakdown and the full debate transcript

Models run via [OpenRouter](https://openrouter.ai) on free-tier endpoints (Llama 3.3 70B, Mistral 24B, Step 3.5, Trinity Large).

## Stack

- Next.js 15 (App Router) + TypeScript
- Vercel AI SDK + OpenRouter
- Tailwind CSS

## Local Development

```bash
git clone https://github.com/rexheng/winner-debate.git
cd winner-debate
npm install
```

Create a `.env.local` file:

```
OPENROUTER_API_KEY=your_openrouter_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deployed on Vercel. Add `OPENROUTER_API_KEY` and `NEXT_PUBLIC_SITE_URL` to your Vercel environment variables.

Note: Free-tier OpenRouter models have rate limits. If responses fail, check your OpenRouter billing dashboard.
