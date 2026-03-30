import {
  useState
} from "react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Join a Tournament", to: "/join" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function StartTournament()  {
  const [joinCode, setJoinCode] = useState("");
  const [wins, setWins] = useState(3);
  const handleCreate = async () => {
    try {
      const response = await fetch("http://localhost:8000/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wins_needed: String(wins)
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      setJoinCode(result.join_code);

      localStorage.setItem("tournament", JSON.stringify({ code: result.join_code }));
      window.location.reload();
    } catch (error) {
      console.error("Failed to create tournament:", error);
      alert("Rate limit reached or server is down")
    }
  };
    return(
        <div>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
              onClick={handleCreate}
            >
                Create a Tournament
            </button>
            <div 
              className="mt-4"
            >
              <label htmlFor="wins" className="block text-sm font-medium text-gray-700">
                Wins Needed:
              </label>
              <input
                type="number"
                id="wins"
                value={wins}
                onChange={(e) => setWins(Number(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="100"
              />
            </div>
            <div>
              <h1
                className="text-3xl font-bold mt-4"
              >
               {joinCode}
              </h1>
            </div>
        </div>
    );
}