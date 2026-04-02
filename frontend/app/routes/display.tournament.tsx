import { useEffect, useState } from "react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Display Drafting", to: "/display/draft" },
  ],
};

export default function Display() {
  const [roundData, setRoundData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [benchData, setBenchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const tournamentString = localStorage.getItem('tournament');
    if (!tournamentString) return;

    const { code: joinCode } = JSON.parse(tournamentString);

    const fetchData = async () => {
      try {
        const [roundRes, standingsRes, tournamentRes, benchRes] = await Promise.all([
          fetch(`/api/tournaments/${joinCode}/current_round`),
          fetch(`/api/tournaments/${joinCode}/standings`),
          fetch(`/api/tournaments/${joinCode}`),
          fetch(`/api/tournaments/${joinCode}/bench`),
        ]);

        const roundJson = await roundRes.json();
        const standingsJson = await standingsRes.json();
        const tJson = await tournamentRes.json();
        const benchJson = await benchRes.json();

        setRoundData(roundJson);
        setPlayers(standingsJson.standings || []);
        setBenchData(benchJson);

        if (tJson.tournament?.status === "finished") {
          setIsFinished(true);
        }
      } catch (error) {
        console.error("Error fetching tournament data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-center font-bold">Loading Tournament State...</div>;

  if (isFinished) {
    return <VictoryScreen players={players} />;
  }

  const activePlayers = benchData?.active_players || [];
  const benchedPlayers = benchData?.benched_players || [];
  const twoPlayerMode = benchData?.round?.two_player_mode;
  const is2Player = benchData?.round?.max_players <= 2;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <main className="max-w-5xl mx-auto">

        {/* CURRENT GAME SECTION */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-6 border-l-8 border-blue-600">
          <div className="flex flex-col md:flex-row items-center gap-8">

            {/* Round Counter */}
            <div className="flex flex-col items-center justify-center bg-blue-50 p-6 rounded-lg min-w-[140px]">
              <span className="text-blue-600 font-semibold uppercase tracking-wider text-sm">Round</span>
              <div className="flex items-center gap-2">
                <span className="text-5xl font-black text-blue-900">
                  {(roundData?.order_index ?? 0) + 1}
                </span>
                <span className="text-2xl font-bold text-blue-300">/</span>
                <span className="text-2xl font-bold text-blue-400">
                  {roundData?.round_count ?? 0}
                </span>
              </div>
            </div>

            {/* Game Cover */}
            <div className="w-40 h-40 bg-gray-200 rounded-lg overflow-hidden shadow-inner flex-shrink-0">
              {roundData?.image_path ? (
                <img
                  src={`http://localhost:8000${roundData.image_path}`}
                  alt={roundData.game_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>

            {/* Game Info */}
            <div className="flex-1 text-center md:text-left">
              <span className="text-gray-500 uppercase tracking-widest font-bold text-xs">{roundData?.console || "System"}</span>
              <h1 className="text-5xl font-black text-gray-900 leading-tight uppercase italic">
                {roundData?.game_name || "Waiting for Game..."}
              </h1>
              {is2Player && twoPlayerMode && (
                <span className={`inline-block mt-2 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full
                  ${twoPlayerMode === "koth" ? "bg-yellow-100 text-yellow-700" : "bg-purple-100 text-purple-700"}
                `}>
                  {twoPlayerMode === "koth" ? "👑 King of the Hill" : "🔥 Parallel Heats"}
                </span>
              )}
              {roundData?.notes && (
                <p className="mt-2 text-gray-600 italic">"{roundData.notes}"</p>
              )}
            </div>
          </div>
        </section>

        {/* BENCH SECTION */}
        {(activePlayers.length > 0 || benchedPlayers.length > 0) && (
          <section className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Lineup</h2>
            <div className="flex flex-wrap gap-3">
              {activePlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-green-50 border-2 border-green-400 px-4 py-2 rounded-full">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="font-black text-green-800">{p.name}</span>
                  <span className="text-[10px] text-green-600 font-bold uppercase">Playing</span>
                </div>
              ))}
              {benchedPlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-100 border-2 border-gray-200 px-4 py-2 rounded-full opacity-60">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span className="font-bold text-gray-500">{p.name}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Bench</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LEADERBOARD */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-800">Standings</h2>
            <span className="text-gray-500 font-mono">{players.length} Players Active</span>
          </div>

          <div className="grid gap-3">
            {players.map((player, index) => (
              <div
                key={index}
                className={`flex items-center bg-white p-4 rounded-lg shadow-md border transition-transform hover:scale-[1.01]
                  ${activePlayers.some((a) => a.id === player.id) ? "border-green-400 border-2" : "border-gray-200"}
                `}
              >
                {/* Rank */}
                <div className="w-12 text-2xl font-black text-gray-300 italic">
                  #{index + 1}
                </div>

                {/* Player Info */}
                <div className="flex-1 flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-gray-700 to-black rounded-full flex items-center justify-center text-white font-bold">
                    {player.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-gray-800 tracking-tight">
                      {player.name}
                    </span>
                    <p className="text-xs text-gray-400">{player.games_played ?? 0} games played</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-8 px-4">
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-400 uppercase">Wins</div>
                    <div className="text-xl font-black text-green-600">{player.wins}</div>
                  </div>
                  <div className="text-center bg-gray-900 text-white px-6 py-1 rounded-md">
                    <div className="text-[10px] font-bold uppercase opacity-60">Points</div>
                    <div className="text-2xl font-black">{player.total_points}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function VictoryScreen({ players }) {
  const winner = players[0];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900 to-black"></div>

      <div className="relative z-10 text-center animate-in zoom-in duration-700">
        <h2 className="text-blue-400 font-black tracking-[0.3em] uppercase mb-2">Tournament Complete</h2>
        <h1 className="text-8xl font-black text-white italic uppercase tracking-tighter mb-8">
          Grand Champion
        </h1>

        <div className="bg-white p-1 rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.5)] transform hover:scale-105 transition-transform">
          <div className="bg-gray-900 rounded-xl p-12 flex flex-col items-center border border-gray-800">
            <div className="w-32 h-32 bg-gradient-to-tr from-yellow-400 to-orange-600 rounded-full flex items-center justify-center text-5xl mb-6 shadow-lg">
              🏆
            </div>
            <span className="text-6xl font-black text-white uppercase italic">{winner?.name}</span>
            <div className="mt-4 flex gap-6 text-gray-400 font-bold uppercase tracking-widest text-sm">
              <span>{winner?.wins} Wins</span>
              <span>{winner?.total_points} Points</span>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {players.slice(1, 5).map((p, i) => (
            <div key={i} className="text-left bg-gray-800/50 p-3 rounded border border-gray-700 flex justify-between">
              <span className="text-gray-400 font-bold">#{i + 2} {p.name}</span>
              <span className="text-blue-400 font-black">{p.total_points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}