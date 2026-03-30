import {
  useNavigate,
} from "react-router";
import {
  useEffect,
  useState,
} from "react";

export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
  ],
};

export default function Draft() {
  const navigate = useNavigate();
  const [playerId, setPlayerId] = useState(null);

  useEffect(() => {
    // This code runs AFTER the component shows up on screen
    const rawData = localStorage.getItem("tournament");
    const data = JSON.parse(rawData || "{}");

    if (data.player_id) {
      // 2. "Upload" the ID into state to be able to use it in the UI
      setPlayerId(data.player_id);
    } else {
      navigate('/join');
    }
  }, [navigate]);

  // 3. Handle the "Wait" (Initial render where playerId is still null)
  if (!playerId) {
    return <div>Loading tournament session...</div>;
  }

  return (
    <div>
      <h1>Draft the games for a Tournament, hello {playerId}</h1>
    </div>
  );
}