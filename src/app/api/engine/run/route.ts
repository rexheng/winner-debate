import { NextResponse } from 'next/server';
import db, { enforceHistoryLimit } from '@/lib/db';
import { MODELS, callGenerateArgument, callVote } from '@/lib/ai';

// Simple political topics for the MVP
const TOPICS = [
  "Do Artefacts Have Politics?"
];

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phase = searchParams.get('phase') || 'full';
    
    // Legacy full route (fallback or local testing)
    if (phase === 'full') {
      // 1. Setup the Models
      const shuffled = shuffle([...MODELS]);
      const proModel = shuffled[0];
      const antiModel = shuffled[1];
      const voters = shuffled.slice(2);
      
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

      const result = db.prepare(`
        INSERT INTO rounds (pro_model, anti_model, topic, status)
        VALUES (?, ?, ?, 'generating')
      `).run(proModel.name, antiModel.name, topic);
      
      const roundId = result.lastInsertRowid;

      const proContent = await callGenerateArgument(proModel.id, topic, 'PRO');
      db.prepare(`INSERT INTO arguments (round_id, model, side, content) VALUES (?, ?, ?, ?)`).run(roundId, proModel.name, 'PRO', proContent);
      
      const antiContent = await callGenerateArgument(antiModel.id, topic, 'ANTI');
      db.prepare(`INSERT INTO arguments (round_id, model, side, content) VALUES (?, ?, ?, ?)`).run(roundId, antiModel.name, 'ANTI', antiContent);

      db.prepare(`UPDATE rounds SET status = 'voting' WHERE id = ?`).run(roundId);

      for (const voter of voters) {
         const verdict = await callVote(voter.id, topic, proContent, antiContent);
         db.prepare(`INSERT INTO votes (round_id, voter_model, voted_for) VALUES (?, ?, ?)`).run(roundId, voter.name, verdict);
      }

      db.prepare(`UPDATE rounds SET status = 'completed' WHERE id = ?`).run(roundId);
      enforceHistoryLimit();

      return NextResponse.json({ success: true, roundId });
    }

    // --- PHASED EXECUTION ---
    
    if (phase === 'init_and_pro') {
      const shuffled = shuffle([...MODELS]);
      const proModel = shuffled[0];
      const antiModel = shuffled[1];
      
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

      const result = db.prepare(`
        INSERT INTO rounds (pro_model, anti_model, topic, status)
        VALUES (?, ?, ?, 'generating')
      `).run(proModel.name, antiModel.name, topic);
      
      const roundId = result.lastInsertRowid as number;

      const proContent = await callGenerateArgument(proModel.id, topic, 'PRO');
      db.prepare(`INSERT INTO arguments (round_id, model, side, content) VALUES (?, ?, ?, ?)`).run(roundId, proModel.name, 'PRO', proContent);
      
      return NextResponse.json({ success: true, roundId, topic, pro_model: proModel.name, anti_model: antiModel.name, proContent });
    }

    // require roundId + context for subsequent phases
    const body = await req.json().catch(() => ({}));
    const roundId = body.roundId;
    if (!roundId) throw new Error("Missing roundId");

    if (phase === 'generate_anti') {
      const { topic, anti_model } = body;
      if (!topic || !anti_model) throw new Error("Missing topic or anti_model");

      const antiModelDef = MODELS.find(m => m.name === anti_model);
      if (!antiModelDef) throw new Error("Anti model not found");

      const antiContent = await callGenerateArgument(antiModelDef.id, topic, 'ANTI');
      db.prepare(`INSERT INTO arguments (round_id, model, side, content) VALUES (?, ?, ?, ?)`).run(roundId, anti_model, 'ANTI', antiContent);

      db.prepare(`UPDATE rounds SET status = 'voting' WHERE id = ?`).run(roundId);
      return NextResponse.json({ success: true, roundId, antiContent });
    }

    if (phase === 'vote_1' || phase === 'vote_2') {
      const { topic, pro_model, anti_model, proContent, antiContent, excludeVoter } = body;
      if (!topic || !pro_model || !anti_model || !proContent || !antiContent) throw new Error("Missing context for voting");

      const usedModels = [pro_model, anti_model];
      if (excludeVoter) usedModels.push(excludeVoter);

      const availableVoters = MODELS.filter(m => !usedModels.includes(m.name));
      if (availableVoters.length === 0) throw new Error("No voters available");

      const voter = availableVoters[Math.floor(Math.random() * availableVoters.length)];

      const verdict = await callVote(voter.id, topic, proContent, antiContent);
      db.prepare(`INSERT INTO votes (round_id, voter_model, voted_for) VALUES (?, ?, ?)`).run(roundId, voter.name, verdict);

      if (phase === 'vote_2') {
         db.prepare(`UPDATE rounds SET status = 'completed' WHERE id = ?`).run(roundId);
         enforceHistoryLimit();
      }

      return NextResponse.json({ success: true, roundId, verdict, voter: voter.name });
    }

    return NextResponse.json({ error: "Unknown phase" }, { status: 400 });

  } catch (error) {
    console.error(`Simulation failed [Phase: ${new URL(req.url).searchParams.get('phase')}]:`, error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
