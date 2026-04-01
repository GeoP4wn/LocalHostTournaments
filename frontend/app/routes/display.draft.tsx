import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";

// 1. DEFINE THE GAMECARD OUTSIDE THE MAIN COMPONENT
function GameCard({ game }) {
  const [isHovered, setIsHovered] = useState(false);

  // If the master library hasn't loaded this game ID yet, show a placeholder
  if (!game) return <div className="bg-gray-800 aspect-square animate-pulse rounded-lg" />;

  return (
    <div 
      className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all shadow-md bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={`http://localhost:8000${game.image_path}`} 
        alt={game.name}
        className="w-full aspect-square object-cover"
      />
      
      {/* Small label always visible */}
      <div className="p-1 text-center bg-white">
        <p className="text-[10px] font-bold truncate uppercase">{game.name}</p>
      </div>
    </div>
  );
}

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
            <div className="bg-green-500 text-black font-black p-4 rounded-xl shadow-lg flex flex-col items-center">
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

export default function Display() {
  const [gamesLibrary, setGamesLibrary] = useState({});
  const [draftStatus, setDraftStatus] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const navigate = useNavigate();

  // Fetch Logic (Keep your existing useEffects)
  useEffect(() => {
    fetch("http://localhost:8000/games")
      .then(res => res.json())
      .then(data => {
        const lookup = {};
        data.games.forEach(g => { lookup[g.id] = g; });
        setGamesLibrary(lookup);
      });
  }, []);

  useEffect(() => {
    const rawData = localStorage.getItem("tournament");
    const data = JSON.parse(rawData || "{}");
    if (!data.code) return navigate('/join');

    setJoinCode(data.code);
    setJoinUrl(window.location.origin + "/join/" + data.code);

    const fetchStatus = () => {
      fetch(`http://localhost:8000/tournaments/${data.code}/draft_status`)
        .then(res => res.json())
        .then(setDraftStatus)
        .catch(console.error);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!draftStatus) return <div className="p-8 text-center font-bold text-xl">Waiting for server...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/*Game Detail Overlay*/}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* LEFT COLUMN: Players & QR */}
        <div className="md:w-1/3 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-lg text-center">
            <h2 className="text-gray-400 uppercase font-black tracking-widest text-sm mb-4">Join Tournament</h2>
            <div className="bg-white p-2 inline-block rounded-lg shadow-inner mb-4">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <p className="text-4xl font-black tracking-tighter text-blue-600 mb-2">{joinCode}</p>
            <p className="text-gray-400 text-xs font-mono">{joinUrl}</p>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-gray-900 font-black uppercase italic mb-4 border-b-2 border-gray-100 pb-2">Draft Status</h2>
            <div className="space-y-3">
              {draftStatus.players.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className={`font-bold ${p.draft_done ? "text-gray-900" : "text-gray-400 animate-pulse"}`}>
                    {p.name}
                  </span>
                  {p.draft_done ? (
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-black uppercase">Ready</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-1 rounded-full font-black uppercase">Drafting...</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <button 
            onClick={() => fetch(`http://localhost:8000/tournaments/${joinCode}/start`, { method: "POST" }).then(() => navigate("/display/tournament"))}
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase shadow-xl hover:bg-blue-700 transition-all"
          >
            Start Tournament
          </button>
        </div>

        {/* RIGHT COLUMN: The Grid */}
        <div className="flex-1">
          <h2 className="text-2xl font-black uppercase italic text-gray-800 mb-6 flex items-center gap-3">
            Game Pool 
            <span className="text-sm font-mono text-gray-400 bg-gray-200 px-2 py-1 rounded-md not-italic">
               {draftStatus.players.flatMap(p => p.game_ids || []).length} Titles
            </span>
          </h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {draftStatus.players.flatMap(p => p.game_ids || []).map((gameId, idx) => {
              const game = gamesLibrary[gameId];
              return (
                <div 
                  key={`${gameId}-${idx}`}
                  onClick={() => setSelectedGame(game)} // Trigger the big detail view
                  className="cursor-pointer transform hover:scale-105 transition-transform"
                >
                  <GameCard game={game} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}