import InjectionPage from "./pages/Home/InjectionPage";
import DiseasePage from "./pages/Disease/DiseasePage";
import FeedPage from "./pages/Feed/FeedPage";
import CountPage from "./pages/Count/CountPage";
import CattleDetailsPage from "./pages/CattleDetails/CattleDetailsPage";

export const routes = [
    {
        path: "/",
        element: InjectionPage,
        name: "Injection",
    },
    {
        path: "/disease",
        element: DiseasePage,
        name: "Disease Detection",
    },
    {
        path: "/feed",
        element: FeedPage,
        name: "Feed",
    },
    {
        path: "/count",
        element: CountPage,
        name: "Count",
    },
    {
        path: "/cattle/:id",
        element: CattleDetailsPage,
        name: "Cattle Details",
    },
];