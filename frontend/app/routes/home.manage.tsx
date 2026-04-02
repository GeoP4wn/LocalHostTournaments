import { useEffect, useState, useCallback } from "react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Join a Tournament", to: "/join" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
  ],
};

// ── Drag-to-reorder for rounds ────────────────────────────────

function DraggableRoundList({ rounds, onReorder }) {
  const [items, setItems] = useState(rounds);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => setItems(rounds), [rounds]);

  const handleDragStart = (index: number) => setDragging(index);
  const handleDragEnter = (index: number) => setDragOver(index);

  const handleDragEnd = () => {
    if (dragging === null || dragOver === null || dragging === dragOver) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(dragOver, 0, moved);
    setItems(reordered);
    setDragging(null);
    setDragOver(null);
    onReorder(reordered.map((r) => r.id));
  };

  return (
    <div className="space-y-2">
      {items.map((round, index) => (
        <div
          key={round.id}
          draggable={round.status === "pending"}
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all
            ${round.status === "active" ? "border-blue-500 bg-blue-50" : ""}
            ${round.status === "done" ? "border-green-200 bg-green-50 opacity-60" : ""}
            ${round.status === "skipped" ? "border-gray-200 bg-gray-50 opacity-50 line-through" : ""}
            ${round.status === "pending" ? "border-gray-200 bg-white cursor-grab hover:border-gray-400" : ""}
            ${dragging === index ? "opacity-40 scale-95" : ""}
            ${dragOver === index && dragging !== index ? "border-blue-400 bg-blue-50" : ""}
          `}
        >
          {/* Drag handle — only for pending */}
          <span className={`text-gray-300 ${round.status === "pending" ? "cursor-grab" : "opacity-0"}`}>
            ⠿
          </span>

          {/* Status badge */}
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full min-w-[52px] text-center
            ${round.status === "active" ? "bg-blue-500 text-white" : ""}
            ${round.status === "done" ? "bg-green-500 text-white" : ""}
            ${round.status === "skipped" ? "bg-gray-400 text-white" : ""}
            ${round.status === "pending" ? "bg-gray-100 text-gray-500" : ""}
          `}>
            {round.status}
          </span>

          {/* Game info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 truncate text-sm">{round.game_name}</p>
            <p className="text-[10px] text-gray-400 uppercase">{round.console}</p>
          </div>

          {/* Player count */}
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
            {round.min_players}–{round.max_players}P
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Bench manager ─────────────────────────────────────────────

function BenchPanel({ joinCode, onUpdate }) {
  const [bench, setBench] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [twoPlayerMode, setTwoPlayerMode] = useState("koth");

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${joinCode}/bench`);
    if (!res.ok) return;
    const data = await res.json();
    setBench(data);
    setSelectedIds(data.active_players?.map((p) => p.id) || []);
    setTwoPlayerMode(data.round?.two_player_mode || "koth");
  }, [joinCode]);

  useEffect(() => { load(); }, [load]);

  if (!bench || !bench.round) {
    return (
      <p className="text-gray-400 text-sm italic">No active round — bench will appear once a round starts.</p>
    );
  }

  const { round } = bench;
  const allPlayers = bench.bench || [];
  const maxPlayers = round.max_players;
  const is2Player = maxPlayers <= 2;

  const togglePlayer = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxPlayers) {
        alert(`Max ${maxPlayers} players for this game!`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const save = async () => {
    setSaving(true);
    await fetch(`/api/tournaments/${joinCode}/bench`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        active_player_ids: selectedIds,
        two_player_mode: is2Player ? twoPlayerMode : undefined,
      }),
    });
    setSaving(false);
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-bold text-gray-800">{round.game_name}</p>
          <p className="text-xs text-gray-500">
            {round.min_players}–{round.max_players} players •{" "}
            <span className={selectedIds.length === maxPlayers ? "text-green-600 font-bold" : "text-orange-500 font-bold"}>
              {selectedIds.length}/{maxPlayers} selected
            </span>
          </p>
        </div>
      </div>

      {/* 2-player mode toggle */}
      {is2Player && (
        <div className="flex gap-2">
          <button
            onClick={() => setTwoPlayerMode("koth")}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
              twoPlayerMode === "koth" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            👑 King of the Hill
          </button>
          <button
            onClick={() => setTwoPlayerMode("heats")}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
              twoPlayerMode === "heats" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            🔥 Parallel Heats
          </button>
        </div>
      )}

      {/* Player list */}
      <div className="space-y-2">
        {allPlayers.map((player) => {
          const isActive = selectedIds.includes(player.id);
          return (
            <button
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                ${isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}
              `}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black
                ${isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}
              `}>
                {isActive ? "▶" : "⏸"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">{player.name}</p>
                <p className="text-[10px] text-gray-400">
                  {player.games_played} games played
                  {player.drafted_this_game && (
                    <span className="ml-2 text-blue-500 font-bold">★ drafted</span>
                  )}
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full
                ${isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}
              `}>
                {isActive ? "playing" : "bench"}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={save}
        disabled={saving || selectedIds.length === 0}
        className="w-full py-3 bg-blue-600 text-white font-black uppercase rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-all"
      >
        {saving ? "Saving..." : "Confirm Lineup"}
      </button>
    </div>
  );
}

