export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Join a Tournament", to: "/join" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
  ],
};

export default function HomeManage()  {
    return(
        <div>
            <h1>Manage a Tournament</h1>
        </div>
    );
}