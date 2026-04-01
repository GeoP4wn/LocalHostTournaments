import { useEffect, useState } from "react";

export const handle = {
  sidebarLinks: [
    { label: "Display Drafting", to: "/display/draft" },
    { label: "Display a Tournament", to: "/display/tournament" },
  ],
};



function GameDetailModal({ game, onClose }) {
  if (!game) return null;

  // Helper to render the stat bars
  const StatBar = ({ label, value, color }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-xs font-mono text-white">{value}/5</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  const getScoreColor = (score) => {
    if (!score) return "bg-gray-500";
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-8 right-8 text-white text-4xl hover:text-blue-500">×</button>
      
      <div className="bg-gray-900 border-2 border-blue-500/30 rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row shadow-[0_0_50px_rgba(59,130,246,0.2)]">
        
        {/* Left: Huge Image & Metascore */}
        <div className="md:w-1/2 relative bg-black">
          <img 
            src={`http://localhost:8000${game.image_path}`} 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute bottom-6 left-6">
            <div className={`${getScoreColor(game.metascore)} text-black font-black p-4 rounded-xl shadow-lg flex flex-col items-center...`}>
              <span className="text-[10px] uppercase leading-none">Metascore</span>
              <span className="text-3xl leading-none">{game.metascore || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Right: Stats & Info */}
        <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-sm">{game.console} • {game.year}</span>
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-6">{game.name}</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <p className="text-[10px] uppercase text-gray-500">Players</p>
              <p className="text-xl font-bold text-white">{game.min_players}-{game.max_players}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <p className="text-[10px] uppercase text-gray-500">Eval Mode</p>
              <p className="text-xl font-bold text-white uppercase">{game.eval_mode}</p>
            </div>
          </div>

          {/* POWER BARS */}
          <div className="space-y-2">
            <StatBar label="Chaos" value={game.chaos} color="bg-purple-500" />
            <StatBar label="Skill Ceiling" value={game.skill_ceiling} color="bg-blue-500" />
            <StatBar label="Duration" value={game.duration} color="bg-green-500" />
            <StatBar label="Pace" value={game.pace} color="bg-yellow-500" />
            <StatBar label="Salt Level" value={game.salt_level} color="bg-red-500" />
          </div>

          {game.notes && (
            <div className="mt-8 p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl">
              <p className="text-gray-300 italic text-sm">"{game.notes}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GamesLibrary() {
  const [groupedGames, setGroupedGames] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("/api/games");
        const data = await res.json();
        
        // Group games by console
        const grouped = data.games.reduce((acc, game) => {
          const consoleName = game.console || "Other";
          if (!acc[consoleName]) acc[consoleName] = [];
          acc[consoleName].push(game);
          return acc;
        }, {});

        setGroupedGames(grouped);
      } catch (error) {
        console.error("Failed to load games library:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) return <div className="p-10 text-center font-bold">Loading Library...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {selectedGame && (
        <GameDetailModal 
          game={selectedGame} 
          onClose={() => setSelectedGame(null)} 
        />
      )}
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b-4 border-black pb-4">
          <h1 className="text-6xl font-black italic uppercase tracking-tighter text-gray-900">
            Games Library
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest mt-2">
            {Object.values(groupedGames).flat().length} Titles Available
          </p>
        </header>

        {Object.entries(groupedGames).map(([consoleName, games]) => (
          <section key={consoleName} className="mb-16">
            {/* Console Header */}
            <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-4 mb-6 border-b-2 border-gray-200 flex items-center gap-4">
              <h2 className="text-3xl font-black uppercase italic text-blue-600">
                {consoleName}
              </h2>
              <div className="h-1 flex-1 bg-gray-200"></div>
              <span className="text-gray-400 font-mono text-sm">{games.length} Games</span>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {games.map((game) => (
                <div 
                  key={game.id}
                  onClick={() => setSelectedGame(game)} 
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Aspect ratio box for image */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {game.image_path ? (
                      <img 
                        src={`http://localhost:8000${game.image_path}`} 
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold italic">
                        NO IMAGE
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                      {game.eval_mode}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-black uppercase text-gray-800 leading-tight mb-1 truncate">
                      {game.name}
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
                        {game.year || "Unknown Year"}
                      </span>
                      <span className="text-xs font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                        {game.min_players}-{game.max_players}P
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}