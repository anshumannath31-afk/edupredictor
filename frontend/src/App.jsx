import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── API Layer ─────────────────────────────────────────────
const BASE_URL = 'https://edupredictor-api.onrender.com/api';
const getToken = () => localStorage.getItem('edu_token');
const apiHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});
const handleRes = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const api = {
  post: (url, body) => fetch(`${BASE_URL}${url}`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) }).then(handleRes),
  get: (url) => fetch(`${BASE_URL}${url}`, { headers: apiHeaders() }).then(handleRes),
  upload: (url, file) => {
    const fd = new FormData(); fd.append('file', file);
    return fetch(`${BASE_URL}${url}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd }).then(handleRes);
  }
};

// ─── Design Tokens ─────────────────────────────────────────
const C = {
  primary: "#4F6EF7", primaryDark: "#3451D1", primaryLight: "#EEF1FF",
  accent: "#7C3AED", accentLight: "#F3EEFF",
  success: "#10B981", successLight: "#D1FAE5",
  warning: "#F59E0B", warningLight: "#FEF3C7",
  danger: "#EF4444", dangerLight: "#FEE2E2",
  dark: "#0F172A", gray: "#64748B", grayLight: "#F1F5F9",
  border: "#E2E8F0", white: "#FFFFFF",
};
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');`;
const GS = `${FONTS}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'DM Sans',sans-serif;background:#F8FAFF;color:#0F172A;}
::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:#F1F5F9;}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;}
@keyframes fadeIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.03);}}
.fade-in{animation:fadeIn 0.45s ease forwards;}`;

// ─── Shared UI Components ───────────────────────────────────
const Badge = ({ bg, color, children, sm }) => (
  <span style={{ background: bg, color, padding: sm ? "2px 8px" : "4px 12px", borderRadius: 20, fontSize: sm ? 11 : 12, fontWeight: 600, letterSpacing: 0.3 }}>{children}</span>
);
const RiskBadge = ({ risk }) => {
  const m = { Low: [C.successLight, C.success], Medium: [C.warningLight, "#B45309"], High: [C.dangerLight, C.danger] };
  return <Badge bg={m[risk]?.[0] || C.grayLight} color={m[risk]?.[1] || C.gray}>{risk} Risk</Badge>;
};
const PredBadge = ({ pred }) => (
  <Badge bg={pred === "Pass" ? C.successLight : C.dangerLight} color={pred === "Pass" ? C.success : C.danger}>{pred}</Badge>
);

const Card = ({ children, style = {}, hover = true }) => {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, transition: "all 0.25s", boxShadow: h ? "0 8px 30px rgba(79,110,247,0.12)" : "0 2px 8px rgba(0,0,0,0.04)", transform: h ? "translateY(-2px)" : "none", ...style }}>
      {children}
    </div>
  );
};

const Btn = ({ children, onClick, variant = "primary", sm, icon, disabled, style = {}, type = "button" }) => {
  const [h, setH] = useState(false);
  const vs = {
    primary: { bg: h ? C.primaryDark : C.primary, color: "#fff", border: "none" },
    secondary: { bg: h ? C.primaryLight : "#F8FAFF", color: C.primary, border: `1px solid ${C.border}` },
    danger: { bg: h ? "#DC2626" : C.danger, color: "#fff", border: "none" },
    ghost: { bg: h ? C.primaryLight : "transparent", color: C.primary, border: "none" },
    success: { bg: h ? "#059669" : C.success, color: "#fff", border: "none" },
  };
  const v = vs[variant] || vs.primary;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: v.bg, color: v.color, border: v.border, padding: sm ? "8px 16px" : "11px 22px", borderRadius: 10, fontSize: sm ? 13 : 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", ...style }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}{children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder, icon, min, max, step, error, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>}
    <div style={{ position: "relative" }}>
      {icon && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>{icon}</span>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max} step={step}
        style={{ width: "100%", padding: icon ? "11px 14px 11px 38px" : "11px 14px", border: `1.5px solid ${error ? C.danger : C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: C.dark, background: "#FAFBFF", outline: "none" }}
        onFocus={e => e.target.style.borderColor = error ? C.danger : C.primary}
        onBlur={e => e.target.style.borderColor = error ? C.danger : C.border} />
    </div>
    {error && <span style={{ fontSize: 12, color: C.danger }}>{error}</span>}
  </div>
);

const ProgressBar = ({ value, max = 100, color = C.primary, label, showVal = true, animate }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ width: "100%" }}>
      {label && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        {showVal && <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}/{max}</span>}
      </div>}
      <div style={{ background: C.grayLight, borderRadius: 999, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${color},${color}cc)`, borderRadius: 999, transition: animate ? "width 1s cubic-bezier(0.34,1.56,0.64,1)" : "none" }} />
      </div>
    </div>
  );
};

