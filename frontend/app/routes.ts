import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  //home
  index("routes/home.tsx"),
  route("join", "routes/join.tsx"),
  route("manage", "routes/home.manage.tsx"),
  route("history", "routes/home.history.tsx"),
  route("start", "routes/home.start.tsx"),

  //display
  route("display", "routes/display.tsx"),
  route("display/draft", "routes/display.draft.tsx"),
  route("display/tournament", "routes/display.tournament.tsx"), 

  //other
  route("draft", "routes/draft.tsx"),
  route("scores", "routes/scores.tsx"),
] satisfies RouteConfig;
