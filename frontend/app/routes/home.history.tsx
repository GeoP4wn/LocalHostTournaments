export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Join a Tournament", to: "/join" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function HomeHistory()  {
    return(
        <div>
            <h1>Look up the history of tournaments</h1>
        </div>
    );
}