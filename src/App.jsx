import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp,
  runTransaction,
} from "firebase/firestore";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ELECTION_ID    = "cmp300_2025";
const ADMIN_PASSWORD = "CourseRep@2025";
const VALID_MATRIC   = /^FT23CMP([0-4]\d{2}|500)$/;
const VALID_EMAIL    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLORS         = ["#1a6b4a","#1a3d6b","#6b1a4a","#6b4a1a","#3d6b1a","#6b1a1a"];

const clean   = (s) => String(s).replace(/[<>"'&]/g, "");
const mkRcpt  = () => "TXN-"+Math.random().toString(36).substring(2,8).toUpperCase()+"-"+Date.now().toString(36).toUpperCase();
const mkAvatar= (n) => n.trim().split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0a0f1a;--s1:#111827;--s2:#1a2235;--s3:#232f42;
      --br:#2a3a52;--ac:#00d4a8;--bl:#0099ff;--or:#ff6b35;
      --tx:#e8edf5;--t2:#8a9bb5;--t3:#5a6b82;
      --er:#ff4757;--wn:#ffd32a;
      --fn:'Sora',sans-serif;--mo:'JetBrains Mono',monospace;
      --rd:16px;--rs:8px;
      --sh:0 4px 24px rgba(0,0,0,.4);--sl:0 8px 48px rgba(0,0,0,.6);
      --gl:0 0 20px rgba(0,212,168,.15);
    }
    html,body,#root{height:100%;width:100%;background:var(--bg);color:var(--tx);font-family:var(--fn);-webkit-font-smoothing:antialiased}
    ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--s1)}::-webkit-scrollbar-thumb{background:var(--br);border-radius:3px}
    @keyframes up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fi{from{opacity:0}to{opacity:1}}
    @keyframes si{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
    @keyframes pu{0%,100%{opacity:1}50%{opacity:.35}}
    @keyframes sp{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    @keyframes gp{0%,100%{box-shadow:var(--gl)}50%{box-shadow:0 0 40px rgba(0,212,168,.3)}}
    button{cursor:pointer;font-family:var(--fn)}
    input,textarea{font-family:var(--fn)}
    .card{background:var(--s1);border:1px solid var(--br);border-radius:var(--rd);box-shadow:var(--sh)}
  `}</style>
);

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Spin = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
    <div style={{width:40,height:40,border:"3px solid var(--br)",borderTopColor:"var(--ac)",borderRadius:"50%",animation:"sp .8s linear infinite"}}/>
  </div>
);

const Dot = ({on}) => (
  <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:on?"var(--ac)":"var(--t3)",animation:on?"pu 1.5s ease infinite":"none",boxShadow:on?"0 0 8px var(--ac)":"none"}}/>
);

const Tag = ({c="ac",children}) => {
  const m={ac:{bg:"rgba(0,212,168,.1)",cl:"#00d4a8",bd:"rgba(0,212,168,.25)"},bl:{bg:"rgba(0,153,255,.1)",cl:"#0099ff",bd:"rgba(0,153,255,.25)"},er:{bg:"rgba(255,71,87,.1)",cl:"#ff4757",bd:"rgba(255,71,87,.25)"},wn:{bg:"rgba(255,211,42,.1)",cl:"#ffd32a",bd:"rgba(255,211,42,.25)"}};
  const s=m[c]||m.ac;
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,background:s.bg,color:s.cl,border:`1px solid ${s.bd}`,fontSize:11,fontWeight:600,letterSpacing:".05em",textTransform:"uppercase"}}>{children}</span>;
};

const Bar = ({val,max,clr="#00d4a8",h=8}) => {
  const p=max>0?Math.min(100,(val/max)*100):0;
  return <div style={{width:"100%",height:h,background:"var(--s3)",borderRadius:h/2,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:clr,borderRadius:h/2,transition:"width 1s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 8px ${clr}40`}}/></div>;
};

const Btn = ({children,onClick,v="pr",sz="md",off=false,st={}}) => {
  const V={
    pr:{background:"linear-gradient(135deg,#00d4a8,#0099ff)",color:"#000",border:"none",boxShadow:"0 4px 16px rgba(0,212,168,.3)"},
    se:{background:"transparent",color:"var(--tx)",border:"1px solid var(--br)"},
    da:{background:"linear-gradient(135deg,#ff4757,#ff6b35)",color:"#fff",border:"none"},
    su:{background:"linear-gradient(135deg,#00d4a8,#00b894)",color:"#000",border:"none"},
    gh:{background:"rgba(255,255,255,.04)",color:"var(--t2)",border:"1px solid var(--br)"},
  };
  const S={sm:{padding:"8px 16px",fontSize:13},md:{padding:"12px 24px",fontSize:14},lg:{padding:"14px 30px",fontSize:15}};
  return (
    <button onClick={onClick} disabled={off}
      style={{...V[v],...S[sz],borderRadius:"var(--rs)",fontWeight:600,transition:"all .2s",opacity:off?.45:1,cursor:off?"not-allowed":"pointer",letterSpacing:".02em",...st}}
      onMouseEnter={e=>!off&&(e.currentTarget.style.transform="translateY(-1px)")}
      onMouseLeave={e=>!off&&(e.currentTarget.style.transform="translateY(0)")}
    >{children}</button>
  );
};

// Generic labeled text/email/password input with icon
const F = ({lb,tp="text",val,set,ph,ic,hint,mono=false,maxLen,bd}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {lb&&<label style={{fontSize:13,fontWeight:600,color:"var(--t2)",letterSpacing:".04em"}}>{lb}</label>}
    <div style={{position:"relative"}}>
      {ic&&<span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>{ic}</span>}
      <input type={tp} value={val} onChange={e=>set(e.target.value)} placeholder={ph} maxLength={maxLen}
        style={{width:"100%",background:"var(--s2)",border:`1px solid ${bd||"var(--br)"}`,borderRadius:"var(--rs)",padding:ic?"12px 14px 12px 40px":"12px 14px",color:"var(--tx)",fontSize:14,outline:"none",transition:"border-color .2s",fontFamily:mono?"var(--mo)":"var(--fn)",letterSpacing:mono?".06em":"normal"}}
        onFocus={e=>e.target.style.borderColor="var(--ac)"}
        onBlur={e=>e.target.style.borderColor=bd||"var(--br)"}
      />
    </div>
    {hint&&<p style={{fontSize:11,color:"var(--t3)",lineHeight:1.5}}>{hint}</p>}
  </div>
);

const Err = ({msg}) => !msg?null:(
  <div style={{display:"flex",gap:8,padding:"11px 14px",background:"rgba(255,71,87,.08)",border:"1px solid rgba(255,71,87,.2)",borderRadius:"var(--rs)",color:"var(--er)",fontSize:13,lineHeight:1.5,animation:"fi .2s ease"}}>
    <span>⚠️</span><span>{msg}</span>
  </div>
);

const Ok = ({msg}) => !msg?null:(
  <div style={{display:"flex",gap:8,padding:"11px 14px",background:"rgba(0,212,168,.08)",border:"1px solid rgba(0,212,168,.2)",borderRadius:"var(--rs)",color:"var(--ac)",fontSize:13,lineHeight:1.5,animation:"fi .2s ease"}}>
    <span>✅</span><span>{msg}</span>
  </div>
);

