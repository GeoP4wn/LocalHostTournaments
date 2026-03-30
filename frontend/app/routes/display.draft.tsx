import {
  useEffect,
  useState,
} from "react";
import {
  useNavigate
} from "react-router";
import { QRCodeSVG } from "qrcode.react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Display a Tournament", to: "/display/tournament" },
  ],
};

export default function Display() {
  const [gamesLibrary, setGamesLibrary] = useState({}); // Stores { "1": {name: "Sonic", ...} }
  const [draftStatus, setDraftStatus] = useState(null); // Stores the current draft status from the server
  const [joinCode, setJoinCode] = useState("");
  const navigate = useNavigate();
  const [joinUrl, setJoinUrl] = useState("");

  const handleDisplay = async (code) => {
    try {
      const targetCode = code || joinCode;
      if (!targetCode) return;
      const response = await fetch("http://localhost:8000/tournaments/"+targetCode+"/draft_status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      setDraftStatus(result);
      
      

    } catch (error) {
      console.error("Failed to fetch draft status:", error);
      alert("Failed: " + error.message);
    }
  };

  // 1. Fetch the Master List once
  useEffect(() => {
    fetch("http://localhost:8000/games")
      .then(res => res.json())
      .then(data => {
        // Transform array [{id: 1, name: 'X'}] into object {1: {name: 'X'}}
        const lookup = {};
        data.games.forEach(g => { lookup[g.id] = g; });
        setGamesLibrary(lookup);
      });
  }, []);

  // 2. Fetch the draft status (you could poll this every 5 seconds)
  useEffect(() => {
    const rawData = localStorage.getItem("tournament");
    const data = JSON.parse(rawData || "{}");

    setJoinUrl(window.location.origin + "/join/" + data.code);

    if (data.code) {
      // 2. "Upload" the ID into state
      setJoinCode(data.code);
      handleDisplay(data.code); // Initial fetch
      const interval = setInterval(() => handleDisplay(data.code), 5000); // Poll every 5 seconds
      return () => clearInterval(interval); // Cleanup on unmount

    } else {
      navigate('/join');
    }
    // Fetch /draft_status logic here...
    // Find the players in the list
  }, []);
  if (!draftStatus) {
    return <div className="p-4 text-center">Loading draft status...</div>;
  }
  return(
    <div className="p-4">
      <h1>Draft Status</h1>
      
      {/* 3. Display Player Status (The text list in your mockup) */}
      <div className="flex gap-4 mb-8">
        {draftStatus?.players.map((p, i) => (
          <span key={i} className={p.draft_done ? "text-green-600 font-bold" : "text-gray-400"}>
            {p.name}{p.draft_done ? " (Done)" : ""}
          </span>
        ))}
      </div>

      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
        onClick={async () => {
            try {
              const response = await fetch("http://localhost:8000/tournaments/"+joinCode+"/start", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
              }

              const result = await response.json();
              navigate("/display/tournament");

            } catch (error) {
              console.error("Failed to join tournament:", error);
              alert("Failed: " + error.message);
            }
        }}
      >
        Join a Tournament
      </button>

      {/* 4. Display Join URL and QR Code */}
      <div className="p-4 bg-white rounded shadow-lg flex flex-col items-center">
        <QRCodeSVG value={joinUrl} size={128} />
        <p className="mt-2 font-mono font-bold text-lg">{joinCode}</p>
      </div>

      <h2>The games chosen:</h2>
      <div className="grid grid-cols-6 gap-2">
        {/* 4. Flatten all player game_ids into one list to show the grid */}
        {draftStatus?.players.flatMap(p => p.game_ids || []).map((gameId, idx) => {
          const game = gamesLibrary[gameId];
          return (
            <div key={idx} className="bg-gray-300 aspect-square flex flex-col items-center p-2">
              <img 
                src={`http://localhost:8000/images/games/${encodeURIComponent(game?.name)}.jpg`}
                alt={`Image of ${game?.name}`}
                className="w-full h-2/3 object-contain"
              />
              <span className="text-xs mt-1">{game?.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}