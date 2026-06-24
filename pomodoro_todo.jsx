import { useState, useEffect, useRef, useCallback } from "react";

const WORK = 30 * 60;
const REST = 5 * 60;
const CIRC = 2 * Math.PI * 33;
const DATA_KEY   = "pm_data";
const SOUND_KEY  = "pm_sound";
const HAB_KEY    = "pm_habitica";

// ─── SOUNDS ───────────────────────────────────────────────────────────────────
const SOUNDS = [
  { id:"chord", name:"Chord", icon:"🎵", desc:"Gentle C-E-G",
    playStart:(c)=>playTones(c,[523,659,784],"sine",0.55,0.2,0.15),
    playEnd:(c)=>playTones(c,[784,659,523,392],"sine",0.7,0.2,0.15) },
  { id:"bell", name:"Bell", icon:"🔔", desc:"Crystal bell",
    playStart:(c)=>playTones(c,[880,1100],"sine",1.2,0.3,0.12),
    playEnd:(c)=>playTones(c,[1100,880,660],"sine",1.4,0.35,0.12) },
  { id:"soft", name:"Soft", icon:"🌊", desc:"Warm sine fade",
    playStart:(c)=>playTones(c,[330,415,494],"sine",0.8,0.35,0.1),
    playEnd:(c)=>playTones(c,[494,415,330,247],"sine",1.0,0.4,0.1) },
  { id:"pop", name:"Pop", icon:"✨", desc:"Quick staccato",
    playStart:(c)=>playTones(c,[600,800,1000],"triangle",0.18,0.08,0.18),
    playEnd:(c)=>playTones(c,[1000,750,500],"triangle",0.2,0.09,0.18) },
  { id:"deep", name:"Deep", icon:"🎶", desc:"Low warm tones",
    playStart:(c)=>playTones(c,[130,164,196],"sine",0.9,0.3,0.13),
    playEnd:(c)=>playTones(c,[196,164,130,98],"sine",1.1,0.35,0.13) },
];

function playTones(ctx,freqs,type,dur,gap,vol){
  freqs.forEach((freq,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.type=type;o.frequency.value=freq;
    const s=ctx.currentTime+i*gap;
    g.gain.setValueAtTime(0,s);
    g.gain.linearRampToValueAtTime(vol,s+0.03);
    g.gain.exponentialRampToValueAtTime(0.001,s+dur);
    o.start(s);o.stop(s+dur);
  });
}

