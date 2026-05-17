import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://assistiq-sa09.onrender.com";

type Message = {
  role: "user" | "ai";
  content: string;
  imageUrl?: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

export default function App() {
  const [page, setPage] = useState<"landing" | "auth" | "chat">("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentSession = sessions.find(s => s.id === activeSession);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSession]);

  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? "#0a0a0a" : "#ffffff";
  }, [darkMode]);

  function newSession() {
    const id = crypto.randomUUID();
    const session: ChatSession = { id, title: "New chat", messages: [] };
    setSessions(prev => [session, ...prev]);
    setActiveSession(id);
  }

  function updateSession(id: string, messages: Message[], title?: string) {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, messages, title: title || s.title } : s
    ));
  }

  async function handleAuth() {
    setError("");
    try {
      if (authMode === "signup") {
        await axios.post(`${API}/signup?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        setAuthMode("login");
        setError("Account created! Please log in.");
        return;
      }
      const { data } = await axios.post(`${API}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      
      setPage("chat");
      newSession();
    } catch {
      setError(authMode === "signup" ? "Account may already exist. Try logging in." : "Invalid email or password.");
    }
  }

  async function sendMessage(msg?: string) {
    const text = msg || input.trim();
    if (!text || !activeSession) return;
    setInput("");
    const session = sessions.find(s => s.id === activeSession)!;
    const userMsg: Message = { role: "user", content: text };
    const isFirst = session.messages.length === 0;
    const updated = [...session.messages, userMsg];
    updateSession(activeSession, updated, isFirst ? text.slice(0, 40) : undefined);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/chat?session_id=${activeSession}&user_message=${encodeURIComponent(text)}`);
      const aiMsg: Message = { role: "ai", content: data.reply };
      updateSession(activeSession, [...updated, aiMsg]);
    } catch {
      updateSession(activeSession, [...updated, { role: "ai", content: "Sorry, something went wrong." }]);
    }
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    const session = sessions.find(s => s.id === activeSession)!;
    const userMsg: Message = { role: "user", content: `📄 Uploaded: ${file.name}` };
    const updated = [...session.messages, userMsg];
    updateSession(activeSession, updated);
    try {
      const { data } = await axios.post(`${API}/upload`, formData);
      const aiMsg: Message = { role: "ai", content: `✅ Got it! I've loaded **${file.name}** (${data.chunks_stored} chunks). Ask me anything about it.` };
      updateSession(activeSession, [...updated, aiMsg]);
    } catch {
      updateSession(activeSession, [...updated, { role: "ai", content: "Failed to upload file." }]);
    }
    setLoading(false);
    e.target.value = "";
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    const imageUrl = URL.createObjectURL(file);
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    const session = sessions.find(s => s.id === activeSession)!;
    const userMsg: Message = { role: "user", content: `🖼️ Uploaded image: ${file.name}`, imageUrl };
    const updated = [...session.messages, userMsg];
    updateSession(activeSession, updated);
    try {
      const { data } = await axios.post(`${API}/image`, formData);
      const aiMsg: Message = { role: "ai", content: data.reply };
      updateSession(activeSession, [...updated, aiMsg]);
    } catch {
      updateSession(activeSession, [...updated, { role: "ai", content: "Failed to analyze image." }]);
    }
    setLoading(false);
    e.target.value = "";
  }

  function toggleVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support voice input. Try Chrome.");
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setRecording(false);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  const bg = darkMode ? "#0a0a0a" : "#ffffff";
  const surface = darkMode ? "#141414" : "#f5f5f5";
  const border = darkMode ? "#2a2a2a" : "#e5e5e5";
  const text = darkMode ? "#ececec" : "#111111";
  const muted = darkMode ? "#888" : "#666";
  const inputBg = darkMode ? "#1a1a1a" : "#f0f0f0";

  if (page === "landing") return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", padding: "2rem" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7F77DD,#1D9E75)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <span style={{ color: "white", fontSize: 18 }}>✦</span>
      </div>
      <h1 style={{ fontSize: 40, fontWeight: 600, color: text, marginBottom: 12, textAlign: "center" }}>The AI that <span style={{ color: "#7F77DD" }}>actually listens</span></h1>
      <p style={{ color: muted, fontSize: 16, marginBottom: 32, textAlign: "center", maxWidth: 400 }}>Chat naturally. Upload documents and images. Get brilliant answers.</p>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => { setAuthMode("signup"); setPage("auth"); }} style={{ padding: "10px 24px", borderRadius: 10, background: "#534AB7", color: "white", border: "none", fontSize: 15, cursor: "pointer", fontWeight: 500 }}>Start chatting free →</button>
        <button onClick={() => { setAuthMode("login"); setPage("auth"); }} style={{ padding: "10px 24px", borderRadius: 10, background: "transparent", color: text, border: `1px solid ${border}`, fontSize: 15, cursor: "pointer" }}>Log in</button>
      </div>
    </div>
  );

  if (page === "auth") return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <div style={{ width: 360, background: surface, borderRadius: 16, padding: "2rem", border: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7F77DD,#1D9E75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 14 }}>✦</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: text }}>Assistiq</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: text, textAlign: "center", marginBottom: 4 }}>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p style={{ color: muted, textAlign: "center", fontSize: 14, marginBottom: 24 }}>{authMode === "login" ? "Sign in to continue" : "Free forever, no card needed"}</p>
        {error && <div style={{ background: error.includes("created") ? "#0f2a1a" : "#2a0f0f", color: error.includes("created") ? "#4ade80" : "#f87171", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, marginBottom: 10, outline: "none", boxSizing: "border-box" }} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" onKeyDown={e => e.key === "Enter" && handleAuth()} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, marginBottom: 16, outline: "none", boxSizing: "border-box" }} />
        <button onClick={handleAuth} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "linear-gradient(90deg,#534AB7,#1D9E75)", color: "white", border: "none", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{authMode === "login" ? "Sign in" : "Create account"}</button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: muted }}>
          {authMode === "login" ? "No account? " : "Have an account? "}
          <span onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(""); }} style={{ color: "#7F77DD", cursor: "pointer" }}>{authMode === "login" ? "Sign up free" : "Sign in"}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: bg, fontFamily: "var(--font-sans)", color: text }}>
      <div style={{ width: 220, background: surface, borderRight: `1px solid ${border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 12px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7F77DD,#1D9E75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 14 }}>✦</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Assistiq</span>
          </div>
          <button onClick={newSession} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${border}`, background: bg, color: text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>+ New chat</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
          {sessions.length === 0 && <p style={{ color: muted, fontSize: 12, padding: "8px 6px" }}>No chats yet</p>}
          {sessions.map(s => (
            <div key={s.id} onClick={() => setActiveSession(s.id)} style={{ padding: "7px 10px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: s.id === activeSession ? bg : "transparent", color: s.id === activeSession ? text : muted, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
          ))}
        </div>
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "white", flexShrink: 0 }}>
            {email ? email[0].toUpperCase() : "U"}
          </div>
          <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email || "User"}</span>
          <button onClick={() => setDarkMode(d => !d)} style={{ background: "transparent", border: "none", color: muted, cursor: "pointer", fontSize: 16, padding: 2 }}>{darkMode ? "☀️" : "🌙"}</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${border}`, fontSize: 14, fontWeight: 500 }}>
          {currentSession?.title || "Select a chat"}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!currentSession || currentSession.messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: muted, gap: 8 }}>
              <div style={{ fontSize: 32 }}>✦</div>
              <p style={{ fontSize: 16, fontWeight: 500, color: text }}>How can I help you today?</p>
              <p style={{ fontSize: 14 }}>Type, speak, or upload a file to get started</p>
            </div>
          ) : (
            currentSession.messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: m.role === "ai" ? "linear-gradient(135deg,#7F77DD,#1D9E75)" : "#534AB7", color: "white" }}>
                  {m.role === "ai" ? "✦" : (email ? email[0].toUpperCase() : "U")}
                </div>
                <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 6 }}>
                  {m.imageUrl && <img src={m.imageUrl} alt="uploaded" style={{ maxWidth: 200, borderRadius: 10, border: `1px solid ${border}` }} />}
                  <div style={{ padding: "9px 13px", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: m.role === "user" ? "#534AB7" : surface, color: m.role === "user" ? "white" : text, fontSize: 14, lineHeight: 1.6, border: m.role === "ai" ? `1px solid ${border}` : "none", whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7F77DD,#1D9E75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", flexShrink: 0 }}>✦</div>
              <div style={{ padding: "12px 16px", borderRadius: "4px 14px 14px 14px", background: surface, border: `1px solid ${border}`, display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: muted, animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: inputBg, border: `1px solid ${border}`, borderRadius: 12, padding: "8px 10px" }}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt" style={{ display: "none" }} />
            <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} title="Upload PDF/TXT" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: muted, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📄</button>
            <button onClick={() => imageInputRef.current?.click()} title="Upload Image" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: muted, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🖼️</button>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message Assistiq..." rows={1} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: text, resize: "none", minHeight: 22, maxHeight: 120, lineHeight: 1.5, fontFamily: "var(--font-sans)" }} />
            <button onClick={toggleVoice} title={recording ? "Stop recording" : "Voice input"} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: recording ? "#7F77DD" : "transparent", color: recording ? "white" : muted, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>🎤</button>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: input.trim() ? "#534AB7" : border, color: "white", cursor: input.trim() ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 8 }}>Assistiq can make mistakes. Verify important info.</p>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} } * { box-sizing: border-box; } body { margin: 0; }`}</style>
    </div>
  );
}
