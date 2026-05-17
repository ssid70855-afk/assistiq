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

function TypingMessage({ content }: { content: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(content.slice(0, i));
      if (i >= content.length) { clearInterval(iv); setDone(true); }
    }, 12);
    return () => clearInterval(iv);
  }, [content]);
  return <span>{displayed}{!done && <span style={{ display: "inline-block", width: 2, height: "1em", background: "#7F77DD", marginLeft: 1, verticalAlign: "middle", animation: "blink 1s infinite" }} />}</span>;
}

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
  const [shareMsg, setShareMsg] = useState("");
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

  function shareChat() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(""), 2000);
    });
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
    const updated = [...session.messages, { role: "user" as const, content: `📄 Uploaded: ${file.name}` }];
    updateSession(activeSession, updated);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      updateSession(activeSession, [...updated, { role: "ai", content: `✅ Loaded ${file.name} (${res.data.chunks_stored} chunks). Ask me anything about it.` }]);
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
    const updated = [...session.messages, { role: "user" as const, content: `🖼️ ${file.name}`, imageUrl }];
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
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(interim);
      if (final) { setInput(final); setTranscript(""); setRecording(false); setTimeout(() => sendMessage(final), 300); }
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
  const muted = darkMode ? "#666" : "#888";
  const inputBg = darkMode ? "#1a1a1a" : "#f0f0f0";

  const LogoMark = () => (
    <div style={{ width: 30, height: 30, borderRadius: 9, background: "#111", border: `1px solid #2a2a2a`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="#534AB7" strokeWidth="1.3"/>
        <circle cx="8" cy="8" r="2" fill="#7F77DD"/>
        <line x1="8" y1="2.5" x2="8" y2="0.5" stroke="#1D9E75" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="8" y1="13.5" x2="8" y2="15.5" stroke="#1D9E75" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="2.5" y1="8" x2="0.5" y2="8" stroke="#1D9E75" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="13.5" y1="8" x2="15.5" y2="8" stroke="#1D9E75" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </div>
  );

  const WaveIcon = ({ active }: { active: boolean }) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18 }}>
      {waveform.map((h, i) => (
        <div key={i} style={{ width: 3, borderRadius: 2, background: active ? "#7F77DD" : muted, height: active ? h : [4,7,5,9,6,4,8,5,7,4][i], transition: "height 0.1s" }} />
      ))}
    </div>
  );

  if (page === "landing") return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ececec", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid #1e1e1e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Assistiq</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setAuthMode("login"); setPage("auth"); }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", color: "#ececec", fontSize: 13, cursor: "pointer" }}>Log in</button>
          <button onClick={() => { setAuthMode("signup"); setPage("auth"); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#534AB7", color: "white", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Get started →</button>
        </div>
      </nav>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 32px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, border: "1px solid #2a2a2a", background: "#111", fontSize: 12, color: "#666", marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75" }} />
          Powered by Llama 3.3 · Free forever
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.12, letterSpacing: "-1.5px", marginBottom: 18, maxWidth: 580 }}>
          The AI that <span style={{ color: "#7F77DD" }}>thinks</span> with you,<br />not <span style={{ color: "#1D9E75" }}>for</span> you
        </h1>
        <p style={{ fontSize: 16, color: "#555", maxWidth: 400, lineHeight: 1.65, marginBottom: 36 }}>
          Chat naturally. Upload docs and images. Speak your thoughts. Assistiq remembers the context.
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 56 }}>
          <button onClick={() => { setAuthMode("signup"); setPage("auth"); }} style={{ padding: "11px 26px", borderRadius: 10, background: "#534AB7", color: "white", border: "none", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>Start chatting free →</button>
          <button onClick={() => { setAuthMode("login"); setPage("auth"); }} style={{ padding: "11px 26px", borderRadius: 10, background: "transparent", color: "#ececec", border: "1px solid #2a2a2a", fontSize: 15, cursor: "pointer" }}>Log in</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 600, width: "100%" }}>
          {[
            { label: "// voice input", val: "listen", str: '"en-US"' },
            { label: "// ai response", val: "stream", str: "reply" },
            { label: "// file context", val: "load", str: '"doc.pdf"' },
            { label: "// image vision", val: "analyze", str: "img" },
            { label: "// share chat", val: "copy", str: "link" },
            { label: "// dark mode", val: "toggle", str: "theme" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "12px 14px", textAlign: "left" }}>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 6, fontFamily: "monospace" }}>{c.label}</div>
              <div style={{ fontSize: 13, fontFamily: "monospace" }}>
                <span style={{ color: "#7F77DD" }}>{c.val}</span>
                <span style={{ color: "#444" }}>(</span>
                <span style={{ color: "#1D9E75" }}>{c.str}</span>
                <span style={{ color: "#444" }}>)</span>
                {i === 0 && <span style={{ display: "inline-block", width: 2, height: "1em", background: "#7F77DD", marginLeft: 1, verticalAlign: "middle", animation: "blink 1s infinite" }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );

  if (page === "auth") return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ width: 360, background: surface, borderRadius: 16, padding: "2rem", border: `1px solid ${border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, justifyContent: "center" }}>
          <LogoMark />
          <span style={{ fontSize: 18, fontWeight: 600, color: text }}>Assistiq</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: text, textAlign: "center", marginBottom: 4 }}>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p style={{ color: muted, textAlign: "center", fontSize: 14, marginBottom: 24 }}>{authMode === "login" ? "Sign in to continue" : "Free forever, no card needed"}</p>
        {error && <div style={{ background: error.includes("created") ? "#0f2a1a" : "#2a0f0f", color: error.includes("created") ? "#4ade80" : "#f87171", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, marginBottom: 10, outline: "none", boxSizing: "border-box" }} />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" onKeyDown={e => e.key === "Enter" && handleAuth()} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, marginBottom: 16, outline: "none", boxSizing: "border-box" }} />
        <button onClick={handleAuth} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#534AB7", color: "white", border: "none", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>{authMode === "login" ? "Sign in" : "Create account"}</button>
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
            <LogoMark />
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
        <div style={{ padding: "10px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{currentSession?.title || "Select a chat"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {shareMsg && <span style={{ fontSize: 12, color: "#1D9E75" }}>{shareMsg}</span>}
            <button onClick={shareChat} title="Share chat link" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
              🔗 Share
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!currentSession || currentSession.messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: muted, gap: 8, marginTop: "20vh" }}>
              <LogoMark />
              <p style={{ fontSize: 16, fontWeight: 500, color: text, marginTop: 8 }}>How can I help you today?</p>
              <p style={{ fontSize: 14 }}>Type, speak, or upload a file to get started</p>
            </div>
          ) : currentSession.messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: m.role === "ai" ? "transparent" : "#534AB7", color: "white", border: m.role === "ai" ? `1px solid ${border}` : "none" }}>
                {m.role === "ai" ? <LogoMark /> : (email ? email[0].toUpperCase() : "U")}
              </div>
              <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 6 }}>
                {m.imageUrl && <img src={m.imageUrl} alt="uploaded" style={{ maxWidth: 200, borderRadius: 10, border: `1px solid ${border}` }} />}
                <div style={{ padding: "9px 13px", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: m.role === "user" ? "#534AB7" : surface, color: m.role === "user" ? "white" : text, fontSize: 14, lineHeight: 1.6, border: m.role === "ai" ? `1px solid ${border}` : "none", whiteSpace: "pre-wrap" }}>
                  {m.role === "ai" && i === (currentSession?.messages.length ?? 0) - 1 && !loading
                    ? <TypingMessage content={m.content} />
                    : m.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0 }}><LogoMark /></div>
              <div style={{ padding: "12px 16px", borderRadius: "4px 14px 14px 14px", background: surface, border: `1px solid ${border}`, display: "flex", gap: 4, alignItems: "center" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: muted, animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${border}` }}>
          {recording && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 12px", background: darkMode ? "#1a0a2e" : "#f0eeff", borderRadius: 10, border: "1px solid #534AB7" }}>
              <WaveIcon active={true} />
              <span style={{ fontSize: 13, color: "#7F77DD", flex: 1 }}>{transcript || "Listening..."}</span>
              <button onClick={toggleVoice} style={{ background: "#534AB7", border: "none", color: "white", borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}>Stop</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: inputBg, border: `1px solid ${recording ? "#534AB7" : border}`, borderRadius: 12, padding: "8px 10px", transition: "border-color 0.2s" }}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt" style={{ display: "none" }} />
            <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: "none" }} />
            <div ref={attachMenuRef} style={{ position: "relative", flexShrink: 0 }}>
              <button onClick={() => setShowAttachMenu(v => !v)} title="Attach file" style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: showAttachMenu ? (darkMode ? "#2a2a2a" : "#e0e0e0") : "transparent", color: showAttachMenu ? "#7F77DD" : muted, cursor: "pointer", fontSize: 20, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
              {showAttachMenu && (
                <div style={{ position: "absolute", bottom: 38, left: 0, background: darkMode ? "#1e1e1e" : "#ffffff", border: `1px solid ${border}`, borderRadius: 10, padding: "6px", minWidth: 190, zIndex: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                  <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: text, fontSize: 13, cursor: "pointer", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = darkMode ? "#2a2a2a" : "#f5f5f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    📄 Document (PDF / TXT)
                  </button>
                  <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }} style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: text, fontSize: 13, cursor: "pointer", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = darkMode ? "#2a2a2a" : "#f5f5f5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    🖼️ Image (PNG / JPG)
                  </button>
                </div>
              )}
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={recording ? "Listening..." : "Message Assistiq..."} rows={1} style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: text, resize: "none", minHeight: 22, maxHeight: 120, lineHeight: 1.5, fontFamily: "sans-serif" }} />
            <button onClick={toggleVoice} title={recording ? "Stop recording" : "Voice input"} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: recording ? "#7F77DD" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
              <WaveIcon active={recording} />
            </button>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: input.trim() ? "#534AB7" : border, color: "white", cursor: input.trim() ? "pointer" : "default", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 8 }}>Assistiq can make mistakes. Verify important info.</p>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}} *{box-sizing:border-box;} body{margin:0;}`}</style>
    </div>
  );
}
