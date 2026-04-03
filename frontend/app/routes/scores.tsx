import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const handle = {
  sidebarLinks: [{ label: "< Back", to: "/" }],
};

// ── Shared ────────────────────────────────────────────────────

function SortablePlayer({ player, rank }: { player: any; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`flex items-center gap-4 p-4 mb-2 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? "bg-blue-50 border-blue-400 shadow-xl scale-105" : "bg-white border-gray-100 shadow-sm"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black
        ${rank === 1 ? "bg-yellow-400 text-yellow-900" : rank === 2 ? "bg-gray-300 text-gray-700" : "bg-gray-100 text-gray-400"}`}>
        {rank}
      </div>
      <span className="flex-1 font-bold text-gray-800 text-lg">{player.name}</span>
      <span className="text-gray-300"><FontAwesomeIcon icon="fa-solid fa-grip-vertical" /></span>
    </div>
  );
}

// ── King of the Hill ──────────────────────────────────────────

function KothScoring({ players, roundId, kothWins, onRoundComplete }) {
  // Queue: first two are "on stage", rest waiting
  const [queue, setQueue] = useState(() => [...players]);
  // win counts per player id
  const [wins, setWins] = useState<Record<number, number>>(() => {
    const w: Record<number, number> = {};
    players.forEach((p) => { w[p.id] = 0; });
    return w;
  });
  const [matchLog, setMatchLog] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [champion, setChampion] = useState<any>(null);

  // The two currently playing
  const player1 = queue[0];
  const player2 = queue[1];
  const waitingQueue = queue.slice(2);

  const recordWin = (winner: any, loser: any) => {
    const newWins = { ...wins, [winner.id]: wins[winner.id] + 1 };
    setWins(newWins);

    const logEntry = `${winner.name} beat ${loser.name}`;
    setMatchLog((prev) => [logEntry, ...prev]);

    if (newWins[winner.id] >= kothWins) {
      setChampion(winner);
      setRoundOver(true);
      return;
    }

    // Winner stays at front, loser goes to back
    setQueue([winner, ...waitingQueue, loser]);
  };

  const submitResults = async () => {
    setSubmitting(true);
    // Build placements: sort by wins descending
    const sorted = [...players].sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0));
    const placements: Record<number, number> = {};
    sorted.forEach((p, i) => { placements[p.id] = i + 1; });

    const res = await fetch(`/api/rounds/${roundId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placements }),
    });
    setSubmitting(false);
    if (res.ok) onRoundComplete();
  };

  if (roundOver && champion) {
    return (
      <div className="space-y-6">
        {/* Champion banner */}
        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">👑</div>
          <h2 className="text-3xl font-black uppercase text-yellow-800">{champion.name}</h2>
          <p className="text-yellow-600 font-bold mt-1">Reached {kothWins} wins!</p>
        </div>

        {/* Final win tally */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-3">Final Tally</h3>
          <div className="space-y-2">
            {[...players].sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0)).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-gray-400 font-black w-6">#{i + 1}</span>
                <span className="flex-1 font-bold text-gray-800">{p.name}</span>
                <span className="font-black text-gray-900">{wins[p.id] || 0} wins</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={submitResults} disabled={submitting}
          className="w-full py-4 bg-blue-600 text-white font-black text-lg uppercase rounded-2xl hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-lg">
          {submitting ? "Saving..." : "Submit & Next Round →"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current matchup */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gray-900 px-4 py-2 text-center">
          <span className="text-gray-400 text-xs font-black uppercase tracking-widest">On Stage</span>
        </div>
        <div className="grid grid-cols-2 gap-0">
          {/* Player 1 */}
          <button onClick={() => recordWin(player1, player2)}
            className="group flex flex-col items-center justify-center p-8 hover:bg-green-50 transition-all border-r border-gray-100 active:scale-95">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 group-hover:scale-110 transition-transform shadow-md">
              {player1?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-black text-gray-900 text-xl text-center">{player1?.name}</span>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: kothWins }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 ${
                  i < (wins[player1?.id] || 0) ? "bg-green-400 border-green-400" : "bg-gray-100 border-gray-300"}`} />
              ))}
            </div>
            <span className="mt-4 text-xs font-black uppercase tracking-widest text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              ✓ Winner
            </span>
          </button>

          {/* Player 2 */}
          <button onClick={() => recordWin(player2, player1)}
            className="group flex flex-col items-center justify-center p-8 hover:bg-green-50 transition-all active:scale-95">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 group-hover:scale-110 transition-transform shadow-md">
              {player2?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-black text-gray-900 text-xl text-center">{player2?.name}</span>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: kothWins }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 ${
                  i < (wins[player2?.id] || 0) ? "bg-green-400 border-green-400" : "bg-gray-100 border-gray-300"}`} />
              ))}
            </div>
            <span className="mt-4 text-xs font-black uppercase tracking-widest text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              ✓ Winner
            </span>
          </button>
        </div>

        {/* VS divider */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="text-gray-200 font-black text-4xl">VS</span>
        </div>
      </div>

      {/* Queue */}
      {waitingQueue.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-3">Up Next</h3>
          <div className="flex flex-wrap gap-2">
            {waitingQueue.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-full">
                <span className="text-xs text-gray-400 font-bold">#{i + 1}</span>
                <span className="font-bold text-gray-700 text-sm">{p.name}</span>
                <span className="text-xs font-black text-blue-500">{wins[p.id] || 0}W</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match log */}
      {matchLog.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-40 overflow-y-auto">
          <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-2">Match History</h3>
          {matchLog.map((entry, i) => (
            <p key={i} className={`text-sm py-1 border-b border-gray-100 last:border-0 ${i === 0 ? "font-bold text-gray-800" : "text-gray-500"}`}>
              {entry}
            </p>
          ))}
        </div>
      )}

      {/* Early end option */}
      <button onClick={() => setRoundOver(true)}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 transition-all">
        End round early
      </button>
    </div>
  );
}

// ── Parallel Heats ────────────────────────────────────────────

function HeatsScoring({ players, roundId, onRoundComplete }) {
  // Pair by standings: rank 1 vs 2, 3 vs 4, 5 vs 6
  const pairs: [any, any][] = [];
  for (let i = 0; i < players.length - 1; i += 2) {
    pairs.push([players[i], players[i + 1]]);
  }
  // Odd player out gets a bye
  const bye = players.length % 2 !== 0 ? players[players.length - 1] : null;

  const [results, setResults] = useState<Record<string, number | null>>(() => {
    const r: Record<string, number | null> = {};
    pairs.forEach(([a, b]) => { r[`${a.id}_${b.id}`] = null; }); // null = undecided, a.id or b.id = winner
    return r;
  });
  const [submitting, setSubmitting] = useState(false);

  const allDecided = Object.values(results).every((v) => v !== null);

  const setWinner = (pairKey: string, winnerId: number) => {
    setResults((prev) => ({ ...prev, [pairKey]: winnerId }));
  };

  const submitResults = async () => {
    setSubmitting(true);
    // Winners get placement 1, losers get placement 2, bye gets placement 1 too
    const placements: Record<number, number> = {};
    pairs.forEach(([a, b]) => {
      const key = `${a.id}_${b.id}`;
      const winnerId = results[key];
      placements[a.id] = winnerId === a.id ? 1 : 2;
      placements[b.id] = winnerId === b.id ? 1 : 2;
    });
    if (bye) placements[bye.id] = 1; // bye counts as a win

    const res = await fetch(`/api/rounds/${roundId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placements }),
    });
    setSubmitting(false);
    if (res.ok) onRoundComplete();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 uppercase font-black tracking-widest text-center">
        Paired by standings — tap the winner of each match
      </p>

      {pairs.map(([a, b]) => {
        const key = `${a.id}_${b.id}`;
        const winner = results[key];
        return (
          <div key={key} className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2">
              <button onClick={() => setWinner(key, a.id)}
                className={`flex flex-col items-center justify-center p-6 transition-all group
                  ${winner === a.id ? "bg-green-50 border-r-2 border-green-400" : "hover:bg-gray-50 border-r border-gray-100"}
                  ${winner === b.id ? "opacity-40" : ""}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 transition-transform group-hover:scale-105
                  ${winner === a.id ? "bg-green-500 shadow-md" : "bg-gray-400"}`}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-black text-gray-800">{a.name}</span>
                {winner === a.id && <span className="text-[10px] text-green-600 font-black uppercase mt-1">✓ Winner</span>}
              </button>

              <button onClick={() => setWinner(key, b.id)}
                className={`flex flex-col items-center justify-center p-6 transition-all group
                  ${winner === b.id ? "bg-green-50" : "hover:bg-gray-50"}
                  ${winner === a.id ? "opacity-40" : ""}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 transition-transform group-hover:scale-105
                  ${winner === b.id ? "bg-green-500 shadow-md" : "bg-gray-400"}`}>
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-black text-gray-800">{b.name}</span>
                {winner === b.id && <span className="text-[10px] text-green-600 font-black uppercase mt-1">✓ Winner</span>}
              </button>
            </div>
          </div>
        );
      })}

      {bye && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 text-center">
          <span className="text-gray-400 text-sm font-bold">{bye.name} has a bye this heat</span>
        </div>
      )}

      <button onClick={submitResults} disabled={!allDecided || submitting}
        className="w-full mt-4 py-4 bg-purple-600 text-white font-black text-lg uppercase rounded-2xl hover:bg-purple-700 disabled:bg-gray-300 transition-all shadow-lg">
        {submitting ? "Saving..." : allDecided ? "Submit Heat Results →" : `${Object.values(results).filter(v => v === null).length} matches remaining`}
      </button>
    </div>
  );
}