function useAudio(soundId){
  const ctxRef=useRef(null);
  const getCtx=()=>{ if(!ctxRef.current) ctxRef.current=new(window.AudioContext||window.webkitAudioContext)(); return ctxRef.current; };
  const sound=SOUNDS.find(s=>s.id===soundId)||SOUNDS[0];
  return {
    playStart:()=>sound.playStart(getCtx()),
    playEnd:()=>sound.playEnd(getCtx()),
    preview:(id)=>{ const s=SOUNDS.find(x=>x.id===id)||SOUNDS[0]; s.playStart(getCtx()); },
  };
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
async function loadData(){
  try{
    const today=new Date().toDateString();
    const r=await window.storage.get(DATA_KEY);
    if(r){ const d=JSON.parse(r.value); if(d.date===today) return d; }
    return{date:today,tasks:[],pomos:0,elapsed:0};
  }catch{ return{date:new Date().toDateString(),tasks:[],pomos:0,elapsed:0}; }
}
async function saveData(data){ try{ await window.storage.set(DATA_KEY,JSON.stringify({...data,date:new Date().toDateString()})); }catch{} }
async function loadSound(){ try{ const r=await window.storage.get(SOUND_KEY); return r?r.value:"chord"; }catch{ return"chord"; } }
async function saveSound(id){ try{ await window.storage.set(SOUND_KEY,id); }catch{} }
async function loadHabCreds(){ try{ const r=await window.storage.get(HAB_KEY); return r?JSON.parse(r.value):{userId:"",token:""}; }catch{ return{userId:"",token:""}; } }
async function saveHabCreds(creds){ try{ await window.storage.set(HAB_KEY,JSON.stringify(creds)); }catch{} }

// ─── HABITICA API ─────────────────────────────────────────────────────────────
async function fetchHabitica(userId, token){
  const headers={
    "x-api-user": userId,
    "x-api-key":  token,
    "x-client":   "pomodoro-app",
    "Content-Type": "application/json",
  };
  const [todosRes, dailiesRes] = await Promise.all([
    fetch("https://habitica.com/api/v3/tasks/user?type=todos",    {headers}),
    fetch("https://habitica.com/api/v3/tasks/user?type=dailys",   {headers}),
  ]);
  if(!todosRes.ok || !dailiesRes.ok) throw new Error(`Habitica error: ${todosRes.status}`);
  const [todosData, dailiesData] = await Promise.all([todosRes.json(), dailiesRes.json()]);

  const todos = (todosData.data||[])
    .filter(t=>!t.completed)
    .map(t=>({ id:"hab_"+t.id, text:t.text, done:false, pomos:0, source:"habitica", habType:"todo" }));

  const dailies = (dailiesData.data||[])
    .filter(t=>!t.completed && t.isDue)
    .map(t=>({ id:"hab_"+t.id, text:t.text, done:false, pomos:0, source:"habitica", habType:"daily" }));

  return [...todos, ...dailies];
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [tasks,setTasks]       = useState([]);
  const [activeId,setActiveId] = useState(null);
  const [newTask,setNewTask]   = useState("");
  const [tl,setTl]             = useState(WORK);
  const [running,setRunning]   = useState(false);
  const [isWork,setIsWork]     = useState(true);
  const [elapsed,setElapsed]   = useState(0);
  const [pomos,setPomos]       = useState(0);
  const [loaded,setLoaded]     = useState(false);
  const [soundId,setSoundId]   = useState("chord");
  const [soundOpen,setSoundOpen] = useState(false);

  // Habitica
  const [habOpen,setHabOpen]     = useState(false);
  const [habUserId,setHabUserId] = useState("");
  const [habToken,setHabToken]   = useState("");
  const [habStatus,setHabStatus] = useState("idle"); // idle | loading | ok | error
  const [habMsg,setHabMsg]       = useState("");
  const [habConnected,setHabConnected] = useState(false);

  const audio    = useAudio(soundId);
  const stateRef = useRef({tasks,activeId,isWork,elapsed,pomos});
  useEffect(()=>{ stateRef.current={tasks,activeId,isWork,elapsed,pomos}; },[tasks,activeId,isWork,elapsed,pomos]);

  useEffect(()=>{
    loadData().then(d=>{ setTasks(d.tasks); setPomos(d.pomos); setElapsed(d.elapsed); setLoaded(true); });
    loadSound().then(s=>setSoundId(s));
    loadHabCreds().then(c=>{ if(c.userId){ setHabUserId(c.userId); setHabToken(c.token); setHabConnected(true); } });
  },[]);

  useEffect(()=>{ if(!loaded) return; saveData({tasks,pomos,elapsed}); },[tasks,pomos,elapsed,loaded]);

  const intervalRef = useRef(null);
  const tick = useCallback(()=>{
    setTl(prev=>{
      const s=stateRef.current;
      if(s.isWork) setElapsed(e=>e+1);
      if(prev<=1){
        clearInterval(intervalRef.current); setRunning(false); audio.playEnd();
        if(s.isWork){
          setPomos(p=>p+1);
          if(s.activeId) setTasks(ts=>ts.map(t=>t.id===s.activeId?{...t,pomos:(t.pomos||0)+1}:t));
          setIsWork(false); return REST;
        }else{ setIsWork(true); return WORK; }
      }
      return prev-1;
    });
  },[audio]);

  const toggleTimer = ()=>{
    if(running){ clearInterval(intervalRef.current); setRunning(false); }
    else{ audio.playStart(); setRunning(true); intervalRef.current=setInterval(tick,1000); }
  };
  const resetTimer = ()=>{ clearInterval(intervalRef.current); setRunning(false); setIsWork(true); setTl(WORK); };
  const skipPhase  = ()=>{ clearInterval(intervalRef.current); setRunning(false); setIsWork(w=>!w); setTl(isWork?REST:WORK); };
  useEffect(()=>()=>clearInterval(intervalRef.current),[]);

  const handleKey = (e)=>{
    if(e.key==="Enter"&&newTask.trim()){
      setTasks(ts=>[{id:Date.now(),text:newTask.trim(),done:false,pomos:0},...ts]);
      setNewTask("");
    }
  };
  const toggleDone = (id)=>{ setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t)); if(activeId===id) setActiveId(null); };
  const delTask    = (id)=>{ setTasks(ts=>ts.filter(t=>t.id!==id)); if(activeId===id) setActiveId(null); };
  const focusTask  = (id)=>setActiveId(a=>a===id?null:id);
  const selectSound= (id)=>{ setSoundId(id); saveSound(id); };

  const syncHabitica = async()=>{
    if(!habUserId.trim()||!habToken.trim()){ setHabMsg("Enter userId and token"); setHabStatus("error"); return; }
    setHabStatus("loading"); setHabMsg("");
    try{
      const habTasks = await fetchHabitica(habUserId.trim(), habToken.trim());
      await saveHabCreds({userId:habUserId.trim(),token:habToken.trim()});
      setHabConnected(true);
      // merge: remove old hab tasks, add fresh ones
      setTasks(ts=>{
        const local = ts.filter(t=>t.source!=="habitica");
        return [...habTasks,...local];
      });
      setHabStatus("ok");
      setHabMsg(`Synced ${habTasks.length} task${habTasks.length!==1?"s":""}`);
    }catch(e){
      setHabStatus("error");
      setHabMsg(e.message||"Sync failed");
    }
  };

  const disconnectHabitica = ()=>{
    setHabUserId(""); setHabToken(""); setHabConnected(false);
    setHabStatus("idle"); setHabMsg("");
    saveHabCreds({userId:"",token:""});
    setTasks(ts=>ts.filter(t=>t.source!=="habitica"));
  };

  const pending    = tasks.filter(t=>!t.done).length;
  const done       = tasks.filter(t=>t.done).length;
  const frac       = tl/(isWork?WORK:REST);
  const offset     = CIRC*(1-frac);
  const mm         = String(Math.floor(tl/60)).padStart(2,"0");
  const ss2        = String(tl%60).padStart(2,"0");
  const activeTask = tasks.find(t=>t.id===activeId);
  const filtered   = tasks.filter(t=>!t.done);
  const curSound   = SOUNDS.find(s=>s.id===soundId)||SOUNDS[0];

  const C = {
    // sidebar
    sb:      {width:210,minWidth:210,background:"#222",display:"flex",flexDirection:"column",borderRight:"1px solid #2e2e2e",padding:"10px 0",overflowY:"auto",overflowX:"hidden"},
    sbHead:  {padding:"6px 14px 14px",display:"flex",alignItems:"center",gap:8,color:"#bbb",fontSize:13,fontWeight:500},
    av:      {width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#e05c5c,#c04040)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white",flexShrink:0},
    navItem: {display:"flex",alignItems:"center",padding:"7px 14px",borderRadius:6,margin:"1px 6px",gap:9,color:"#e0e0e0",background:"#2d2d2d"},
    navLabel:{flex:1,fontSize:13},
    navCount:{color:"#666",fontSize:12},

    secDiv:  {borderTop:"1px solid #2a2a2a",margin:"10px 0 0"},
    secHead: {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px 6px",cursor:"pointer"},
    secTitle:{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:"0.05em"},
    secArr:  {fontSize:10,color:"#555"},
    secBody: {padding:"0 10px 10px"},

    // sound
    soundCur:{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",borderRadius:7,background:"#2a2a2a",border:"1px solid #333",marginBottom:4},
    soundList:{display:"flex",flexDirection:"column",gap:2},
    soundItem:(sel)=>({display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,cursor:"pointer",background:sel?"rgba(224,92,92,.1)":"transparent",border:`1px solid ${sel?"rgba(224,92,92,.35)":"transparent"}`,transition:"all 0.12s"}),
    soundName:(sel)=>({fontSize:12,color:sel?"#e05c5c":"#bbb",fontWeight:sel?500:400}),
    soundDesc:{fontSize:10,color:"#555"},
    prevBtn: {background:"transparent",border:"1px solid #333",borderRadius:5,color:"#666",fontSize:10,padding:"2px 6px",cursor:"pointer",flexShrink:0},

    // habitica
    habCred: {display:"flex",flexDirection:"column",gap:5,marginBottom:8},
    habInput:{background:"#1e1e1e",border:"1px solid #333",borderRadius:6,color:"#ccc",fontSize:11,padding:"5px 8px",outline:"none",width:"100%"},
    habBtn:  (col)=>({border:"none",borderRadius:6,fontSize:11,fontWeight:500,padding:"5px 10px",cursor:"pointer",background:col||"#e05c5c",color:"white",width:"100%",marginTop:2}),
    habStatus:(st)=>({fontSize:10,padding:"4px 8px",borderRadius:5,marginTop:4,textAlign:"center",
      background:st==="ok"?"rgba(80,200,120,.12)":st==="error"?"rgba(224,92,92,.12)":"rgba(255,255,255,.04)",
      color:st==="ok"?"#50c878":st==="error"?"#e05c5c":"#888"}),
    habBadge:{fontSize:9,padding:"1px 5px",borderRadius:4,background:"rgba(80,200,120,.15)",color:"#50c878",marginLeft:4},
    habConnRow:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px",background:"rgba(80,200,120,.08)",border:"1px solid rgba(80,200,120,.2)",borderRadius:7,marginBottom:6},
    habDisBtn:{background:"transparent",border:"none",color:"#666",fontSize:10,cursor:"pointer",padding:"2px 6px"},

    // main
    root:    {display:"flex",height:"100vh",background:"#1a1a1a",color:"#e0e0e0",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",fontSize:14,overflow:"hidden"},
    main:    {flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0},
    mHead:   {padding:"16px 22px 14px",borderBottom:"1px solid #2a2a2a"},
    mTitle:  {fontSize:20,fontWeight:600,color:"#f0f0f0",marginBottom:14},
    stats:   {display:"flex",justifyContent:"space-between",width:"100%"},
    stat:    {textAlign:"center"},
    sv:   (r)=>({fontSize:20,fontWeight:300,color:r?"#e05c5c":"#e0e0e0",lineHeight:1.1}),
    sl:      {fontSize:10,color:"#666",marginTop:2},
    pp:      {background:"#252525",border:"1px solid #2e2e2e",borderRadius:10,margin:"12px 16px 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:18},
    tCircle: {width:68,height:68,borderRadius:"50%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0,cursor:"pointer"},
    tTime:   {fontSize:14,fontWeight:600,color:"#f0f0f0",zIndex:1},
    tPh:     {fontSize:9,color:"#888",zIndex:1},
    tInfo:   {flex:1,minWidth:0},
    tTask:   {fontSize:12,color:activeId?"#ccc":"#555",marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
    tCtrl:   {display:"flex",gap:7,alignItems:"center"},
    btnP: (p)=>({border:"none",cursor:"pointer",borderRadius:6,fontSize:12,fontWeight:500,padding:"5px 12px",background:p?"#3a3a3a":"#e05c5c",color:p?"#bbb":"white",display:"flex",alignItems:"center",gap:4}),
    btnG:    {border:"1px solid #333",cursor:"pointer",borderRadius:6,fontSize:12,background:"transparent",color:"#777",padding:"5px 10px"},
    badge:(w)=>({fontSize:10,padding:"2px 7px",borderRadius:10,background:w?"rgba(224,92,92,.15)":"rgba(80,200,120,.15)",color:w?"#e05c5c":"#50c878"}),
    addRow:  {display:"flex",alignItems:"center",margin:"10px 16px 0",background:"#252525",border:"1px solid #2e2e2e",borderRadius:7,padding:"7px 12px",gap:8},
    inp:     {flex:1,background:"transparent",border:"none",color:"#ccc",fontSize:13,outline:"none"},
    tList:   {flex:1,overflowY:"auto",padding:"8px 16px 16px"},
    ti:   (a,d)=>({display:"flex",alignItems:"center",padding:"8px 12px",marginBottom:3,borderRadius:7,background:a?"rgba(224,92,92,.06)":"#252525",border:`1px solid ${a?"rgba(224,92,92,.45)":"#2e2e2e"}`,gap:9,opacity:d?0.4:1}),
    chk:  (k)=>({width:17,height:17,border:`2px solid ${k?"#e05c5c":"#444"}`,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:k?"#e05c5c":"transparent",color:"white",fontSize:9}),
    ttxt: (d)=>({flex:1,fontSize:13,color:d?"#555":"#ccc",textDecoration:d?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}),
    pdots:   {display:"flex",alignItems:"center",gap:2},
    pd:   (f)=>({width:6,height:6,borderRadius:"50%",background:f?"#e05c5c":"rgba(224,92,92,.2)"}),
    fbtn:    {border:"1px solid #3a3a3a",borderRadius:5,color:"#777",fontSize:11,padding:"2px 7px",cursor:"pointer",background:"transparent",whiteSpace:"nowrap"},
    del:     {color:"#3a3a3a",cursor:"pointer",fontSize:12,padding:"0 3px",flexShrink:0,background:"none",border:"none"},
    empty:   {textAlign:"center",padding:36,color:"#555"},
    addProj: {padding:"10px 14px",display:"flex",alignItems:"center",gap:8,color:"#666",fontSize:13,cursor:"pointer",borderTop:"1px solid #2a2a2a"},
  };

  return (
    <div style={C.root}>
      {/* ── SIDEBAR ── */}
      <div style={C.sb}>
        <div style={C.sbHead}><div style={C.av}>Y</div>yalovyysanya</div>

        <div style={C.navItem}>
          <span style={{fontSize:15,width:18,textAlign:"center"}}>☀️</span>
          <span style={C.navLabel}>Today</span>
          <span style={C.navCount}>{pending}</span>
        </div>

        {/* HABITICA */}
        <div style={C.secDiv}>
          <div style={C.secHead} onClick={()=>setHabOpen(o=>!o)}>
            <span style={C.secTitle}>
              ⚔️ Habitica
              {habConnected && <span style={C.habBadge}>connected</span>}
            </span>
            <span style={C.secArr}>{habOpen?"▲":"▼"}</span>
          </div>
          {habOpen && (
            <div style={C.secBody}>
              {habConnected && (
                <div style={C.habConnRow}>
                  <span style={{fontSize:11,color:"#50c878"}}>✓ Synced</span>
                  <button style={C.habDisBtn} onClick={disconnectHabitica}>Disconnect</button>
                </div>
              )}
              <div style={C.habCred}>
                <input style={C.habInput} placeholder="User ID" value={habUserId}
                  onChange={e=>setHabUserId(e.target.value)} spellCheck={false}/>
                <input style={C.habInput} placeholder="API Token" type="password" value={habToken}
                  onChange={e=>setHabToken(e.target.value)} spellCheck={false}/>
              </div>
              <button style={C.habBtn()} onClick={syncHabitica} disabled={habStatus==="loading"}>
                {habStatus==="loading" ? "⏳ Syncing…" : "⟳ Sync Tasks"}
              </button>
              {habMsg && <div style={C.habStatus(habStatus)}>{habStatus==="ok"?"✓ ":habStatus==="error"?"✕ ":""}{habMsg}</div>}
            </div>
          )}
        </div>

        {/* SOUND */}
        <div style={C.secDiv}>
          <div style={C.secHead} onClick={()=>setSoundOpen(o=>!o)}>
            <span style={C.secTitle}>🔊 Sound</span>
            <span style={C.secArr}>{soundOpen?"▲":"▼"}</span>
          </div>
          <div style={{padding:"0 10px",paddingBottom:soundOpen?0:10}}>
            <div style={C.soundCur}>
              <span style={{fontSize:16}}>{curSound.icon}</span>
              <span style={{fontSize:12,color:"#ccc",flex:1}}>{curSound.name}</span>
              <span style={{fontSize:10,color:"#555"}}>{curSound.desc}</span>
            </div>
          </div>
          {soundOpen && (
            <div style={{padding:"0 10px 10px",display:"flex",flexDirection:"column",gap:2}}>
              {SOUNDS.map(s=>(
                <div key={s.id} style={C.soundItem(s.id===soundId)} onClick={()=>selectSound(s.id)}>
                  <span style={{fontSize:15,width:20,textAlign:"center"}}>{s.icon}</span>
                  <div style={{flex:1}}>
                    <div style={C.soundName(s.id===soundId)}>{s.name}</div>
                    <div style={C.soundDesc}>{s.desc}</div>
                  </div>
                  <button style={C.prevBtn} onClick={e=>{e.stopPropagation();audio.preview(s.id);}}>▶</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={C.addProj} onClick={()=>document.getElementById("ni").focus()}>
          <span>＋</span> Add Task
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={C.main}>
        <div style={C.mHead}>
          <div style={C.mTitle}>Today</div>
          <div style={C.stats}>
            {[
              [pending*30+"m","Estimated",true],
              [pending,"To Complete",false],
              [Math.floor(elapsed/60)+"m","Elapsed",true],
              [done,"Completed",false],
              [pomos+"🍅","Pomodoros",false],
            ].map(([v,l,r],i)=>(
              <div key={i} style={C.stat}>
                <div style={C.sv(r)}>{v}</div>
                <div style={C.sl}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={C.pp}>
          <div style={C.tCircle} onClick={toggleTimer}>
            <svg style={{position:"absolute",top:-3,left:-3,width:74,height:74,transform:"rotate(-90deg)"}} viewBox="0 0 74 74">
              <circle cx="37" cy="37" r="33" fill="none" stroke="#333" strokeWidth="3"/>
              <circle cx="37" cy="37" r="33" fill="none" stroke={isWork?"#e05c5c":"#50c878"} strokeWidth="3"
                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
                style={{transition:"stroke-dashoffset 1s linear"}}/>
            </svg>
            <div style={C.tTime}>{mm}:{ss2}</div>
            <div style={C.tPh}>{isWork?"Work":"Rest"}</div>
          </div>
          <div style={C.tInfo}>
            <div style={C.tTask}>{activeTask?`🍅 ${activeTask.text}`:"No task — free pomodoro"}</div>
            <div style={C.tCtrl}>
              <button style={C.btnP(running)} onClick={toggleTimer}>{running?"⏸ Pause":"▶ Start"}</button>
              <button style={C.btnG} onClick={resetTimer}>↺</button>
              <button style={C.btnG} onClick={skipPhase}>⏭</button>
              <span style={C.badge(isWork)}>{isWork?"Work":"Rest"}</span>
            </div>
          </div>
        </div>

        <div style={C.addRow}>
          <span style={{color:"#555",fontSize:16}}>＋</span>
          <input id="ni" style={C.inp} placeholder="Add a task, press Enter to save"
            value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={handleKey}/>
        </div>

        <div style={C.tList}>
          {filtered.length===0?(
            <div style={C.empty}>
              <div style={{fontSize:36,marginBottom:10}}>📋</div>
              <p style={{fontSize:13}}>No Tasks</p>
              <small style={{fontSize:11}}>Add a task or sync Habitica</small>
            </div>
          ):(
            <>
              {/* Habitica group */}
              {filtered.some(t=>t.source==="habitica")&&(
                <>
                  <div style={{fontSize:10,color:"#555",padding:"6px 0 3px",textTransform:"uppercase",letterSpacing:"0.04em"}}>
                    ⚔️ Habitica · <span style={{color:"#888"}}>{filtered.filter(t=>t.source==="habitica"&&t.habType==="daily").length} dailies · {filtered.filter(t=>t.source==="habitica"&&t.habType==="todo").length} todos</span>
                  </div>
                  {filtered.filter(t=>t.source==="habitica").map(t=>(
                    <TaskItem key={t.id} t={t} isActive={t.id===activeId} C={C}
                      onDone={()=>toggleDone(t.id)} onDel={()=>delTask(t.id)} onFocus={()=>focusTask(t.id)}/>
                  ))}
                </>
              )}
              {/* Local tasks */}
              {filtered.some(t=>!t.source)&&(
                <>
                  {filtered.some(t=>t.source==="habitica")&&(
                    <div style={{fontSize:10,color:"#555",padding:"8px 0 3px",textTransform:"uppercase",letterSpacing:"0.04em"}}>📋 Local</div>
                  )}
                  {filtered.filter(t=>!t.source).map(t=>(
                    <TaskItem key={t.id} t={t} isActive={t.id===activeId} C={C}
                      onDone={()=>toggleDone(t.id)} onDel={()=>delTask(t.id)} onFocus={()=>focusTask(t.id)}/>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskItem({t,isActive,C,onDone,onDel,onFocus}){
  const [hover,setHover]=useState(false);
  const isHab=t.source==="habitica";
  return(
    <div style={C.ti(isActive,t.done)} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={C.chk(t.done)} onClick={onDone}>{t.done?"✓":""}</div>
      <div style={C.ttxt(t.done)} title={t.text}>{t.text}</div>
      {isHab&&(
        <span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:t.habType==="daily"?"rgba(120,80,200,.15)":"rgba(80,160,200,.15)",color:t.habType==="daily"?"#a080e0":"#60b0e0",flexShrink:0}}>
          {t.habType==="daily"?"daily":"todo"}
        </span>
      )}
      <div style={C.pdots} title={`${t.pomos} pomo(s)`}>
        {t.pomos>0
          ?Array.from({length:t.pomos}).map((_,i)=><div key={i} style={C.pd(true)}/>)
          :<span style={{color:"#3a3a3a",fontSize:10}}>0</span>}
      </div>
      {!t.done&&(hover||isActive)&&(
        <button style={C.fbtn} onClick={onFocus}>{isActive?"⏹ Unlink":"▶ Focus"}</button>
      )}
      <button style={C.del} onClick={onDel}>✕</button>
    </div>
  );
}
