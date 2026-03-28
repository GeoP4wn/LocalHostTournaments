export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function Display()  {
    return(
        <div>
            <h1>Display the current Tournament</h1>
        </div>
    );
}