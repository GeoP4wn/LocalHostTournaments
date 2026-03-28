import {
  Outlet
} from "react-router";

export const handle = {
  sidebarLinks: [
    { label: "Bracket View", to: "/tournament/bracket" },
    { label: "Player List", to: "/tournament/players" },
    { label: "Match History", to: "/tournament/history" },
  ],
};
export default function Home() {
  return (
    <div>
      <h1>Tournament</h1>
      <img className="w-full h-{full-30} md:w-screen self-end" src="static/images/mario_stacked.jpg" alt="Mario_Stacked" />
      <Outlet />
    </div>
  )
}
