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

export default function Draft() {
  const navigate = useNavigate();
  const [gamesLibrary, setGamesLibrary] = useState({}); // Stores { "1": {name: "Sonic", ...} }
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [maxGamesPerPlayer, setMaxGamesPerPlayer] = useState(3);
  const [playerId, setPlayerId] = useState(null);

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
        <h2 className="text-xl font-bold mb-4">Select your games:</h2>
        
          <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {Object.values(gamesLibrary).map((game) => {
            const isSelected = selectedGameIds.includes(game.id);

            return (
              <div
                key={game.id}
                onClick={() => toggleGame(game.id)} // TODO make the number of games that are selectable a setting.
                className={`cursor-pointer transition-all border-4 p-2 flex flex-col items-center
                  ${isSelected ? "border-blue-500 bg-blue-50" : "border-transparent bg-gray-100"}`}
              >
                <div className="relative w-full aspect-square">
                  <img
                    src={`http://localhost:8000${game.image_path}`}
                    alt={game.name}
                    className="w-full h-full object-contain"
                  />
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white p-1 text-xs">
                      <FontAwesomeIcon icon="fa-solid fa-check" />
                    </div>
                  )}
                </div>
                <span className="text-xs mt-2 font-semibold text-center">{game.name}</span>
              </div>
            );
          })}
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