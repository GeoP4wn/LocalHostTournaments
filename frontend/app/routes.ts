import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("display", "routes/display.tsx"),
  route("draft", "routes/draft.tsx"),
  route("scores", "routes/scores.tsx")
] satisfies RouteConfig;
