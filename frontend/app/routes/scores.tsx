import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
  ],
};

// --- Helper Component (Defined in same file) ---
function SortablePlayer({ player, rank }: { player: any, rank: number }) {
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
      <span className="flex-1 font-bold text-gray-800 text-lg">{player.name}</span>
      <span className="text-gray-300">
        <FontAwesomeIcon icon="fa-solid fa-grip-vertical" />
      </span>
    </div>
  );
}

// --- Main All-in-One Component ---
export default function AdminScoring() {
  const [roundData, setRoundData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const fetchData = async () => {
    const tournamentString = localStorage.getItem('tournament');
    if (!tournamentString) return;
    const { code: joinCode } = JSON.parse(tournamentString);

    try {
      const [roundRes, standingsRes] = await Promise.all([
        fetch(`/api/tournaments/${joinCode}/current_round`),
        fetch(`/api/tournaments/${joinCode}/standings`)
      ]);

      const rJson = await roundRes.json();
      const sJson = await standingsRes.json();

      setRoundData(rJson);
      setPlayers(sJson.standings || []);
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
        fetchData(); // Refresh to get the next active round
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <header className="mb-8 text-center">
          <span className="text-blue-600 font-bold uppercase tracking-widest text-xs">Current Match</span>
          <h1 className="text-4xl font-black uppercase italic text-gray-900">{roundData.game_name}</h1>
        </header>

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
      </div>
    </div>
  );
}