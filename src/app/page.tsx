'use client';

import React, { useState, useEffect } from "react";
import "@/styles/quipslop.css"; // The copied Quipslop styles
import { MODELS } from "@/lib/ai";

// ── Model colors & logos ─────────────────────────────────────────────────────

const MODEL_COLORS: Record<string, string> = {
  "Llama 3.3 70B": "#4285F4",
  "Mistral 24B": "#00E599",
  "Step 3.5": "#4D6BFE",
  "Trinity Large": "#D97757",
};

function getColor(name: string): string {
  return MODEL_COLORS[name] ?? "#A1A1A1";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Dots() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? "" : d + ".");
    }, 500);
    return () => clearInterval(id);
  }, []);
  return <span>{dots}</span>;
}

function ModelTag({ name, small }: { name: string; small?: boolean }) {
  const color = getColor(name);
  return (
    <span className={`model-tag ${small ? "model-tag--sm" : ""}`} style={{ color }}>
      {name}
    </span>
  );
}

// ── Arena ─────────────────────────────────────────────────────────────────────

function Arena({ round }: { round: any }) {
  const isDone = round.status === "completed";
  
  const proArg = round.arguments?.find((a: any) => a.side === 'PRO');
  const antiArg = round.arguments?.find((a: any) => a.side === 'ANTI');
  
  let proVotes = 0;
  let antiVotes = 0;
  const proVoters: any[] = [];
  const antiVoters: any[] = [];

  if (round.votes) {
      for (const v of round.votes) {
          if (v.voted_for === 'PRO') {
              proVotes++;
              proVoters.push(v);
          } else {
              antiVotes++;
              antiVoters.push(v);
          }
      }
  }

  const totalVotes = proVotes + antiVotes;

  const phaseText = round.status === "generating" ? "Generating Arguments" 
                  : round.status === "voting" ? "Judges voting" 
                  : "Complete";

  return (
    <div className="arena">
      <div className="arena__meta">
        <span className="arena__round">
          Round {round.id}
        </span>
        <span className="arena__phase">
          {phaseText}
        </span>
      </div>

      <div className="prompt">
        <div className="prompt__by">Topic:</div>
        <div className="prompt__text">{round.topic}</div>
      </div>

      {(proArg || antiArg) && (
        <div className="showdown">
          {/* PRO SIDE */}
          <div className={`contestant ${isDone && proVotes > antiVotes ? "contestant--winner" : ""}`} style={{ '--accent': getColor(round.pro_model) } as any}>
            <div className="contestant__head">
              <span className="side-badge side-badge--pro">PRO</span>
              <ModelTag name={round.pro_model} />
              {isDone && proVotes > antiVotes && <span className="win-tag">WIN</span>}
            </div>
            <div className="contestant__body">
              {proArg ? <p className="answer">&ldquo;{proArg.content}&rdquo;</p> : <p className="answer answer--loading">Drafting PRO argument<Dots/></p>}
            </div>
            {(round.status === 'voting' || isDone) && (
              <div className="contestant__foot">
                <div className="vote-bar">
                  <div className="vote-bar__fill" style={{ width: `${totalVotes > 0 ? (proVotes/totalVotes)*100 : 0}%`, background: getColor(round.pro_model) }} />
                </div>
                <div className="vote-meta">
                  <span className="vote-meta__count" style={{ color: getColor(round.pro_model) }}>{proVotes}</span>
                  <span className="vote-meta__label">vote{proVotes !== 1 ? "s" : ""}</span>
                  <span className="vote-meta__dots">
                    {proVoters.map((v, i) => (
                      <span key={i} className="voter-dot voter-dot--letter" style={{ color: getColor(v.voter_model) }} title={v.voter_model}>{v.voter_model[0]}</span>
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ANTI SIDE */}
          <div className={`contestant ${isDone && antiVotes > proVotes ? "contestant--winner" : ""}`} style={{ '--accent': getColor(round.anti_model) } as any}>
            <div className="contestant__head">
              <span className="side-badge side-badge--anti">ANTI</span>
              <ModelTag name={round.anti_model} />
              {isDone && antiVotes > proVotes && <span className="win-tag">WIN</span>}
            </div>
            <div className="contestant__body">
              {antiArg ? <p className="answer">&ldquo;{antiArg.content}&rdquo;</p> : <p className="answer answer--loading">Drafting ANTI argument<Dots/></p>}
            </div>
            {(round.status === 'voting' || isDone) && (
              <div className="contestant__foot">
                <div className="vote-bar">
                  <div className="vote-bar__fill" style={{ width: `${totalVotes > 0 ? (antiVotes/totalVotes)*100 : 0}%`, background: getColor(round.anti_model) }} />
                </div>
                <div className="vote-meta">
                  <span className="vote-meta__count" style={{ color: getColor(round.anti_model) }}>{antiVotes}</span>
                  <span className="vote-meta__label">vote{antiVotes !== 1 ? "s" : ""}</span>
                  <span className="vote-meta__dots">
                    {antiVoters.map((v, i) => (
                      <span key={i} className="voter-dot voter-dot--letter" style={{ color: getColor(v.voter_model) }} title={v.voter_model}>{v.voter_model[0]}</span>
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isDone && proVotes === antiVotes && totalVotes > 0 && (
        <div className="tie-label">Tie</div>
      )}
    </div>
  );
}

// ── Standings ────────────────────────────────────────────────────────────────

function LeaderboardSection({ label, scores, bias }: { label: string; scores: Record<string, number>, bias?: Record<string, any> }) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const maxScore = sorted[0]?.[1] || 1;

  return (
    <div className="lb-section">
      <div className="lb-section__head">
        <span className="lb-section__label">{label}</span>
      </div>
      <div className="lb-section__list">
        {sorted.map(([name, score], i) => {
          const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
          const color = getColor(name);
          const biasData = bias ? bias[name] : null;

          return (
            <div key={name} className="lb-entry">
              <div className="lb-entry__top">
                <span className="lb-entry__rank">{i === 0 && score > 0 ? "👑" : i + 1}</span>
                <ModelTag name={name} small />
                <span className="lb-entry__score">{score}</span>
              </div>
              <div className="lb-entry__bar">
                <div className="lb-entry__fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              {biasData && (
                <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7, display: 'flex', justifyContent: 'space-between' }}>
                  <span>PRO Bias: {biasData.PRO}</span>
                  <span>ANTI Bias: {biasData.ANTI}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Poll state every 2 seconds
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/engine/state');
        const data = await res.json();
        setState(data);
      } catch (e) {}
    };
    fetchState();
    const id = setInterval(fetchState, 2000);
    return () => clearInterval(id);
  }, []);

  const triggerSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      // Phase 1: Init and Pro
      const res1 = await fetch('/api/engine/run?phase=init_and_pro', { method: 'POST' });
      const data1 = await res1.json();
      if (!data1.success) throw new Error(data1.error);
      const roundId = data1.roundId;

      await new Promise(r => setTimeout(r, 2000));

      // Phase 2: Anti
      const res2 = await fetch('/api/engine/run?phase=generate_anti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId })
      });
      const data2 = await res2.json();
      if (!data2.success) throw new Error(data2.error);

      await new Promise(r => setTimeout(r, 2000));

      // Phase 3: Vote 1
      const res3 = await fetch('/api/engine/run?phase=vote_1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId })
      });
      const data3 = await res3.json();
      if (!data3.success) throw new Error(data3.error);

      await new Promise(r => setTimeout(r, 1500));

      // Phase 4: Vote 2
      const res4 = await fetch('/api/engine/run?phase=vote_2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId })
      });
      const data4 = await res4.json();
      if (!data4.success) throw new Error(data4.error);

    } catch (e) {
      console.error(e);
      alert("Simulation failed. Check console.");
    } finally {
      setIsSimulating(false);
    }
  };

  if (!state) {
    return (
      <div className="connecting">
        <div className="connecting__sub">Loading State...<Dots /></div>
      </div>
    );
  }

  const displayRound = state.active || state.completed[state.completed.length - 1];

  return (
    <div className="app">
      <div className="layout">
        <main className="main">
          <header className="header">
            <div className="site-title">Winner — Do Politics Have Artefacts?</div>
            <button 
              onClick={triggerSimulation} 
              disabled={isSimulating || !!state.active}
              style={{
                background: (isSimulating || state.active) ? '#333' : '#10A37F',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: (isSimulating || state.active) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              {isSimulating || state.active ? "Simulation Running..." : "Run Simulation"}
            </button>
          </header>

          {displayRound ? (
            <Arena round={displayRound} />
          ) : (
            <div className="waiting">Click 'Run Simulation' to start<Dots /></div>
          )}

        </main>

        <aside className="standings">
          <div className="standings__head">
            <span className="standings__title">Standings (Last 25)</span>
          </div>
          <LeaderboardSection label="Debate Wins" scores={state.scores ?? {}} />
          <LeaderboardSection label="Systemic Voter Bias" scores={Object.fromEntries(Object.keys(state.voterBias ?? {}).map(k => [k, state.voterBias[k].PRO + state.voterBias[k].ANTI]))} bias={state.voterBias ?? {}} />
        </aside>

      </div>
    </div>
  );
}