// ── Standard ranking (4+ player games) ───────────────────────

function StandardScoring({ players, roundId, onRoundComplete }) {
  const [ranked, setRanked] = useState(players);
  const [submitting, setSubmitting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setRanked((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const submit = async () => {
    setSubmitting(true);
    const placements: Record<number, number> = {};
    ranked.forEach((p, i) => { placements[p.id] = i + 1; });
    const res = await fetch(`/api/rounds/${roundId}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placements }),
    });
    setSubmitting(false);
    if (res.ok) onRoundComplete();
  };

  return (
    <>
      <p className="text-center text-xs text-gray-400 mb-4 uppercase tracking-widest font-bold">
        Drag to set final standings — top = 1st place
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ranked} strategy={verticalListSortingStrategy}>
          {ranked.map((player, index) => (
            <SortablePlayer key={player.id} player={player} rank={index + 1} />
          ))}
        </SortableContext>
      </DndContext>
      <button onClick={submit} disabled={submitting}
        className="w-full mt-8 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg disabled:bg-gray-400">
        {submitting ? "Saving..." : "Confirm Standings →"}
      </button>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function AdminScoring() {
  const [roundData, setRoundData] = useState<any>(null);
  const [benchData, setBenchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0); // bump to remount scoring components on new round

  const fetchData = useCallback(async () => {
    const tournamentString = localStorage.getItem('tournament');
    if (!tournamentString) return;
    const { code: joinCode } = JSON.parse(tournamentString);

    try {
      const [roundRes, benchRes] = await Promise.all([
        fetch(`/api/tournaments/${joinCode}/current_round`),
        fetch(`/api/tournaments/${joinCode}/bench`),
      ]);
      setRoundData(await roundRes.json());
      setBenchData(await benchRes.json());
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRoundComplete = () => {
    alert("Round saved! Moving to next round.");
    setKey((k) => k + 1);
    fetchData();
  };

  if (loading) return <div className="p-10 text-center font-bold">Syncing...</div>;

  if (!roundData || roundData.status === "no active round") {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold">No Active Round</h2>
        <p className="text-gray-500">Wait for players to draft or start the tournament.</p>
      </div>
    );
  }

  const is2Player = roundData.max_players <= 2;
  const twoPlayerMode = benchData?.round?.two_player_mode || "koth";
  const kothWins = benchData?.round?.koth_wins_needed || 3;

  // Active players from bench, fallback to all standings players
  const activePlayers = benchData?.active_players?.length
    ? benchData.active_players
    : (roundData.active_players || []);

  const benched = benchData?.benched_players || [];

  // If it's a 2-player game but mode hasn't been confirmed on the display screen yet
  const modeNotSet = is2Player && (!benchData?.round?.two_player_mode || roundData.active_player_ids?.length === 0);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <header className="mb-8 text-center">
          <span className="text-blue-600 font-bold uppercase tracking-widest text-xs">Current Match</span>
          <h1 className="text-4xl font-black uppercase italic text-gray-900">{roundData.game_name}</h1>
          {is2Player && !modeNotSet && (
            <span className={`inline-block mt-2 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full
              ${twoPlayerMode === "koth" ? "bg-yellow-100 text-yellow-700" : "bg-purple-100 text-purple-700"}`}>
              {twoPlayerMode === "koth" ? `👑 King of the Hill — first to ${kothWins}` : "🔥 Parallel Heats"}
            </span>
          )}
        </header>

        {/* Benched players notice */}
        {benched.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded-xl border border-gray-200">
            <p className="text-xs font-black uppercase text-gray-400 mb-1">On the bench</p>
            <div className="flex flex-wrap gap-2">
              {benched.map((p) => (
                <span key={p.id} className="text-xs bg-white border border-gray-300 text-gray-500 px-2 py-1 rounded-full font-bold">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mode not confirmed yet — prompt host to go to display screen */}
        {is2Player && modeNotSet && (
          <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-2xl text-center">
            <div className="text-3xl mb-3">📺</div>
            <h2 className="font-black text-orange-800 text-lg">Format not chosen yet</h2>
            <p className="text-orange-600 text-sm mt-1">
              Go to the <strong>Display screen</strong> to choose King of the Hill or Parallel Heats before scoring.
            </p>
          </div>
        )}

        {/* KotH scoring */}
        {is2Player && !modeNotSet && twoPlayerMode === "koth" && (
          <KothScoring
            key={key}
            players={activePlayers}
            roundId={roundData.id}
            kothWins={kothWins}
            onRoundComplete={handleRoundComplete}
          />
        )}

        {/* Heats scoring */}
        {is2Player && !modeNotSet && twoPlayerMode === "heats" && (
          <HeatsScoring
            key={key}
            players={activePlayers}
            roundId={roundData.id}
            onRoundComplete={handleRoundComplete}
          />
        )}

        {/* Standard ranking for 3+ player games */}
        {!is2Player && (
          <StandardScoring
            key={key}
            players={activePlayers}
            roundId={roundData.id}
            onRoundComplete={handleRoundComplete}
          />
        )}
      </div>
    </div>
  );
}