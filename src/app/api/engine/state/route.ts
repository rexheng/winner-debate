import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { MODELS } from '@/lib/ai';

export async function GET() {
  try {
    // 1. Fetch rounds
    const rounds = db.prepare(`SELECT * FROM rounds ORDER BY created_at ASC`).all() as any[];

    // 2. Hydrate Rounds with Arguments and Votes
    for (const round of rounds) {
      round.arguments = db.prepare(`SELECT * FROM arguments WHERE round_id = ?`).all(round.id);
      round.votes = db.prepare(`SELECT * FROM votes WHERE round_id = ?`).all(round.id);
    }

    // 3. Separate Active vs Completed (grab the most recent active round to ignore old stuck ones)
    const active = [...rounds].reverse().find(r => r.status !== 'completed') || null;
    const completed = rounds.filter(r => r.status === 'completed');

    // 4. Calculate Scores
    const scores: Record<string, number> = {};
    const voterBias: Record<string, { PRO: number, ANTI: number }> = {};
    
    // Initialize
    MODELS.forEach(m => {
      scores[m.name] = 0;
      voterBias[m.name] = { PRO: 0, ANTI: 0 };
    });

    for (const round of completed) {
      let proVotes = 0;
      let antiVotes = 0;

      for (const vote of round.votes) {
         if (vote.voted_for === 'PRO') proVotes++;
         else antiVotes++;

         // Track voter bias
         if (!voterBias[vote.voter_model]) voterBias[vote.voter_model] = { PRO: 0, ANTI: 0 };
         
         const side = vote.voted_for as 'PRO' | 'ANTI';
         voterBias[vote.voter_model][side]++;
      }

      if (proVotes > antiVotes) {
        scores[round.pro_model] = (scores[round.pro_model] || 0) + 1;
      } else if (antiVotes > proVotes) {
        scores[round.anti_model] = (scores[round.anti_model] || 0) + 1;
      }
    }

    // 5. Send state package (matching Quipslop format loosely)
    return NextResponse.json({
      active,
      completed,
      scores,
      voterBias
    });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
