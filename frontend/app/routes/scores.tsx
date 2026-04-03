import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const handle = {
  sidebarLinks: [{ label: "< Back", to: "/" }],
};

// ── Sortable player row (standard mode) ───────────────────────

function SortablePlayer({ player, rank }: { player: any; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`flex items-center gap-4 p-4 mb-2 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? "bg-blue-50 border-blue-400 shadow-xl scale-105" : "bg-white border-gray-100 shadow-sm"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black
        ${rank === 1 ? "bg-yellow-400 text-yellow-900" : rank === 2 ? "bg-gray-300 text-gray-700" : rank === 3 ? "bg-orange-300 text-orange-900" : "bg-gray-100 text-gray-400"}`}>
        {rank}
      </div>
      <span className="flex-1 font-bold text-gray-800 text-lg">{player.name}</span>
      <span className="text-gray-300"><FontAwesomeIcon icon="fa-solid fa-grip-vertical" /></span>
    </div>
  );
}

// ── King of the Hill ──────────────────────────────────────────

function KothScoring({ players, roundId, kothWins, onRoundComplete }) {
  // queue[0] and queue[1] are the two currently playing.
  // Everything is derived from queue state — no stale closures.
  const [queue, setQueue] = useState<any[]>(() => [...players]);
  const [wins, setWins] = useState<Record<number, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, 0]))
  );
  const [matchLog, setMatchLog] = useState<string[]>([]);
  const [champion, setChampion] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const recordWin = useCallback((winnerId: number, loserId: number) => {
    // Step 1: compute new win counts
    setWins((prevWins) => {
      const newWins = { ...prevWins, [winnerId]: prevWins[winnerId] + 1 };

      // Step 2: check win condition inside the same updater cycle via ref trick
      if (newWins[winnerId] >= kothWins) {
        const champ = players.find((p) => p.id === winnerId);
        setChampion(champ);
      }

      return newWins;
    });

    // Step 3: rotate queue — winner stays at front, loser goes to back
    // Use functional updater so we always operate on latest queue state
    setQueue((prevQueue) => {
      const winner = prevQueue.find((p) => p.id === winnerId)!;
      const loser = prevQueue.find((p) => p.id === loserId)!;
      const rest = prevQueue.filter((p) => p.id !== winnerId && p.id !== loserId);
      return [winner, ...rest, loser];
    });

    // Step 4: log
    const winnerName = players.find((p) => p.id === winnerId)?.name;
    const loserName = players.find((p) => p.id === loserId)?.name;
    setMatchLog((prev) => [`${winnerName} beat ${loserName}`, ...prev]);
  }, [players, kothWins]);

  const submitResults = async (finalWins: Record<number, number>) => {
    setSubmitting(true);
    const sorted = [...players].sort((a, b) => (finalWins[b.id] || 0) - (finalWins[a.id] || 0));
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

  const player1 = queue[0];
  const player2 = queue[1];
  const waitingQueue = queue.slice(2);

  // Champion screen
  if (champion) {
    return (
      <div className="space-y-5">
        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">👑</div>
          <h2 className="text-3xl font-black uppercase text-yellow-800">{champion.name}</h2>
          <p className="text-yellow-600 font-bold mt-1">Reached {kothWins} win{kothWins !== 1 ? "s" : ""}!</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-3">Final Tally</h3>
          <div className="space-y-2">
            {[...players].sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0)).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-300 font-black w-6">#{i + 1}</span>
                <span className="flex-1 font-bold text-gray-800">{p.name}</span>
                <span className="font-black text-gray-900">{wins[p.id] || 0}W</span>
              </div>
            ))}
          </div>
        </div>

        {matchLog.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-36 overflow-y-auto">
            <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-2">Match Log</h3>
            {matchLog.map((entry, i) => (
              <p key={i} className={`text-sm py-0.5 ${i === 0 ? "font-bold text-gray-700" : "text-gray-400"}`}>{entry}</p>
            ))}
          </div>
        )}

        <button onClick={() => submitResults(wins)} disabled={submitting}
          className="w-full py-4 bg-blue-600 text-white font-black text-lg uppercase rounded-2xl hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-lg">
          {submitting ? "Saving..." : "Submit & Next Round →"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Current matchup — two big tap targets */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gray-900 px-4 py-2 text-center">
          <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Tap the winner</span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {/* Player 1 */}
          <button onClick={() => recordWin(player1.id, player2.id)}
            className="group flex flex-col items-center justify-center p-8 hover:bg-green-50 active:bg-green-100 transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 group-hover:scale-110 transition-transform shadow-md">
              {player1?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-black text-gray-900 text-xl">{player1?.name}</span>
            {/* Win pips */}
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: kothWins }).map((_, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all
                  ${i < (wins[player1?.id] || 0) ? "bg-green-400 border-green-400 scale-110" : "bg-gray-100 border-gray-300"}`} />
              ))}
            </div>
            <span className="mt-3 text-xs font-black uppercase tracking-widest text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              ✓ Winner
            </span>
          </button>

          {/* Player 2 */}
          <button onClick={() => recordWin(player2.id, player1.id)}
            className="group flex flex-col items-center justify-center p-8 hover:bg-green-50 active:bg-green-100 transition-all">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 group-hover:scale-110 transition-transform shadow-md">
              {player2?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="font-black text-gray-900 text-xl">{player2?.name}</span>
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: kothWins }).map((_, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all
                  ${i < (wins[player2?.id] || 0) ? "bg-green-400 border-green-400 scale-110" : "bg-gray-100 border-gray-300"}`} />
              ))}
            </div>
            <span className="mt-3 text-xs font-black uppercase tracking-widest text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
              ✓ Winner
            </span>
          </button>
        </div>
      </div>

      {/* Waiting queue */}
      {waitingQueue.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-3">Queue</h3>
          <div className="flex flex-wrap gap-2">
            {waitingQueue.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-full">
                <span className="text-xs text-gray-400 font-bold">#{i + 1}</span>
                <span className="font-bold text-gray-700 text-sm">{p.name}</span>
                <span className="text-xs font-black text-blue-500 bg-blue-50 px-1.5 rounded">{wins[p.id] || 0}W</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Match log */}
      {matchLog.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-36 overflow-y-auto">
          <h3 className="font-black uppercase text-xs text-gray-400 tracking-widest mb-2">Match Log</h3>
          {matchLog.map((entry, i) => (
            <p key={i} className={`text-sm py-0.5 ${i === 0 ? "font-bold text-gray-700" : "text-gray-400"}`}>{entry}</p>
          ))}
        </div>
      )}

      {/* Early end */}
      <button onClick={() => setChampion(queue[0])}
        className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl hover:border-gray-300 transition-all">
        End round early (current leader wins)
      </button>
    </div>
  );
}

