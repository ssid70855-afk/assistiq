import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "https://assistiq-sa09.onrender.com";
type Msg = { role: "user" | "bot"; text: string; time: string; id: number };
type Page = "landing" | "login" | "signup" | "chat";
type Chat = { id: string; title: string; messages: Msg[] };

let msgId = 0;
function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return { displayed, done };
}

function BotMessage({ text, isLatest }: { text: string; isLatest: boolean }) {
  const { displayed } = useTypewriter(isLatest ? text : "", 12);
  const content = isLatest ? displayed : text;
  return <span style={{ whiteSpace: "pre-wrap" }}>{content}{isLatest && displayed.length < text.length && <span style={{ opacity: 0.6, animation: "blink 0.8s infinite" }}>▋</span>}</span>;
}

function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #050508 0%, #0d0d1a 40%, #0a1628 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", color: "white", overflowX: "hidden" }}>
      {/* Animated background orbs */}
      <div style={{ position: "fixed", top: "10%", left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(62,207,142,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 3rem", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, background: "rgba(5,5,8,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 20px rgba(108,99,255,0.4)" }}>✦</div>
          <span style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(90deg, #6C63FF, #3ecf8e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.5px" }}>Assistiq</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onLogin} style={{ padding: "8px 20px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", fontSize: 14, transition: "all 0.2s" }}>Log in</button>
          <button onClick={onSignup} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", border: "none", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(108,99,255,0.35)" }}>Get Started Free</button>
        </div>
      </nav>

      <div style={{ textAlign: "center", padding: "7rem 2rem 5rem", position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.25)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: "#a89fff", marginBottom: "2rem" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ecf8e", display: "inline-block", boxShadow: "0 0 8px #3ecf8e" }} />
          Now powered by Llama 3.3 · Free forever
        </div>
        <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontWeight: 900, margin: "0 0 1.5rem", lineHeight: 1.05, letterSpacing: "-2px" }}>
          The AI that<br />
          <span style={{ background: "linear-gradient(90deg, #6C63FF 0%, #a78bfa 40%, #3ecf8e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>actually listens</span>
        </h1>
        <p style={{ fontSize: 19, color: "rgba(255,255,255,0.5)", maxWidth: 520, margin: "0 auto 3rem", lineHeight: 1.75 }}>
          Chat naturally. Upload your documents. Get brilliant answers. Assistiq thinks with you, not for you.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: "5rem" }}>
          <button onClick={onSignup} style={{ padding: "15px 36px", borderRadius: 14, background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", border: "none", color: "white", cursor: "pointer", fontSize: 16, fontWeight: 700, boxShadow: "0 8px 32px rgba(108,99,255,0.4)", letterSpacing: "-0.3px" }}>
            Start chatting free →
          </button>
          <button onClick={onLogin} style={{ padding: "15px 36px", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", cursor: "pointer", fontSize: 16, letterSpacing: "-0.3px" }}>
            Log in
          </button>
        </div>

        {/* Mock chat preview */}
        <div style={{ maxWidth: 580, margin: "0 auto", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "1.5rem", textAlign: "left" }}>
          {[
            { role: "user", text: "Summarize my Q4 report PDF" },
            { role: "bot", text: "Your Q4 report shows a 34% revenue increase with strong performance in APAC. Key highlights: ₹2.4Cr net profit, 18% customer growth, and product margin improvement of 6pts. Want me to dive deeper into any section?" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div style={{ background: m.role === "user" ? "linear-gradient(135deg, #6C63FF, #5a54e8)" : "rgba(255,255,255,0.06)", color: "white", padding: "10px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", maxWidth: "80%", fontSize: 14, lineHeight: 1.6 }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 2rem 8rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {[
          { icon: "🧠", title: "Memory", desc: "Remembers your full conversation context" },
          { icon: "📄", title: "Doc Q&A", desc: "Ask anything about your PDFs and text files" },
          { icon: "⚡", title: "Fast", desc: "Sub-second responses with Groq inference" },
          { icon: "🔒", title: "Private", desc: "Your data stays yours, always encrypted" },
          { icon: "🌙", title: "Dark Mode", desc: "Beautiful dark and light themes built-in" },
          { icon: "🆓", title: "Free", desc: "No credit card, no hidden limits" },
        ].map((f, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.4rem", transition: "border-color 0.2s" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 15 }}>{f.title}</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthPage({ mode, onSuccess, onSwitch, onBack }: { mode: "login" | "signup"; onSuccess: (email: string) => void; onSwitch: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true); setError("");
    try {
      await axios.post(`${API}/${mode}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      onSuccess(email);
    } catch { setError(mode === "login" ? "Invalid email or password." : "Account may already exist. Try logging in."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #050508 0%, #0d0d1a 50%, #0a1628 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: "1.5rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✦</div>
            <span style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(90deg, #6C63FF, #3ecf8e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Assistiq</span>
          </div>
          <h2 style={{ color: "white", fontSize: 24, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.5px" }}>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: 0 }}>{mode === "login" ? "Sign in to continue" : "Free forever, no card needed"}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2rem" }}>
          {error && <div style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff9090", marginBottom: "1rem" }}>{error}</div>}
          {[{ label: "Email", value: email, set: setEmail, type: "email", ph: "you@example.com" }, { label: "Password", value: password, set: setPassword, type: "password", ph: "••••••••" }].map((f, i) => (
            <div key={i} style={{ marginBottom: i === 0 ? "1rem" : "1.5rem" }}>
              <label style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder={f.ph} type={f.type}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
            </div>
          ))}
          <button onClick={submit} disabled={loading}
            style={{ width: "100%", padding: "13px", borderRadius: 10, background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", border: "none", color: "white", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 20px rgba(108,99,255,0.3)" }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: "1.5rem", marginBottom: 0 }}>
            {mode === "login" ? "No account? " : "Have an account? "}
            <span onClick={onSwitch} style={{ color: "#8b83ff", cursor: "pointer", fontWeight: 600 }}>{mode === "login" ? "Sign up free" : "Sign in"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatPage({ userEmail, onLogout }: { userEmail: string; onLogout: () => void }) {
  const [chats, setChats] = useState<Chat[]>([{ id: "1", title: "New chat", messages: [{ role: "bot", text: "👋 Hi! I'm Assistiq. Ask me anything or upload a document!", time: getTime(), id: msgId++ }] }]);
  const [activeChatId, setActiveChatId] = useState("1");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [latestBotMsgId, setLatestBotMsgId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId)!;
  const sessionId = activeChatId;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages, loading]);

  const newChat = () => {
    const id = Date.now().toString();
    const chat: Chat = { id, title: "New chat", messages: [{ role: "bot", text: "👋 Fresh start! What would you like to explore?", time: getTime(), id: msgId++ }] };
    setChats(c => [chat, ...c]);
    setActiveChatId(id);
    setUploadedFile("");
    inputRef.current?.focus();
  };

  const updateChat = (id: string, updater: (c: Chat) => Chat) => {
    setChats(prev => prev.map(c => c.id === id ? updater(c) : c));
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    const userMsgObj: Msg = { role: "user", text: userMsg, time: getTime(), id: msgId++ };
    updateChat(activeChatId, c => ({
      ...c,
      title: c.title === "New chat" ? userMsg.slice(0, 30) : c.title,
      messages: [...c.messages, userMsgObj]
    }));
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/chat?session_id=${sessionId}&user_message=${encodeURIComponent(userMsg)}`);
      const botId = msgId++;
      setLatestBotMsgId(botId);
      updateChat(activeChatId, c => ({ ...c, messages: [...c.messages, { role: "bot", text: data.reply, time: getTime(), id: botId }] }));
    } catch {
      updateChat(activeChatId, c => ({ ...c, messages: [...c.messages, { role: "bot", text: "⚠️ Something went wrong. Please try again.", time: getTime(), id: msgId++ }] }));
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await axios.post(`${API}/upload`, formData);
      setUploadedFile(file.name);
      const botId = msgId++;
      setLatestBotMsgId(botId);
      updateChat(activeChatId, c => ({ ...c, messages: [...c.messages, { role: "bot", text: `✅ "${file.name}" uploaded! ${data.chunks_stored} chunks indexed. Ask me anything about it!`, time: getTime(), id: botId }] }));
    } catch {
      updateChat(activeChatId, c => ({ ...c, messages: [...c.messages, { role: "bot", text: "❌ Upload failed. Please try again.", time: getTime(), id: msgId++ }] }));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const bg = darkMode ? "#0a0a0f" : "#f4f4f8";
  const sidebarBg = darkMode ? "#0d0d14" : "#ffffff";
  const chatBg = darkMode ? "#0f0f17" : "#fafafa";
  const bubbleBg = darkMode ? "#1c1c28" : "#efefef";
  const textColor = darkMode ? "#e8e8f0" : "#1a1a2e";
  const mutedColor = darkMode ? "#44445a" : "#aaa";
  const borderColor = darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const inputBg = darkMode ? "#16161f" : "#ffffff";

  return (
    <div style={{ display: "flex", height: "100vh", background: bg, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", color: textColor, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 248, background: sidebarBg, borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "1.2rem 1rem 0.8rem", borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
            <span style={{ fontSize: 17, fontWeight: 800, background: "linear-gradient(90deg, #6C63FF, #3ecf8e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Assistiq</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: "0.8rem" }}>
          <button onClick={newChat} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(62,207,142,0.1))", border: "1px solid rgba(108,99,255,0.2)", color: "#a89fff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            ✏️ New chat
          </button>
          <button onClick={() => fileRef.current?.click()} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "transparent", border: `1px solid ${borderColor}`, color: mutedColor, cursor: "pointer", fontSize: 13 }}>
            📎 Upload document
          </button>
          {uploadedFile && (
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: darkMode ? "rgba(62,207,142,0.08)" : "rgba(62,207,142,0.1)", border: "1px solid rgba(62,207,142,0.2)", fontSize: 11, color: "#3ecf8e" }}>
              📄 {uploadedFile.length > 26 ? uploadedFile.slice(0, 26) + "…" : uploadedFile}
            </div>
          )}
        </div>

        {/* Chat history */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0.8rem" }}>
          <p style={{ fontSize: 11, color: mutedColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, padding: "4px 4px 6px" }}>Recent</p>
          {chats.map(c => (
            <button key={c.id} onClick={() => setActiveChatId(c.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, background: c.id === activeChatId ? (darkMode ? "rgba(108,99,255,0.12)" : "rgba(108,99,255,0.08)") : "transparent", border: c.id === activeChatId ? "1px solid rgba(108,99,255,0.2)" : "1px solid transparent", color: c.id === activeChatId ? "#a89fff" : mutedColor, cursor: "pointer", fontSize: 13, textAlign: "left", marginBottom: 2, transition: "all 0.15s" }}>
              <span style={{ fontSize: 14 }}>💬</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{c.title}</span>
            </button>
          ))}
        </div>

        {/* Bottom user section */}
        <div style={{ padding: "0.8rem", borderTop: `1px solid ${borderColor}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
              {userEmail[0].toUpperCase()}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
              <p style={{ margin: 0, fontSize: 11, color: mutedColor }}>Free plan</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ flex: 1, padding: "7px", borderRadius: 8, background: "transparent", border: `1px solid ${borderColor}`, color: mutedColor, cursor: "pointer", fontSize: 12 }}>{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={onLogout} style={{ flex: 1, padding: "7px", borderRadius: 8, background: "transparent", border: `1px solid ${borderColor}`, color: mutedColor, cursor: "pointer", fontSize: 12 }}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: "0.9rem 1.5rem", borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: chatBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Assistiq</p>
              <p style={{ margin: 0, fontSize: 11, color: loading ? "#f59e0b" : uploading ? "#6C63FF" : "#3ecf8e" }}>
                {loading ? "● Thinking..." : uploading ? "● Uploading..." : "● Online"}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: mutedColor }}>{activeChat.title}</p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", display: "flex", flexDirection: "column", gap: 20, background: chatBg }}>
          {activeChat.messages.map((m, i) => (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp 0.25s ease forwards" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", maxWidth: "78%" }}>
                {m.role === "bot" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginBottom: 2 }}>✦</div>
                )}
                <div style={{
                  background: m.role === "user" ? "linear-gradient(135deg, #6C63FF 0%, #5551e8 100%)" : bubbleBg,
                  color: m.role === "user" ? "white" : textColor,
                  padding: "11px 16px",
                  borderRadius: m.role === "user" ? "16px 16px 3px 16px" : "16px 16px 16px 3px",
                  fontSize: 14,
                  lineHeight: 1.65,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  boxShadow: m.role === "user" ? "0 4px 16px rgba(108,99,255,0.25)" : "none",
                }}>
                  {m.role === "bot"
                    ? <BotMessage text={m.text} isLatest={m.id === latestBotMsgId} />
                    : <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
                  }
                </div>
              </div>
              <p style={{ margin: "4px 6px 0", fontSize: 10, color: mutedColor }}>{m.time}</p>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, animation: "fadeUp 0.25s ease forwards" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #3ecf8e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✦</div>
              <div style={{ background: bubbleBg, padding: "13px 18px", borderRadius: "16px 16px 16px 3px", display: "flex", gap: 5, alignItems: "center" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#6C63FF", animation: `bounce 1.2s ease-in-out infinite ${i*0.18}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding: "1rem 2rem 1.2rem", background: chatBg, borderTop: `1px solid ${borderColor}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: inputBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "6px 6px 6px 16px", boxShadow: "0 2px 20px rgba(0,0,0,0.15)", transition: "border-color 0.2s" }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Message Assistiq..."
              style={{ flex: 1, border: "none", background: "transparent", color: textColor, fontSize: 14, outline: "none", minWidth: 0 }} />
            <button onClick={() => fileRef.current?.click()} title="Upload file"
              style={{ width: 34, height: 34, borderRadius: 9, background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: "none", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              📎
            </button>
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ width: 34, height: 34, borderRadius: 9, background: input.trim() && !loading ? "linear-gradient(135deg, #6C63FF, #3ecf8e)" : (darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"), border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s", boxShadow: input.trim() ? "0 2px 12px rgba(108,99,255,0.3)" : "none" }}>
              ➤
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: mutedColor, margin: "8px 0 0" }}>Assistiq may make mistakes · Press Enter to send</p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={handleUpload} style={{ display: "none" }} />
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0);opacity:0.5} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(108,99,255,0.3); border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [userEmail, setUserEmail] = useState("");

  if (page === "landing") return <LandingPage onLogin={() => setPage("login")} onSignup={() => setPage("signup")} />;
  if (page === "login") return <AuthPage mode="login" onSuccess={e => { setUserEmail(e); setPage("chat"); }} onSwitch={() => setPage("signup")} onBack={() => setPage("landing")} />;
  if (page === "signup") return <AuthPage mode="signup" onSuccess={e => { setUserEmail(e); setPage("chat"); }} onSwitch={() => setPage("login")} onBack={() => setPage("landing")} />;
  return <ChatPage userEmail={userEmail} onLogout={() => setPage("landing")} />;
}