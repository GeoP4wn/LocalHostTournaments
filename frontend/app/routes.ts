import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("join", "routes/join.tsx"),
  route("host", "routes/host.tsx"),
  route("draft/:playerId", "routes/draft.tsx"),
  route("display/:code", "routes/display.tsx"),
  route("scores/:code", "routes/scores.tsx"),
  route("games", "routes/games.tsx"),
] satisfies RouteConfig;
