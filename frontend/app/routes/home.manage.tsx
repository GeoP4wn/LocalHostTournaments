import { useEffect, useState } from "react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Join a Tournament", to: "/join" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
  ],
};

export default function HomeManage()  {
      const [joinCode, setJoinCode] = useState(() => {
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("tournament");
          return saved ? JSON.parse(saved).code : "";
        }
        return "";
      });
      const [gamesPerPlayer, setGamesPerPlayer] = useState(3);

      const updateMaxGames = async (newLimit: number) => {
        setGamesPerPlayer(newLimit) // optimistic update

        try {
          const res = await fetch(`/api/tournaments/${joinCode}/settings`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ max_games_per_player: newLimit }),
          })

          if (!res.ok) {
            // revert optimistic update if server rejected it
            setGamesPerPlayer(gamesPerPlayer)
            console.error("Server rejected settings update:", await res.text())
          }
        } catch (error) {
          setGamesPerPlayer(gamesPerPlayer) // revert on network failure
          console.error("Failed to update settings:", error)
        }
      }

      useEffect(() => {
        const existingData = JSON.parse(localStorage.getItem("tournament") || "{}");
        existingData.code = joinCode;
        existingData.maxGames = gamesPerPlayer; // Save the limit too
        localStorage.setItem("tournament", JSON.stringify(existingData));

        fetch(`/api/tournaments/${joinCode}`)
        .then(r => r.json())
        .then(data => {
          setGamesPerPlayer(data.tournament.max_games_per_player ?? 3)
          // set other settings fields here as you add them IMPORTANT
        })
      }, [joinCode, gamesPerPlayer]);

    return(
      <div className="flex flex-col gap-6">
        <div className="flex flex-row gap-4">
            <input
              type="text"
              className="border p-2 rounded"
              placeholder="Enter Tournament Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => {
                window.location.reload();
              }}
            >
              Submit
            </button>
        </div>
        <div>
            <h1 className="text-xl font-bold">Manage Rounds</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Games per Player:</label>
                <input 
                  type="number"
                  className="border p-2 rounded w-24"
                  value={gamesPerPlayer}
                  onChange={(e) => {updateMaxGames(Number(e.target.value))}}
                />
              </div>
            </div>
        </div>
        <div>
            <h1 className="text-xl font-bold">Manage Games</h1>
        </div>
        <div>
            <h1 className="text-xl font-bold">Manage Players</h1>
        </div>
      </div>
);
}