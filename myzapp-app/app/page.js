"use client";
import { useState } from 'react';

export default function Home() {
  const [session, setSession] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session.startsWith("RGNK~")) {
      setStatus({ type: "error", message: "Session invalide. Elle doit commencer par RGNK~" });
      return;
    }
    
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("https://myzapp-bot.onrender.com/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStatus({ type: "success", message: data.message });
        setSession("");
      } else {
        setStatus({ type: "error", message: data.error || "Erreur serveur" });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Erreur de connexion au serveur (Assurez-vous que le bot tourne bien sur l'URL de production)" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="card">
        <h1>MyZapp Panel</h1>
        <p className="subtitle">Ajoutez et authentifiez une nouvelle session au bot Raganork de manière sécurisée.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Ex: RGNK~QzuUU3iC" 
              value={session}
              onChange={(e) => setSession(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          
          {status && (
            <div className={`alert ${status.type}`}>
              {status.message}
            </div>
          )}

          <button type="submit" disabled={loading || !session}>
            {loading ? "Enregistrement..." : "Ajouter la session"}
          </button>
        </form>
      </div>
    </main>
  );
}
