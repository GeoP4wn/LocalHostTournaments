import {
  useNavigate
} from "react-router";
import {
  useState
} from "react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function JoinTournament()  {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
  const handleJoin = async () => {
    try {
      const response = await fetch("http://localhost:8000/tournaments/"+joinCode+"/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const result = await response.json();
      const existingData = JSON.parse(localStorage.getItem("tournament") || "{}");
      existingData.player_id= result.player_id
      existingData.code = joinCode;
      localStorage.setItem("tournament", JSON.stringify(existingData));
      navigate("/draft");

    } catch (error) {
      console.error("Failed to join tournament:", error);
      alert("Failed: " + error.message);
    }
  };
  return(
    <div>
        <h1>Join a Tournament</h1>
        <div>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
            onClick={handleJoin}
          >
              Join a Tournament
          </button>
          <div 
            className="mt-4"
          >
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Your Player Name:
            </label>
            <input
              type="string"
              id="name"
              value={name}
              onChange={(e) => setName(String(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="100"
            />
            <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700">
              Tournament Join Code:
            </label>
            <input
              type="string"
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(String(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              min="0"
              max="100"
            />
          </div>
          <div>
            <h1
              className="text-3xl font-bold mt-4"
            >
            </h1>
          </div>
        </div>
    </div>
  );
}