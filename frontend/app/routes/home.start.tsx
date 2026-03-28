export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Join a Tournament", to: "/join" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function StartTournament()  {
    return(
        <div>
            <h1>Start a Tournament</h1>
        </div>
    );
}