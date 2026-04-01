import {
  Outlet,
} from "react-router";


export const handle = {
  sidebarLinks: [
    { label: "Join a Tournament", to: "/join" },
    { label: "Start a new Tournament", to: "/start" },
    { label: "Tournament History", to: "/history" },
    { label: "Manage a Tournament", to: "/manage" },
  ],
};

export default function Home() {
  return (
    <div>
      <img className="w-full h-{full-30} md:w-screen self-end" src="/static/images/mario_stacked.jpg" alt="Mario_Stacked" />
      <Outlet />
    </div>
  )
}
