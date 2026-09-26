import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,getDocs,addDoc,serverTimestamp,writeBatch,query,where} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig,profiles} from "./config.js";
import {starterChallenges} from "./content.js";

const fb=initializeApp(firebaseConfig), auth=getAuth(fb), db=getFirestore(fb), root=document.getElementById("app");
let S={user:null,profile:null,challenges:[],attempts:[],route:"home",challenge:null};

const HERO_LEVELS=[
  {level:0,min:0,title:"Baby Kitten",icon:"🐱",tag:"Tiny paws. Huge potential."},
  {level:1,min:250,title:"Brave Cub",icon:"🐾",tag:"First missions cleared."},
  {level:2,min:550,title:"Shield Scout",icon:"🛡️",tag:"Focused, brave and ready."},
  {level:3,min:900,title:"Iron Lynx",icon:"🤖",tag:"Skills upgraded."},
  {level:4,min:1300,title:"Thunder Prowler",icon:"⚡",tag:"Power is building."},
  {level:5,min:1800,title:"Web Guardian",icon:"🕸️",tag:"Fast thinking. Smart moves."},
  {level:6,min:2400,title:"Star Sentinel",icon:"⭐",tag:"A proven learning hero."},
  {level:7,min:3100,title:"Cosmic Panther",icon:"🌌",tag:"Elite mission status."},
  {level:8,min:3900,title:"Infinity Champion",icon:"💎",tag:"Legendary learner."}
];

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const profByEmail=e=>Object.values(profiles).find(p=>p.email.toLowerCase()===(e||"").toLowerCase());
const admin=()=>S.profile?.role==="admin";
const passMark=c=>Number(c?.passPercent??60);
const subjectIcon=s=>s==="Hebrew"?"🇮🇱":s==="English"?"🇬🇧":s==="Math"?"🧮":"🎯";

function bestPercent(challengeId, attempts=S.attempts){
  const list=attempts.filter(a=>a.challengeId===challengeId);
  return list.length?Math.max(...list.map(a=>Number(a.percent||0))):0;
}
function xpFromBest(best){
  if(!best) return 0;
  let xp=Math.round(best*2);             // 0-200 skill XP
  if(best>=60) xp+=100;                 // mission-clear bonus
  if(best>=85) xp+=50;                  // excellence bonus
  if(best>=100) xp+=50;                 // perfect-score bonus
  return xp;                             // max 400 per mission
}
function totalHeroXp(attempts=S.attempts){
  const ids=[...new Set(attempts.map(a=>a.challengeId).filter(Boolean))];
  return ids.reduce((sum,id)=>sum+xpFromBest(bestPercent(id,attempts)),0);
}
function heroLevelForXp(xp){
  let current=HERO_LEVELS[0];
  for(const h of HERO_LEVELS) if(xp>=h.min) current=h;
  return current;
}
function nextHeroLevel(xp){ return HERO_LEVELS.find(h=>h.min>xp)||null; }
function levelProgress(xp){
  const cur=heroLevelForXp(xp), next=nextHeroLevel(xp);
  if(!next) return 100;
  return Math.max(0,Math.min(100,Math.round((xp-cur.min)/(next.min-cur.min)*100)));
}
function studentChallenges(studentId){
  return S.challenges.filter(c=>(c.targetStudents||[]).includes(studentId)).sort((a,b)=>(a.pathOrder??999)-(b.pathOrder??999)||String(a.title).localeCompare(String(b.title)));
}
function missionStatus(c,index,path,attempts=S.attempts){
  const best=bestPercent(c.id,attempts), passed=best>=passMark(c), attempted=attempts.some(a=>a.challengeId===c.id);
  let unlocked=index===0;
  if(index>0){
    const prev=path[index-1], prevBest=bestPercent(prev.id,attempts);
    unlocked=prevBest>=passMark(prev);
  }
  return {best,passed,attempted,unlocked,xp:xpFromBest(best)};
}

