import { useTournament } from "~/hooks/useTournament";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
  ],
};

export default function Draft()  {
  const { tournament, leave } = useTournament()
  if (!tournament) return null // redirecting
  return(
      <div>
          <h1>Draft the games for a Tournament</h1>
      </div>
  );
}