const Spinner = ({ size = 24 }) => (
  <div style={{ width: size, height: size, border: `3px solid ${C.primaryLight}`, borderTop: `3px solid ${C.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
);

const Alert = ({ type = "info", children, onClose }) => {
  const m = { info: [C.primaryLight, C.primary, "ℹ️"], success: [C.successLight, C.success, "✅"], error: [C.dangerLight, C.danger, "❌"], warning: [C.warningLight, "#B45309", "⚠️"] };
  const [bg, color, icon] = m[type];
  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, color, fontWeight: 500 }}>{children}</span>
      {onClose && <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 16 }}>×</button>}
    </div>
  );
};

// ─── Auth Context ──────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── Sidebar ───────────────────────────────────────────────
const Sidebar = ({ page, setPage, user, onLogout }) => {
  const studentNav = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "data-entry", icon: "✏️", label: "Academic Data" },
    { id: "semesters", icon: "📅", label: "Semester History" },
    { id: "youtube", icon: "🎬", label: "YouTube Playlists" },
    { id: "schedule", icon: "🗓", label: "Study Schedule" },
    { id: "resources", icon: "📚", label: "Resources" },
    { id: "history", icon: "📋", label: "History" },
  ];
  const adminNav = [
    { id: "admin-overview", icon: "⊞", label: "Overview" },
    { id: "students", icon: "👥", label: "Students" },
    { id: "upload", icon: "⬆", label: "Upload Data" },
    { id: "analytics", icon: "📊", label: "Analytics" },
  ];
  const nav = user?.role === "admin" ? adminNav : studentNav;

  return (
    <div style={{ width: 240, minHeight: "100vh", background: C.dark, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎓</div>
          <div>
            <div style={{ color: "#fff", fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15 }}>EduPredictor</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{user?.role === "admin" ? "Admin Panel" : "Student Portal"}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, padding: "0 8px 10px", textTransform: "uppercase" }}>Menu</div>
        {nav.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: active ? `linear-gradient(135deg,${C.primary}22,${C.accent}22)` : "transparent", border: active ? `1px solid ${C.primary}33` : "1px solid transparent", color: active ? C.primary : "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: active ? 600 : 400, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", transition: "all 0.2s", textAlign: "left" }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: C.primary }} />}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{user?.name?.[0] || "U"}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          ← Logout
        </button>
      </div>
    </div>
  );
};

const TopBar = ({ title, subtitle }) => (
  <div style={{ padding: "18px 32px", background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div>
      <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 20, color: C.dark }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{subtitle}</p>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.success }} />
      <span style={{ fontSize: 12, color: C.gray }}>API Connected</span>
    </div>
  </div>
);

// ─── Landing Page ──────────────────────────────────────────
const LandingPage = ({ onGoLogin }) => {
  const feats = [
    { icon: "🔮", title: "AI Predictions", desc: "Accurate Pass/Fail predictions with confidence scores using Gradient Boosting ML." },
    { icon: "📊", title: "Smart Analytics", desc: "Subject-wise performance charts, risk distribution, and trend analysis." },
    { icon: "🎯", title: "Weak Area Detection", desc: "Auto-detect subjects needing attention with personalized improvement plans." },
    { icon: "📚", title: "Curated Resources", desc: "AI-matched study materials, videos, and practice sets for weak subjects." },
    { icon: "🏫", title: "Admin Dashboard", desc: "Upload bulk student data, monitor at-risk students, export reports." },
    { icon: "⚡", title: "Real-time API", desc: "Flask REST API with JWT auth, SQLite DB, and scikit-learn ML model." },
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFF" }}>
      <style>{GS}</style>
      <nav style={{ padding: "18px 60px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: C.dark }}>EduPredictor</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Btn variant="secondary" onClick={() => onGoLogin("student")}>Student Login</Btn>
          <Btn onClick={() => onGoLogin("admin")} icon="🏫">Admin Portal</Btn>
        </div>
      </nav>
      <div style={{ padding: "80px 60px 60px", background: `linear-gradient(135deg,${C.primaryLight} 0%,#F3EEFF 50%,${C.white} 100%)`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle,${C.primary}15,transparent 70%)`, pointerEvents: "none" }} />
        <div className="fade-in" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.primaryLight, border: `1px solid ${C.primary}33`, padding: "6px 16px", borderRadius: 999, marginBottom: 24 }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>Flask + scikit-learn + SQLite · Full-Stack AI Platform</span>
          </div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1.15, color: C.dark, marginBottom: 20, maxWidth: 680, margin: "0 auto 20px" }}>
            Predict Academic Success<br />
            <span style={{ background: `linear-gradient(135deg,${C.primary},${C.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>with Real AI</span>
          </h1>
          <p style={{ fontSize: 17, color: C.gray, maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.7 }}>Know your exam outcomes before results. ML-powered predictions, personalized guidance, and institutional analytics.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => onGoLogin("student")} icon="🚀" style={{ fontSize: 15, padding: "13px 28px" }}>Student Demo</Btn>
            <Btn variant="secondary" onClick={() => onGoLogin("admin")} style={{ fontSize: 15, padding: "13px 28px" }}>Admin Demo →</Btn>
          </div>
        </div>
        <div style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 56, flexWrap: "wrap" }}>
          {[["94%", "ML Accuracy"], ["5", "Demo Students"], ["9", "Study Resources"], ["Real-time", "API Predictions"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}><div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 28, color: C.primary }}>{v}</div><div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={{ padding: "64px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 32, color: C.dark }}>Full Stack Architecture</h2>
          <p style={{ color: C.gray, marginTop: 8, fontSize: 15 }}>React · Flask · SQLite · scikit-learn · JWT Auth</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, maxWidth: 960, margin: "0 auto" }}>
          {feats.map((f, i) => (
            <Card key={i}><div style={{ fontSize: 30, marginBottom: 12 }}>{f.icon}</div><div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div><div style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>{f.desc}</div></Card>
          ))}
        </div>
      </div>
      <div style={{ margin: "0 60px 60px", background: `linear-gradient(135deg,${C.primary},${C.accent})`, borderRadius: 24, padding: "48px 40px", textAlign: "center", color: "#fff" }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 30, marginBottom: 10 }}>Ready to try EduPredictor?</h2>
        <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 24 }}>Demo credentials: priya@demo.com · Student@123 &nbsp;|&nbsp; admin@edupredictor.com · Admin@123</p>
        <Btn onClick={() => onGoLogin("student")} style={{ background: "#fff", color: C.primary, fontSize: 15, padding: "12px 32px" }}>Launch Demo →</Btn>
      </div>
    </div>
  );
};

// ─── Login / Register Page ─────────────────────────────────
const AuthPage = ({ onAuth, hint }) => {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState(hint || "student");
  const [form, setForm] = useState({ name: "", email: hint === "admin" ? "admin@edupredictor.com" : "priya@demo.com", password: hint === "admin" ? "Admin@123" : "Student@123" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      let res;
      if (mode === "login") {
        res = await api.post("/auth/login", { email: form.email, password: form.password });
      } else {
        res = await api.post("/auth/register", { name: form.name, email: form.email, password: form.password, role });
      }
      localStorage.setItem("edu_token", res.token);
      onAuth(res.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.primaryLight},#F3EEFF)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{GS}</style>
      <div className="fade-in" style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>🎓</div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 26, color: C.dark }}>EduPredictor</h1>
          <p style={{ color: C.gray, fontSize: 14, marginTop: 6 }}>{mode === "login" ? "Sign in to continue" : "Create your account"}</p>
        </div>
        <Card style={{ padding: 32 }}>
          <div style={{ display: "flex", background: C.grayLight, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 700, background: mode === m ? C.white : "transparent", color: mode === m ? C.dark : C.gray, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", background: C.grayLight, borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
            {["student", "admin"].map(r => (
              <button key={r} onClick={() => { setRole(r); set("email", r === "admin" ? "admin@edupredictor.com" : "priya@demo.com"); set("password", r === "admin" ? "Admin@123" : "Student@123"); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 13, fontWeight: 600, background: role === r ? (r === "admin" ? C.accent : C.primary) : "transparent", color: role === r ? "#fff" : C.gray, border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                {r === "student" ? "🎒 Student" : "🏫 Admin"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <Input label="Full Name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your full name" icon="👤" required />}
            <Input label="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" icon="✉️" required />
            <Input label="Password" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" icon="🔒" required />
            {error && <Alert type="error" onClose={() => setError("")}>{error}</Alert>}
            <Btn onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px 0" }}>
              {loading ? <><Spinner size={18} /> Processing...</> : mode === "login" ? `Sign In as ${role}` : "Create Account"}
            </Btn>
          </div>
          <div style={{ background: C.grayLight, borderRadius: 10, padding: "10px 14px", marginTop: 16, fontSize: 12, color: C.gray }}>
            <strong>Demo credentials:</strong><br />
            Student: priya@demo.com · Student@123<br />
            Admin: admin@edupredictor.com · Admin@123
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Student Dashboard ─────────────────────────────────────
const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    api.get("/predictions/latest").then(d => {
      setData(d);
      setLoading(false);
      setTimeout(() => {
        if (d.record) {
          setProgress({
            Mathematics: d.record.math_marks,
            Physics: d.record.physics_marks,
            Chemistry: d.record.chemistry_marks,
            English: d.record.english_marks,
            "Computer Science": d.record.cs_marks,
          });
        }
      }, 300);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}><Spinner size={40} /></div>;

  const pred = data?.prediction;
  const rec = data?.record;
  const subjects = rec ? [
    { name: "Mathematics", marks: rec.math_marks, color: rec.math_marks >= 75 ? C.success : rec.math_marks >= 60 ? C.warning : C.danger },
    { name: "Physics", marks: rec.physics_marks, color: rec.physics_marks >= 75 ? C.success : rec.physics_marks >= 60 ? C.warning : C.danger },
    { name: "Chemistry", marks: rec.chemistry_marks, color: rec.chemistry_marks >= 75 ? C.success : rec.chemistry_marks >= 60 ? C.warning : C.danger },
    { name: "English", marks: rec.english_marks, color: rec.english_marks >= 75 ? C.success : rec.english_marks >= 60 ? C.warning : C.danger },
    { name: "Computer Science", marks: rec.cs_marks, color: rec.cs_marks >= 75 ? C.success : rec.cs_marks >= 60 ? C.warning : C.danger },
  ] : [];

  if (!pred && !rec) return (
    <div style={{ padding: "28px 32px" }}>
      <Card style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>No Data Yet</h2>
        <p style={{ color: C.gray, marginBottom: 24 }}>Enter your academic data to get your first AI prediction.</p>
        <Btn icon="✏️" onClick={() => {}}>Enter Academic Data</Btn>
      </Card>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      {/* Prediction Banner */}
      <div style={{ background: pred?.prediction === "Pass" ? `linear-gradient(135deg,${C.primary},${C.accent})` : `linear-gradient(135deg,#DC2626,#9333EA)`, borderRadius: 20, padding: "28px 32px", color: "#fff", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, fontWeight: 600, letterSpacing: 1 }}>CURRENT PREDICTION · {pred?.confidence}% CONFIDENCE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 50 }}>{pred?.prediction === "Pass" ? "✅" : "❌"}</div>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 34 }}>{pred?.prediction || "—"}</div>
              <div style={{ opacity: 0.85, fontSize: 14 }}>{pred ? `${pred.risk_level} Risk` : "No prediction yet"}</div>
            </div>
          </div>
        </div>
        {rec && (
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[["📅", "Attendance", `${rec.attendance}%`], ["📝", "Avg Marks", `${rec.internal_marks}`], ["⏱", "Study Hrs", `${rec.study_hours}h`], ["📌", "Backlogs", `${rec.backlogs}`]].map(([icon, label, val]) => (
              <div key={label} style={{ textAlign: "center", background: "rgba(255,255,255,0.15)", padding: "12px 16px", borderRadius: 12, minWidth: 80 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 20 }}>{val}</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Weak Subjects */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15 }}>⚠️ Weak Subjects</h3>
            {pred?.weak_subjects?.length > 0 && <Badge bg={C.dangerLight} color={C.danger}>{pred.weak_subjects.length} Found</Badge>}
          </div>
          {pred?.weak_subjects?.length > 0 ? pred.weak_subjects.map(s => (
            <div key={s} style={{ padding: "12px 14px", borderRadius: 10, background: C.dangerLight, marginBottom: 10, border: `1px solid ${C.danger}22` }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s}</div>
              <div style={{ fontSize: 12, color: C.gray }}>Below 60% – needs immediate attention</div>
            </div>
          )) : (
            <div style={{ padding: "20px", textAlign: "center", color: C.gray, fontSize: 14 }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🎉</div>
              No weak subjects detected!
            </div>
          )}
        </Card>

        {/* AI Recommendations */}
        <Card>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>🤖 AI Recommendations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(pred?.recommendations || []).slice(0, 4).map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: C.grayLight, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon || "💡"}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, lineHeight: 1.5 }}>{r.text}</div></div>
                <Badge bg={r.priority === "High" ? C.dangerLight : C.warningLight} color={r.priority === "High" ? C.danger : "#B45309"} sm>{r.priority}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Subject Performance */}
      {subjects.length > 0 && (
        <Card>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📊 Subject-wise Performance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {subjects.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 140, fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div style={{ flex: 1 }}><ProgressBar value={progress[s.name] || 0} color={s.color} animate /></div>
                <div style={{ width: 45, fontSize: 14, fontWeight: 700, color: s.color, textAlign: "right" }}>{s.marks}%</div>
                <div style={{ width: 72 }}><Badge bg={s.marks >= 75 ? C.successLight : s.marks >= 60 ? C.warningLight : C.dangerLight} color={s.marks >= 75 ? C.success : s.marks >= 60 ? "#B45309" : C.danger} sm>{s.marks >= 75 ? "Strong" : s.marks >= 60 ? "Average" : "Weak"}</Badge></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions for New Features */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[
          { icon: "📅", title: "Semester History", desc: "Track your results across all semesters and see AI trend analysis", page: "semesters", bg: "linear-gradient(135deg,#1E3A8A,#2563EB)", badge: "New" },
          { icon: "🎬", title: "YouTube Playlists", desc: "Watch curated video playlists for your weak subjects", page: "youtube", bg: "linear-gradient(135deg,#7f1d1d,#DC2626)", badge: "YouTube" },
          { icon: "🗓️", title: "Study Schedule", desc: "Get an AI-generated weekly study plan based on your weak areas", page: "schedule", bg: "linear-gradient(135deg,#4C1D95,#7C3AED)", badge: "AI" },
        ].map(item => (
          <DashboardQuickCard key={item.page} {...item} />
        ))}
      </div>
    </div>
  );
};

// Quick action card for dashboard (needs setPage from parent — uses window event)
const DashboardQuickCard = ({ icon, title, desc, page, bg, badge }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => window.dispatchEvent(new CustomEvent("edunav", { detail: page }))}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ background: bg, borderRadius: 16, padding: "20px", cursor: "pointer", transition: "all 0.25s", transform: hover ? "translateY(-4px)" : "none", boxShadow: hover ? "0 12px 30px rgba(0,0,0,0.2)" : "0 4px 12px rgba(0,0,0,0.1)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>{badge}</span>
      </div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
};

// ─── Data Entry Page ───────────────────────────────────────
const DataEntryPage = ({ onSuccess }) => {
  const [form, setForm] = useState({ attendance: 85, internal_marks: 72, study_hours: 4.5, backlogs: 1, math_marks: 58, physics_marks: 72, chemistry_marks: 85, english_marks: 91, cs_marks: 78 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: parseFloat(v) || 0 }));

  const submit = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await api.post("/predict", form);
      setResult(res);
      if (onSuccess) onSuccess();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📊 General Academic Info</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Attendance (%)" type="number" value={form.attendance} onChange={e => set("attendance", e.target.value)} icon="📅" min={0} max={100} required />
              <Input label="Internal Marks (0–100)" type="number" value={form.internal_marks} onChange={e => set("internal_marks", e.target.value)} icon="📝" min={0} max={100} required />
              <Input label="Daily Study Hours" type="number" value={form.study_hours} onChange={e => set("study_hours", e.target.value)} icon="⏱" min={0} max={24} step={0.5} required />
              <Input label="Number of Backlogs" type="number" value={form.backlogs} onChange={e => set("backlogs", e.target.value)} icon="📌" min={0} max={20} />
            </div>
          </Card>
          <Card>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📚 Subject-wise Marks</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Mathematics" type="number" value={form.math_marks} onChange={e => set("math_marks", e.target.value)} icon="📐" min={0} max={100} />
              <Input label="Physics" type="number" value={form.physics_marks} onChange={e => set("physics_marks", e.target.value)} icon="⚛️" min={0} max={100} />
              <Input label="Chemistry" type="number" value={form.chemistry_marks} onChange={e => set("chemistry_marks", e.target.value)} icon="🧪" min={0} max={100} />
              <Input label="English" type="number" value={form.english_marks} onChange={e => set("english_marks", e.target.value)} icon="📖" min={0} max={100} />
              <Input label="Computer Science" type="number" value={form.cs_marks} onChange={e => set("cs_marks", e.target.value)} icon="💻" min={0} max={100} />
            </div>
          </Card>
        </div>
        <div>
          <Card style={{ marginBottom: 20, background: `linear-gradient(135deg,${C.primaryLight},${C.accentLight})` }}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>🔮 ML Prediction Engine</h3>
            <p style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>Gradient Boosting model trained on 2000 synthetic student records.</p>
            <div style={{ background: C.dark, borderRadius: 10, padding: "14px 16px", marginBottom: 16, fontFamily: "monospace", fontSize: 12, color: "#94A3B8" }}>
              <div style={{ color: C.success, marginBottom: 4 }}>POST /api/predict</div>
              <div style={{ color: "#CBD5E1" }}>{"{"}</div>
              {Object.entries({ attendance: form.attendance, marks: form.internal_marks, study_hours: form.study_hours, backlogs: form.backlogs }).map(([k, v]) => (
                <div key={k} style={{ paddingLeft: 16 }}><span style={{ color: C.primary }}>"{k}"</span>: {v},</div>
              ))}
              <div style={{ color: "#CBD5E1" }}>{"}"}</div>
            </div>
            {error && <Alert type="error" onClose={() => setError("")} >{error}</Alert>}
            <Btn onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15, marginTop: error ? 12 : 0 }}>
              {loading ? <><Spinner size={18} /> Running Model...</> : "🚀 Run AI Prediction"}
            </Btn>
          </Card>
          {loading && (
            <Card style={{ textAlign: "center", padding: 40 }}>
              <Spinner size={48} /><div style={{ marginTop: 16, fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>Analyzing academic data...</div>
              <div style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>Gradient Boosting model processing</div>
            </Card>
          )}
          {result && !loading && (
            <Card className="fade-in" style={{ border: `2px solid ${result.prediction === "Pass" ? C.success : C.danger}44` }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 54 }}>{result.prediction === "Pass" ? "✅" : "❌"}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 34, color: result.prediction === "Pass" ? C.success : C.danger }}>{result.prediction}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10 }}>
                  <RiskBadge risk={result.risk_level} />
                  <Badge bg={C.primaryLight} color={C.primary}>Confidence: {result.confidence}%</Badge>
                </div>
              </div>
              <div style={{ background: C.dark, borderRadius: 10, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#94A3B8", marginBottom: 14 }}>
                <div style={{ color: C.success, marginBottom: 4 }}>200 OK</div>
                <div>{"{"}<span style={{ color: C.primary }}> "prediction"</span>: <span style={{ color: C.warning }}>"{result.prediction}"</span>,</div>
                <div style={{ paddingLeft: 10 }}><span style={{ color: C.primary }}>"risk_level"</span>: <span style={{ color: C.warning }}>"{result.risk_level}"</span>,</div>
                <div style={{ paddingLeft: 10 }}><span style={{ color: C.primary }}>"confidence"</span>: {result.confidence}</div>
                <div>{"}"}</div>
              </div>
              {result.weak_subjects?.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚠️ Weak Subjects:</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {result.weak_subjects.map(s => <Badge key={s} bg={C.dangerLight} color={C.danger}>{s}</Badge>)}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Resources Page ────────────────────────────────────────
const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const subjects = ["All", "Mathematics", "Physics", "Chemistry", "English", "Computer Science"];
  const typeColors = { Video: C.primary, PDF: C.danger, Practice: C.success, Course: C.accent };

  useEffect(() => {
    api.get("/resources").then(d => { setResources(d.resources || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === "All" ? resources : resources.filter(r => r.subject === filter);

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <Card style={{ marginBottom: 24, background: `linear-gradient(135deg,${C.primaryLight},${C.accentLight})`, border: "none" }}>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 17 }}>📚 Study Resources</h3>
        <p style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>Curated materials for your academic improvement</p>
      </Card>
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: filter === s ? C.primary : C.white, color: filter === s ? "#fff" : C.gray, border: `1.5px solid ${filter === s ? C.primary : C.border}`, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>{s}</button>
        ))}
      </div>
      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={40} /></div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {filtered.map(r => {
            const color = typeColors[r.resource_type] || C.gray;
            return (
              <Card key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {r.resource_type === "Video" ? "▶" : r.resource_type === "PDF" ? "📄" : r.resource_type === "Course" ? "💻" : "✏️"}
                  </div>
                  <Badge bg={color + "22"} color={color} sm>{r.resource_type}</Badge>
                </div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 4 }}>{r.subject} · {r.duration}</div>
                <div style={{ fontSize: 12, color: C.gray, marginBottom: 14, lineHeight: 1.5 }}>{r.description}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#B45309" }}>{"★".repeat(Math.floor(r.rating))} {r.rating}</span>
                  <Btn variant="secondary" sm>Start →</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Prediction History ────────────────────────────────────
const HistoryPage = () => {
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/predictions").then(d => { setPreds(d.predictions || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <Card>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📋 Prediction History</h3>
        {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={36} /></div> :
          preds.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.gray }}>No predictions yet. Enter your data to get started.</div> :
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {preds.map(p => (
                <div key={p.id} style={{ padding: "14px 18px", borderRadius: 12, background: C.grayLight, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                      <PredBadge pred={p.prediction} /><RiskBadge risk={p.risk_level} />
                    </div>
                    <div style={{ fontSize: 12, color: C.gray }}>{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{p.confidence}%</div>
                    <div style={{ fontSize: 11, color: C.gray }}>confidence</div>
                  </div>
                  {p.weak_subjects?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
                      {p.weak_subjects.map(s => <Badge key={s} bg={C.dangerLight} color={C.danger} sm>{s}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  );
};

// ─── Admin Overview ────────────────────────────────────────
const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/overview").then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}><Spinner size={40} /></div>;
  if (!data) return <Alert type="error">Failed to load analytics. Make sure the backend is running.</Alert>;

  const ov = data.overview;
  const sr = data.subject_stats;

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          ["👥", "Total Students", ov.total_students, C.primary, C.primaryLight],
          ["✅", "Predicted Pass", ov.pass_count, C.success, C.successLight],
          ["⚠️", "High Risk", ov.high_risk, C.danger, C.dangerLight],
          ["📊", "Pass Rate", `${ov.pass_rate}%`, C.accent, C.accentLight],
        ].map(([icon, label, val, color, bg]) => (
          <Card key={label} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 30, color }}>{val}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <Card>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📚 Subject Pass Rates</h3>
          {Object.entries(sr.pass_rate || {}).sort(([, a], [, b]) => b - a).map(([subj, rate]) => {
            const color = rate >= 75 ? C.success : rate >= 60 ? C.warning : C.danger;
            return (
              <div key={subj} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13 }}>{subj}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{rate}%</span>
                </div>
                <ProgressBar value={rate} color={color} animate />
              </div>
            );
          })}
        </Card>
        <Card>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🚨 At-Risk Students</h3>
          {data.at_risk_students?.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: C.gray }}><div style={{ fontSize: 30, marginBottom: 8 }}>🎉</div>No high-risk students!</div>
          ) : data.at_risk_students?.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: C.dangerLight, marginBottom: 8, border: `1px solid ${C.danger}22` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${C.danger},#9333EA)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{s.name[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.gray }}>Attendance: {s.attendance}%</div>
                </div>
              </div>
              <RiskBadge risk={s.risk_level} />
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>🕐 Recent Predictions</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${C.border}` }}>
                {["Student", "Prediction", "Risk Level", "Confidence", "Date"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.recent_predictions || []).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 14 }}>{r.student_name}</td>
                  <td style={{ padding: "12px 14px" }}><PredBadge pred={r.prediction} /></td>
                  <td style={{ padding: "12px 14px" }}><RiskBadge risk={r.risk_level} /></td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: C.primary }}>{r.confidence}%</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: C.gray }}>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Admin Students Page ───────────────────────────────────
const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/analytics/students").then(d => { setStudents(d.students || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15 }}>👥 All Students ({students.length})</h3>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." icon="🔍" />
        </div>
        {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={40} /></div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${C.border}` }}>
                  {["Student", "Email", "Attendance", "Marks", "Risk", "Prediction", "Weak Subjects"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.white : "#FAFBFF" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{s.name[0]}</div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: C.gray }}>{s.email}</td>
                    <td style={{ padding: "12px 14px", fontSize: 14 }}>{s.attendance != null ? `${s.attendance}%` : "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 14 }}>{s.internal_marks != null ? `${s.internal_marks}` : "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{s.risk_level ? <RiskBadge risk={s.risk_level} /> : "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{s.prediction ? <PredBadge pred={s.prediction} /> : "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(s.weak_subjects || []).map(w => <Badge key={w} bg={C.dangerLight} color={C.danger} sm>{w}</Badge>)}
                        {(!s.weak_subjects || s.weak_subjects.length === 0) && <span style={{ fontSize: 12, color: C.success }}>None ✓</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.gray }}>No students found</div>}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─── Upload Page ───────────────────────────────────────────
const UploadPage = () => {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const processFile = async (file) => {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await api.upload("/upload", file);
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ maxWidth: 680 }}>
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>📤 Bulk Student Upload</h3>
          <p style={{ fontSize: 13, color: C.gray, marginBottom: 20 }}>Upload CSV or Excel with student data. The ML model will auto-generate predictions for all students.</p>

          <div style={{ background: C.primaryLight, border: `1.5px dashed ${C.primary}55`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>Required columns</div>
              <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>student_name, email, attendance, internal_marks, study_hours, backlogs</div>
            </div>
            <Badge bg={C.primaryLight} color={C.primary}>.csv / .xlsx</Badge>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById("file-input").click()}
            style={{ border: `2px dashed ${dragging ? C.primary : C.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center", background: dragging ? C.primaryLight : C.grayLight, transition: "all 0.2s", cursor: "pointer" }}>
            <input id="file-input" type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
            {loading ? (
              <div><Spinner size={48} /><div style={{ marginTop: 12, fontWeight: 600 }}>Processing file & running ML predictions...</div></div>
            ) : result ? (
              <div>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ marginTop: 10, fontWeight: 700, fontSize: 16, color: C.success }}>Upload Successful!</div>
                <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>{result.summary.total_processed} students processed · {result.summary.at_risk} at-risk identified</div>
                <Btn style={{ marginTop: 14 }} sm variant="secondary" onClick={e => { e.stopPropagation(); setResult(null); }}>Upload Another</Btn>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 48 }}>📂</div>
                <div style={{ marginTop: 12, fontWeight: 600, fontSize: 15 }}>Drop your CSV or Excel file here</div>
                <div style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>or click to browse</div>
              </div>
            )}
          </div>
          {error && <div style={{ marginTop: 14 }}><Alert type="error" onClose={() => setError("")}>{error}</Alert></div>}
        </Card>

        {result && (
          <Card className="fade-in">
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📊 Upload Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
              {[
                ["Total Processed", result.summary.total_processed, C.primary],
                ["Predicted Pass", result.summary.predicted_pass, C.success],
                ["Predicted Fail", result.summary.predicted_fail, C.danger],
                ["New Students", result.summary.new_students, C.accent],
                ["At Risk", result.summary.at_risk, C.warning],
                ["Errors", result.summary.errors, C.gray],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: C.grayLight, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 24, color }}>{val}</div>
                  <div style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `1.5px solid ${C.border}` }}>
                  {["Name", "Email", "Prediction", "Risk", "Weak Subjects"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.gray, fontSize: 11, textTransform: "uppercase" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: "8px 12px", color: C.gray }}>{r.email}</td>
                      <td style={{ padding: "8px 12px" }}><PredBadge pred={r.prediction} /></td>
                      <td style={{ padding: "8px 12px" }}><RiskBadge risk={r.risk_level} /></td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {r.weak_subjects.map(s => <Badge key={s} bg={C.dangerLight} color={C.danger} sm>{s}</Badge>)}
                          {r.weak_subjects.length === 0 && <span style={{ color: C.success, fontSize: 12 }}>None ✓</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card style={{ marginTop: 20 }}>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📋 Required CSV Format</h3>
          <div style={{ background: C.dark, borderRadius: 10, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#94A3B8", overflowX: "auto" }}>
            <div style={{ color: "#64748B", marginBottom: 6 }}># CSV Example</div>
            <div style={{ color: C.success }}>student_name,email,attendance,internal_marks,study_hours,backlogs,math_marks,physics_marks</div>
            <div>Priya Sharma,priya@college.edu,85,72,4.5,0,78,82</div>
            <div>Rahul Mehta,rahul@college.edu,62,45,1.5,3,38,42</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Admin Analytics ───────────────────────────────────────
const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/analytics/overview").then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}><Spinner size={40} /></div>;
  if (!data) return <div style={{ padding: 32 }}><Alert type="error">Backend not reachable. Run: python app.py</Alert></div>;

  const ov = data.overview;
  const sr = data.subject_stats;
  const barMax = Math.max(ov.pass_count, ov.fail_count, 1);

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          ["📈", "Overall Pass Rate", `${ov.pass_rate}%`, C.success],
          ["📅", "Avg Attendance", `${ov.avg_attendance}%`, C.primary],
          ["⚠️", "High Risk Students", ov.high_risk, C.danger],
        ].map(([icon, title, val, color]) => (
          <Card key={title} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 13, color: C.gray, marginBottom: 8 }}>{title}</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 32, color }}>{val}</div>
              </div>
              <div style={{ fontSize: 32 }}>{icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Pass/Fail Chart */}
        <Card>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📊 Pass vs Fail Distribution</h3>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-end", height: 160 }}>
            {[["Pass", ov.pass_count, C.success], ["Fail", ov.fail_count, C.danger], ["High Risk", ov.high_risk, C.warning], ["Low Risk", ov.low_risk, C.primary]].map(([label, val, color]) => (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div>
                <div style={{ width: "100%", height: `${Math.max(20, (val / Math.max(ov.total_predictions, 1)) * 120)}px`, background: color, borderRadius: "6px 6px 0 0", transition: "height 0.8s", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6 }} />
                <div style={{ fontSize: 11, color: C.gray, textAlign: "center" }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Subject Averages */}
        <Card>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📚 Subject Average Marks</h3>
          {Object.entries(sr.avg_marks || {}).sort(([, a], [, b]) => b - a).map(([subj, avg]) => {
            const color = avg >= 75 ? C.success : avg >= 60 ? C.warning : C.danger;
            return (
              <div key={subj} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{subj}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{avg}</span>
                </div>
                <ProgressBar value={avg} color={color} animate />
              </div>
            );
          })}
        </Card>
      </div>

      <Card>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>📈 Risk Level Breakdown</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 16 }}>
          {[["🟢 Low Risk", ov.low_risk, C.success, C.successLight], ["🟡 Medium Risk", ov.medium_risk, "#B45309", C.warningLight], ["🔴 High Risk", ov.high_risk, C.danger, C.dangerLight]].map(([label, val, color, bg]) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 36, color }}>{val}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color, marginTop: 6 }}>{label}</div>
              <div style={{ fontSize: 12, color, marginTop: 4, opacity: 0.7 }}>
                {ov.total_predictions > 0 ? `${Math.round((val / ov.total_predictions) * 100)}% of students` : "No data"}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── YouTube & Semester Data ───────────────────────────────
const YOUTUBE_PLAYLISTS = {
  Mathematics: [
    { title: "Calculus Full Course", channel: "Professor Leonard", duration: "20+ hrs", level: "Beginner→Advanced", thumbnail: "https://img.youtube.com/vi/WUvTyaaNkzM/mqdefault.jpg", url: "https://www.youtube.com/watch?v=WUvTyaaNkzM&list=PLF797E961509B4EB5", topic: "Calculus", views: "5.2M" },
    { title: "Linear Algebra – Essence", channel: "3Blue1Brown", duration: "3h 45m", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/fNk_zzaMoSs/mqdefault.jpg", url: "https://www.youtube.com/watch?v=fNk_zzaMoSs&list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", topic: "Linear Algebra", views: "8.1M" },
    { title: "Algebra Basics", channel: "Khan Academy", duration: "10+ hrs", level: "Beginner", thumbnail: "https://img.youtube.com/vi/NybHckSEQBI/mqdefault.jpg", url: "https://www.youtube.com/watch?v=NybHckSEQBI", topic: "Algebra", views: "12M" },
    { title: "Trigonometry Full Course", channel: "Organic Chemistry Tutor", duration: "6h", level: "Beginner", thumbnail: "https://img.youtube.com/vi/PUB0TaZ7bhA/mqdefault.jpg", url: "https://www.youtube.com/watch?v=PUB0TaZ7bhA", topic: "Trigonometry", views: "3.4M" },
    { title: "Statistics & Probability", channel: "StatQuest", duration: "8+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/qBigTkBLU6g/mqdefault.jpg", url: "https://www.youtube.com/watch?v=qBigTkBLU6g", topic: "Statistics", views: "2.8M" },
    { title: "Differential Equations", channel: "MIT OpenCourseWare", duration: "25+ hrs", level: "Advanced", thumbnail: "https://img.youtube.com/vi/ZvL88xqYSak/mqdefault.jpg", url: "https://www.youtube.com/watch?v=ZvL88xqYSak", topic: "Diff Equations", views: "1.5M" },
  ],
  Physics: [
    { title: "Physics Class 11 & 12", channel: "Physics Wallah", duration: "40+ hrs", level: "Beginner→Advanced", thumbnail: "https://img.youtube.com/vi/6TV6LmLMqm8/mqdefault.jpg", url: "https://www.youtube.com/watch?v=6TV6LmLMqm8", topic: "Full Course", views: "15M" },
    { title: "Classical Mechanics", channel: "MIT OpenCourseWare", duration: "30+ hrs", level: "Advanced", thumbnail: "https://img.youtube.com/vi/ApUFtLCrU90/mqdefault.jpg", url: "https://www.youtube.com/watch?v=ApUFtLCrU90", topic: "Mechanics", views: "2.1M" },
    { title: "Electromagnetism Full", channel: "Neso Academy", duration: "12+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/rFsV-SFnGaE/mqdefault.jpg", url: "https://www.youtube.com/watch?v=rFsV-SFnGaE", topic: "Electromagnetics", views: "4.5M" },
    { title: "Quantum Physics Basics", channel: "Domain of Science", duration: "2h", level: "Beginner", thumbnail: "https://img.youtube.com/vi/p7bzE1E5PMY/mqdefault.jpg", url: "https://www.youtube.com/watch?v=p7bzE1E5PMY", topic: "Quantum", views: "6.2M" },
    { title: "Thermodynamics", channel: "Organic Chemistry Tutor", duration: "5h", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/7DjSBMX-FSQ/mqdefault.jpg", url: "https://www.youtube.com/watch?v=7DjSBMX-FSQ", topic: "Thermodynamics", views: "2.9M" },
  ],
  Chemistry: [
    { title: "Organic Chemistry Full", channel: "Khan Academy", duration: "15+ hrs", level: "Beginner→Advanced", thumbnail: "https://img.youtube.com/vi/bSMx0NS0XfY/mqdefault.jpg", url: "https://www.youtube.com/watch?v=bSMx0NS0XfY", topic: "Organic", views: "8.7M" },
    { title: "Chemistry Class 12", channel: "Vedantu", duration: "30+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/1MOabDGKmKU/mqdefault.jpg", url: "https://www.youtube.com/watch?v=1MOabDGKmKU", topic: "Full Syllabus", views: "5.3M" },
    { title: "Chemical Bonding", channel: "BYJU's", duration: "4h", level: "Beginner", thumbnail: "https://img.youtube.com/vi/CGA8sRwqIFg/mqdefault.jpg", url: "https://www.youtube.com/watch?v=CGA8sRwqIFg", topic: "Bonding", views: "4.2M" },
    { title: "Electrochemistry", channel: "Organic Chemistry Tutor", duration: "3h", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/JD3F9yLBXvA/mqdefault.jpg", url: "https://www.youtube.com/watch?v=JD3F9yLBXvA", topic: "Electrochemistry", views: "1.8M" },
    { title: "Inorganic Chemistry", channel: "Unacademy JEE", duration: "20+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/HiNuFyHGtOk/mqdefault.jpg", url: "https://www.youtube.com/watch?v=HiNuFyHGtOk", topic: "Inorganic", views: "3.1M" },
  ],
  English: [
    { title: "English Grammar Full", channel: "Learn English with Emma", duration: "10+ hrs", level: "Beginner", thumbnail: "https://img.youtube.com/vi/6Oq0uqEMvmU/mqdefault.jpg", url: "https://www.youtube.com/watch?v=6Oq0uqEMvmU", topic: "Grammar", views: "9.4M" },
    { title: "Spoken English Full Course", channel: "Spoken English Guru", duration: "15+ hrs", level: "Beginner", thumbnail: "https://img.youtube.com/vi/VX9m_8KDXCU/mqdefault.jpg", url: "https://www.youtube.com/watch?v=VX9m_8KDXCU", topic: "Speaking", views: "18M" },
    { title: "Academic Writing Skills", channel: "Oxford Online English", duration: "5h", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/o-49gNsGOY4/mqdefault.jpg", url: "https://www.youtube.com/watch?v=o-49gNsGOY4", topic: "Writing", views: "2.1M" },
    { title: "Vocabulary Building", channel: "mmmEnglish", duration: "4h", level: "Beginner→Inter", thumbnail: "https://img.youtube.com/vi/y7sOIGBeSaI/mqdefault.jpg", url: "https://www.youtube.com/watch?v=y7sOIGBeSaI", topic: "Vocabulary", views: "3.2M" },
  ],
  "Computer Science": [
    { title: "Data Structures & Algorithms", channel: "Abdul Bari", duration: "25+ hrs", level: "Beginner→Advanced", thumbnail: "https://img.youtube.com/vi/0IAPZzGSbME/mqdefault.jpg", url: "https://www.youtube.com/watch?v=0IAPZzGSbME&list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O", topic: "DSA", views: "11M" },
    { title: "Python Full Course", channel: "freeCodeCamp", duration: "12h", level: "Beginner", thumbnail: "https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg", url: "https://www.youtube.com/watch?v=rfscVS0vtbw", topic: "Python", views: "35M" },
    { title: "Operating Systems", channel: "Neso Academy", duration: "20+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/vBURTt97EkA/mqdefault.jpg", url: "https://www.youtube.com/watch?v=vBURTt97EkA", topic: "OS", views: "6.7M" },
    { title: "DBMS Full Course", channel: "Gate Smashers", duration: "15+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/kBdlM6hNDAE/mqdefault.jpg", url: "https://www.youtube.com/watch?v=kBdlM6hNDAE", topic: "DBMS", views: "4.2M" },
    { title: "Computer Networks", channel: "Neso Academy", duration: "20+ hrs", level: "Intermediate", thumbnail: "https://img.youtube.com/vi/VwN91x5i25g/mqdefault.jpg", url: "https://www.youtube.com/watch?v=VwN91x5i25g", topic: "Networks", views: "5.8M" },
    { title: "Web Dev Full Course", channel: "Traversy Media", duration: "20+ hrs", level: "Beginner→Inter", thumbnail: "https://img.youtube.com/vi/ysEN5RaKOlA/mqdefault.jpg", url: "https://www.youtube.com/watch?v=ysEN5RaKOlA", topic: "Web Dev", views: "7.3M" },
  ],
};

const SUBJ_META = {
  Mathematics: { color: C.danger, bg: C.dangerLight, icon: "📐" },
  Physics: { color: C.warning, bg: C.warningLight, icon: "⚛️" },
  Chemistry: { color: C.success, bg: C.successLight, icon: "🧪" },
  English: { color: C.primary, bg: C.primaryLight, icon: "📖" },
  "Computer Science": { color: C.accent, bg: C.accentLight, icon: "💻" },
};

// ─── YouTube Playlists Page ────────────────────────────────
const YouTubePage = ({ weakSubjects = [] }) => {
  const allSubjects = Object.keys(YOUTUBE_PLAYLISTS);
  const [active, setActive] = useState(weakSubjects[0] || allSubjects[0]);
  const [saved, setSaved] = useState({});

  const toggleSave = (id) => setSaved(p => ({ ...p, [id]: !p[id] }));
  const playlists = YOUTUBE_PLAYLISTS[active] || [];
  const meta = SUBJ_META[active] || { color: C.primary, bg: C.primaryLight, icon: "📚" };

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <style>{GS}</style>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.dark}, #1E3A5F)`, borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>YOUTUBE STUDY PLAYLISTS</div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22 }}>📺 Curated Video Resources</h2>
          <p style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>Hand-picked playlists from top educators — click any card to open on YouTube</p>
        </div>
        {weakSubjects.length > 0 && (
          <div style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "10px 16px" }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>⚠️ Your Weak Subjects</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {weakSubjects.map(s => <span key={s} style={{ background: C.danger, color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Subject Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {allSubjects.map(s => {
          const m = SUBJ_META[s];
          const isWeak = weakSubjects.includes(s);
          return (
            <button key={s} onClick={() => setActive(s)} style={{
              padding: "9px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: active === s ? m.color : C.white,
              color: active === s ? "#fff" : m.color,
              border: `2px solid ${active === s ? m.color : m.color + "44"}`,
              cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {m.icon} {s} {isWeak && <span style={{ background: active === s ? "rgba(255,255,255,0.3)" : C.danger, color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 20 }}>WEAK</span>}
            </button>
          );
        })}
      </div>

      {/* Playlist Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {playlists.map((p, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
            overflow: "hidden", transition: "all 0.25s", cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 30px ${meta.color}22`; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}
          >
            {/* Thumbnail */}
            <div style={{ position: "relative" }} onClick={() => window.open(p.url, '_blank')}>
              <img src={p.thumbnail} alt={p.title}
                style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.display = "none"; e.target.parentElement.style.background = meta.bg; e.target.parentElement.style.height = "160px"; e.target.parentElement.style.display = "flex"; e.target.parentElement.style.alignItems = "center"; e.target.parentElement.style.justifyContent = "center"; e.target.parentElement.innerHTML = `<span style="font-size:48px">${meta.icon}</span>`; }}
              />
              {/* Play Overlay */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 22, marginLeft: 4 }}>▶</span>
                </div>
              </div>
              {/* Topic badge */}
              <div style={{ position: "absolute", top: 10, left: 10, background: meta.color, color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{p.topic}</div>
              {/* Views */}
              <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>👁 {p.views}</div>
            </div>

            {/* Info */}
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.dark, lineHeight: 1.4 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: C.gray, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: "#FF0000" }}>▶ {p.channel}</span> · {p.duration}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ background: meta.bg, color: meta.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{p.level}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => toggleSave(`${active}-${i}`)} style={{ background: saved[`${active}-${i}`] ? C.warningLight : C.grayLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>
                    {saved[`${active}-${i}`] ? "⭐" : "☆"}
                  </button>
                  <button onClick={() => window.open(p.url, '_blank')} style={{ background: "#FF0000", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                    Watch →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Semester History Page ─────────────────────────────────
const SemesterPage = () => {
  const [semesters, setSemesters] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ semester_no: 1, semester_name: "Semester 1", math_marks: 0, physics_marks: 0, chemistry_marks: 0, english_marks: 0, cs_marks: 0, cgpa: 0, attendance: 75, backlogs: 0 });

  const load = () => {
    Promise.all([
      api.get("/semesters"),
      api.get("/semester-analysis")
    ]).then(([s, a]) => {
      setSemesters(s.semesters || []);
      setAnalysis(a.analysis);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/semesters", { ...form, semester_no: parseInt(form.semester_no), cgpa: parseFloat(form.cgpa), attendance: parseFloat(form.attendance), backlogs: parseInt(form.backlogs), math_marks: parseFloat(form.math_marks), physics_marks: parseFloat(form.physics_marks), chemistry_marks: parseFloat(form.chemistry_marks), english_marks: parseFloat(form.english_marks), cs_marks: parseFloat(form.cs_marks) });
      setMsg("✅ Semester saved!"); setShowForm(false); load();
    } catch (e) { setMsg("❌ " + e.message); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const subjects = ["math_marks", "physics_marks", "chemistry_marks", "english_marks", "cs_marks"];
  const subjectNames = ["Mathematics", "Physics", "Chemistry", "English", "Computer Science"];

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <style>{GS}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, color: C.dark }}>📅 Semester History & Analysis</h2>
          <p style={{ color: C.gray, fontSize: 13, marginTop: 4 }}>Track your performance across all semesters and see AI-powered trend insights</p>
        </div>
        <Btn onClick={() => setShowForm(!showForm)} icon="➕">Add Semester</Btn>
      </div>

      {msg && <div style={{ marginBottom: 16 }}><Alert type={msg.startsWith("✅") ? "success" : "error"}>{msg}</Alert></div>}

      {/* Add Form */}
      {showForm && (
        <Card className="fade-in" style={{ marginBottom: 24, border: `2px solid ${C.primary}33` }}>
          <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>➕ Add Semester Result</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Semester Number</label>
              <select value={form.semester_no} onChange={e => { setF("semester_no", e.target.value); setF("semester_name", `Semester ${e.target.value}`); }}
                style={{ padding: "11px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans',sans-serif", background: "#FAFBFF" }}>
                {[1,2].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>
            <Input label="CGPA" type="number" value={form.cgpa} onChange={e => setF("cgpa", e.target.value)} icon="🎓" min={0} max={10} step={0.1} />
            <Input label="Attendance (%)" type="number" value={form.attendance} onChange={e => setF("attendance", e.target.value)} icon="📅" min={0} max={100} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 14 }}>
            {[["Mathematics","📐","math_marks"],["Physics","⚛️","physics_marks"],["Chemistry","🧪","chemistry_marks"],["English","📖","english_marks"],["Computer Sci","💻","cs_marks"]].map(([label,icon,key]) => (
              <Input key={key} label={label} type="number" value={form[key]} onChange={e => setF(key, e.target.value)} icon={icon} min={0} max={100} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "💾 Save Semester"}</Btn>
            <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={40} /></div> : (
        <>
          {/* Trend Analysis */}
          {analysis && (
            <>
              {/* Insights */}
              {analysis.insights.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12, marginBottom: 24 }}>
                  {analysis.insights.map((ins, i) => (
                    <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: ins.type === "success" ? C.successLight : ins.type === "warning" ? C.warningLight : C.primaryLight, border: `1px solid ${ins.type === "success" ? C.success : ins.type === "warning" ? C.warning : C.primary}33`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{ins.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: ins.type === "success" ? C.success : ins.type === "warning" ? "#B45309" : C.primary, marginBottom: 4 }}>{ins.subject.toUpperCase()}</div>
                        <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.5 }}>{ins.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CGPA Trend */}
              {analysis.cgpa_trend.length > 0 && (
                <Card style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📈 CGPA Progression</h3>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
                    {analysis.cgpa_trend.map((cgpa, i) => {
                      const color = cgpa >= 8 ? C.success : cgpa >= 6 ? C.primary : cgpa >= 5 ? C.warning : C.danger;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color }}>{cgpa}</div>
                          <div style={{ width: "100%", height: `${(cgpa / 10) * 100}px`, background: color, borderRadius: "6px 6px 0 0", transition: "height 0.8s", minHeight: 20 }} />
                          <div style={{ fontSize: 12, color: C.gray }}>Sem {i + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                    {analysis.most_improved && <Badge bg={C.successLight} color={C.success}>📈 Most Improved: {analysis.most_improved}</Badge>}
                    {analysis.most_declined && <Badge bg={C.dangerLight} color={C.danger}>📉 Declining: {analysis.most_declined}</Badge>}
                    {analysis.consistently_weak.length > 0 && <Badge bg={C.warningLight} color="#B45309">⚠️ Needs Focus: {analysis.consistently_weak.join(", ")}</Badge>}
                  </div>
                </Card>
              )}

              {/* Subject Trends */}
              {Object.keys(analysis.subject_trends).length > 0 && (
                <Card style={{ marginBottom: 24 }}>
                  <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📊 Subject-wise Trends</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {Object.entries(analysis.subject_trends).map(([subj, data]) => {
                      const m = SUBJ_META[subj] || { color: C.primary, bg: C.primaryLight, icon: "📚" };
                      return (
                        <div key={subj} style={{ padding: "14px 16px", borderRadius: 12, background: C.grayLight }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{m.icon}</span>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{subj}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>Avg: {data.average}%</span>
                              <Badge bg={data.direction === "improving" ? C.successLight : data.direction === "declining" ? C.dangerLight : C.warningLight}
                                color={data.direction === "improving" ? C.success : data.direction === "declining" ? C.danger : "#B45309"}>
                                {data.direction === "improving" ? "📈 +" : data.direction === "declining" ? "📉 " : "➡️ "}{Math.abs(data.trend)}
                              </Badge>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 50 }}>
                            {data.marks.map((mark, idx) => (
                              <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                <div style={{ width: "100%", height: `${(mark / 100) * 40}px`, background: m.color, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
                                <div style={{ fontSize: 10, color: C.gray }}>S{idx + 1}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Semester Cards */}
          {semesters.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>📅</div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Semester Data Yet</h3>
              <p style={{ color: C.gray, marginBottom: 20 }}>Add your past semester results to see trend analysis and AI insights.</p>
              <Btn onClick={() => setShowForm(true)} icon="➕">Add First Semester</Btn>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {semesters.map(sem => {
                const avg = ((sem.math_marks + sem.physics_marks + sem.chemistry_marks + sem.english_marks + sem.cs_marks) / 5).toFixed(1);
                const cgpaColor = sem.cgpa >= 8 ? C.success : sem.cgpa >= 6 ? C.primary : sem.cgpa >= 5 ? C.warning : C.danger;
                return (
                  <Card key={sem.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16 }}>{sem.semester_name || `Semester ${sem.semester_no}`}</div>
                        <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>Avg: {avg}% · Attendance: {sem.attendance}%</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 26, color: cgpaColor }}>{sem.cgpa}</div>
                        <div style={{ fontSize: 10, color: C.gray }}>CGPA</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[["📐 Math", sem.math_marks],["⚛️ Physics", sem.physics_marks],["🧪 Chem", sem.chemistry_marks],["📖 English", sem.english_marks],["💻 CS", sem.cs_marks]].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80, fontSize: 12, color: C.gray }}>{label}</div>
                          <div style={{ flex: 1, background: C.grayLight, borderRadius: 999, height: 6, overflow: "hidden" }}>
                            <div style={{ width: `${val}%`, height: "100%", background: val >= 75 ? C.success : val >= 60 ? C.warning : C.danger, borderRadius: 999 }} />
                          </div>
                          <div style={{ width: 30, fontSize: 12, fontWeight: 700, textAlign: "right", color: val >= 75 ? C.success : val >= 60 ? C.warning : C.danger }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    {sem.backlogs > 0 && <div style={{ marginTop: 12 }}><Badge bg={C.dangerLight} color={C.danger} sm>⚠️ {sem.backlogs} Backlog(s)</Badge></div>}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Study Schedule Page ───────────────────────────────────
const StudySchedulePage = () => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [hours, setHours] = useState(4);
  const allSubjects = ["Mathematics", "Physics", "Chemistry", "English", "Computer Science"];

  const toggleSubject = (s) => setWeakSubjects(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.post("/study-schedule", { weak_subjects: weakSubjects, daily_hours: hours });
      setSchedule(res.schedule);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const dayColors = { Monday: C.primary, Tuesday: C.accent, Wednesday: C.success, Thursday: C.warning, Friday: C.danger, Saturday: "#EC4899", Sunday: C.gray };

  return (
    <div style={{ padding: "28px 32px", animation: "fadeIn 0.4s ease" }}>
      <style>{GS}</style>

      <Card style={{ marginBottom: 24, background: `linear-gradient(135deg, ${C.primaryLight}, ${C.accentLight})` }}>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>📅 AI Study Schedule Generator</h3>
        <p style={{ fontSize: 13, color: C.gray, marginBottom: 20 }}>Select your weak subjects and daily study hours to generate a personalized weekly plan.</p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Select Weak Subjects:</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {allSubjects.map(s => {
              const m = SUBJ_META[s];
              const sel = weakSubjects.includes(s);
              return (
                <button key={s} onClick={() => toggleSubject(s)} style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: sel ? m.color : C.white, color: sel ? "#fff" : m.color, border: `2px solid ${m.color}`, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>
                  {m.icon} {s}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Daily Study Hours:</div>
          {[2, 3, 4, 5, 6, 8].map(h => (
            <button key={h} onClick={() => setHours(h)} style={{ width: 44, height: 44, borderRadius: "50%", background: hours === h ? C.primary : C.white, color: hours === h ? "#fff" : C.dark, border: `2px solid ${hours === h ? C.primary : C.border}`, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{h}h</button>
          ))}
        </div>

        <Btn onClick={generate} disabled={loading} icon="🤖">{loading ? "Generating..." : "Generate My Study Schedule"}</Btn>
      </Card>

      {loading && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <Spinner size={48} />
          <div style={{ marginTop: 14, fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>Creating your personalized schedule...</div>
        </Card>
      )}

      {schedule && !loading && (
        <div className="fade-in">
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 16, color: C.dark }}>📋 Your Weekly Study Plan</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
            {schedule.map((day, i) => {
              const color = dayColors[day.day] || C.primary;
              return (
                <Card key={i} style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ background: color, padding: "12px 16px", color: "#fff" }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15 }}>{day.day}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Total: {day.total_hours}h study time</div>
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    {day.sessions.map((s, j) => {
                      const m = SUBJ_META[s.subject] || { icon: "📚", color: C.gray, bg: C.grayLight };
                      return (
                        <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: j < day.sessions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg || C.grayLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{m.icon}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{s.subject}</div>
                            <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>{s.activity}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: m.color || C.primary, marginTop: 4 }}>⏱ {s.hours}h</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Page Title Map ────────────────────────────────────────
const PAGE_TITLES = {
  "dashboard": ["Student Dashboard", "AI prediction & performance overview"],
  "data-entry": ["Academic Data Entry", "Input your data to run ML prediction"],
  "resources": ["Study Resources", "Curated materials for your improvement"],
  "history": ["Prediction History", "All your past AI predictions"],
  "semesters": ["Semester History", "Track performance across all semesters"],
  "youtube": ["YouTube Playlists", "Curated video resources for every subject"],
  "schedule": ["Study Schedule", "AI-generated personalized weekly study plan"],
  "admin-overview": ["Admin Overview", "Real-time student performance intelligence"],
  "students": ["Student Management", "All enrolled students"],
  "upload": ["Bulk Upload", "Import CSV/Excel to run batch predictions"],
  "analytics": ["Analytics Dashboard", "Institute-wide ML-driven insights"],
};

// ─── Root App ──────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [loginHint, setLoginHint] = useState("student");

  const handleAuth = (u) => { setUser(u); setPage(u.role === "admin" ? "admin-overview" : "dashboard"); setScreen("app"); };
  const handleLogout = () => { localStorage.removeItem("edu_token"); setUser(null); setScreen("landing"); };
  const goLogin = (hint) => { setLoginHint(hint); setScreen("login"); };

  // Auto-login if token exists
  useEffect(() => {
    const token = localStorage.getItem("edu_token");
    if (token) {
      api.get("/auth/me").then(d => { setUser(d.user); setPage(d.user.role === "admin" ? "admin-overview" : "dashboard"); setScreen("app"); }).catch(() => localStorage.removeItem("edu_token"));
    }
  }, []);

  // Listen for dashboard quick card navigation
  useEffect(() => {
    const handler = (e) => setPage(e.detail);
    window.addEventListener("edunav", handler);
    return () => window.removeEventListener("edunav", handler);
  }, []);

  if (screen === "landing") return <LandingPage onGoLogin={goLogin} />;
  if (screen === "login") return <AuthPage onAuth={handleAuth} hint={loginHint} />;

  const [title, subtitle] = PAGE_TITLES[page] || [page, ""];

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <StudentDashboard />;
      case "data-entry": return <DataEntryPage onSuccess={() => setPage("dashboard")} />;
      case "resources": return <ResourcesPage />;
      case "semesters": return <SemesterPage />;
      case "youtube": return <YouTubePage weakSubjects={[]} />;
      case "schedule": return <StudySchedulePage />;
      case "history": return <HistoryPage />;
      case "admin-overview": return <AdminOverview />;
      case "students": return <StudentsPage />;
      case "upload": return <UploadPage />;
      case "analytics": return <AnalyticsPage />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{GS}</style>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={handleLogout} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: "#F8FAFF" }}>
        <TopBar title={title} subtitle={subtitle} />
        <div style={{ flex: 1 }}>{renderPage()}</div>
      </div>
    </div>
  );
}