function shell(x){
  const xp=S.profile?.role==="student"?totalHeroXp():0, hero=heroLevelForXp(xp);
  return `<div class="shell ${S.profile?.id==='ella'?'ella':''}">
    <header class="top">
      <div class="brand"><div class="hero-mark">⚡</div><span>BrightPath <b>Hero Academy</b></span></div>
      <div class="top-actions">
        ${S.profile?.role==='student'?`<span class="mini-rank"><b>${hero.icon}</b> L${hero.level} · ${xp} XP</span>`:''}
        ${S.profile?`<span class="badge identity">${S.profile.emoji} ${esc(S.profile.name)}</span>`:''}
        ${S.user?`<button class="btn ghost" data-home>Mission Map</button> <button class="btn danger" data-out>Log out</button>`:''}
      </div>
    </header>${x}</div>`;
}

function login(){
  return `<div class="login"><div class="loginbox">
    <div class="academy-logo"><div class="core">⚡</div><div><div class="eyebrow">BRIGHTPATH</div><h1>HERO ACADEMY</h1></div></div>
    <p class="muted">Choose your hero profile. Every mission makes your character stronger.</p>
    <div class="profiles">${Object.values(profiles).map((p,i)=>`<button class="profile ${i===0?'active':''}" data-prof="${p.id}"><div class="avatar">${p.emoji}</div><b>${esc(p.name)}</b><div class="muted">${esc(p.grade||'Mission Control')}</div></button>`).join('')}</div>
    <form id="loginForm"><input type="hidden" id="pid" value="admin"><div class="field"><label>Secret code / password</label><input id="pass" type="password" required autocomplete="current-password"></div><div id="loginMsg"></div><button class="btn primary big" style="width:100%">Enter Mission Control</button></form>
  </div></div>`;
}

function heroPanel(p,attempts){
  const xp=totalHeroXp(attempts), hero=heroLevelForXp(xp), next=nextHeroLevel(xp), prog=levelProgress(xp);
  return `<section class="hero-dashboard">
    <div class="hero-avatar-ring"><div class="hero-avatar">${hero.icon}</div><div class="level-chip">LEVEL ${hero.level}</div></div>
    <div class="hero-info">
      <div class="eyebrow">CURRENT HERO FORM</div>
      <h1>${esc(hero.title)}</h1>
      <p>${esc(hero.tag)}</p>
      <div class="xp-row"><b>${xp} HERO XP</b><span>${next?`${next.min-xp} XP to ${next.title}`:'MAX LEVEL'}</span></div>
      <div class="xp-bar"><span style="width:${prog}%"></span></div>
    </div>
    <div class="power-card"><span>⚔️</span><b>${attempts.filter(a=>Number(a.percent||0)>=60).length}</b><small>successful attempts</small></div>
  </section>`;
}

function student(){
  const p=S.profile, path=studentChallenges(p.id), attempts=S.attempts.filter(a=>a.studentId===p.id);
  const cleared=path.filter(c=>bestPercent(c.id,attempts)>=passMark(c)).length;
  const avg=attempts.length?Math.round(attempts.reduce((s,x)=>s+Number(x.percent||0),0)/attempts.length):0;
  return shell(`<main class="wrap">
    ${heroPanel(p,attempts)}
    <div class="mission-summary">
      <div><strong>${cleared}/${path.length}</strong><span>Missions cleared</span></div>
      <div><strong>${avg}%</strong><span>Average score</span></div>
      <div><strong>${path.reduce((s,c)=>s+xpFromBest(bestPercent(c.id,attempts)),0)}</strong><span>Hero XP</span></div>
    </div>
    <div class="section title-row"><div><div class="eyebrow">YOUR CAMPAIGN</div><h2>Hero Mission Path</h2><p class="muted">Score at least 60% to clear a mission and unlock the next one. Better scores earn more Hero XP.</p></div></div>
    ${missionPath(path,attempts)}
    <div class="scoring-legend card">
      <h3>How Hero XP works</h3>
      <div class="legend-grid"><span>🎯 Score XP<br><b>up to 200</b></span><span>✅ Clear 60%+<br><b>+100</b></span><span>🌟 85%+<br><b>+50</b></span><span>💯 Perfect<br><b>+50</b></span></div>
      <p class="muted">Replaying a mission only increases your total XP when you improve your best score, so practice is rewarded without unlimited point farming.</p>
    </div>
  </main>`);
}

