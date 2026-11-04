import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./components/Login";
import ActivitiesPage from "./components/ActivitiesPage";

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="loading">Učitavanje...</div>;
  if (!user) return <Login />;

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Planer</span>
        <nav className="tabs">
          <button className="tab active">Aktivnosti</button>
        </nav>
        <span className="spacer" />
        <span className="muted small user-name">{user.username}</span>
        <button className="btn small" onClick={logout}>
          Odjava
        </button>
      </header>
      <main className="main">
        <ActivitiesPage />
      </main>
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
