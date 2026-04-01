import {
  useNavigate,
} from "react-router";
import {
  useEffect,
  useState,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
  ],
};

const useLongPress = (callback, ms = 500) => {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    let timerId;
    if (startLongPress) {
      timerId = setTimeout(() => {
        callback();
        setStartLongPress(false);
      }, ms);
    } else {
      clearTimeout(timerId);
    }
    return () => clearTimeout(timerId);
  }, [startLongPress, callback, ms]);

  return {
    onMouseDown: () => setStartLongPress(true),
    onMouseUp: () => setStartLongPress(false),
    onMouseLeave: () => setStartLongPress(false),
    onTouchStart: () => setStartLongPress(true),
    onTouchEnd: () => setStartLongPress(false),
  };
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

function DraftGameCard({ game, isSelected, onToggle, onLongPress }) {
  // Now the hook is called at the top level of this specific component.
  // This is allowed and safe!
  const longPressProps = useLongPress(() => onLongPress(game), 800);

  return (
    <div
      {...longPressProps}
      onClick={() => onToggle(game.id)}
      className={`cursor-pointer transition-all border-4 p-2 flex flex-col items-center select-none
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-transparent bg-gray-100 hover:bg-gray-200"}`}
    >
      <div className="relative w-full aspect-square">
        <img
          src={`http://localhost:8000${game.image_path}`}
          alt={game.name}
          className="w-full h-full object-contain pointer-events-none" 
        />
        {isSelected && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white p-1 text-xs">
             ✓
          </div>
        )}
      </div>
      <span className="text-[10px] mt-2 font-semibold text-center leading-tight">
        {game.name}
      </span>
    </div>
  );
}

export default function Draft() {
  const navigate = useNavigate();
  const [gamesLibrary, setGamesLibrary] = useState({}); // Stores { "1": {name: "Sonic", ...} }
  const [selectedGameIds, setSelectedGameIds] = useState([]); // For the draft selection
  const [maxGamesPerPlayer, setMaxGamesPerPlayer] = useState(3);
  const [playerId, setPlayerId] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null); // For the game detail modal

  const toggleGame = (id) => {
    const isCurrentlySelected = selectedGameIds.includes(id);
    const reachingLimit = selectedGameIds.length >= maxGamesPerPlayer;
    if (!isCurrentlySelected && reachingLimit) {
        alert(`You can only pick ${maxGamesPerPlayer} games!`);
        return;
      }
    setSelectedGameIds(prev => {
      return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
    });
  };

  const submitDraft = async () => {
    if (selectedGameIds.length === 0) { 
      alert("Please select at least one game!");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/players/${playerId}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          game_ids: selectedGameIds,
        }),
      });

      if (response.ok) {
        alert("Draft submitted successfully!");
        setSelectedGameIds([]); // Clear selection
      }
    } catch (error) {
      alert("Failed to submit draft, have you already drafted?")
      console.error("Submission failed:", error);
    }
  };

  useEffect(() => {
    fetch("/api/games")
      .then(res => res.json())
      .then(data => {
        // Transform array [{id: 1, name: 'X'}] into object {1: {name: 'X'}}
        const lookup = {};
        data.games.forEach(g => { lookup[g.id] = g; });
        setGamesLibrary(lookup);
      });
  }, []);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("tournament") || "{}");
    if (data.code) {
      fetch(`/api/tournaments/${data.code}`)
        .then(res => res.json())
        .then(data => setMaxGamesPerPlayer(data.tournament.max_games_per_player ?? 3));
    }
  }, []);  

  useEffect(() => {
    // This code runs AFTER the component shows up on screen
    const rawData = localStorage.getItem("tournament");
    const data = JSON.parse(rawData || "{}");

    if (data.player_id) {
      // 2. "Upload" the ID into state to be able to use it in the UI
      setPlayerId(data.player_id);
    } else {
      navigate('/join');
    }
  }, [navigate]);

  // 3. Handle the "Wait" (Initial render where playerId is still null)
  if (!playerId) {
    return <div>Loading tournament session...</div>;
  }

  return (
    <div>
      <div className="p-4 mb-20"> {/* Bottom margin so button doesn't hide content */}
        {selectedGame && (
          <GameDetailModal 
            game={selectedGame} 
            onClose={() => setSelectedGame(null)} 
          />
        )}
        <h2 className="text-xl font-bold mb-4">Select your games:</h2>
        
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
            {Object.values(gamesLibrary).map((game) => (
              <DraftGameCard
                key={game.id}
                game={game}
                isSelected={selectedGameIds.includes(game.id)}
                onToggle={toggleGame}
                onLongPress={setSelectedGame} // This opens the modal
              />
            ))}
          </div>

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-lg">
          <p>{selectedGameIds.length} games selected</p>
          <button 
            onClick={submitDraft}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
          >
            Submit Draft
          </button>
        </div>
      </div>
      
    </div>
  );
}