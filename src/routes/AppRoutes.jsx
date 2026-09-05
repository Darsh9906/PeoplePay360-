import Dashboard from "../pages/dashboard/Dashboard";

export const routes = [
  { path: "/", element: Dashboard },
];

export default function AppRoutes() {
  return <Dashboard />;
}
