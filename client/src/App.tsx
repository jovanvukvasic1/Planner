import { useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./components/Login";
import ActivitiesPage from "./components/ActivitiesPage";
import PlannerPage from "./components/planner/PlannerPage";

type Tab = "planner" | "activities";
const TAB_KEY = "planer_tab";

const TABS: [Tab, string][] = [
  ["planner", "Kalendar"],
  ["activities", "Aktivnosti"],
];

function initialTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === "activities" ? "activities" : "planner";
  } catch {
    return "planner";
  }
}

function Shell() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);

  if (loading) return <div className="loading">Učitavanje...</div>;
  if (!user) return <Login />;

  const changeTab = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* nedostupno */
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Planer</span>
        <nav className="tabs">
          {TABS.map(([t, label]) => (
            <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => changeTab(t)}>
              {label}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        <span className="muted small user-name">{user.username}</span>
        <button className="btn small" onClick={logout}>
          Odjava
        </button>
      </header>
      <main className="main">{tab === "planner" ? <PlannerPage /> : <ActivitiesPage />}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
