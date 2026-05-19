import React, { useState, useEffect, useRef, useCallback } from "react";

// API URL (Your Render Backend)
const API = "https://assistiq-sa09.onrender.com";

// Design Tokens based on your "Minimalist Dark" Stitch Export
const theme = {
  bg: "#0A0A0A",          // Ultra dark background
  sidebar: "#111111",     // Slightly lighter sidebar
  surface: "#1A1A1A",     // Card/Bubble surface
  primary: "#7C3AED",     // Vibrant purple (Nexa Accent)
  border: "#262626",      // Subtle borders
  text: "#EDEDED",        // Main text
  muted: "#A1A1A1",       // Faded text
  userBubble: "#7C3AED",  // Purple for user
  aiBubble: "#1A1A1A",    // Dark grey for AI
};

// --- Interfaces ---
interface Message {
  role: "user" | "model";
  content: string;
}

interface Session {
  id: string;
  title: string;
}

// --- Main App Component ---
export default function App() {
  const [view, setView] = useState<"landing" | "auth" | "chat">("landing");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Auto-redirect if token exists
  useEffect(() => {
    if (token) setView("chat");
  }, [token]);

  // --- Auth Logic ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = isLogin ? "/login" : "/signup";
    const res = await fetch(`${API}${path}?email=${email}&password=${password}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      if (isLogin) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
        setView("chat");
      } else {
        alert("Account created! Please log in.");
        setIsLogin(true);
      }
    } else {
      alert(data.detail || "Error");
    }
  };

  // --- Chat Logic ---
  const loadSessions = useCallback(async () => {
    const res = await fetch(`${API}/sessions?email=${email}`);
    const data = await res.json();
    setSessions(data);
    if (data.length > 0 && !currentSession) setCurrentSession(data[0].id);
  }, [email, currentSession]);

  useEffect(() => {
    if (view === "chat" && email) loadSessions();
  }, [view, email, loadSessions]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat?session_id=${currentSession}&user_message=${encodeURIComponent(userMsg.content)}`, { method: "POST" });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "model", content: data.reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    const endpoint = type === 'image' ? '/image' : '/upload';
    const res = await fetch(`${API}${endpoint}`, { method: "POST", body: formData });
    const data = await res.json();
    if (type === 'image') setMessages(prev => [...prev, { role: "model", content: data.reply }]);
    else alert("PDF Context Loaded");
    setLoading(false);
  };

  const startVoice = () => {
    const Speech = (window as any).webkitSpeechRecognition;
    if (!Speech) return alert("Browser not supported");
    const rec = new Speech();
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  // --- Views ---
  if (view === "landing") return (
    <div style={{ background: theme.bg, height: "100vh", color: theme.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "4rem", marginBottom: "1rem" }}>Assistiq</h1>
      <p style={{ color: theme.muted, marginBottom: "2rem" }}>Minimalist Dark AI Intelligence</p>
      <button onClick={() => setView("auth")} style={{ padding: "12px 30px", background: theme.primary, border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontSize: "1rem" }}>Get Started</button>
    </div>
  );

  if (view === "auth") return (
    <div style={{ background: theme.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <form onSubmit={handleAuth} style={{ background: theme.surface, padding: "40px", borderRadius: "16px", width: "350px", border: `1px solid ${theme.border}` }}>
        <h2 style={{ color: theme.text, marginBottom: "20px" }}>{isLogin ? "Login" : "Sign Up"}</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", background: theme.bg, border: `1px solid ${theme.border}`, color: "white" }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", background: theme.bg, border: `1px solid ${theme.border}`, color: "white" }} />
        <button style={{ width: "100%", padding: "12px", background: theme.primary, border: "none", color: "white", borderRadius: "8px" }}>{isLogin ? "Enter" : "Create Account"}</button>
        <p onClick={() => setIsLogin(!isLogin)} style={{ color: theme.muted, marginTop: "20px", textAlign: "center", cursor: "pointer" }}>{isLogin ? "Need an account? Sign up" : "Have an account? Login"}</p>
      </form>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text, fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: "260px", background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", fontWeight: "bold", borderBottom: `1px solid ${theme.border}` }}>Assistiq</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {sessions.map(s => (
            <div key={s.id} onClick={() => setCurrentSession(s.id)} style={{ padding: "10px", borderRadius: "8px", cursor: "pointer", background: currentSession === s.id ? theme.surface : "transparent", marginBottom: "5px" }}>{s.title}</div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "40px 20% 100px 20%" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: "20px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", padding: "15px", borderRadius: "12px", background: m.role === "user" ? theme.userBubble : theme.aiBubble, border: m.role === "model" ? `1px solid ${theme.border}` : "none" }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div style={{ color: theme.muted }}>Typing...</div>}
        </div>

        {/* Input Area */}
        <div style={{ position: "fixed", bottom: "30px", left: "260px", right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "60%", background: theme.surface, borderRadius: "16px", border: `1px solid ${theme.border}`, display: "flex", alignItems: "center", padding: "10px 20px" }}>
             <button onClick={startVoice} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: isListening ? "red" : "white", marginRight: "10px" }}>🎙️</button>
             <label style={{ cursor: "pointer", marginRight: "10px" }}>📎
               <input type="file" hidden onChange={e => handleFileUpload(e, 'pdf')} />
             </label>
             <label style={{ cursor: "pointer", marginRight: "10px" }}>🖼️
               <input type="file" hidden accept="image/*" onChange={e => handleFileUpload(e, 'image')} />
             </label>
             <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Ask anything..." style={{ flex: 1, background: "none", border: "none", color: "white", outline: "none", fontSize: "1rem" }} />
             <button onClick={sendMessage} style={{ background: theme.primary, border: "none", color: "white", padding: "8px 15px", borderRadius: "8px", cursor: "pointer" }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