function missionPath(path,attempts){
  if(!path.length) return `<div class="notice">No missions yet. Ask Admin to publish the starter campaign.</div>`;
  return `<div class="mission-path">${path.map((c,i)=>{
    const st=missionStatus(c,i,path,attempts), side=i%2===0?'left':'right';
    const status=st.passed?'CLEARED':st.unlocked?(st.attempted?'RETRY':'READY'):'LOCKED';
    const cls=st.passed?'cleared':st.unlocked?'ready':'locked';
    return `<div class="mission-node ${side} ${cls}">
      <div class="path-dot">${st.passed?'✓':st.unlocked?(c.missionIcon||subjectIcon(c.subject)):'🔒'}</div>
      <article class="mission-card">
        <div class="mission-top"><span class="mission-number">MISSION ${i+1}</span><span class="status-pill ${cls}">${status}</span></div>
        <div class="mission-icon">${c.missionIcon||subjectIcon(c.subject)}</div>
        <div class="eyebrow">${esc(c.missionName||c.subject)}</div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description||'')}</p>
        <div class="mission-meta"><span>${subjectIcon(c.subject)} ${esc(c.subject)}</span><span>🎚️ ${esc(c.difficulty||'')}</span><span>🏆 ${st.xp} XP</span></div>
        ${st.attempted?`<div class="best-score"><span>Best score</span><b>${st.best}%</b><div class="scorebar"><span style="width:${st.best}%"></span></div></div>`:''}
        ${st.unlocked?`<button class="btn primary mission-btn" data-open="${c.id}">${st.passed?'Train again':st.attempted?'Retry mission':'Start mission'} →</button>`:`<div class="locked-note">Clear Mission ${i} with 60%+ to unlock.</div>`}
      </article>
    </div>`;
  }).join('')}</div>`;
}

function challengeView(id){
  const c=S.challenges.find(x=>x.id===id);
  if(!c)return shell(`<main class="wrap"><div class="notice error">Mission not found.</div></main>`);
  const path=studentChallenges(S.profile.id), idx=path.findIndex(x=>x.id===id), st=missionStatus(c,idx,path,S.attempts);
  if(!st.unlocked) return shell(`<main class="wrap"><div class="card locked-screen"><div class="big-lock">🔒</div><h2>Mission locked</h2><p>Clear the previous mission with at least 60% to unlock this one.</p><button class="btn primary" data-home>Back to Mission Map</button></div></main>`);
  return shell(`<main class="wrap ${c.language==='he'?'rtl':''}">
    <div class="mission-header"><div><span class="badge">MISSION ${idx+1}</span><span class="badge">${subjectIcon(c.subject)} ${esc(c.subject)}</span><h1>${esc(c.title)}</h1><p>${esc(c.description||'')}</p></div><div class="mission-target"><b>60%</b><span>to clear</span></div></div>
    <form id="challengeForm" data-id="${c.id}" class="challengepage">
      <section class="card mission-sheet">${(c.questions||[]).map((q,i)=>qhtml(q,i,c.language)).join('')}<div id="result"></div><button class="btn good big" style="margin-top:18px">${c.language==='he'?'שליחת המשימה':'Submit mission'}</button></section>
      <aside class="card reading"><h3>${c.language==='he'?'קטע הקריאה':'Mission Intel'}</h3>${c.passage?`<div class="passage">${esc(c.passage)}</div>`:`<div class="notice">${c.language==='he'?'אין קטע קריאה במשימה זו':'No reading passage for this mission.'}</div>`}</aside>
    </form>
  </main>`);
}

