export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function Draft()  {
    return(
        <div>
            <h1>Draft the games for a Tournament</h1>
        </div>
    );
}