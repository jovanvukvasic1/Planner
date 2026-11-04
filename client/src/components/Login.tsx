import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.auth
      .status()
      .then((s) => {
        setRegistrationOpen(s.registrationOpen);
        if (s.registrationOpen) setMode("register");
      })
      .catch(() => {});
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Planer</h1>
        <p className="muted">
          {mode === "login" ? "Prijavi se na svoj planer" : "Napravi nalog. Prvi korisnik postaje vlasnik planera."}
        </p>
        <label>
          Korisničko ime
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} autoFocus />
        </label>
        <label>
          Lozinka
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy}>
          {mode === "login" ? "Prijava" : "Registracija"}
        </button>
        {registrationOpen && (
          <button type="button" className="link-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Nemaš nalog? Registruj se" : "Već imaš nalog? Prijavi se"}
          </button>
        )}
      </form>
    </div>
  );
}