function qhtml(q,i,lang){
  return `<div class="q"><div class="q-number">${i+1}</div><h4>${esc(q.text)}</h4>${q.type==='mcq'?(q.options||[]).map((o,j)=>`<label class="opt"><input type="radio" name="${q.id}" value="${j}"><span>${esc(o)}</span></label>`).join(''):`<textarea class="answer" name="${q.id}" placeholder="${lang==='he'?'כתבו כאן...':'Type your answer...'}"></textarea>`}<div class="fb" id="fb-${q.id}"></div></div>`;
}
function norm(t){return (t||'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim()}
function grade(q,v){
  if(q.type==='mcq')return Number(v)===Number(q.answer);
  const t=norm(v); if(q.creative)return t.length>=8;
  const kws=(q.keywords||[]).map(norm),hits=kws.filter(k=>k&&t.includes(k)).length;
  return t.length>2&&hits>=Number(q.minKeywords??q.need??1);
}

async function submit(form){
  const c=S.challenges.find(x=>x.id===form.dataset.id),fd=new FormData(form);
  const oldBest=bestPercent(c.id), oldXp=xpFromBest(oldBest), oldLevel=heroLevelForXp(totalHeroXp());
  let score=0;
  for(const q of c.questions){
    const v=String(fd.get(q.id)||''),ok=grade(q,v); if(ok)score++;
    const el=document.getElementById('fb-'+q.id);
    el.innerHTML=`<span class="${ok?'correct':'wrong'}">${ok?'✓ Correct':'✗ Review this answer'}</span>${!ok&&q.example?`<div class="muted">Example: ${esc(q.example)}</div>`:''}`;
  }
  const total=c.questions.length, percent=Math.round(score/total*100), cleared=percent>=passMark(c);
  await addDoc(collection(db,'attempts'),{uid:S.user.uid,studentId:S.profile.id,studentName:S.profile.name,challengeId:c.id,challengeTitle:c.title,subject:c.subject,score,total,percent,createdAt:serverTimestamp()});
  await loadAttempts();
  const newBest=bestPercent(c.id), newXp=xpFromBest(newBest), delta=Math.max(0,newXp-oldXp), totalXp=totalHeroXp(), newLevel=heroLevelForXp(totalXp), levelUp=newLevel.level>oldLevel.level;
  document.getElementById('result').innerHTML=`<div class="result-panel ${cleared?'win':'retry'}">
    <div class="result-burst">${cleared?'🏆':'🧠'}</div>
    <div><div class="eyebrow">${cleared?'MISSION CLEARED':'TRAINING COMPLETE'}</div><div class="score">${percent}%</div><b>${score}/${total} correct</b>
    <p>${cleared?'The next mission is now available.':'Reach 60% to unlock the next mission. Review the feedback and try again.'}</p>
    <div class="xp-earned">+${delta} HERO XP · Total ${totalXp} XP</div>
    ${levelUp?`<div class="level-up">⚡ LEVEL UP! You evolved into <b>${newLevel.icon} ${esc(newLevel.title)}</b></div>`:''}
    <button type="button" class="btn primary" data-home>Return to Mission Map</button></div>
  </div>`;
  bind();
}

function adminView(){
  const students=['amit','maya','ella'].map(id=>profiles[id]);
  return shell(`<main class="wrap">
    <section class="admin-hero"><div><div class="eyebrow">MISSION CONTROL</div><h1>Hero Academy Admin</h1><p>Monitor every learner's score, rank and mission progress.</p></div><div class="radar">📡</div></section>
    <div class="section"><h2>Hero roster</h2></div>
    <div class="grid g3">${students.map(p=>adminStudentCard(p)).join('')}</div>
    <div class="section"><h2>Campaign content</h2></div>
    <div class="grid g2"><div class="card command-card"><h3>🚀 Starter campaign</h3><p>Publish / refresh 9 missions: 3 each for Amit, Maya and Ella, including Maya's full Hebrew unseen.</p><button class="btn primary" id="seed">Seed / refresh all missions</button><div id="seedMsg"></div></div><div class="card"><h3>Scoring system</h3><p>Best score determines Hero XP. 60% clears a mission, 85% earns an excellence bonus, and 100% earns a perfect bonus.</p><p class="muted">Retakes can improve XP, but repeating the same score does not farm extra points.</p></div></div>
    <div class="section"><h2>Recent attempts</h2></div>${attemptTable()}
  </main>`);
}
function adminStudentCard(p){
  const a=S.attempts.filter(x=>x.studentId===p.id), path=studentChallenges(p.id), xp=totalHeroXp(a), hero=heroLevelForXp(xp), cleared=path.filter(c=>bestPercent(c.id,a)>=passMark(c)).length;
  const avg=a.length?Math.round(a.reduce((s,x)=>s+Number(x.percent||0),0)/a.length):0;
  return `<div class="card hero-roster-card"><div class="roster-top"><div class="hero-avatar small">${hero.icon}</div><div><div class="eyebrow">LEVEL ${hero.level}</div><h3>${esc(p.name)}</h3><div class="muted">${esc(p.grade)} · Age ${p.age}</div></div></div><div class="rank-name">${esc(hero.title)}</div><div class="xp-bar"><span style="width:${levelProgress(xp)}%"></span></div><div class="roster-stats"><span><b>${xp}</b> XP</span><span><b>${cleared}/${path.length}</b> cleared</span><span><b>${avg}%</b> avg</span></div></div>`;
}
function attemptTable(){
  if(!S.attempts.length)return `<div class="notice">No attempts yet.</div>`;
  return `<div class="card table"><table><thead><tr><th>Hero</th><th>Mission</th><th>Subject</th><th>Score</th><th>Result</th></tr></thead><tbody>${S.attempts.map(a=>`<tr><td>${esc(a.studentName||a.studentId)}</td><td>${esc(a.challengeTitle||a.challengeId)}</td><td>${esc(a.subject||'')}</td><td>${a.score}/${a.total} · <b>${a.percent}%</b></td><td><span class="status-pill ${Number(a.percent)>=60?'cleared':'ready'}">${Number(a.percent)>=60?'CLEARED':'RETRY'}</span></td></tr>`).join('')}</tbody></table></div>`;
}

async function loadChallenges(){const s=await getDocs(collection(db,'challenges'));S.challenges=s.docs.map(d=>({id:d.id,...d.data()}))}
async function loadAttempts(){
  if(admin()){const s=await getDocs(collection(db,'attempts'));S.attempts=s.docs.map(d=>({id:d.id,...d.data()}))}
  else{const s=await getDocs(query(collection(db,'attempts'),where('uid','==',S.user.uid)));S.attempts=s.docs.map(d=>({id:d.id,...d.data()}))}
}
async function seed(){
  const m=document.getElementById('seedMsg');
  try{const b=writeBatch(db);for(const c of starterChallenges)b.set(doc(db,'challenges',c.id),c,{merge:true});await b.commit();await loadChallenges();m.innerHTML=`<div class="notice success">⚡ ${starterChallenges.length} hero missions are ready.</div>`;render()}
  catch(e){m.innerHTML=`<div class="notice error">${esc(e.message)}</div>`}
}

function route(){const h=(location.hash||'#home').slice(1).split('/');S.route=h[0];S.challenge=h[1]||null;render()}
function render(){
  if(!S.user){root.innerHTML=login();bind();return}
  if(!S.profile){root.innerHTML=shell(`<main class="wrap"><div class="notice error">This Firebase login is not mapped to a BrightPath profile.</div></main>`);bind();return}
  if(S.route==='challenge'&&S.challenge&&!admin())root.innerHTML=challengeView(S.challenge);
  else root.innerHTML=admin()?adminView():student();
  bind();
}
function bind(){
  document.querySelectorAll('[data-prof]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-prof]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('pid').value=b.dataset.prof});
  const f=document.getElementById('loginForm');if(f)f.onsubmit=async e=>{e.preventDefault();const p=profiles[document.getElementById('pid').value],m=document.getElementById('loginMsg');try{m.innerHTML='<div class="notice">Opening the portal…</div>';await signInWithEmailAndPassword(auth,p.email,document.getElementById('pass').value)}catch(err){m.innerHTML=`<div class="notice error">${p.id==='ella'?"Ella's Firebase account may not exist yet. ":''}${esc(err.message)}</div>`}};
  document.querySelectorAll('[data-out]').forEach(b=>b.onclick=()=>signOut(auth));
  document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>location.hash='home');
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>location.hash='challenge/'+b.dataset.open);
  const cf=document.getElementById('challengeForm');if(cf)cf.onsubmit=e=>{e.preventDefault();submit(cf)};
  const s=document.getElementById('seed');if(s)s.onclick=seed;
}
window.addEventListener('hashchange',route);
onAuthStateChanged(auth,async u=>{S.user=u;S.profile=u?profByEmail(u.email):null;if(u){try{await loadChallenges();await loadAttempts()}catch(e){console.error(e)}}else{S.challenges=[];S.attempts=[]}route()});
