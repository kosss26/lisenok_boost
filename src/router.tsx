import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Shell } from "./screens/shell";
import { Title } from "./screens/title";
import { WorldMap } from "./screens/world-map";
import { Forest } from "./screens/forest";
import { StopScreen } from "./screens/stop";
import { Album } from "./screens/album";
import { Practice, PracticeLesson } from "./screens/practice";
import { NotFound, RouteError } from "./screens/recovery";
import { Glade } from "./screens/glade";

const root = createRootRoute({
  component: Shell,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});
const title = createRoute({ getParentRoute: () => root, path: "/", component: Title });
const map = createRoute({ getParentRoute: () => root, path: "/map", component: WorldMap });
const forest = createRoute({ getParentRoute: () => root, path: "/forest", component: Forest });
export const stopRoute = createRoute({
  getParentRoute: () => root,
  path: "/forest/$stopId",
  component: StopScreen,
});
const glade = createRoute({ getParentRoute: () => root, path: "/glade", component: Glade });
const practice = createRoute({
  getParentRoute: () => root,
  path: "/practice",
  component: Practice,
});
const practiceLesson = createRoute({
  getParentRoute: () => root,
  path: "/practice/$skill",
  component: PracticeLesson,
});
const album = createRoute({ getParentRoute: () => root, path: "/album", component: Album });

export const router = createRouter({
  routeTree: root.addChildren([
    title,
    map,
    forest,
    stopRoute,
    glade,
    album,
    practice,
    practiceLesson,
  ]),
  defaultPreload: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
