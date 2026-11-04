import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("provjeravam...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setStatus(d.status === "ok" ? "server radi" : "greska"))
      .catch(() => setStatus("server nije dostupan"));
  }, []);

  return (
    <main className="app">
      <h1>Planer</h1>
      <p>Status: {status}</p>
    </main>
  );
}
