import { createBrowserRouter } from "react-router-dom";
import { App } from "./App";
import { TodayPage } from "../pages/today/TodayPage";

const StatsPage = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="text-5xl mb-3">📊</div>
      <p className="text-gray-400">Statistics page coming soon</p>
      <p className="text-xs text-gray-600 mt-2">(Angular module)</p>
    </div>
  </div>
);

const SettingsPage = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="text-5xl mb-3">⚙️</div>
      <p className="text-gray-400">Settings page coming soon</p>
      <p className="text-xs text-gray-600 mt-2">(Vue module)</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <TodayPage />,
      },
      {
        path: "stats",
        element: <StatsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);
