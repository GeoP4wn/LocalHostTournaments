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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tournamentString = localStorage.getItem('tournament');
    if (!tournamentString) return;
    
    const { code: joinCode } = JSON.parse(tournamentString);

    const fetchData = async () => {
      try {
        // Note: Ensure your proxy or base URL is correct (http://localhost:8000 vs /api)
        const [roundRes, standingsRes] = await Promise.all([
          fetch(`/api/tournaments/${joinCode}/current_round`),
          fetch(`/api/tournaments/${joinCode}/standings`)
        ]);

        const roundJson = await roundRes.json();
        const standingsJson = await standingsRes.json();

        setRoundData(roundJson);
        setPlayers(standingsJson.standings || []);
      } catch (error) {
        console.error("Error fetching tournament data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-center font-bold">Loading Tournament State...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <main className="max-w-5xl mx-auto">
        
        {/* CURRENT GAME SECTION */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-10 border-l-8 border-blue-600">
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

            {/* Game Cover Image */}
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
              {roundData?.notes && (
                <p className="mt-2 text-gray-600 italic">"{roundData.notes}"</p>
              )}
            </div>
          </div>
        </section>

        {/* LEADERBOARD SECTION */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-800">Standings</h2>
            <span className="text-gray-500 font-mono">{players.length} Players Active</span>
          </div>
          
          <div className="grid gap-3">
            {players.map((player, index) => (
              <div 
                key={index} 
                className="flex items-center bg-white p-4 rounded-lg shadow-md border border-gray-200 transition-transform hover:scale-[1.01]"
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
                  <span className="text-2xl font-bold text-gray-800 tracking-tight">
                    {player.name}
                  </span>
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