// ── Parallel Heats ────────────────────────────────────────────

function HeatsScoring({ players, roundId, onRoundComplete }) {
  // Pair by standings: #1 vs #2, #3 vs #4, etc.
  // players array is already sorted by standings from the parent
  const pairs: [any, any][] = [];
  for (let i = 0; i + 1 < players.length; i += 2) {
    pairs.push([players[i], players[i + 1]]);
  }
  const bye = players.length % 2 !== 0 ? players[players.length - 1] : null;

  // results: pairIndex → winner player id (null = undecided)
  const [results, setResults] = useState<(number | null)[]>(() => pairs.map(() => null));
  const [submitting, setSubmitting] = useState(false);

  const decidedCount = results.filter((r) => r !== null).length;
  const allDecided = decidedCount === pairs.length;

  const setWinner = (pairIndex: number, winnerId: number) => {
    setResults((prev) => {
      const next = [...prev];
      next[pairIndex] = winnerId;
      return next;
    });
  };

  const submitResults = async () => {
    setSubmitting(true);
    const placements: Record<number, number> = {};

    pairs.forEach(([a, b], i) => {
      const winnerId = results[i];
      placements[a.id] = winnerId === a.id ? 1 : 2;
      placements[b.id] = winnerId === b.id ? 1 : 2;
    });

    // Bye player gets a win
    if (bye) placements[bye.id] = 1;

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
      <p className="text-center text-xs text-gray-400 uppercase font-black tracking-widest">
        Tap the winner of each matchup
      </p>

      {pairs.map(([a, b], pairIndex) => {
        const winnerId = results[pairIndex];
        return (
          <div key={pairIndex} className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all
            ${winnerId !== null ? "border-green-200" : "border-gray-100"}`}>

            {/* Pair header */}
            <div className={`px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest
              ${winnerId !== null ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-400"}`}>
              {winnerId !== null ? "✓ Result recorded" : `Match ${pairIndex + 1}`}
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {/* Player A */}
              <button onClick={() => setWinner(pairIndex, a.id)}
                className={`flex flex-col items-center justify-center p-6 transition-all group
                  ${winnerId === a.id ? "bg-green-50" : winnerId === b.id ? "bg-gray-50 opacity-50" : "hover:bg-green-50"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 transition-transform
                  ${winnerId === a.id ? "bg-green-500 scale-110 shadow-md" : "bg-gray-400 group-hover:scale-105"}`}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <span className={`font-black text-sm ${winnerId === a.id ? "text-green-800" : "text-gray-700"}`}>{a.name}</span>
                {winnerId === a.id
                  ? <span className="text-[10px] text-green-600 font-black uppercase mt-1">✓ Winner</span>
                  : <span className="text-[10px] text-gray-300 font-black uppercase mt-1">tap to pick</span>
                }
              </button>

              {/* Player B */}
              <button onClick={() => setWinner(pairIndex, b.id)}
                className={`flex flex-col items-center justify-center p-6 transition-all group
                  ${winnerId === b.id ? "bg-green-50" : winnerId === a.id ? "bg-gray-50 opacity-50" : "hover:bg-green-50"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mb-2 transition-transform
                  ${winnerId === b.id ? "bg-green-500 scale-110 shadow-md" : "bg-gray-400 group-hover:scale-105"}`}>
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <span className={`font-black text-sm ${winnerId === b.id ? "text-green-800" : "text-gray-700"}`}>{b.name}</span>
                {winnerId === b.id
                  ? <span className="text-[10px] text-green-600 font-black uppercase mt-1">✓ Winner</span>
                  : <span className="text-[10px] text-gray-300 font-black uppercase mt-1">tap to pick</span>
                }
              </button>
            </div>
          </div>
        );
      })}

      {/* Bye notice */}
      {bye && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-3 text-center">
          <span className="text-gray-500 text-sm font-bold">{bye.name} has a bye — automatically gets a win</span>
        </div>
      )}

      {/* Submit */}
      <button onClick={submitResults} disabled={!allDecided || submitting}
        className={`w-full mt-2 py-4 font-black text-lg uppercase rounded-2xl transition-all shadow-lg
          ${allDecided
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}>
        {submitting
          ? "Saving..."
          : allDecided
            ? "Submit Results →"
            : `${pairs.length - decidedCount} match${pairs.length - decidedCount !== 1 ? "es" : ""} remaining`
        }
      </button>
    </div>
  );
}

// ── Standard ranking (3+ players) ────────────────────────────

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
        Drag to rank — top = 1st place
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

// ── Main component ────────────────────────────────────────────

export default function AdminScoring() {
  const [roundData, setRoundData] = useState<any>(null);
  const [benchData, setBenchData] = useState<any>(null);
  const [standingsData, setStandingsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // roundKey: bump this when round changes to fully remount scoring components and reset their state
  const [roundKey, setRoundKey] = useState(0);
  const prevRoundIdRef = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    const tournamentString = localStorage.getItem('tournament');
    if (!tournamentString) return;
    const { code: joinCode } = JSON.parse(tournamentString);

    try {
      const [roundRes, benchRes, standingsRes] = await Promise.all([
        fetch(`/api/tournaments/${joinCode}/current_round`),
        fetch(`/api/tournaments/${joinCode}/bench`),
        fetch(`/api/tournaments/${joinCode}/standings`),
      ]);

      const rJson = await roundRes.json();
      const bJson = await benchRes.json();
      const sJson = await standingsRes.json();

      // If the round changed, bump the key to remount scoring components
      const newRoundId = rJson?.id ?? null;
      if (newRoundId !== null && newRoundId !== prevRoundIdRef.current) {
        prevRoundIdRef.current = newRoundId;
        setRoundKey((k) => k + 1);
      }

      setRoundData(rJson);
      setBenchData(bJson);
      setStandingsData(sJson.standings || []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 4 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRoundComplete = () => {
    fetchData();
  };

  if (loading) return <div className="p-10 text-center font-bold">Syncing...</div>;

  if (!roundData || roundData.status === "no active round") {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold">No Active Round</h2>
        <p className="text-gray-500 mt-2">Wait for players to draft or start the tournament.</p>
      </div>
    );
  }

  const is2Player = roundData.max_players <= 2;
  const twoPlayerMode: "koth" | "heats" = benchData?.round?.two_player_mode || "koth";
  const kothWins: number = benchData?.round?.koth_wins_needed || 3;

  // KotH needs ALL players in the queue, same as heats.
  // The bench auto-assigns only max_players=2 active players for a 2-player game,
  // but KotH needs the full roster so everyone rotates through.
  const kothPlayers: any[] = standingsData;

  // Active players for standard (3+) mode: bench-assigned or full standings
  const activePlayers: any[] = benchData?.active_players?.length
    ? benchData.active_players
    : standingsData;

  // Heats always uses ALL players from standings regardless of bench auto-assignment.
  const heatPlayers: any[] = standingsData;

  const benched: any[] = benchData?.benched_players || [];

  // modeConfirmed: host has explicitly set the format via the display screen.
  // We check active_player_ids on the round (set by POST /bench) as the signal.
  // The bench endpoint returns a default two_player_mode even before confirmation,
  // so we cannot rely on that field alone.
  const modeConfirmed = !is2Player || (roundData.active_player_ids?.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <header className="mb-6 text-center">
          <span className="text-blue-600 font-bold uppercase tracking-widest text-xs">Current Match</span>
          <h1 className="text-4xl font-black uppercase italic text-gray-900">{roundData.game_name}</h1>
          {is2Player && modeConfirmed && (
            <span className={`inline-block mt-2 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full
              ${twoPlayerMode === "koth" ? "bg-yellow-100 text-yellow-700" : "bg-purple-100 text-purple-700"}`}>
              {twoPlayerMode === "koth" ? `👑 King of the Hill — first to ${kothWins}` : "🔥 Parallel Heats"}
            </span>
          )}

          {/* Live poll indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Live</span>
          </div>
        </header>

        {/* Benched players */}
        {benched.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded-xl border border-gray-200">
            <p className="text-xs font-black uppercase text-gray-400 mb-1.5">On the bench this round</p>
            <div className="flex flex-wrap gap-2">
              {benched.map((p: any) => (
                <span key={p.id} className="text-xs bg-white border border-gray-300 text-gray-500 px-2 py-1 rounded-full font-bold">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Format not confirmed yet */}
        {is2Player && !modeConfirmed && (
          <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-2xl text-center">
            <div className="text-3xl mb-3">📺</div>
            <h2 className="font-black text-orange-800 text-lg">Format not chosen yet</h2>
            <p className="text-orange-600 text-sm mt-1">
              Go to the <strong>Display screen</strong> to choose King of the Hill or Parallel Heats before scoring.
            </p>
          </div>
        )}

        {/* KotH */}
        {is2Player && modeConfirmed && twoPlayerMode === "koth" && (
          <KothScoring
            key={roundKey}
            players={kothPlayers}
            roundId={roundData.id}
            kothWins={kothWins}
            onRoundComplete={handleRoundComplete}
          />
        )}

        {/* Parallel Heats */}
        {is2Player && modeConfirmed && twoPlayerMode === "heats" && (
          <HeatsScoring
            key={roundKey}
            players={heatPlayers}
            roundId={roundData.id}
            onRoundComplete={handleRoundComplete}
          />
        )}

        {/* Standard 3+ player ranking */}
        {!is2Player && (
          <StandardScoring
            key={roundKey}
            players={activePlayers}
            roundId={roundData.id}
            onRoundComplete={handleRoundComplete}
          />
        )}
      </div>
    </div>
  );
}