const Modal = ({open,close,title,children}) => !open?null:(
  <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.72)",backdropFilter:"blur(10px)",animation:"fi .2s ease",padding:16}} onClick={close}>
    <div className="card" style={{padding:28,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto",animation:"up .3s ease",boxShadow:"var(--sl)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h3 style={{fontSize:17,fontWeight:700}}>{title}</h3>
        <button onClick={close} style={{background:"none",border:"none",color:"var(--t3)",fontSize:20,cursor:"pointer",lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ─── LANDING (Login / Sign Up / Admin) ────────────────────────────────────────
function Landing({onStudent,onAdmin,status}) {
  const [pg,  setPg]  = useState("home");
  const [err, setErr] = useState("");
  const [ok,  setOk]  = useState("");
  const [busy,setBusy]= useState(false);

  // Signup state
  const [sName,  setName]  = useState("");
  const [sMatric,setMat]   = useState("");
  const [sEmail, setEmail] = useState("");

  // Login state
  const [lMat, setLMat]    = useState("");

  // Admin state
  const [aPw,  setAPw]     = useState("");

  const go = (p) => { setPg(p); setErr(""); setOk(""); };

  // ── validation helpers ────────────────────────────────────────────────────
  const matOk   = VALID_MATRIC.test(sMatric);
  const emailOk = VALID_EMAIL.test(sEmail);
  const nameOk  = sName.trim().split(" ").length >= 2 && sName.trim().length >= 4;

  // ── SIGN UP ───────────────────────────────────────────────────────────────
  const doSignup = async () => {
    setErr(""); setOk("");
    const nm  = clean(sName.trim());
    const mat = clean(sMatric.trim().toUpperCase());
    const em  = clean(sEmail.trim().toLowerCase());

    if (!nm || nm.split(" ").length < 2)
      return setErr("Please enter your full name (first and last name).");
    if (!VALID_MATRIC.test(mat))
      return setErr("Invalid Matric No. Must be between FT23CMP001 and FT23CMP500.");
    if (!VALID_EMAIL.test(em))
      return setErr("Please enter a valid email address (e.g. name@school.edu.ng).");

    setBusy(true);
    try {
      const ref  = doc(db, "users", mat);
      const snap = await getDoc(ref);
      if (snap.exists())
        return setErr("This Matric No is already registered. Please log in instead.");
      await setDoc(ref, { name:nm, matric:mat, email:em, hasVoted:false, createdAt:serverTimestamp() });
      setOk(`Welcome, ${nm.split(" ")[0]}! 🎉 Account created. Redirecting you to log in…`);
      setName(""); setMat(""); setEmail("");
      setTimeout(() => { go("login"); setLMat(mat); }, 2200);
    } catch(e) {
      setErr("Registration failed. Check your internet connection and try again.");
    } finally { setBusy(false); }
  };

  // ── LOG IN ────────────────────────────────────────────────────────────────
  const doLogin = async () => {
    setErr("");
    const mat = clean(lMat.trim().toUpperCase());
    if (!mat)                    return setErr("Please enter your Matriculation Number.");
    if (!VALID_MATRIC.test(mat)) return setErr("Invalid format. Must be FT23CMP001 – FT23CMP500.");
    setBusy(true);
    try {
      const snap = await getDoc(doc(db, "users", mat));
      if (!snap.exists())
        return setErr("Matric No not found. Please create an account first.");
      onStudent(mat, snap.data());
    } catch(e) {
      setErr("Connection error. Please check your internet and try again.");
    } finally { setBusy(false); }
  };

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  const doAdmin = () => {
    setErr("");
    if (!aPw)                   return setErr("Please enter the admin password.");
    if (aPw !== ADMIN_PASSWORD) return setErr("Incorrect password. Access denied.");
    setBusy(true);
    setTimeout(() => { setBusy(false); onAdmin(); }, 600);
  };

  const isOpen   = status === "open";
  const isClosed = status === "closed";

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"var(--bg)",backgroundImage:"radial-gradient(ellipse at 20% 50%,rgba(0,212,168,.06) 0%,transparent 55%),radial-gradient(ellipse at 80% 15%,rgba(0,153,255,.06) 0%,transparent 55%)"}}>
      <div style={{width:"100%",maxWidth:462,animation:"up .6s ease"}}>

        {/* ── LOGO ── */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:74,height:74,borderRadius:22,background:"linear-gradient(135deg,rgba(0,212,168,.18),rgba(0,153,255,.18))",border:"1px solid rgba(0,212,168,.3)",fontSize:34,marginBottom:14,boxShadow:"var(--gl)"}}>🗳️</div>
          <h1 style={{fontSize:25,fontWeight:800,letterSpacing:"-.02em",marginBottom:5}}>VoteSecure</h1>
          <p style={{color:"var(--t2)",fontSize:12,marginBottom:12,letterSpacing:".03em"}}>300 LEVEL CMP ONLINE VOTING SYSTEM</p>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:20,background:isOpen?"rgba(0,212,168,.08)":isClosed?"rgba(255,71,87,.08)":"rgba(255,211,42,.08)",border:`1px solid ${isOpen?"rgba(0,212,168,.2)":isClosed?"rgba(255,71,87,.2)":"rgba(255,211,42,.2)"}`}}>
            <Dot on={isOpen}/>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:".06em",color:isOpen?"var(--ac)":isClosed?"var(--er)":"var(--wn)"}}>
              {isOpen?"ELECTION LIVE":isClosed?"ELECTION CLOSED":"ELECTION PENDING"}
            </span>
          </div>
        </div>

        {/* ── HOME ── */}
        {pg==="home"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12,animation:"up .4s ease"}}>
            {[
              {p:"signup",ic:"📝",title:"Create Account",       sub:"New student? Register with your details",  col:"var(--ac)"},
              {p:"login", ic:"🔐",title:"Student Login",        sub:"Already registered? Log in to vote",       col:"var(--ac)"},
              {p:"admin", ic:"🛡️",title:"Course Rep Dashboard", sub:"Admin access — password protected",        col:"var(--bl)"},
            ].map(b=>(
              <button key={b.p} onClick={()=>go(b.p)}
                style={{background:"var(--s1)",border:"1px solid var(--br)",borderRadius:"var(--rd)",padding:"18px 22px",display:"flex",alignItems:"center",gap:16,cursor:"pointer",transition:"all .2s",textAlign:"left",width:"100%"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=b.col;e.currentTarget.style.background="var(--s2)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--br)";e.currentTarget.style.background="var(--s1)"}}
              >
                <div style={{width:48,height:48,borderRadius:14,background:`${b.col==="var(--ac)"?"rgba(0,212,168,.1)":"rgba(0,153,255,.1)"}`,border:`1px solid ${b.col==="var(--ac)"?"rgba(0,212,168,.2)":"rgba(0,153,255,.2)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{b.ic}</div>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,fontSize:15,color:"var(--tx)",marginBottom:3}}>{b.title}</p>
                  <p style={{color:"var(--t2)",fontSize:12}}>{b.sub}</p>
                </div>
                <span style={{color:"var(--t3)",fontSize:20}}>›</span>
              </button>
            ))}
            <div style={{marginTop:4,padding:"13px 16px",background:"rgba(0,153,255,.05)",borderRadius:"var(--rs)",border:"1px solid rgba(0,153,255,.12)"}}>
              <p style={{fontSize:12,color:"var(--t2)",lineHeight:1.7}}>🔒 <strong style={{color:"var(--tx)"}}>Secure & Anonymous</strong> — Your vote is stored in Firebase. Your identity is <em>never</em> linked to your choice. You receive a unique receipt ID as proof of voting.</p>
            </div>
          </div>
        )}

        {/* ── SIGN UP ── */}
        {pg==="signup"&&(
          <div className="card" style={{padding:28,animation:"up .4s ease"}}>
            <button onClick={()=>go("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:13,cursor:"pointer",marginBottom:22,display:"flex",alignItems:"center",gap:5}}>← Back</button>

            <div style={{marginBottom:24}}>
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:44,height:44,borderRadius:12,background:"rgba(0,212,168,.1)",border:"1px solid rgba(0,212,168,.2)",fontSize:20,marginBottom:12}}>📝</div>
              <h2 style={{fontSize:20,fontWeight:800,marginBottom:5}}>Create Your Account</h2>
              <p style={{color:"var(--t2)",fontSize:13,lineHeight:1.6}}>Register once with your university details to access the ballot. All fields are required.</p>
            </div>

            {/* Progress indicators */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:24}}>
              {[
                {lbl:"Full Name",  ok:nameOk},
                {lbl:"Matric No",  ok:matOk},
                {lbl:"Email",      ok:emailOk},
              ].map(s=>(
                <div key={s.lbl}>
                  <div style={{height:3,borderRadius:2,background:s.ok?"var(--ac)":"var(--br)",marginBottom:5,transition:"background .3s"}}/>
                  <p style={{fontSize:10,color:s.ok?"var(--ac)":"var(--t3)",fontWeight:600,letterSpacing:".04em",textAlign:"center"}}>{s.lbl} {s.ok?"✓":""}</p>
                </div>
              ))}
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:18}}>

              {/* ── Full Name ── */}
              <F lb="Full Name *" val={sName} set={setName}
                ph="e.g. Chidi Emmanuel Okafor" ic="👤"
                hint="Enter first and last name exactly as it appears on your university ID"
                bd={sName&&!nameOk?"var(--er)":sName&&nameOk?"var(--ac)":undefined}
              />

              {/* ── Matric No ── */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:"var(--t2)",letterSpacing:".04em"}}>Matriculation Number *</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>🎓</span>
                  <input type="text" value={sMatric}
                    onChange={e=>setMat(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))}
                    placeholder="e.g. FT23CMP042" maxLength={12}
                    style={{width:"100%",background:"var(--s2)",border:`1px solid ${sMatric&&!matOk?"var(--er)":sMatric&&matOk?"var(--ac)":"var(--br)"}`,borderRadius:"var(--rs)",padding:"12px 40px 12px 40px",color:"var(--tx)",fontSize:14,outline:"none",fontFamily:"var(--mo)",letterSpacing:".06em",transition:"border-color .2s"}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor=sMatric&&!matOk?"var(--er)":sMatric&&matOk?"var(--ac)":"var(--br)"}
                  />
                  {sMatric&&(
                    <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>{matOk?"✅":"❌"}</span>
                  )}
                </div>
                <p style={{fontSize:11,color:"var(--t3)"}}>Format: FT23CMP001 – FT23CMP500 · Automatically converts to uppercase</p>
              </div>

              {/* ── Email ── */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:"var(--t2)",letterSpacing:".04em"}}>University Email Address *</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>✉️</span>
                  <input type="email" value={sEmail} onChange={e=>setEmail(e.target.value)}
                    placeholder="e.g. ft23cmp042@university.edu.ng"
                    style={{width:"100%",background:"var(--s2)",border:`1px solid ${sEmail&&!emailOk?"var(--er)":sEmail&&emailOk?"var(--ac)":"var(--br)"}`,borderRadius:"var(--rs)",padding:"12px 40px 12px 40px",color:"var(--tx)",fontSize:14,outline:"none",transition:"border-color .2s"}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor=sEmail&&!emailOk?"var(--er)":sEmail&&emailOk?"var(--ac)":"var(--br)"}
                  />
                  {sEmail&&(
                    <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>{emailOk?"✅":"❌"}</span>
                  )}
                </div>
                <p style={{fontSize:11,color:"var(--t3)"}}>Use your official university email address</p>
              </div>

              {/* Privacy note */}
              <div style={{padding:"12px 14px",background:"rgba(0,212,168,.05)",borderRadius:"var(--rs)",border:"1px solid rgba(0,212,168,.12)"}}>
                <p style={{fontSize:12,color:"var(--t2)",lineHeight:1.65}}>
                  🔐 Your details are stored securely in Firebase. Your name and email are <strong style={{color:"var(--tx)"}}>never</strong> linked to your vote — anonymity is enforced at the database level.
                </p>
              </div>

              <Err msg={err}/>
              <Ok  msg={ok}/>

              <Btn v="pr" sz="lg" off={busy} onClick={doSignup} st={{width:"100%",textAlign:"center"}}>
                {busy?"Creating Account…":"✅  Create My Account"}
              </Btn>

              <p style={{fontSize:13,textAlign:"center",color:"var(--t2)"}}>
                Already registered?{" "}
                <button onClick={()=>go("login")} style={{background:"none",border:"none",color:"var(--ac)",cursor:"pointer",fontWeight:700,fontSize:13}}>Log in here →</button>
              </p>
            </div>
          </div>
        )}

        {/* ── LOGIN ── */}
        {pg==="login"&&(
          <div className="card" style={{padding:28,animation:"up .4s ease"}}>
            <button onClick={()=>go("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:13,cursor:"pointer",marginBottom:22,display:"flex",alignItems:"center",gap:5}}>← Back</button>

            <div style={{marginBottom:24}}>
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:44,height:44,borderRadius:12,background:"rgba(0,212,168,.1)",border:"1px solid rgba(0,212,168,.2)",fontSize:20,marginBottom:12}}>🔐</div>
              <h2 style={{fontSize:20,fontWeight:800,marginBottom:5}}>Student Login</h2>
              <p style={{color:"var(--t2)",fontSize:13,lineHeight:1.6}}>Enter your Matriculation Number to access the ballot.</p>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{fontSize:13,fontWeight:600,color:"var(--t2)",letterSpacing:".04em"}}>Matriculation Number</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>🎓</span>
                  <input type="text" value={lMat}
                    onChange={e=>setLMat(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))}
                    placeholder="e.g. FT23CMP042" maxLength={12}
                    style={{width:"100%",background:"var(--s2)",border:"1px solid var(--br)",borderRadius:"var(--rs)",padding:"13px 14px 13px 40px",color:"var(--tx)",fontSize:15,outline:"none",fontFamily:"var(--mo)",letterSpacing:".06em",transition:"border-color .2s"}}
                    onFocus={e=>e.target.style.borderColor="var(--ac)"}
                    onBlur={e=>e.target.style.borderColor="var(--br)"}
                    onKeyDown={e=>e.key==="Enter"&&doLogin()}
                  />
                </div>
                <p style={{fontSize:11,color:"var(--t3)"}}>Format: FT23CMP001 – FT23CMP500</p>
              </div>

              <Err msg={err}/>

              <Btn sz="lg" off={busy} onClick={doLogin} st={{width:"100%",textAlign:"center"}}>
                {busy?"Verifying…":"Access Voter Portal  →"}
              </Btn>

              <p style={{fontSize:13,textAlign:"center",color:"var(--t2)"}}>
                Don't have an account?{" "}
                <button onClick={()=>go("signup")} style={{background:"none",border:"none",color:"var(--ac)",cursor:"pointer",fontWeight:700,fontSize:13}}>Register here →</button>
              </p>
            </div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {pg==="admin"&&(
          <div className="card" style={{padding:28,animation:"up .4s ease"}}>
            <button onClick={()=>go("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:13,cursor:"pointer",marginBottom:22,display:"flex",alignItems:"center",gap:5}}>← Back</button>
            <div style={{marginBottom:24}}>
              <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:44,height:44,borderRadius:12,background:"rgba(0,153,255,.1)",border:"1px solid rgba(0,153,255,.2)",fontSize:20,marginBottom:12}}>🛡️</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
                <h2 style={{fontSize:20,fontWeight:800}}>Admin Access</h2>
                <Tag c="bl">Restricted</Tag>
              </div>
              <p style={{color:"var(--t2)",fontSize:13,lineHeight:1.6}}>Restricted to the Course Representative only.</p>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <F lb="Admin Password" tp="password" val={aPw} set={setAPw} ph="Enter admin password" ic="🔑"/>
              <Err msg={err}/>
              <Btn v="se" sz="lg" off={busy} onClick={doAdmin} st={{width:"100%",textAlign:"center"}}>
                {busy?"Authenticating…":"🔓  Enter Dashboard"}
              </Btn>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── VOTER PORTAL ─────────────────────────────────────────────────────────────
function Voter({sid, student, onOut}) {
  const [election,setElection]= useState(null);
  const [cands,   setCands]   = useState([]);
  const [pick,    setPick]    = useState(null);
  const [expand,  setExpand]  = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [rcpt,    setRcpt]    = useState(null);
  const [voting,  setVoting]  = useState(false);
  const [voted,   setVoted]   = useState(student.hasVoted||false);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");

  useEffect(()=>{
    const u1=onSnapshot(doc(db,"elections",ELECTION_ID),s=>{if(s.exists())setElection(s.data());});
    const u2=onSnapshot(query(collection(db,"candidates"),orderBy("createdAt","asc")),s=>{setCands(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);});
    const u3=onSnapshot(doc(db,"users",sid),s=>{if(s.exists())setVoted(s.data().hasVoted||false);});
    return()=>{u1();u2();u3();};
  },[sid]);

  const castVote = async () => {
    if(!pick||voting)return;
    setVoting(true); setErr("");
    const rid = mkRcpt();
    try {
      await runTransaction(db, async tx => {
        const uRef  = doc(db,"users",sid);
        const uSnap = await tx.get(uRef);
        if(uSnap.data()?.hasVoted) throw new Error("voted");
        tx.set(doc(collection(db,"votes")), {receiptId:rid,candidateId:pick,electionId:ELECTION_ID,votedAt:serverTimestamp()});
        tx.update(uRef, {hasVoted:true, receiptId:rid});
        const cRef  = doc(db,"candidates",pick);
        const cSnap = await tx.get(cRef);
        tx.update(cRef, {votes:(cSnap.data()?.votes||0)+1});
        const eRef  = doc(db,"elections",ELECTION_ID);
        const eSnap = await tx.get(eRef);
        tx.update(eRef, {totalVotes:(eSnap.data()?.totalVotes||0)+1});
      });
      setRcpt({rid, cand:cands.find(c=>c.id===pick), ts:new Date().toLocaleString()});
      setConfirm(false);
      setVoted(true);
    } catch(e) {
      setErr(e.message==="voted"?"You have already voted.":"Vote failed. Please try again.");
      setConfirm(false);
    } finally { setVoting(false); }
  };

  const closed = election?.status==="closed";
  if(loading) return <Spin/>;

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)"}}>
      <header style={{background:"rgba(17,24,39,.96)",backdropFilter:"blur(12px)",borderBottom:"1px solid var(--br)",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>🗳️</span>
          <div>
            <p style={{fontWeight:700,fontSize:14}}>VoteSecure</p>
            <p style={{fontSize:10,color:"var(--t2)"}}>300 LEVEL CMP ONLINE VOTING SYSTEM</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}><Dot on={!closed}/><span style={{fontSize:11,color:closed?"var(--er)":"var(--ac)",fontWeight:700,letterSpacing:".04em"}}>{closed?"CLOSED":"LIVE"}</span></div>
          <div style={{padding:"5px 11px",background:"var(--s1)",borderRadius:"var(--rs)",border:"1px solid var(--br)",fontSize:11,color:"var(--t2)",fontFamily:"var(--mo)"}}>👤 {sid}</div>
          <button onClick={onOut} style={{background:"none",border:"1px solid var(--br)",color:"var(--t3)",padding:"5px 12px",borderRadius:"var(--rs)",fontSize:12,cursor:"pointer"}}>Logout</button>
        </div>
      </header>

      <div style={{maxWidth:940,margin:"0 auto",padding:"32px 20px"}}>
        {/* Welcome banner */}
        <div style={{marginBottom:24,padding:"16px 20px",background:"var(--s1)",borderRadius:"var(--rd)",border:"1px solid var(--br)",display:"flex",alignItems:"center",gap:14,animation:"up .4s ease"}}>
          <div style={{width:42,height:42,borderRadius:11,background:"linear-gradient(135deg,rgba(0,212,168,.2),rgba(0,153,255,.2))",border:"1px solid rgba(0,212,168,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"var(--ac)",fontFamily:"var(--mo)",flexShrink:0}}>{mkAvatar(student.name||"ST")}</div>
          <div style={{flex:1}}>
            <p style={{fontWeight:700,fontSize:14,marginBottom:2}}>Welcome back, {(student.name||"Student").split(" ")[0]}! 👋</p>
            <p style={{fontSize:11,color:"var(--t2)"}}>{student.email} · <span style={{fontFamily:"var(--mo)"}}>{sid}</span></p>
          </div>
          {voted&&<Tag c="ac">Voted ✓</Tag>}
        </div>

        {err&&<div style={{marginBottom:18}}><Err msg={err}/></div>}

        {voted&&(
          <div style={{background:"rgba(0,212,168,.07)",border:"1px solid rgba(0,212,168,.25)",borderRadius:"var(--rd)",padding:"16px 20px",marginBottom:24,display:"flex",gap:14,alignItems:"center",animation:"up .4s ease"}}>
            <span style={{fontSize:26}}>✅</span>
            <div><p style={{fontWeight:700,color:"var(--ac)",marginBottom:2}}>Your vote has been recorded in Firebase!</p><p style={{fontSize:13,color:"var(--t2)"}}>Your choice is anonymous and cannot be changed.</p></div>
          </div>
        )}
        {closed&&!voted&&(
          <div style={{background:"rgba(255,71,87,.07)",border:"1px solid rgba(255,71,87,.25)",borderRadius:"var(--rd)",padding:"16px 20px",marginBottom:24}}>
            <p style={{fontWeight:700,color:"var(--er)",marginBottom:2}}>🔒 Election Closed</p>
            <p style={{fontSize:13,color:"var(--t2)"}}>Voting has ended. Results are being processed.</p>
          </div>
        )}

        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:23,fontWeight:800,letterSpacing:"-.02em",marginBottom:6}}>{voted?"Election Candidates":"Cast Your Vote"}</h2>
          <p style={{color:"var(--t2)",fontSize:13}}>{voted?"You have already voted. Candidates are shown for reference.":closed?"Voting is now closed.":"Review each candidate carefully. Your vote is anonymous and permanent."}</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))",gap:16,marginBottom:32}}>
          {cands.map((c,i)=>{
            const sel=pick===c.id;
            return(
              <div key={c.id}
                style={{background:"var(--s1)",border:`2px solid ${sel&&!voted?"var(--ac)":"var(--br)"}`,borderRadius:"var(--rd)",padding:20,cursor:voted||closed?"default":"pointer",transition:"all .25s",animation:`up .5s ease ${i*.08}s both`,transform:sel&&!voted?"translateY(-3px)":"none",boxShadow:sel&&!voted?"var(--gl)":"var(--sh)"}}
                onClick={()=>!voted&&!closed&&setPick(sel?null:c.id)}
              >
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{width:52,height:52,borderRadius:14,background:`${c.color}28`,border:`2px solid ${c.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:c.color,fontFamily:"var(--mo)"}}>{c.avatar}</div>
                  {sel&&!voted&&<div style={{width:25,height:25,borderRadius:"50%",background:"var(--ac)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,animation:"fi .2s ease"}}>✓</div>}
                </div>
                <h3 style={{fontWeight:700,fontSize:15,marginBottom:3}}>{c.name}</h3>
                <p style={{fontSize:11,color:"var(--ac)",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>{c.position}</p>
                <p style={{fontSize:13,color:"var(--t2)",lineHeight:1.75,marginBottom:10}}>{expand===c.id?c.manifesto:c.manifesto.slice(0,95)+"…"}</p>
                <button onClick={e=>{e.stopPropagation();setExpand(expand===c.id?null:c.id)}} style={{background:"none",border:"none",color:"var(--ac)",fontSize:12,cursor:"pointer",fontWeight:600}}>
                  {expand===c.id?"▲ Show less":"▼ Read full manifesto"}
                </button>
              </div>
            );
          })}
        </div>

        {!voted&&!closed&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,animation:"up .6s ease"}}>
            <Btn sz="lg" off={!pick} onClick={()=>setConfirm(true)} st={{minWidth:230,textAlign:"center"}}>🗳️  Submit My Vote</Btn>
            <p style={{fontSize:12,color:"var(--t3)"}}>{pick?`Selected: ${cands.find(c=>c.id===pick)?.name}`:"Select a candidate above to continue"}</p>
          </div>
        )}
      </div>

      <Modal open={confirm} close={()=>setConfirm(false)} title="Confirm Your Vote">
        {pick&&(()=>{const c=cands.find(x=>x.id===pick);return c&&(
          <div>
            <p style={{color:"var(--t2)",fontSize:13,marginBottom:18}}>You are about to cast your vote for:</p>
            <div style={{background:"var(--s2)",borderRadius:"var(--rs)",padding:16,marginBottom:16,border:"1px solid var(--br)",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:44,height:44,borderRadius:11,background:`${c.color}28`,border:`2px solid ${c.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:c.color,fontFamily:"var(--mo)"}}>{c.avatar}</div>
              <div><p style={{fontWeight:700,fontSize:15}}>{c.name}</p><p style={{fontSize:12,color:"var(--t2)"}}>{c.position}</p></div>
            </div>
            <div style={{background:"rgba(255,211,42,.07)",border:"1px solid rgba(255,211,42,.2)",borderRadius:"var(--rs)",padding:11,marginBottom:18}}>
              <p style={{fontSize:13,color:"var(--wn)"}}>⚠️ This is permanent and cannot be undone. You may only vote once.</p>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn v="se" onClick={()=>setConfirm(false)} st={{flex:1,textAlign:"center"}}>Cancel</Btn>
              <Btn off={voting} onClick={castVote} st={{flex:1,textAlign:"center"}}>{voting?"⏳ Recording…":"✅  Confirm Vote"}</Btn>
            </div>
          </div>
        );})()}
      </Modal>

      <Modal open={!!rcpt} close={()=>setRcpt(null)} title="🎉 Vote Recorded!">
        {rcpt&&(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:58,marginBottom:12}}>✅</div>
            <h3 style={{fontSize:18,fontWeight:800,marginBottom:8}}>Your vote has been cast!</h3>
            <p style={{color:"var(--t2)",fontSize:13,marginBottom:20,lineHeight:1.7}}>Your identity is not linked to your choice. Save this receipt as proof of participation:</p>
            <div style={{background:"var(--s2)",borderRadius:"var(--rd)",padding:20,marginBottom:18,border:"1px solid rgba(0,212,168,.25)"}}>
              <p style={{fontSize:11,color:"var(--t3)",marginBottom:8,textTransform:"uppercase",letterSpacing:".1em"}}>Transaction Receipt ID</p>
              <p style={{fontSize:16,fontFamily:"var(--mo)",color:"var(--ac)",fontWeight:700,letterSpacing:".08em",wordBreak:"break-all"}}>{rcpt.rid}</p>
              <p style={{fontSize:11,color:"var(--t3)",marginTop:8}}>{rcpt.ts}</p>
            </div>
            <p style={{fontSize:12,color:"var(--t3)",marginBottom:18}}>This ID proves your vote was counted without revealing who you chose.</p>
            <Btn onClick={()=>setRcpt(null)} st={{width:"100%",textAlign:"center"}}>Close</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function Admin({onOut}) {
  const [tab,    setTab]    = useState("overview");
  const [elec,   setElec]   = useState(null);
  const [cands,  setCands]  = useState([]);
  const [votes,  setVotes]  = useState([]);
  const [ready,  setReady]  = useState(false);
  const [busy,   setBusy]   = useState(false);

  const [addOpen,  setAddOpen]  = useState(false);
  const [editOpen, setEditOpen] = useState(null);
  const [endOpen,  setEndOpen]  = useState(false);
  const [resOpen,  setResOpen]  = useState(false);

  const [nName,  setNName]  = useState("");
  const [nManif, setNManif] = useState("");
  const [eName,  setEName]  = useState("");
  const [eManif, setEManif] = useState("");

  useEffect(()=>{
    const u1=onSnapshot(doc(db,"elections",ELECTION_ID),s=>{if(s.exists())setElec({id:s.id,...s.data()});});
    const u2=onSnapshot(query(collection(db,"candidates"),orderBy("createdAt","asc")),s=>{setCands(s.docs.map(d=>({id:d.id,...d.data()})));setReady(true);});
    const u3=onSnapshot(query(collection(db,"votes"),orderBy("votedAt","desc")),s=>setVotes(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();u3();};
  },[]);

  const tv   = elec?.totalVotes||0;
  const ts   = elec?.totalStudents||500;
  const tp   = Math.round((tv/ts)*100);
  const isOpen  = elec?.status==="open";
  const isClosed= elec?.status==="closed";
  const ranked  = [...cands].sort((a,b)=>b.votes-a.votes);
  const winner  = ranked[0];

  const toggle=async()=>await updateDoc(doc(db,"elections",ELECTION_ID),{status:isOpen?"closed":"open"});

  const addCand=async()=>{
    if(!nName.trim())return;
    setBusy(true);
    await addDoc(collection(db,"candidates"),{name:clean(nName.trim()),position:"Course Representative",manifesto:clean(nManif.trim())||"Manifesto to be added.",avatar:mkAvatar(nName),color:COLORS[cands.length%COLORS.length],votes:0,createdAt:serverTimestamp()});
    setNName("");setNManif("");setAddOpen(false);setBusy(false);
  };

  const saveCand=async()=>{
    setBusy(true);
    await updateDoc(doc(db,"candidates",editOpen),{name:clean(eName),manifesto:clean(eManif)});
    setEditOpen(null);setBusy(false);
  };

  const delCand=async(id)=>{
    if(!window.confirm("Remove this candidate?"))return;
    await deleteDoc(doc(db,"candidates",id));
  };

  const endElec=async()=>{
    await updateDoc(doc(db,"elections",ELECTION_ID),{status:"closed",winnerId:ranked[0]?.id||null,endedAt:serverTimestamp()});
    setEndOpen(false);setResOpen(true);
  };

  const TABS=[{id:"overview",l:"📊 Overview"},{id:"candidates",l:"👥 Candidates"},{id:"monitoring",l:"📡 Live Monitor"},{id:"schema",l:"🗄️ DB Schema"}];
  if(!ready)return <Spin/>;

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex"}}>
      <aside style={{width:230,background:"var(--s1)",borderRight:"1px solid var(--br)",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
        <div style={{padding:"20px 18px",borderBottom:"1px solid var(--br)"}}>
          <span style={{fontSize:22}}>🛡️</span>
          <p style={{fontWeight:800,fontSize:14,marginTop:7}}>Admin Dashboard</p>
          <p style={{fontSize:11,color:"var(--t2)",marginTop:2}}>300 Level CMP</p>
        </div>
        <nav style={{padding:10,flex:1}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:"100%",textAlign:"left",background:tab===t.id?"rgba(0,212,168,.1)":"transparent",border:tab===t.id?"1px solid rgba(0,212,168,.2)":"1px solid transparent",borderRadius:"var(--rs)",padding:"10px 13px",marginBottom:3,color:tab===t.id?"var(--ac)":"var(--t2)",fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",transition:"all .2s"}}>{t.l}</button>
          ))}
        </nav>
        <div style={{padding:13,borderTop:"1px solid var(--br)"}}>
          <div style={{marginBottom:10,padding:"10px 12px",background:`rgba(${isOpen?"0,212,168":"255,71,87"},.07)`,borderRadius:"var(--rs)",border:`1px solid rgba(${isOpen?"0,212,168":"255,71,87"},.2)`}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><Dot on={isOpen}/><span style={{fontSize:11,fontWeight:700,color:isOpen?"var(--ac)":"var(--er)"}}>{isOpen?"ELECTION OPEN":"ELECTION CLOSED"}</span></div>
            <Btn v={isOpen?"da":"su"} sz="sm" onClick={toggle} st={{width:"100%",textAlign:"center",fontSize:12}}>{isOpen?"🔒 Close Voting":"🔓 Open Voting"}</Btn>
          </div>
          <button onClick={onOut} style={{width:"100%",background:"none",border:"1px solid var(--br)",color:"var(--t3)",padding:9,borderRadius:"var(--rs)",fontSize:12,cursor:"pointer"}}>← Logout</button>
        </div>
      </aside>

      <main style={{flex:1,padding:"26px 30px",overflowY:"auto"}}>

        {tab==="overview"&&(
          <div style={{animation:"up .4s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div><h1 style={{fontSize:22,fontWeight:800,letterSpacing:"-.02em",marginBottom:4}}>Election Overview</h1><p style={{color:"var(--t2)",fontSize:13}}>Live Firebase data · Auto-refreshes in real time</p></div>
              {!isClosed?<Btn v="da" sz="sm" onClick={()=>setEndOpen(true)}>🏁 End Election</Btn>:<Btn sz="sm" onClick={()=>setResOpen(true)}>🏆 View Results</Btn>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:13,marginBottom:24}}>
              {[{l:"Votes Cast",v:tv,ic:"🗳️",cl:"var(--ac)"},{l:"Total Students",v:ts,ic:"🎓",cl:"var(--bl)"},{l:"Turnout",v:`${tp}%`,ic:"📊",cl:"var(--wn)"},{l:"Candidates",v:cands.length,ic:"👥",cl:"var(--or)"}].map((s,i)=>(
                <div key={i} className="card" style={{padding:18,textAlign:"center",animation:`up .4s ease ${i*.08}s both`}}>
                  <div style={{fontSize:24,marginBottom:6}}>{s.ic}</div>
                  <div style={{fontSize:24,fontWeight:800,color:s.cl,fontFamily:"var(--mo)"}}>{s.v}</div>
                  <div style={{fontSize:11,color:"var(--t2)",marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:20,marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}><h3 style={{fontWeight:700,fontSize:14}}>Voter Turnout</h3><Tag c={tp>70?"ac":tp>40?"wn":"er"}>{tp}% Participated</Tag></div>
              <Bar val={tv} max={ts} clr="var(--ac)" h={13}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:9,fontSize:12,color:"var(--t3)"}}><span>✅ {tv} voted</span><span>⏳ {ts-tv} remaining</span></div>
            </div>
            <div className="card" style={{padding:20}}>
              <h3 style={{fontWeight:700,fontSize:14,marginBottom:6}}>Live Vote Distribution</h3>
              <p style={{fontSize:12,color:"var(--t3)",marginBottom:16,fontStyle:"italic"}}>ℹ️ Exact counts hidden until election closes.</p>
              {ranked.map((c,i)=>{
                const p=tv>0?Math.round((c.votes/tv)*100):0;
                const cl=["var(--ac)","var(--bl)","var(--or)","var(--wn)"][i%4];
                return(
                  <div key={c.id} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:7,background:`${c.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:c.color,fontFamily:"var(--mo)"}}>{c.avatar}</div><span style={{fontWeight:600,fontSize:13}}>{c.name}</span></div>
                      <span style={{fontFamily:"var(--mo)",fontSize:12,color:cl}}>{isClosed?`${c.votes} votes`:`${p}%`}</span>
                    </div>
                    <Bar val={c.votes} max={Math.max(tv,1)} clr={cl} h={9}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="candidates"&&(
          <div style={{animation:"up .4s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><h1 style={{fontSize:22,fontWeight:800}}>Candidate Management</h1><Btn sz="sm" onClick={()=>setAddOpen(true)}>+ Add Candidate</Btn></div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              {cands.map((c,i)=>(
                <div key={c.id} className="card" style={{padding:18,animation:`up .4s ease ${i*.08}s both`}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:13}}>
                    <div style={{width:48,height:48,borderRadius:12,background:`${c.color}25`,border:`2px solid ${c.color}45`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:c.color,flexShrink:0,fontFamily:"var(--mo)"}}>{c.avatar}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                        <div><p style={{fontWeight:700,fontSize:15,marginBottom:2}}>{c.name}</p><p style={{fontSize:11,color:"var(--ac)",fontWeight:600,letterSpacing:".04em"}}>{c.position}</p></div>
                        <div style={{display:"flex",gap:7}}>
                          <button onClick={()=>{setEditOpen(c.id);setEName(c.name);setEManif(c.manifesto);}} style={{background:"rgba(0,153,255,.08)",border:"1px solid rgba(0,153,255,.2)",color:"var(--bl)",padding:"6px 12px",borderRadius:"var(--rs)",fontSize:12,cursor:"pointer"}}>✏️ Edit</button>
                          <button onClick={()=>delCand(c.id)} style={{background:"rgba(255,71,87,.08)",border:"1px solid rgba(255,71,87,.2)",color:"var(--er)",padding:"6px 12px",borderRadius:"var(--rs)",fontSize:12,cursor:"pointer"}}>🗑️ Remove</button>
                        </div>
                      </div>
                      <p style={{fontSize:13,color:"var(--t2)",marginTop:9,lineHeight:1.75}}>{c.manifesto}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!cands.length&&<p style={{color:"var(--t3)",fontSize:14}}>No candidates yet.</p>}
            </div>
          </div>
        )}

        {tab==="monitoring"&&(
          <div style={{animation:"up .4s ease"}}>
            <div style={{marginBottom:22}}><h1 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Live Monitoring</h1><p style={{color:"var(--t2)",fontSize:13}}>Real-time Firebase data · Student identities never shown.</p></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
              <div className="card" style={{padding:18,animation:"gp 3s ease infinite"}}>
                <p style={{fontSize:11,color:"var(--t3)",marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>Votes Cast</p>
                <p style={{fontSize:42,fontWeight:800,fontFamily:"var(--mo)",color:"var(--ac)"}}>{tv}</p>
                <p style={{fontSize:12,color:"var(--t2)",marginTop:3}}>of {ts} students</p>
              </div>
              <div className="card" style={{padding:18}}>
                <p style={{fontSize:11,color:"var(--t3)",marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>Turnout</p>
                <p style={{fontSize:42,fontWeight:800,fontFamily:"var(--mo)",color:"var(--wn)"}}>{tp}%</p>
                <p style={{fontSize:12,color:"var(--t2)",marginTop:3}}>participation rate</p>
              </div>
            </div>
            <div className="card" style={{padding:20,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <h3 style={{fontWeight:700,fontSize:14}}>Participation Gauge</h3>
                <div style={{display:"flex",alignItems:"center",gap:7}}><Dot on={isOpen}/><span style={{fontSize:12,color:isOpen?"var(--ac)":"var(--er)",fontWeight:600}}>{isOpen?"Accepting Votes":"Closed"}</span></div>
              </div>
              <Bar val={tv} max={ts} clr="var(--ac)" h={16}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:9,fontSize:12,color:"var(--t2)"}}><span>✅ {tv} voted</span><span>⏳ {ts-tv} pending</span></div>
            </div>
            <div className="card" style={{padding:20}}>
              <h3 style={{fontWeight:700,fontSize:14,marginBottom:16}}>Anonymous Vote Log <span style={{fontSize:12,color:"var(--t3)",fontWeight:400}}>· receipt IDs only</span></h3>
              {!votes.length?<p style={{color:"var(--t3)",fontSize:13}}>No votes yet.</p>:(
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {votes.slice(0,60).map(v=>(
                    <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--s2)",borderRadius:"var(--rs)",padding:"10px 14px",border:"1px solid var(--br)",animation:"si .3s ease"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,borderRadius:"50%",background:"var(--ac)",flexShrink:0}}/><span style={{fontFamily:"var(--mo)",fontSize:12,color:"var(--t2)"}}>{v.receiptId}</span></div>
                      <span style={{fontSize:11,color:"var(--t3)"}}>{v.votedAt?.toDate?.()?.toLocaleTimeString?.()??""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="schema"&&(
          <div style={{animation:"up .4s ease"}}>
            <h1 style={{fontSize:22,fontWeight:800,marginBottom:5}}>Firebase Data Structure</h1>
            <p style={{color:"var(--t2)",fontSize:13,marginBottom:24}}>Firestore collections powering this system.</p>
            {[
              {coll:"users/{matricNo}",cl:"#0099ff",desc:"Created at signup. Stores name, matric, email. has_voted enforces one-vote rule via atomic transaction.",flds:[{f:"name",t:"string",n:"Full name from signup"},{f:"matric",t:"string",n:"e.g. FT23CMP042"},{f:"email",t:"string",n:"University email"},{f:"hasVoted",t:"boolean",n:"🔐 One-vote gate"},{f:"receiptId",t:"string?",n:"Set after voting"},{f:"createdAt",t:"timestamp",n:"Signup time"}]},
              {coll:"candidates/{id}",cl:"#00d4a8",desc:"Managed by admin. votes counter incremented atomically.",flds:[{f:"name",t:"string",n:""},{f:"position",t:"string",n:""},{f:"manifesto",t:"string",n:"HTML-sanitized"},{f:"avatar",t:"string",n:"Initials"},{f:"votes",t:"number",n:"Atomic increment"},{f:"createdAt",t:"timestamp",n:""}]},
              {coll:"votes/{id}",cl:"#ff6b35",desc:"⚠️ Student matric/ID is NEVER stored here — anonymity by design.",flds:[{f:"receiptId",t:"string",n:"Voter proof token"},{f:"candidateId",t:"string",n:"FK → candidates"},{f:"electionId",t:"string",n:"FK → elections"},{f:"votedAt",t:"timestamp",n:"Server timestamp"}]},
              {coll:"elections/{id}",cl:"#ffd32a",desc:"One document manages the entire election lifecycle.",flds:[{f:"title",t:"string",n:""},{f:"status",t:"'pending'|'open'|'closed'",n:"Toggleable"},{f:"totalStudents",t:"number",n:"For turnout calc"},{f:"totalVotes",t:"number",n:"Atomic increment"},{f:"winnerId",t:"string?",n:"Set on close"},{f:"endedAt",t:"timestamp?",n:""}]},
            ].map((c,i)=>(
              <div key={c.coll} className="card" style={{padding:18,marginBottom:14,animation:`up .4s ease ${i*.08}s both`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}><code style={{fontFamily:"var(--mo)",color:c.cl,fontSize:13,fontWeight:700}}>{c.coll}</code><Tag c={["bl","ac","wn","wn"][i]}>COLLECTION</Tag></div>
                <p style={{fontSize:13,color:"var(--t2)",marginBottom:12,lineHeight:1.6}}>{c.desc}</p>
                <div style={{background:"var(--s2)",borderRadius:"var(--rs)",overflow:"hidden",border:"1px solid var(--br)"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:"var(--s3)"}}>{["Field","Type","Note"].map(h=><th key={h} style={{padding:"8px 13px",textAlign:"left",fontSize:10,color:"var(--t3)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{h}</th>)}</tr></thead>
                    <tbody>{c.flds.map(r=><tr key={r.f} style={{borderTop:"1px solid var(--br)"}}><td style={{padding:"8px 13px",fontFamily:"var(--mo)",color:"var(--tx)",fontWeight:600}}>{r.f}</td><td style={{padding:"8px 13px",fontFamily:"var(--mo)",color:c.cl,fontSize:11}}>{r.t}</td><td style={{padding:"8px 13px",color:"var(--t3)"}}>{r.n}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={addOpen} close={()=>setAddOpen(false)} title="Add New Candidate">
        <div style={{display:"flex",flexDirection:"column",gap:15}}>
          <F lb="Full Name" val={nName} set={setNName} ph="e.g. John Emeka Doe"/>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--t2)"}}>Manifesto</label>
            <textarea value={nManif} onChange={e=>setNManif(e.target.value)} placeholder="Write the candidate's manifesto…" rows={5} style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:"var(--rs)",padding:"12px 14px",color:"var(--tx)",fontSize:13,outline:"none",resize:"vertical"}} onFocus={e=>e.target.style.borderColor="var(--ac)"} onBlur={e=>e.target.style.borderColor="var(--br)"}/>
          </div>
          <div style={{display:"flex",gap:10}}><Btn v="se" onClick={()=>setAddOpen(false)} st={{flex:1,textAlign:"center"}}>Cancel</Btn><Btn off={busy} onClick={addCand} st={{flex:1,textAlign:"center"}}>{busy?"Saving…":"Add Candidate"}</Btn></div>
        </div>
      </Modal>

      <Modal open={!!editOpen} close={()=>setEditOpen(null)} title="Edit Candidate">
        <div style={{display:"flex",flexDirection:"column",gap:15}}>
          <F lb="Full Name" val={eName} set={setEName} ph="Full name"/>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:13,fontWeight:600,color:"var(--t2)"}}>Manifesto</label>
            <textarea value={eManif} onChange={e=>setEManif(e.target.value)} rows={5} style={{background:"var(--s2)",border:"1px solid var(--br)",borderRadius:"var(--rs)",padding:"12px 14px",color:"var(--tx)",fontSize:13,outline:"none",resize:"vertical"}} onFocus={e=>e.target.style.borderColor="var(--ac)"} onBlur={e=>e.target.style.borderColor="var(--br)"}/>
          </div>
          <div style={{display:"flex",gap:10}}><Btn v="se" onClick={()=>setEditOpen(null)} st={{flex:1,textAlign:"center"}}>Cancel</Btn><Btn off={busy} onClick={saveCand} st={{flex:1,textAlign:"center"}}>{busy?"Saving…":"Save Changes"}</Btn></div>
        </div>
      </Modal>

      <Modal open={endOpen} close={()=>setEndOpen(false)} title="🏁 End Election?">
        <p style={{color:"var(--t2)",fontSize:13,marginBottom:16,lineHeight:1.7}}>This will permanently close voting, lock results in Firebase, and declare a winner. This cannot be reversed.</p>
        <div style={{background:"rgba(255,71,87,.07)",border:"1px solid rgba(255,71,87,.2)",borderRadius:"var(--rs)",padding:11,marginBottom:18}}><p style={{fontSize:13,color:"var(--er)"}}>⚠️ {tv} votes cast · {tp}% turnout.</p></div>
        <div style={{display:"flex",gap:10}}><Btn v="se" onClick={()=>setEndOpen(false)} st={{flex:1,textAlign:"center"}}>Cancel</Btn><Btn v="da" onClick={endElec} st={{flex:1,textAlign:"center"}}>🏁 End & Declare Winner</Btn></div>
      </Modal>

      <Modal open={resOpen} close={()=>setResOpen(false)} title="🏆 Election Results">
        {winner&&(
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:50,marginBottom:9}}>🏆</div>
            <p style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:5}}>Winner Declared</p>
            <div style={{width:64,height:64,borderRadius:16,background:`${winner.color}25`,border:`2px solid ${winner.color}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,color:winner.color,margin:"0 auto 9px",fontFamily:"var(--mo)"}}>{winner.avatar}</div>
            <h2 style={{fontSize:20,fontWeight:800,marginBottom:3}}>{winner.name}</h2>
            <p style={{color:"var(--ac)",fontWeight:600,fontSize:13}}>{winner.position}</p>
            <p style={{color:"var(--t2)",fontSize:13,marginTop:5}}>{winner.votes} votes · {tv>0?Math.round(winner.votes/tv*100):0}% of ballots</p>
          </div>
        )}
        <div style={{marginBottom:16}}>
          {ranked.map((c,i)=>(
            <div key={c.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13}}>{["🥇","🥈","🥉"][i]||""}</span><span style={{fontWeight:600,fontSize:13}}>{c.name}</span></div>
                <span style={{fontFamily:"var(--mo)",fontSize:12,fontWeight:700}}>{c.votes} votes</span>
              </div>
              <Bar val={c.votes} max={Math.max(tv,1)} clr={i===0?"var(--ac)":"var(--t3)"} h={7}/>
            </div>
          ))}
        </div>
        <div style={{background:"var(--s2)",borderRadius:"var(--rs)",padding:11,marginBottom:14}}><p style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--mo)"}}>Votes: {tv} · Turnout: {tp}% · Students: {ts}</p></div>
        <Btn onClick={()=>{
          const r=`300 LEVEL CMP ONLINE VOTING SYSTEM\nELECTION RESULTS REPORT\n${"=".repeat(50)}\n\nWINNER: ${winner?.name} (${winner?.votes} votes)\n\nFULL RESULTS:\n${ranked.map((c,i)=>`${i+1}. ${c.name}: ${c.votes} votes (${tv>0?Math.round(c.votes/tv*100):0}%)`).join("\n")}\n\nTurnout: ${tv}/${ts} (${tp}%)\nGenerated: ${new Date().toLocaleString()}`;
          const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([r],{type:"text/plain"})),download:"cmp300-results.txt"});a.click();
        }} st={{width:"100%",textAlign:"center"}}>📄  Download Results Report</Btn>
      </Modal>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,   setView]   = useState("landing");
  const [student,setStudent]= useState(null);
  const [status, setStatus] = useState("open");

  useEffect(()=>{
    return onSnapshot(doc(db,"elections",ELECTION_ID),s=>{if(s.exists())setStatus(s.data().status);});
  },[]);

  return (
    <>
      <GS/>
      {view==="landing"&&<Landing status={status} onStudent={(id,u)=>{setStudent({id,...u});setView("voter");}} onAdmin={()=>setView("admin")}/>}
      {view==="voter"&&student&&<Voter sid={student.id} student={student} onOut={()=>{setStudent(null);setView("landing");}}/>}
      {view==="admin"&&<Admin onOut={()=>setView("landing")}/>}
    </>
  );
}
