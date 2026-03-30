export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function JoinTournament()  {
    return(
        <div>
            <h1>Join a Tournament</h1>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
              onClick={() => {               
                if (typeof window !== "undefined") {
                  const data = {
                    code: "X7K2",
                    playerId: 3,
                    playerName: "Lorin"
                  };

                  localStorage.setItem("tournament", JSON.stringify(data));
                  // Force a reload to show the tournament button in the top right
                  window.location.reload(); 
                } else {
                  console.log("We are on the server - localStorage is not available yet.");
                }
              }}
            >
                Join
            </button>
        </div>
    );
}