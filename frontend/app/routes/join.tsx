"use client";
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
                console.log("Button clicked!"); // Step 1: Did the click register?
                
                if (typeof window !== "undefined") {
                  const data = {
                    code: "X7K2",
                    playerId: 3,
                    playerName: "Lorin"
                  };
                  
                  localStorage.setItem("tournament", JSON.stringify(data));
                  console.log("Data saved to localStorage:", localStorage.getItem("tournament")); // Step 2: Can we read it back immediately?
                  
                  // Optional: Force a page reload just to see if it persists
                  // window.location.reload(); 
                } else {
                  console.log("We are on the server - localStorage is not available yet.");
                }
              }}
            >
                Join
            </button>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" 
              onClick={() => alert("Browser is alive!")}
            >
              Test Alert
            </button>
        </div>
    );
}