import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

type Message = { role: "user" | "ai"; content: string; imageUrl?: string; };
type ChatSession = { id: string; title: string; messages: Message[]; createdAt: number; };

function TypingMessage({ content }: { content: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false); let i = 0;
    const iv = setInterval(() => { i++; setDisplayed(content.slice(0, i)); if (i >= content.length) { clearInterval(iv); setDone(true); } }, 10);
    return () => clearInterval(iv);
  }, [content]);
  return <span>{displayed}{!done && <span style={{ display: "inline-block", width: 2, height: "1em", background: "#cc785c", marginLeft: 1, verticalAlign: "middle", animation: "blink 1s infinite" }} />}</span>;
}

const MicIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke={active ? "#cc785c" : "currentColor"} strokeWidth="1.8" fill={active ? "rgba(204,120,92,0.15)" : "none"} />
    <path d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11" stroke={active ? "#cc785c" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" stroke={active ? "#cc785c" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="8" y1="22" x2="16" y2="22" stroke={active ? "#cc785c" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AttachIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LogoIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#cc785c" />
    <path d="M8 20C8 20 10 12 16 12C22 12 24 20 24 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="10" r="2.5" fill="white" />
    <path d="M11 20C11 20 12 24 16 24C20 24 21 20 21 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

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
  const [shareMsg, setShareMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === activeSession);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sessions, activeSession, loading]);
  useEffect(() => { document.body.style.margin = "0"; document.body.style.backgroundColor = darkMode ? "#1a1a1a" : "#f9f6f1"; }, [darkMode]);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  function newSession() {
    const id = crypto.randomUUID();
    setSessions(prev => [{ id, title: "New conversation", messages: [], createdAt: Date.now() }, ...prev]);
    setActiveSession(id);
  }

  function updateSession(id: string, messages: Message[], title?: string) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, messages, title: title || s.title } : s));
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession === id) setActiveSession("");
  }

  async function handleAuth() {
    setError("");
    try {
      if (authMode === "signup") {
        await axios.post(`${API}/signup?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        setAuthMode("login"); setError("Account created! Please log in."); return;
      }
      await axios.post(`${API}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      setPage("chat"); newSession();
    } catch { setError(authMode === "signup" ? "Account may already exist." : "Invalid email or password."); }
  }

  async function sendMessage(msg?: string) {
    const text = msg || input.trim();
    if (!text || !activeSession || loading) return;
    setInput(""); setTranscript("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    const session = sessions.find(s => s.id === activeSession)!;
    const isFirst = session.messages.length === 0;
    const updated = [...session.messages, { role: "user" as const, content: text }];
    updateSession(activeSession, updated, isFirst ? text.slice(0, 40) : undefined);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat?session_id=${activeSession}&user_message=${encodeURIComponent(text)}`);
      updateSession(activeSession, [...updated, { role: "ai", content: res.data.reply }]);
    } catch { updateSession(activeSession, [...updated, { role: "ai", content: "Something went wrong. Please try again." }]); }
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    const session = sessions.find(s => s.id === activeSession)!;
    const updated = [...session.messages, { role: "user" as const, content: `📄 ${file.name}` }];
    updateSession(activeSession, updated);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      updateSession(activeSession, [...updated, { role: "ai", content: `I've loaded **${file.name}** (${res.data.chunks_stored} chunks indexed). Ask me anything about it!` }]);
    } catch { updateSession(activeSession, [...updated, { role: "ai", content: "Failed to upload. Please try again." }]); }
    setLoading(false); e.target.value = "";
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    const imageUrl = URL.createObjectURL(file);
    setLoading(true);
    const session = sessions.find(s => s.id === activeSession)!;
    const updated = [...session.messages, { role: "user" as const, content: `🖼️ ${file.name}`, imageUrl }];
    updateSession(activeSession, updated);
    updateSession(activeSession, [...updated, { role: "ai", content: "Image received! Vision endpoint not set up yet — but I can help with anything else." }]);
    setLoading(false); e.target.value = "";
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input."); return; }
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(interim);
      if (final) { setInput(final); setTranscript(""); setRecording(false); setTimeout(() => sendMessage(final), 300); }
    };
    r.onerror = () => { setRecording(false); setTranscript(""); };
    r.onend = () => { setRecording(false); setTranscript(""); };
    recognitionRef.current = r; r.start(); setRecording(true);
  }

  const dm = darkMode;
  const bg = dm ? "#1a1a1a" : "#f9f6f1";
  const sidebar = dm ? "#111111" : "#eeebe4";
  const surface = dm ? "#222222" : "#ffffff";
  const border = dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const text = dm ? "#ececec" : "#1a1a1a";
  const muted = dm ? "#666" : "#999";
  const inputBg = dm ? "#2a2a2a" : "#ffffff";
  const accent = "#cc785c";
  const userBubble = dm ? "#2f2f2f" : "#f0ece4";

  const todayChats = sessions.filter(s => Date.now() - s.createdAt < 86400000);
  const olderChats = sessions.filter(s => Date.now() - s.createdAt >= 86400000);

  if (page === "landing") return (
    <div style={{ minHeight: "100vh", background: dm ? "#1a1a1a" : "#f9f6f1", color: text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 48px", borderBottom: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoIcon size={28} />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>Assistiq</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setDarkMode(d => !d)} style={{ background: "transparent", border: `1px solid ${border}`, color: muted, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>{dm ? "☀️" : "🌙"}</button>
          <button onClick={() => { setAuthMode("login"); setPage("auth"); }} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: text, fontSize: 14, cursor: "pointer" }}>Log in</button>
          <button onClick={() => { setAuthMode("signup"); setPage("auth"); }} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: accent, color: "white", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>Get started</button>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "100px 32px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, border: `1px solid ${border}`, background: dm ? "#222" : "#eeebe4", fontSize: 13, color: muted, marginBottom: 32 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2ecc71" }} />
          Powered by Llama 3.3 · Completely free
        </div>
        <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 3.8rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 20 }}>
          Meet <span style={{ color: accent }}>Assistiq</span>,<br />your AI companion
        </h1>
        <p style={{ fontSize: 17, color: muted, lineHeight: 1.75, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
          Chat naturally, upload documents, use your voice. Assistiq remembers your conversations and helps you think more clearly.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 80 }}>
          <button onClick={() => { setAuthMode("signup"); setPage("auth"); }} style={{ padding: "13px 32px", borderRadius: 10, background: accent, color: "white", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Start for free →</button>
          <button onClick={() => { setAuthMode("login"); setPage("auth"); }} style={{ padding: "13px 32px", borderRadius: 10, background: "transparent", color: text, border: `1px solid ${border}`, fontSize: 16, cursor: "pointer" }}>Sign in</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { icon: "💬", title: "Conversation memory", desc: "Remembers the full context of your chat" },
            { icon: "📄", title: "Document Q&A", desc: "Upload PDFs and ask questions about them" },
            { icon: "🎤", title: "Voice input", desc: "Speak naturally using Chrome's mic API" },
            { icon: "🌙", title: "Dark & light mode", desc: "Beautiful in any lighting condition" },
            { icon: "⚡", title: "Ultra fast", desc: "Sub-second responses via Groq inference" },
            { icon: "🔒", title: "Private & secure", desc: "Your data never leaves your account" },
          ].map((f, i) => (
            <div key={i} style={{ background: dm ? "#222" : "#fff", border: `1px solid ${border}`, borderRadius: 14, padding: "1.2rem", textAlign: "left" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
              <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14, color: text }}>{f.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: muted, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (page === "auth") return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ width: 380, background: surface, borderRadius: 20, padding: "2.5rem", border: `1px solid ${border}`, boxShadow: dm ? "0 8px 40px rgba(0,0,0,0.4)" : "0 8px 40px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><LogoIcon size={40} /></div>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: text, letterSpacing: "-0.5px" }}>{authMode === "login" ? "Welcome back" : "Create account"}</h2>
          <p style={{ margin: 0, fontSize: 14, color: muted }}>{authMode === "login" ? "Sign in to continue" : "Free forever · No credit card"}</p>
        </div>
        {error && <div style={{ background: error.includes("created") ? "rgba(46,204,113,0.1)" : "rgba(231,76,60,0.1)", border: `1px solid ${error.includes("created") ? "rgba(46,204,113,0.3)" : "rgba(231,76,60,0.3)"}`, color: error.includes("created") ? "#2ecc71" : "#e74c3c", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: muted, marginBottom: 6 }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: muted, marginBottom: 6 }}>Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" onKeyDown={e => e.key === "Enter" && handleAuth()} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={handleAuth} style={{ width: "100%", padding: "12px", borderRadius: 10, background: accent, color: "white", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{authMode === "login" ? "Sign in" : "Create account"}</button>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: muted, marginBottom: 0 }}>
          {authMode === "login" ? "No account? " : "Have an account? "}
          <span onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setError(""); }} style={{ color: accent, cursor: "pointer", fontWeight: 600 }}>{authMode === "login" ? "Sign up free" : "Sign in"}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: text, overflow: "hidden" }}>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width: 256, background: sidebar, borderRight: `1px solid ${border}`, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s" }}>
          <div style={{ padding: "14px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LogoIcon size={24} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>Assistiq</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: "transparent", border: "none", color: muted, cursor: "pointer", fontSize: 18, padding: 2, display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <button onClick={newSession} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${border}`, background: dm ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: text, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
              <PlusIcon /> New conversation
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
            {sessions.length === 0 && <p style={{ color: muted, fontSize: 12, padding: "8px 8px", textAlign: "center" }}>No conversations yet</p>}
            {todayChats.length > 0 && <>
              <p style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", padding: "8px 8px 4px" }}>Today</p>
              {todayChats.map(s => (
                <div key={s.id} onClick={() => setActiveSession(s.id)} style={{ padding: "8px 10px", borderRadius: 9, fontSize: 13, cursor: "pointer", background: s.id === activeSession ? (dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent", color: s.id === activeSession ? text : muted, marginBottom: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, transition: "background 0.15s" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>💬 {s.title}</span>
                  <span onClick={e => deleteSession(s.id, e)} style={{ opacity: 0, fontSize: 12, color: muted, flexShrink: 0 }} className="del">✕</span>
                </div>
              ))}
            </>}
            {olderChats.length > 0 && <>
              <p style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", padding: "12px 8px 4px" }}>Earlier</p>
              {olderChats.map(s => (
                <div key={s.id} onClick={() => setActiveSession(s.id)} style={{ padding: "8px 10px", borderRadius: 9, fontSize: 13, cursor: "pointer", background: s.id === activeSession ? (dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent", color: s.id === activeSession ? text : muted, marginBottom: 1, display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {s.title}</span>
                </div>
              ))}
            </>}
          </div>

          <div style={{ padding: "12px", borderTop: `1px solid ${border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white", flexShrink: 0 }}>{email ? email[0].toUpperCase() : "U"}</div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email || "User"}</p>
                <p style={{ margin: 0, fontSize: 11, color: muted }}>Free plan</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => setDarkMode(d => !d)} style={{ flex: 1, padding: "7px", borderRadius: 8, background: "transparent", border: `1px solid ${border}`, color: muted, cursor: "pointer", fontSize: 12 }}>{dm ? "☀️ Light" : "🌙 Dark"}</button>
              <button onClick={() => { setPage("landing"); setSessions([]); setActiveSession(""); }} style={{ flex: 1, padding: "7px", borderRadius: 8, background: "transparent", border: `1px solid ${border}`, color: muted, cursor: "pointer", fontSize: 12 }}>Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: bg }}>

        {/* Top bar */}
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: "transparent", border: "none", color: muted, cursor: "pointer", padding: 4, display: "flex" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            )}
            {!sidebarOpen && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><LogoIcon size={22} /><span style={{ fontSize: 15, fontWeight: 700 }}>Assistiq</span></div>}
            <span style={{ fontSize: 14, color: muted }}>{currentSession?.title || ""}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {shareMsg && <span style={{ fontSize: 12, color: "#2ecc71" }}>{shareMsg}</span>}
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); setShareMsg("Copied!"); setTimeout(() => setShareMsg(""), 2000); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>Share</button>
            <button onClick={newSession} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><PlusIcon /> New</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          {!currentSession || currentSession.messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: muted, gap: 12 }}>
              <LogoIcon size={48} />
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: text, letterSpacing: "-0.5px" }}>How can I help you today?</h2>
              <p style={{ margin: 0, fontSize: 15, color: muted }}>Type a message, use your voice, or upload a document</p>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 600, padding: "0 16px" }}>
                {["Summarize a PDF for me", "Help me write an email", "Explain a complex topic", "Brainstorm ideas with me"].map((s, i) => (
                  <button key={i} onClick={() => { if (activeSession) sendMessage(s); }} style={{ padding: "9px 16px", borderRadius: 20, border: `1px solid ${border}`, background: dm ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", color: text, fontSize: 13, cursor: "pointer" }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
              {currentSession.messages.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 14, flexDirection: "row", alignItems: "flex-start", animation: "fadeUp 0.2s ease forwards" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                    {m.role === "ai" ? <LogoIcon size={30} /> : (
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>{email ? email[0].toUpperCase() : "U"}</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: m.role === "ai" ? accent : text }}>{m.role === "ai" ? "Assistiq" : (email.split("@")[0] || "You")}</p>
                    {m.imageUrl && <img src={m.imageUrl} alt="uploaded" style={{ maxWidth: 280, borderRadius: 12, border: `1px solid ${border}`, marginBottom: 8, display: "block" }} />}
                    <div style={{ fontSize: 15, lineHeight: 1.7, color: text, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {m.role === "ai" && i === (currentSession?.messages.length ?? 0) - 1 && !loading
                        ? <TypingMessage content={m.content} />
                        : m.content}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", animation: "fadeUp 0.2s ease forwards" }}>
                  <LogoIcon size={30} />
                  <div style={{ marginTop: 8, display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: muted, animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px 20px", flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "10px 14px", background: dm ? "rgba(204,120,92,0.1)" : "rgba(204,120,92,0.08)", borderRadius: 12, border: `1px solid rgba(204,120,92,0.3)` }}>
                <MicIcon active={true} />
                <span style={{ fontSize: 13, color: accent, flex: 1 }}>{transcript || "Listening..."}</span>
                <button onClick={toggleVoice} style={{ background: accent, border: "none", color: "white", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Stop</button>
              </div>
            )}
            <div style={{ background: inputBg, border: `1px solid ${border}`, borderRadius: 16, boxShadow: dm ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "flex-end", padding: "12px 12px 10px" }}>
                <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message Assistiq..."
                  rows={1}
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 15, color: text, resize: "none", minHeight: 24, maxHeight: 200, lineHeight: 1.6, fontFamily: "inherit", padding: 0 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 10px" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt" style={{ display: "none" }} />
                  <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: "none" }} />
                  <div ref={attachMenuRef} style={{ position: "relative" }}>
                    <button onClick={() => setShowAttachMenu(v => !v)} title="Attach" style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: showAttachMenu ? (dm ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "transparent", color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AttachIcon />
                    </button>
                    {showAttachMenu && (
                      <div style={{ position: "absolute", bottom: 42, left: 0, background: dm ? "#2a2a2a" : "#ffffff", border: `1px solid ${border}`, borderRadius: 12, padding: "6px", minWidth: 200, zIndex: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                        <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: text, fontSize: 13, cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>📄 Document (PDF / TXT)</button>
                        <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: text, fontSize: 13, cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>🖼️ Image (PNG / JPG)</button>
                      </div>
                    )}
                  </div>
                  <button onClick={toggleVoice} title="Voice input" style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: recording ? "rgba(204,120,92,0.15)" : "transparent", color: recording ? accent : muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MicIcon active={recording} />
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: muted }}>Shift+Enter for new line</span>
                  <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                    style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: input.trim() && !loading ? accent : (dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"), color: input.trim() && !loading ? "white" : muted, cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 10 }}>Assistiq can make mistakes. Always verify important information.</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;} body{margin:0;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:4px;}
        button:hover{opacity:0.85;}
        .del:hover{opacity:1!important;}
      `}</style>
    </div>
  );
}
