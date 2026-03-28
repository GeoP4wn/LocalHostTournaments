export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function Scores() {
    return(
        <div>
            <h1>Input the scores during a Tournament</h1>
        </div>
    );
}