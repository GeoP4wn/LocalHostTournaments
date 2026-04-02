import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
  ],
};

function SortablePlayer({ player, rank }: { player: any; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-4 p-4 mb-2 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "bg-blue-50 border-blue-400 shadow-xl scale-105" : "bg-white border-gray-100 shadow-sm"
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
        rank === 1 ? "bg-yellow-400 text-yellow-900" : "bg-gray-100 text-gray-400"
      }`}>
        {rank}
      </div>
      <div className="flex-1">
        <span className="font-bold text-gray-800 text-lg">{player.name}</span>
        {player.drafted_this_game && (
          <span className="ml-2 text-[10px] text-blue-500 font-black uppercase">★ drafted</span>
        )}
      </div>
      <span className="text-gray-300">
        <FontAwesomeIcon icon="fa-solid fa-grip-vertical" />
      </span>
    </div>
  );
}

export default function AdminScoring() {
  const [roundData, setRoundData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [benchData, setBenchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [twoPlayerMode, setTwoPlayerMode] = useState<"koth" | "heats">("koth");
  const [heatResults, setHeatResults] = useState<Record<number, "win" | "loss" | null>>({});

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchData = async () => {
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

      setRoundData(rJson);
      setBenchData(bJson);

      const mode = bJson?.round?.two_player_mode || "koth";
      setTwoPlayerMode(mode);

      // Use active players from bench if available, otherwise fall back to full standings
      const activePlayers = bJson?.active_players?.length
        ? bJson.active_players
        : (sJson.standings || []);

      setPlayers(activePlayers);

      // Init heat results
      if (mode === "heats") {
        const initHeats: Record<number, "win" | "loss" | null> = {};
        activePlayers.forEach((p) => { initHeats[p.id] = null; });
        setHeatResults(initHeats);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPlayers((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const submitScores = async () => {
    if (!roundData?.id) return;
    setSubmitting(true);

    const placements: Record<number, number> = {};
    players.forEach((p, index) => { placements[p.id] = index + 1; });

    try {
      const res = await fetch(`/api/rounds/${roundData.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements }),
      });

      if (res.ok) {
        alert("Scores saved! Moving to next round.");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  // For heats: each heat is a 1v1, winners get "win", losers get "loss"
  const submitHeats = async () => {
    if (!roundData?.id) return;
    setSubmitting(true);

    // Build placements: winners get placement 1, losers get placement 2
    // For heats with 3 pairs of 6 players, we give winners 1, losers 2 within each heat
    // Here we simply record: win = placement 1, loss = placement 2
    const placements: Record<number, number> = {};
    Object.entries(heatResults).forEach(([pid, result]) => {
      placements[Number(pid)] = result === "win" ? 1 : 2;
    });

    try {
      const res = await fetch(`/api/rounds/${roundData.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placements }),
      });

      if (res.ok) {
        alert("Heat results saved!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
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

  const is2Player = benchData?.round?.max_players <= 2;
  const benched = benchData?.benched_players || [];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <header className="mb-8 text-center">
          <span className="text-blue-600 font-bold uppercase tracking-widest text-xs">Current Match</span>
          <h1 className="text-4xl font-black uppercase italic text-gray-900">{roundData.game_name}</h1>
          {is2Player && (
            <span className={`inline-block mt-2 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full
              ${twoPlayerMode === "koth" ? "bg-yellow-100 text-yellow-700" : "bg-purple-100 text-purple-700"}
            `}>
              {twoPlayerMode === "koth" ? "👑 King of the Hill" : "🔥 Parallel Heats"}
            </span>
          )}
        </header>

        {/* Benched players notice */}
        {benched.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded-xl border border-gray-200">
            <p className="text-xs font-black uppercase text-gray-400 mb-1">On the bench this round</p>
            <div className="flex flex-wrap gap-2">
              {benched.map((p) => (
                <span key={p.id} className="text-xs bg-white border border-gray-300 text-gray-500 px-2 py-1 rounded-full font-bold">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Standard drag-to-rank (for 3+ player games or KotH) */}
        {(!is2Player || twoPlayerMode === "koth") && (
          <>
            <p className="text-center text-xs text-gray-400 mb-4 uppercase tracking-widest font-bold">
              Drag to set final standings
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={players} strategy={verticalListSortingStrategy}>
                {players.map((player, index) => (
                  <SortablePlayer key={player.id} player={player} rank={index + 1} />
                ))}
              </SortableContext>
            </DndContext>

            <button
              onClick={submitScores}
              disabled={submitting}
              className="w-full mt-8 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg disabled:bg-gray-400"
            >
              {submitting ? "Saving..." : "Confirm Standings"}
            </button>
          </>
        )}

        {/* Heats mode: win/loss buttons per player */}
        {is2Player && twoPlayerMode === "heats" && (
          <>
            <p className="text-center text-xs text-gray-400 mb-4 uppercase tracking-widest font-bold">
              Mark each player's heat result
            </p>
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm">
                  <span className="flex-1 font-bold text-gray-800">{player.name}</span>
                  <button
                    onClick={() => setHeatResults((prev) => ({ ...prev, [player.id]: "win" }))}
                    className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${
                      heatResults[player.id] === "win"
                        ? "bg-green-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-500 hover:bg-green-100"
                    }`}
                  >
                    Win
                  </button>
                  <button
                    onClick={() => setHeatResults((prev) => ({ ...prev, [player.id]: "loss" }))}
                    className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${
                      heatResults[player.id] === "loss"
                        ? "bg-red-400 text-white shadow-md"
                        : "bg-gray-100 text-gray-500 hover:bg-red-100"
                    }`}
                  >
                    Loss
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={submitHeats}
              disabled={submitting || Object.values(heatResults).some((v) => v === null)}
              className="w-full mt-8 bg-purple-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg disabled:bg-gray-400"
            >
              {submitting ? "Saving..." : "Submit Heat Results"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}