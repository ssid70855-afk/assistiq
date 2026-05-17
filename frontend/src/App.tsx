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
  const [transcript, setTranscript] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([3,5,3,7,5,3,8,4,6,3]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const waveformRef = useRef<any>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === activeSession);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, activeSession]);

  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? "#0a0a0a" : "#ffffff";
  }, [darkMode]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (recording) {
      waveformRef.current = setInterval(() => {
        setWaveform(Array.from({ length: 10 }, () => Math.floor(Math.random() * 12) + 2));
      }, 120);
    } else {
      clearInterval(waveformRef.current);
      setWaveform([3,5,3,7,5,3,8,4,6,3]);
    }
    return () => clearInterval(waveformRef.current);
  }, [recording]);

  function newSession() {
    const id = crypto.randomUUID();
    setSessions(prev => [{ id, title: "New chat", messages: [] }, ...prev]);
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
      await axios.post(`${API}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
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
    setTranscript("");
    const session = sessions.find(s => s.id === activeSession)!;
    const userMsg: Message = { role: "user", content: text };
    const isFirst = session.messages.length === 0;
    const updated = [...session.messages, userMsg];
    updateSession(activeSession, updated, isFirst ? text.slice(0, 40) : undefined);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat?session_id=${activeSession}&user_message=${encodeURIComponent(text)}`);
      updateSession(activeSession, [...updated, { role: "ai", content: res.data.reply }]);
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
      const res = await axios.post(`${API}/upload`, formData);
      updateSession(activeSession, [...updated, { role: "ai", content: `✅ Loaded **${file.name}** (${res.data.chunks_stored} chunks). Ask me anything about it.` }]);
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
    const userMsg: Message = { role: "user", content: `🖼️ ${file.name}`, imageUrl };
    const updated = [...session.messages, userMsg];
    updateSession(activeSession, updated);
    try {
      const res = await axios.post(`${API}/image`, formData);
      updateSession(activeSession, [...updated, { role: "ai", content: res.data.reply }]);
    } catch {
      updateSession(activeSession, [...updated, { role: "ai", content: "Failed to analyze image." }]);
    }
    setLoading(false);
    e.target.value = "";
  }

  function toggleVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Try Chrome for voice input."); return; }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(interim);
      if (final) {
        setInput(final);
        setTranscript("");
        setRecording(false);
        setTimeout(() => sendMessage(final), 300);
      }
    };
    recognition.onerror = () => { setRecording(false); setTranscript(""); };
    recognition.onend = () => { setRecording(false); setTranscript(""); };
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
    <div style={{ minHeight: "100vh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem" }}>
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
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
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
    <div style={{ display: "flex", height: "100vh", background: bg, fontFamily: "sans-serif", color: text }}>
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: muted, gap: 8, marginTop: "20vh" }}>
              <div style={{ fontSize: 32 }}>✦</div>
              <p style={{ fontSize: 16, fontWeight: 500, color: text }}>How can I help you today?</p>
              <p style={{ fontSize: 14 }}>Type, speak, or upload a file to get started</p>
            </div>
          ) : currentSession.messages.map((m, i) => (
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
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7F77DD,#1D9E75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", flexShrink: 0 }}>✦</div>
              <div style={{ padding: "12px 16px", borderRadius: "4px 14px 14px 14px", background: surface, border: `1px solid ${border}`, display: "flex", gap: 4, alignItems: "center" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: muted, animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${border}` }}>
          {recording && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 12px", background: darkMode ? "#1a0a2e" : "#f0eeff", borderRadius: 10, border: `1px solid #534AB7` }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
                {waveform.map((h, i) => (
                  <div key={i} style={{ width: 3, height: h, background: "#7F77DD", borderRadius: 2, transition: "height 0.1s" }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: "#7F77DD", flex: 1 }}>{transcript || "Listening..."}</span>
              <button onClick={toggleVoice} style={{ background: "#534AB7", border: "none", color: "white", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}>Stop</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: inputBg, border: `1px solid ${recording ? "#534AB7" : border}`, borderRadius: 12, padding: "8px 10px", transition: "border-color 0.2s" }}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt" style={{ display: "none" }} />
            <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: "none" }} />
            <div ref={attachMenuRef} style={{ position: "relative", flexShrink: 0 }}>
              <button onClick={() => setShowAttachMenu(v => !v)} title="Attach file" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: showAttachMenu ? (darkMode ? "#2a2a2a" : "#e0e0e0") : "transparent", color: showAttachMenu ? "#7F77DD" : muted, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>📎</button>
              {showAttachMenu && (
                <div style={{ position: "absolute", bottom: 38, left: 0, background: darkMode ? "#1e1e1e" : "#ffffff", border: `1px solid ${border}`, borderRadius: 10, padding: "6px", minWidth: 180, zIndex: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                  <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: text, fontSize: 13, cursor: "pointer", borderRadius: 7, display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = darkMode ? "#2a2a2a" : "#f5f5f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <span>📄</span> Document (PDF / TXT)
                  </button>
                  <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: text, fontSize: 13, cursor: "pointer", borderRadius: 7, display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget.style.background = darkMode ? "#2a2a2a" : "#f5f5f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <span>🖼️</span> Image (PNG / JPG)
                  </button>
                </div>
              )}
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={recording ? "Listening..." : "Message Assistiq..."} rows={1} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: text, resize: "none", minHeight: 22, maxHeight: 120, lineHeight: 1.5, fontFamily: "sans-serif" }} />
            <button onClick={toggleVoice} title={recording ? "Stop recording" : "Voice input"} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: recording ? "#7F77DD" : "transparent", color: recording ? "white" : muted, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", animation: recording ? "pulse 1s infinite" : "none" }}>🎤</button>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: input.trim() ? "#534AB7" : border, color: "white", cursor: input.trim() ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 8 }}>Assistiq can make mistakes. Verify important info.</p>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} *{box-sizing:border-box;} body{margin:0;}`}</style>
    </div>
  );
}