// ── Player roster with kick ───────────────────────────────────

function PlayerRoster({ joinCode }) {
  const [players, setPlayers] = useState<any[]>([]);
  const [confirming, setConfirming] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${joinCode}`);
    if (!res.ok) return;
    const data = await res.json();
    setPlayers(data.players || []);
  }, [joinCode]);

  useEffect(() => { load(); }, [load]);

  const kick = async (id: number) => {
    await fetch(`/api/players/${id}/kick`, { method: "POST" });
    setConfirming(null);
    load();
  };

  return (
    <div className="space-y-2">
      {players.length === 0 && (
        <p className="text-gray-400 text-sm italic">No players yet.</p>
      )}
      {players.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
          <div>
            <p className="font-bold text-gray-800">{p.name}</p>
            <p className="text-xs text-gray-400">
              {p.draft_done ? "✅ Drafted" : "⏳ Drafting..."}
            </p>
          </div>
          {confirming === p.id ? (
            <div className="flex gap-2">
              <button
                onClick={() => kick(p.id)}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-600"
              >
                Confirm kick
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(p.id)}
              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded border border-gray-200 hover:border-red-300 transition-colors"
            >
              Kick
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Skip round ────────────────────────────────────────────────

function SkipRound({ joinCode, onSkipped }) {
  const [activeRound, setActiveRound] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    fetch(`/api/tournaments/${joinCode}/current_round`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status !== "no active round") setActiveRound(data);
      });
  }, [joinCode]);

  const skip = async () => {
    if (!activeRound) return;
    setSkipping(true);
    const res = await fetch(`/api/rounds/${activeRound.id}/skip`, { method: "POST" });
    const data = await res.json();
    setSkipping(false);
    setConfirming(false);
    setActiveRound(null);
    onSkipped?.(data);
  };

  if (!activeRound) {
    return <p className="text-gray-400 text-sm italic">No active round to skip.</p>;
  }

  return (
    <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
      <p className="text-sm text-gray-700 mb-3">
        Current round: <span className="font-black">{activeRound.game_name}</span>
      </p>
      {confirming ? (
        <div className="flex gap-2">
          <button
            onClick={skip}
            disabled={skipping}
            className="flex-1 py-2 bg-orange-500 text-white font-black text-sm rounded-lg hover:bg-orange-600 disabled:bg-gray-300"
          >
            {skipping ? "Skipping..." : "Yes, skip this round"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 py-2 bg-gray-200 text-gray-600 font-bold text-sm rounded-lg"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-2 bg-orange-500 text-white font-black text-sm rounded-xl hover:bg-orange-600 transition-all"
        >
          ⏭ Skip Current Round
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function HomeManage() {
  const [joinCode, setJoinCode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tournament");
      return saved ? JSON.parse(saved).code : "";
    }
    return "";
  });
  const [gamesPerPlayer, setGamesPerPlayer] = useState(3);
  const [tournamentStatus, setTournamentStatus] = useState("active");
  const [rounds, setRounds] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"settings" | "bench" | "players" | "rounds">("settings");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  const loadRounds = useCallback(async () => {
    if (!joinCode) return;
    const res = await fetch(`/api/tournaments/${joinCode}/rounds`);
    if (!res.ok) return;
    const data = await res.json();
    setRounds(data.rounds || []);
  }, [joinCode]);

  useEffect(() => {
    if (!joinCode) return;
    fetch(`/api/tournaments/${joinCode}`)
      .then((r) => r.json())
      .then((data) => {
        setGamesPerPlayer(data.tournament.max_games_per_player ?? 3);
        setTournamentStatus(data.tournament.status ?? "active");
        // save code to localStorage
        const existing = JSON.parse(localStorage.getItem("tournament") || "{}");
        existing.code = joinCode;
        localStorage.setItem("tournament", JSON.stringify(existing));
      });
    loadRounds();
  }, [joinCode, refreshKey, loadRounds]);

  const updateMaxGames = async (newLimit: number) => {
    setGamesPerPlayer(newLimit);
    const res = await fetch(`/api/tournaments/${joinCode}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_games_per_player: newLimit }),
    });
    if (!res.ok) setGamesPerPlayer(gamesPerPlayer);
  };

  const updateTournamentStatus = async (newStatus: string) => {
    setTournamentStatus(newStatus);
    const res = await fetch(`/api/tournaments/${joinCode}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) setTournamentStatus(tournamentStatus);
  };

  const handleReorder = async (newOrderIds: number[]) => {
    await fetch(`/api/tournaments/${joinCode}/rounds/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round_ids: newOrderIds }),
    });
    loadRounds();
  };

  const TABS = [
    { id: "settings", label: "⚙️ Settings" },
    { id: "bench", label: "🎮 Bench" },
    { id: "players", label: "👥 Players" },
    { id: "rounds", label: "📋 Rounds" },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Code input */}
      <div className="flex flex-row gap-4">
        <input
          type="text"
          className="border p-2 rounded flex-1"
          placeholder="Enter Tournament Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        />
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={refresh}
        >
          Load
        </button>
      </div>

      {joinCode && (
        <>
          {/* Tab bar */}
          <div className="flex gap-2 border-b border-gray-200 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all
                  ${activeTab === tab.id
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings tab */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold mb-3">Tournament Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Games per Player:</label>
                    <input
                      type="number"
                      className="border p-2 rounded w-24"
                      value={gamesPerPlayer}
                      onChange={(e) => updateMaxGames(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Tournament Status:</label>
                    <select
                      className="border p-2 rounded"
                      value={tournamentStatus}
                      onChange={(e) => updateTournamentStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="finished">Finished</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold mb-3">Round Controls</h2>
                <SkipRound joinCode={joinCode} onSkipped={refresh} />
              </div>
            </div>
          )}

          {/* Bench tab */}
          {activeTab === "bench" && (
            <div>
              <h2 className="text-xl font-bold mb-3">Bench & Lineup</h2>
              <p className="text-sm text-gray-500 mb-4">
                Players are auto-sorted by draft priority then games played. Override the lineup here before a round starts.
              </p>
              <BenchPanel joinCode={joinCode} onUpdate={refresh} />
            </div>
          )}

          {/* Players tab */}
          {activeTab === "players" && (
            <div>
              <h2 className="text-xl font-bold mb-3">Players</h2>
              <p className="text-sm text-gray-500 mb-4">
                Kicked players are removed from future rounds. Their past results remain in standings.
              </p>
              <PlayerRoster joinCode={joinCode} />
            </div>
          )}

          {/* Rounds tab */}
          {activeTab === "rounds" && (
            <div>
              <h2 className="text-xl font-bold mb-3">Round Order</h2>
              <p className="text-sm text-gray-500 mb-4">
                Drag pending rounds to reorder them. Active and completed rounds cannot be moved.
              </p>
              <DraggableRoundList rounds={rounds} onReorder={handleReorder} />
            </div>
          )}
        </>
      )}
    </div>
  );
}