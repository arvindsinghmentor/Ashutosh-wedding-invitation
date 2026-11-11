// A&S Wedding · Organiser dashboard v10. Logic ported from dashboard v9; storage moved to Firebase.
// Designed by Arvind Singh. No guest or room data lives in this file: everything comes from Firestore.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider, sendPasswordResetEmail, sendEmailVerification, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, setDoc, getDoc,
  writeBatch, serverTimestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';

const fb = initializeApp(firebaseConfig), auth = getAuth(fb);
const db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });

/* ===== constants (from v9) ===== */
const SITE = 'https://arvindsinghmentor.github.io/Ashutosh-wedding-invitation/';
const CARD_URL = SITE + '?v=5', RSVP_URL = SITE + 'rsvp/', CARDS_URL = SITE + 'cards/';
const CREDIT = 'Designed by Arvind Singh';
const T = {411:'Inter-connected',412:'Inter-connected',511:'Inter-connected',512:'Inter-connected',414:'Pooja / Family room',514:'Pooja / Family room',421:'Executive suite',422:'Presidential suite',521:'Presidential suite',522:'Executive suite (unavailable)'};
const GN = {c:'Groom',s:'Siblings & in-laws',p:'Paternal side',m:'Maternal side',f:'Other relatives',r:"Ashu's friends",g:'Guests / Doctors',u:'Ujjain hall','':'Vacant'};
const GS = {c:'Groom',s:'Siblings',p:'Paternal',m:'Maternal',f:'Other',r:"Ashu's friends",g:'Guests/Doctors',u:'Ujjain hall'};
const GC = {c:'#c2255c',s:'#7b1e2b',p:'#2563a8',m:'#b5532f',f:'#6b7a1f',r:'#1f8a8a',g:'#5b4bb5',u:'#b8862b','':'#f1e6cc'};
const ORDER = ['c','s','p','m','f','r','g','u'];
const POS = {21:[9,1],22:[10,1],20:[9,2],23:[10,2],19:[9,3],24:[10,3],7:[1,4],8:[2,4],9:[3,4],10:[4,4],11:[5,4],12:[6,4],14:[7,4,2],15:[9,4],16:[10,4],6:[1,5],5:[3,5],4:[4,5],3:[5,5],2:[6,5],1:[7,5],18:[9,5],17:[10,5]};
const MAP_RESORT = 'https://maps.app.goo.gl/6dFUHGh6tHEv27Y5A', MAP_POOJAN = 'https://maps.app.goo.gl/JykM6UuGr3fdbQ9z7';
const FN = [['Shri Ganesh Poojan','Sat 28 Nov, 11:00 AM'],['Haldi','Tue 1 Dec, 10:00 AM'],['Sangeet','Tue 1 Dec, 7:00 PM'],['Nikasi','Wed 2 Dec, 10:00 AM'],['Phere','Wed 2 Dec, 12:30 PM'],['Vidaai','Wed 2 Dec']];
const SIDEG = {"Groom's side":'f','Friend':'r'};
const BAARAT = 'With baarat family from Gwalior';
const EVT = [['Shri Ganesh Poojan','2026-11-28T11:00:00+05:30','Sanskriti Hotel, Morar, Gwalior','Poojan',MAP_POOJAN],['Haldi','2026-12-01T10:00:00+05:30','Pukhraj Resort','Haldi',MAP_RESORT],['Sangeet','2026-12-01T19:00:00+05:30','Pukhraj Resort','Sangeet',MAP_RESORT],['Nikasi','2026-12-02T10:00:00+05:30','Pukhraj Resort','Nikasi',MAP_RESORT],['Phere','2026-12-02T12:30:00+05:30','Pukhraj Resort','Phere',MAP_RESORT],['Vidaai','2026-12-02T18:00:00+05:30','Pukhraj Resort','Vidaai',MAP_RESORT]];
const ROLES = ['Family coordinator','Venue','Caterer','Decorator','Pandit ji','Photographer','Driver','Transport','Other'];
const TFOR = ['General','Shri Ganesh Poojan','Haldi','Sangeet','Nikasi','Phere','Vidaai','Rooms','Travel','Shopping'];
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function enc(o){const b=new TextEncoder().encode(JSON.stringify(o));let n=1n;for(const x of b)n=n*256n+BigInt(x);let s='';while(n>0n){s=B62[Number(n%62n)]+s;n/=62n}return s}
function dec(s){let n=0n;for(const c of s){const i=B62.indexOf(c);if(i<0)throw new Error('bad');n=n*62n+BigInt(i)}const a=[];while(n>1n){a.unshift(Number(n%256n));n/=256n}return JSON.parse(new TextDecoder().decode(new Uint8Array(a)))}

/* ===== helpers ===== */
const $ = s => document.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pn = s => (s || '').split('+').reduce((a, x) => a + (parseInt(x) || 0), 0);
const t12 = v => {if(!v)return'';let[h,m]=v.split(':').map(Number);const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`};
const when = t => t ? new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) : '';
const ago = t => {if(!t)return'';const m=Math.round((Date.now()-t)/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' d ago'};
const fdate = d => d ? new Date(d+'T00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}) : '';
const sdate = d => d ? new Date(d+'T00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
const ph91 = s => {const d=String(s||'').replace(/\D/g,'');return d.length==10?'91'+d:d.length==11&&d[0]=='0'?'91'+d.slice(1):d};
const waL = (p, t) => 'https://wa.me/' + ph91(p) + (t ? '?text=' + encodeURIComponent(t) : '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ini = n => String(n||'?').replace(/[^A-Za-zऀ-ॿ ]/g,' ').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';
const today = () => new Date().toISOString().slice(0, 10);
let toastT = 0;
const toast = m => {const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)};
function dlBlob(blob, name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
const credit = () => `<div class="credit">${CREDIT}</div>`;
const I = {
 back:'<path d="m15 5-7 7 7 7"/>', plus:'<path d="M12 5v14M5 12h14"/>', dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', dots:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/>', map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', desk:'<path d="M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4"/>',
 bus:'<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21l1-3M16 21l-1-3"/>', train:'<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M8 21l2-4M16 21l-2-4"/>',
 todo:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>', phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
 wa:'<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/>', bed:'<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 21v-3M21 21v-3M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>', eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 qr:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>', send:'<path d="M21 3 3 10l7 3 3 7z"/><path d="m10 13 4-4"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
 up:'<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>', out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', check:'<path d="m6 12 4 4 8-9"/>', heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'
};
const svg = (k, st = '') => `<svg viewBox="0 0 24 24"${st ? ` stroke="${st}"` : ''}>${I[k]}</svg>`;

/* ===== state ===== */
let D = {}, R = {}, CT = {}, TK = {}, VH = {}, ORG = {}, META = {}, ME = null, LIVE = false;
const SEEN = {};
const live = o => Object.values(o).filter(x => !x.del);
const tOf = r => r.t || (r.createdAt && r.createdAt.toMillis ? r.createdAt.toMillis() : 0);
// Same guest replying twice: show only the newest reply per phone number (older ones are merged into it, see dedupe()).
function rlist(){const by={};Object.values(R).filter(r=>!r.del).forEach(r=>{const k=r.p||r.id;if(!by[k]||tOf(r)>tOf(by[k]))by[k]=r});return Object.values(by).sort((a,b)=>tOf(b)-tOf(a))}
const roomOf = r => r && r.room && D[r.room] && D[r.room].rid === r.id ? r.room : '';
const paxStr = r => r.ad ? (r.ch ? r.ad + '+' + r.ch : String(r.ad)) : '';
const paxWords = r => r.ad ? `${r.ad} adult${r.ad>1?'s':''}${r.ch?`, ${r.ch} child${r.ch>1?'ren':''}`:''}` : '';
const people = r => (r.ad || 0) + (r.ch || 0);
const coming = () => rlist().filter(r => r.a);
const grpOf = r => (GN[r.g] && r.g ? r.g : '') || (GN[r.gk] && r.gk ? r.gk : '') || SIDEG[r.sd] || 'f';
const idsOf = f => Object.keys(D).filter(k => D[k].f == f).sort();
const vacant = () => Object.keys(D).filter(i => !D[i].name).sort();
const vOf = r => live(VH).filter(v => v.px && v.px[r.id]);
const rtype = id => T[id] || 'Executive room';

/* ===== Firestore writes ===== */
const clean = o => {const x={};for(const k in o){if(k==='id'||o[k]===undefined)continue;x[k]=o[k]}return x};
function put(coll, id, o, merge = true){o.t2=Date.now();setDoc(doc(db,coll,id),clean(o),{merge}).catch(e=>toast('Could not save: '+(e.code||e.message)))}
const putRoom = id => put('rooms', id, D[id], false);
const putR = r => put('rsvps', r.id, r);

/* ===== render loop ===== */
let PAGE = 'home', ARG = '', pendR = false, raf = 0;
const busy = () => {const a=document.activeElement;return a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)&&($('#view').contains(a)||$('#sheet').contains(a))&&a.type!=='checkbox'&&a.type!=='file'};
function rer(){if(busy()){pendR=true;return}cancelAnimationFrame(raf);raf=requestAnimationFrame(render)}
document.addEventListener('focusout',()=>setTimeout(()=>{if(pendR&&!busy()){pendR=false;rer()}},150));
function go(p){location.hash='#/'+p}
function route(){const h=location.hash;if(h.startsWith('#rsvp-')){askImport(h.slice(6));return}
 const m=h.match(/^#\/([a-z]+)(?:\/(.+))?$/);PAGE=m?m[1]:'home';ARG=m&&m[2]?decodeURIComponent(m[2]):'';if(!P[PAGE])PAGE='home';closeSheet();render();scrollTo(0,0)}
addEventListener('hashchange',route);
const NAVOF = {home:'home',rooms:'rooms',guests:'guests',guest:'guests',travel:'travel',veh:'travel'};
function render(){if($('#app').hidden)return;const v=$('#view');v.innerHTML=P[PAGE](ARG)+credit();(B[PAGE]||(()=>{}))(ARG);
 $$('#nav [data-n]').forEach(b=>b.classList.toggle('on',(NAVOF[PAGE]||'more')===b.dataset.n));if(FLOOR&&!$('#fv').hidden&&!SELR)Object.keys(els).forEach(paint);if(!$('#pv').hidden&&!$('#pbody').contains(document.activeElement))showPaper()}
const P = {}, B = {};
const ph = (title, sub, right = '', back = 'home') => `<div class="ph"><button class="bk" data-back="${back}" aria-label="Back">${svg('back')}</button><div class="tt"><b class="H">${title}</b><span>${sub}</span></div>${right}</div>`;
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();go(g.dataset.go);return}
 const b=e.target.closest('[data-back]');if(b){e.preventDefault();go(b.dataset.back)}});

/* ===== bottom sheet ===== */
function openSheet(html, bind){$('#sheet').innerHTML='<div class="grab"></div>'+html;$('#sheet').hidden=false;$('#scrim').hidden=false;if(bind)bind($('#sheet'))}
function closeSheet(){$('#sheet').hidden=true;$('#scrim').hidden=true;$('#sheet').innerHTML='';if(SELR){const o=SELR;SELR=null;if(els[o])paint(o);rer()}}
$('#scrim').onclick=closeSheet;

/* ================= HOME ================= */
function nextEv(){const now=Date.now();let i=EVT.findIndex(e=>new Date(e[1]).getTime()>now-3*3600e3);return i<0?EVT.length-1:i}
P.home = () => {const C=coming(),L=rlist(),need=C.filter(r=>r.rm),noRoom=need.filter(r=>!roomOf(r)).length,keys=C.filter(r=>roomOf(r)&&!r.ks).length,
 ni=nextEv(),ne=EVT[ni],dt=new Date(ne[1]),ms=dt-Date.now(),days=Math.ceil(ms/864e5),open=live(TK).filter(t=>!t.dn),vs=live(VH),
 unsent=vs.reduce((a,v)=>a+Object.keys(v.px||{}).filter(i=>R[i]&&!R[i].del&&!v.px[i].s).length,0),ba=C.filter(r=>r.tr==BAARAT),
 drops=C.filter(r=>r.dr),wk=new Date(Date.now()+7*864e5).toISOString().slice(0,10),due=open.filter(t=>t.d&&t.d<=wk),vac=vacant(),
 hand=C.filter(r=>roomOf(r)&&!r.kg&&r.ci).length,tot=Object.keys(D).length,given=tot-vac.length;
 const when2=days>1?`IN ${days} DAYS`:days==1?'TOMORROW':ms>0?'TODAY':'NOW';
 const cd=ms>0?[Math.floor(ms/864e5),Math.floor(ms/36e5)%24,Math.floor(ms/6e4)%60]:[0,0,0];
 const hr=+new Date().toLocaleString('en-GB',{hour:'numeric',hour12:false,timeZone:'Asia/Kolkata'});
 const nm=(ORG[ME.email]&&ORG[ME.email].name||ME.displayName||ME.email.split('@')[0]).split(' ')[0];
 const att=[noRoom&&['bed','#fbeef0','#7b1e2b',`<b>${noRoom} ${noRoom>1?'families':'family'}</b> need a room`,`${vac.length} rooms still vacant`,'Assign','guests/need'],
  keys&&['key','#fbf3e1','#b8862b',`<b>${keys} room key${keys>1?'s':''}</b> to send`,'on WhatsApp, one tap each','Send','guests/key'],
  unsent&&['bus','#eaf1fa','#2563a8',`<b>${unsent} travel card${unsent>1?'s':''}</b> to send`,'bus and train passengers','Send','travel'],
  drops.length&&['pin','#eaf1fa','#2563a8',`<b>${drops.length} drop${drops.length>1?'s':''}</b> requested`,'Departures on 2 Dec','Plan','travel/drop'],
  due.length&&['todo','#eef3e4','#6b7a1f',`<b>${due.length} task${due.length>1?'s':''}</b> due this week`,due.slice(0,2).map(t=>esc(t.n)).join(' · '),'View','todo'],
  hand&&['desk','#fbf3e1','#b8862b',`<b>${hand} key${hand>1?'s':''}</b> to hand over`,'guests who have arrived','Open','checkin']].filter(Boolean);
 const tile=(go,ic,t,n,sub,badge)=>`<button class="card tile" data-go="${go}">${badge?`<span class="badge">${badge}</span>`:''}<div class="ic">${svg(ic)}</div><b>${t}</b><div class="n">${n}</div><span>${sub}</span></button>`;
 const track=f=>{const ids=idsOf(f);return ORDER.map(k=>{const n=ids.filter(i=>D[i].name&&(D[i].g||'f')==k).length;return n?`<i style="width:${n/ids.length*100}%;background:${GC[k]}"></i>`:''}).join('')};
 return `<div class="bar"><div class="mono H">A&amp;S</div><div class="bt"><b class="H">Ashutosh &amp; Shrusti</b><span>ORGANISER · 1–2 DEC · UJJAIN</span></div>${liveChip()}<button class="av" data-go="more" aria-label="Account">${esc(ini(nm))}</button></div>
 <div class="wrap"><div class="hello"><b class="H">Good ${hr<12?'morning':hr<17?'afternoon':'evening'}, ${esc(nm)}</b><span>${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Kolkata'})}</span></div>
 <div class="hero"><div class="kick">NEXT UP · ${when2}</div><h2 class="H">${ne[0]}</h2>
  <div class="meta"><div>${svg('cal')}${dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Kolkata'})} · ${dt.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'})}</div><div>${svg('pin')}${ne[2]}</div></div>
  <div class="cd"><div><b class="H">${cd[0]}</b><span>DAYS</span></div><div><b class="H">${cd[1]}</b><span>HRS</span></div><div><b class="H">${cd[2]}</b><span>MIN</span></div></div>
  <div class="hb"><button class="pill gold" id="h_alert">${svg('bell')}Send alert</button><a class="pill ghost" href="${ne[4]}" target="_blank" rel="noopener">${svg('map')}Map</a></div></div>
 <div class="tl">${EVT.map((e,i)=>`<div class="ev${i==ni?' now':i<ni?' past':''}"><i></i><b>${e[3]}</b>${new Date(e[1]).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'})}</div>`).join('')}</div>
 <div class="card att" style="margin-top:16px"><button class="r" data-go="invite"><div class="ic" style="background:#fbeef0">${svg('send','#7b1e2b')}</div><div class="t"><b>Invite guests</b><span>Share the invitation + RSVP on WhatsApp</span></div><div class="act">Share</div></button></div>
 <div class="sec"><h3 class="H">At a glance</h3><a href="#/guests">All RSVPs ›</a></div>
 <div class="card kpi"><div><b class="H">${L.length}</b><span>Replies</span></div><div><b class="H">${C.length}</b><span>Coming</span></div><div><b class="H">${C.reduce((a,r)=>a+people(r),0)}</b><span>Guests</span></div><div><b class="H">${given}<small>/${tot}</small></b><span>Rooms</span></div></div>
 <div class="sec"><h3 class="H">Needs attention</h3><a>${att.length?att.length+' item'+(att.length>1?'s':''):''}</a></div>
 <div class="card att">${att.map(a=>`<button class="r" data-go="${a[6]}"><div class="ic" style="background:${a[1]}">${svg(a[0],a[2])}</div><div class="t">${a[3]}<span>${a[4]}</span></div><div class="act">${a[5]}</div></button>`).join('')||`<div class="r"><div class="ic" style="background:#eaf5ec">${svg('check','#2f7d4a')}</div><div class="t"><b>All caught up</b><span>Nothing waiting right now</span></div></div>`}</div>
 <div class="sec"><h3 class="H">Manage</h3></div>
 <div class="grid">${tile('guests','mail','RSVPs',L.length,`${C.length} coming`,noRoom+keys)}${tile('checkin','desk','Check-in',`${C.filter(r=>r.ci).length}/${C.length}`,'arrived',hand)}
 ${tile('travel','bus','Travel',vs.length,`${vs.filter(v=>v.k=='bus').length} buses · ${vs.filter(v=>v.k=='train').length} trains · ${ba.reduce((a,r)=>a+people(r),0)} baarat`,unsent)}
 ${tile('alerts','bell','Alerts',C.length,'to message','')}${tile('todo','todo','To-do',open.length,'open tasks',due.length)}${tile('contacts','phone','Contacts',live(CT).length,'venue, drivers','')}</div>
 <div class="sec"><h3 class="H">Rooms</h3><a href="#/rooms">Floor plan ›</a></div>
 <div class="card rooms">${tot?[4,5].map(f=>{const ids=idsOf(f),g=ids.filter(i=>D[i].name).length;return `<div class="fl"><div class="h"><b>${f}th floor</b><span>${g} of ${ids.length} given</span></div><div class="track">${track(f)}</div></div>`}).join('')+legend()
  +`<div class="rb"><button class="pill solid" data-go="rooms">Floor plan</button><button class="pill out" id="h_pdf">View PDF</button><button class="pill out" id="h_csv">Export</button></div>`
  :`<div class="empty">No room plan yet. Import the starting data once from <b>More → Import starting data</b>.</div><div class="rb"><button class="pill solid" data-go="import">Import starting data</button></div>`}</div>
 ${D['422']?'<div class="foot">Room 422 · Presidential suite · Groom</div>':''}</div>`};
B.home = () => {$('#h_alert').onclick=()=>{ALX={ev:nextEv()};go('alerts')};const p=$('#h_pdf');if(p)p.onclick=openPaper;const c=$('#h_csv');if(c)c.onclick=csv};
const legend = (st = '') => `<div class="legend"${st}>${ORDER.map(k=>`<span><i style="background:${GC[k]}"></i>${GS[k]}</span>`).join('')}<span><i style="background:#fff6dc;border:1px dashed #b8862b"></i>Vacant</span></div>`;
const liveChip = () => `<div class="live${LIVE?'':' off'}"><i></i>${LIVE?'Live':'Offline'}</div>`;
setInterval(()=>{if(PAGE=='home'&&$('#sheet').hidden)rer()},30000);

/* ================= ROOMS ================= */
let RF = 4, RQ = '';
P.rooms = () => {const tot=Object.keys(D).length,vac=vacant().length;
 if(!tot)return ph('Rooms','No room plan yet')+`<div class="body"><div class="card empty">Import the starting room plan once, then rooms appear here.<div class="rb" style="margin-top:10px"><button class="pill solid" data-go="import">Import starting data</button></div></div></div>`;
 const q=RQ.toLowerCase(),hit=id=>!q||id.includes(q)||D[id].name.toLowerCase().includes(q)||(D[id].note||'').toLowerCase().includes(q);
 let inner;
 if(RF=='list'){const ids=Object.keys(D).sort().filter(hit);inner=`<div class="card list">${ids.map(id=>{const d=D[id];return `<button class="it" data-room="${id}"><div class="rm${d.name?'':' v'}" style="width:40px;flex:none;${d.name?'background:'+GC[d.g||'f']:''}">${id}</div><div class="t"><b>${esc(d.name||'Vacant')}</b><span>${[rtype(id),d.pax&&d.pax+' persons',d.name&&GS[d.g||'f'],d.note].filter(Boolean).map(esc).join(' · ')}</span></div></button>`}).join('')||'<div class="empty">No room matches your search.</div>'}</div>`}
 else{const ids=idsOf(RF),g=ids.filter(i=>D[i].name).length;
  const cells=ids.map(id=>{const p=POS[+id%100],d=D[id];if(!p)return'';return `<button class="rm${d.name?'':' v'}${id=='422'?' gr':''}${hit(id)?'':' dim'}" data-room="${id}" style="grid-column:${p[0]}${p[2]?'/span '+p[2]:''};grid-row:${p[1]};${d.name?'background:'+GC[d.g||'f']:''}">${id}</button>`}).join('')
   +`<div class="rm deco" style="grid-column:8;grid-row:1/4;height:auto">Stairs<br>&amp; Lift</div><div class="rm deco" style="grid-column:2;grid-row:5">Service</div><div class="rm deco" style="grid-column:8;grid-row:5">Lobby</div>`
   +(RF==5?'<div class="rm x" style="grid-column:10;grid-row:1" title="Unavailable">522</div>':'');
  inner=`<div class="card"><div style="display:flex;justify-content:space-between;padding:10px 12px 0;font-size:12px;color:var(--mute);gap:8px"><b style="color:var(--ink);font-size:14px">${RF}th floor</b>${g} of ${ids.length} given · tap a room</div>
  <div class="mini" style="grid-template-rows:repeat(5,34px)">${cells}</div>${legend(' style="padding:0 12px 10px;margin:0"')}</div>
  ${RF==4&&D['422']?'<div class="foot" style="color:#c2255c;font-weight:700">★ Groom’s room: 422 · Presidential suite</div>':''}`}
 return ph('Rooms',`${tot} usable · ${tot-vac} given · ${vac} vacant`,`<button class="ib" id="r_dl" aria-label="Download PDF">${svg('dl')}</button>`)+`<div class="body">
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="r_q" placeholder="Search guest or room…" value="${esc(RQ)}"></label>
 <div class="seg" style="margin-top:10px">${[[4,'4th floor'],[5,'5th floor'],['list','List']].map(([k,l])=>`<button data-rf="${k}" class="${RF==k?'on':''}">${l}</button>`).join('')}</div>${inner}
 <div class="rb" style="margin-top:12px"><button class="pill solid" id="r_fp">Floor plan</button><button class="pill out" id="r_pdf">View PDF</button><button class="pill out" id="r_csv">Export list</button></div>
 <div class="rb" style="margin-top:8px"><button class="pill out" id="r_dl2">${svg('dl')}Download PDF</button><button class="pill danger" id="r_rst">Reset all</button></div></div>`};
B.rooms = () => {if(!Object.keys(D).length)return;
 const q=$('#r_q');q.oninput=()=>{RQ=q.value;const p=q.selectionStart;render();const n=$('#r_q');n.focus();n.setSelectionRange(p,p)};
 $$('[data-rf]').forEach(b=>b.onclick=()=>{RF=b.dataset.rf=='list'?'list':+b.dataset.rf;render()});
 $$('[data-room]').forEach(b=>b.onclick=()=>editRoom(b.dataset.room));
 $('#r_fp').onclick=()=>openFloor(RF=='list'?4:RF);$('#r_pdf').onclick=openPaper;$('#r_csv').onclick=csv;$('#r_dl').onclick=dl;$('#r_dl2').onclick=dl;
 $('#r_rst').onclick=()=>{if(!META.seed){toast('Starting plan not found. Import the starting data again.');return}
  if(!confirm('Reset all rooms to the original allotment? Rooms given to RSVPs will be cleared.'))return;
  const b=writeBatch(db);Object.keys(D).forEach(id=>b.delete(doc(db,'rooms',id)));Object.entries(seedRooms(META.seed)).forEach(([id,r])=>b.set(doc(db,'rooms',id),{...r,t2:Date.now()}));b.commit().then(()=>toast('Rooms reset')).catch(e=>toast('Could not reset: '+e.code))}};

/* room editor sheet (replaces the v9 side panel) */
let SELR = null;
function editRoom(id){const d=D[id];if(!d)return;SELR=id;if(els[id])paint(id);const g0=d.g||(d.name?'f':'');
 openSheet(`<div style="display:flex;align-items:center;gap:10px"><div class="rm${d.name?'':' v'}" style="width:46px;height:46px;font-size:14px;${d.name?'background:'+GC[d.g||'f']:''}">${id}</div><div style="flex:1"><b class="H" style="font-size:22px;color:var(--mar)">Room ${id}</b><div style="font-size:11.5px;color:var(--mute)">${rtype(id)} · ${d.f}th floor</div></div><span class="tag ${d.name?'tg':'ty'}">${d.name?'Given':'Vacant'}</span></div>
 <div class="two"><div class="fld"><label>Guest / family</label><input class="inp" id="e_a" value="${esc(d.name)}"></div><div class="fld"><label>Persons (e.g. 2+1)</label><input class="inp" id="e_b" value="${esc(d.pax)}"></div></div>
 <div class="fld"><label>Group</label><div class="opt" id="e_g">${ORDER.map(k=>`<button class="chip${k==g0?' on':''}" data-g="${k}">${GS[k]}</button>`).join('')}</div></div>
 <div class="fld"><label>Notes</label><input class="inp" id="e_n" value="${esc(d.note||'')}"></div>
 ${d.rid&&R[d.rid]?`<div class="hint">Given to RSVP: <b>${esc(R[d.rid].n)}</b></div>`:''}
 <div class="btns"><button class="pill out" id="e_clr">Remove</button><button class="pill solid" id="e_ok">Save</button></div>`,s=>{
  let g=g0;$$('[data-g]',s).forEach(b=>b.onclick=()=>{g=b.dataset.g;$$('[data-g]',s).forEach(x=>x.classList.toggle('on',x===b))});
  $('#e_ok').onclick=()=>{Object.assign(d,{name:$('#e_a').value.trim(),pax:$('#e_b').value.trim(),g:$('#e_a').value.trim()?(g||'f'):'',note:$('#e_n').value.trim()});if(!d.name)d.rid='';putRoom(id);closeSheet();toast('Room '+id+' saved')};
  $('#e_clr').onclick=()=>{if(d.name&&!confirm('Clear room '+id+'?'))return;Object.assign(d,{name:'',pax:'',g:'',note:'',rid:''});putRoom(id);closeSheet();toast('Room '+id+' is now vacant')}})}

/* full-screen floor plan with pinch zoom (from v9) */
let els = {}, FLOOR = 0;const V = {x:0,y:0,k:1};
function paint(id){const e=els[id],d=D[id];if(!e)return;
 if(id=='522'){e.className='ftile x';e.innerHTML='<div><b>522</b></div><span>Unavailable</span>';return}
 if(!d){e.className='ftile v';e.innerHTML=`<div><b>${id}</b></div>`;return}
 e.className='ftile'+(d.name?'':' v')+(SELR==id?' sel':'')+(id=='422'?' groom':'');e.style.background=d.name?GC[d.g||'f']:'';
 e.innerHTML=`<div><b>${id}</b><i${d.pax?'':' hidden'}>${esc(d.pax)}</i></div><span>${id=='422'?'★ GROOM · ':''}${esc(d.name||T[id]||'Vacant')}</span>`}
function openFloor(f){FLOOR=f;els={};const g=document.createElement('div');g.className='fgrid';
 g.innerHTML=`<div class="flab">${f}TH FLOOR · pool side ↑ · highway side ↓</div><div class="fdeco" style="grid-column:8;grid-row:1/4">Stairs<br>&amp; Lift</div><div class="fdeco" style="grid-column:2;grid-row:5">Service</div><div class="fdeco" style="grid-column:8;grid-row:5">Lobby</div>`;
 const ids=idsOf(f);if(f==5)ids.push('522');
 ids.forEach(id=>{const p=POS[+id%100];if(!p)return;const e=document.createElement('div');e.style.gridColumn=p[0]+(p[2]?'/span '+p[2]:'');e.style.gridRow=p[1];e.dataset.id=id;els[id]=e;g.appendChild(e);paint(id)});
 $('#pz').innerHTML='';$('#pz').appendChild(g);$('#ft').textContent=f+'th floor';$('#fv').hidden=false;fit()}
$('#fx').onclick=()=>{$('#fv').hidden=true;FLOOR=0;els={};rer()};
function ap(){$('#pz').style.transform=`translate(${V.x}px,${V.y}px) scale(${V.k})`}
function fit(){const r=$('#vp').getBoundingClientRect();V.k=Math.min(r.width/960,r.height/520);V.x=(r.width-912*V.k)/2;V.y=(r.height-382*V.k)/2+10;ap()}
function zoomAt(cx,cy,nk){nk=Math.max(.3,Math.min(5,nk));V.x=cx-(cx-V.x)*nk/V.k;V.y=cy-(cy-V.y)*nk/V.k;V.k=nk;ap()}
const vp=$('#vp'),PT=new Map();let md=0,t0=0,ld=0,lx,ly,vx=0,vy=0,fr=0;
const relp=e=>{const r=vp.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
vp.addEventListener('pointerdown',e=>{cancelAnimationFrame(fr);PT.set(e.pointerId,relp(e));if(PT.size==1){md=0;t0=Date.now();vx=vy=0}else{ld=0}});
addEventListener('pointermove',e=>{if(!PT.has(e.pointerId))return;const n=relp(e),o=PT.get(e.pointerId);PT.set(e.pointerId,n);
 if(PT.size==1){const dx=n[0]-o[0],dy=n[1]-o[1];md+=Math.abs(dx)+Math.abs(dy);V.x+=dx;V.y+=dy;vx=dx;vy=dy;ap()}
 else if(PT.size==2){md+=99;const[a,b]=[...PT.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  if(ld){V.x+=mx-lx;V.y+=my-ly;zoomAt(mx,my,V.k*d/ld)}ld=d;lx=mx;ly=my}});
function up(e){if(!PT.has(e.pointerId))return;const was=PT.size;PT.delete(e.pointerId);ld=0;
 if(was==1){if(md<8&&Date.now()-t0<500){const el=document.elementFromPoint(e.clientX,e.clientY),r=el&&el.closest('.ftile');if(r&&r.dataset.id!='522')editRoom(r.dataset.id)}
  else if(Math.hypot(vx,vy)>2){const f=()=>{vx*=.93;vy*=.93;V.x+=vx;V.y+=vy;ap();if(Math.hypot(vx,vy)>.4)fr=requestAnimationFrame(f)};fr=requestAnimationFrame(f)}}}
addEventListener('pointerup',up);addEventListener('pointercancel',up);
vp.addEventListener('wheel',e=>{e.preventDefault();const[x,y]=relp(e);zoomAt(x,y,V.k*Math.exp(-e.deltaY*.0015))},{passive:false});
vp.addEventListener('dblclick',e=>{const[x,y]=relp(e);zoomAt(x,y,V.k>1.6?Math.min(r0(),1):V.k*2.2)});
const r0=()=>Math.min(vp.clientWidth/960,vp.clientHeight/520);
addEventListener('resize',()=>{if(!$('#fv').hidden)fit()});

/* PDF preview + download (from v9) */
function groups(){const rows=Object.keys(D).filter(i=>D[i].name).sort(),by={};ORDER.forEach(k=>by[k]=[]);rows.forEach(i=>by[D[i].g||'f'].push(i));return{rows,by,vac:vacant()}}
function pdfHTML(){const{rows,by,vac}=groups();
 return `<div class="paper"><h2>Ashutosh &amp; Shrusti — Guest Room Allotment</h2><div style="color:#666">2 December 2026 · Pukhraj Club &amp; Resort, Newa Kheda, Ujjain</div>
 <div style="margin:8px 0">${ORDER.map(k=>`<span class="pchip" style="background:${GC[k]};margin:0 6px 4px 0">${GN[k]}</span>`).join('')}</div>
 <div style="background:#fff8e1;border:1px solid #e2cfa6;border-radius:6px;padding:6px 10px;margin:8px 0;color:#7a5a00">✎ Tap any guest name, persons or note to edit, or change the category from the dropdown. Edits save automatically and go into the downloaded PDF, which also has fillable fields.</div><h4>Part 1 · Room-wise list</h4><table><tr><th>Room</th><th>Guest / family</th><th>Persons</th><th>Category</th><th>Notes</th></tr>
 ${rows.map(i=>{const d=D[i],c=GC[d.g||'f'];return `<tr data-r="${i}"><td><span class="pchip" style="background:${c}">${i}</span></td><td contenteditable data-k="name">${esc(d.name)}</td><td contenteditable data-k="pax">${esc(d.pax)}</td><td><select data-k="g" style="background:${c};color:#fff;border:0;border-radius:4px;font-weight:700;padding:2px 4px">${ORDER.map(k=>`<option value="${k}"${k==(d.g||'f')?' selected':''}>${GN[k]}</option>`).join('')}</select></td><td contenteditable data-k="note">${esc(d.note)}</td></tr>`}).join('')}</table>
 <h4>Part 2 · Category-wise</h4>${ORDER.filter(k=>by[k].length).map(k=>`<div class="cat" style="background:${GC[k]}"><span>${GN[k]}</span><span>${by[k].length} rooms · ${by[k].reduce((a,i)=>a+pn(D[i].pax),0)} persons</span></div><table>${by[k].map(i=>`<tr><td style="width:60px"><b>${i}</b></td><td>${esc(D[i].name)}</td><td>${esc(D[i].pax)}</td></tr>`).join('')}</table>`).join('')}
 <p style="color:#666">Vacant rooms: ${vac.join(', ')||'none'}</p><p style="color:#999;text-align:center;font-size:11px;margin-top:20px">${CREDIT}</p></div>`}
let pT = {};
function showPaper(){const b=$('#pbody'),t=b.scrollTop;b.innerHTML=pdfHTML();b.scrollTop=t;
 $$('tr[data-r]',b).forEach(tr=>{const id=tr.dataset.r;$$('[data-k]',tr).forEach(el=>{
  if(el.tagName=='SELECT')el.onchange=()=>{D[id].g=el.value;putRoom(id);showPaper()};
  else el.oninput=()=>{D[id][el.dataset.k]=el.textContent;clearTimeout(pT[id]);pT[id]=setTimeout(()=>putRoom(id),700)}})})}
function openPaper(){showPaper();$('#pv').hidden=false}
$('#px').onclick=()=>{$('#pv').hidden=true;rer()};
function makePDF(){const{rows,by,vac}=groups(),J=window.jspdf&&window.jspdf.jsPDF;if(!J)return null;
 const doc=new J({unit:'pt',format:'a4'}),M=36;let y=M;const rgb=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
 doc.setProperties({title:'Ashutosh & Shrusti - Guest Room Allotment',author:'Arvind Singh',creator:'A&S Wedding dashboard · Designed by Arvind Singh',subject:'Room allotment'});
 const need=n=>{if(y+n>800){doc.addPage();y=M}},cut=(s,w)=>doc.splitTextToSize(String(s||''),w)[0]||'';const AF=J.AcroForm,fld=(n,v,x,w)=>{try{const f=new AF.TextField();f.fieldName=n;f.Rect=[x,y,w,15];f.value=String(v||'');f.fontSize=9;f.maxFontSize=9;doc.addField(f)}catch(e){doc.text(cut(v,w),x,y+11)}};
 doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(123,30,43);doc.text('Ashutosh & Shrusti - Guest Room Allotment',M,y+14);y+=24;
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(100);doc.text('2 December 2026  |  Pukhraj Club & Resort, Newa Kheda, Ujjain',M,y+4);y+=18;
 let x=M;ORDER.forEach(k=>{const w=doc.getTextWidth(GN[k])+34;if(x+w>560){x=M;y+=18}doc.setFillColor(...rgb(GC[k]));doc.roundedRect(x,y,12,12,2,2,'F');doc.setTextColor(60);doc.text(GN[k],x+16,y+9);x+=w});y+=28;
 const head=t=>{need(40);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(123,30,43);doc.text(t,M,y+10);y+=20};
 head('Part 1 - Room-wise list');
 const th=()=>{doc.setFillColor(244,234,210);doc.rect(M,y,523,16,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(60);[['Room',M+6],['Guest / family',M+60],['Persons',M+270],['Category',M+330],['Notes',M+410]].forEach(([t,xx])=>doc.text(t,xx,y+11));y+=18};
 th();
 rows.forEach(i=>{const d=D[i],c=rgb(GC[d.g||'f']);if(y+18>800){doc.addPage();y=M;th()}
  doc.setFillColor(...c);doc.roundedRect(M+2,y,38,15,3,3,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(i,M+21,y+11,{align:'center'});
  fld('name_'+i,d.name,M+60,205);fld('pax_'+i,d.pax,M+270,50);
  doc.setTextColor(...c);doc.setFont('helvetica','bold');doc.text(GN[d.g||'f'],M+330,y+11);fld('note_'+i,d.note,M+410,113);
  doc.setDrawColor(235);doc.line(M,y+17,M+523,y+17);y+=19});
 y+=14;head('Part 2 - Category-wise list');
 ORDER.filter(k=>by[k].length).forEach(k=>{need(40);const c=rgb(GC[k]);doc.setFillColor(...c);doc.rect(M,y,523,18,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text(GN[k],M+8,y+12);doc.text(by[k].length+' rooms | '+by[k].reduce((a,i)=>a+pn(D[i].pax),0)+' persons',M+515,y+12,{align:'right'});y+=22;
  by[k].forEach(i=>{need(16);doc.setTextColor(30);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(i,M+8,y+9);doc.setFont('helvetica','normal');doc.text(cut(D[i].name,330),M+60,y+9);doc.text(String(D[i].pax||''),M+430,y+9);y+=15});y+=8});
 need(30);doc.setFontSize(9);doc.setTextColor(100);doc.text('Vacant rooms: '+(vac.join(', ')||'none'),M,y+10);
 const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(140);doc.text(CREDIT+'   ·   page '+p+' of '+pages,297.5,828,{align:'center'})}
 return doc}
function dl(){const doc=makePDF();if(!doc)return toast('PDF engine not loaded - check connection');doc.save('AS_Wedding_Rooms_by_Arvind_Singh.pdf')}
$('#pdl').onclick=dl;
function csv(){const r=['Floor,Room,Type,Guest,Persons,Group,Notes'];Object.keys(D).sort().forEach(id=>{const d=D[id];r.push([d.f,id,T[id]||'Executive',d.name,d.pax,d.name?GN[d.g||'f']:'Vacant',d.note].map(v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"').join(','))});
 r.push('','"'+CREDIT+'"');$('#dlt').textContent='Allotment list (CSV)';$('#ta').value=r.join('\n');$('#dld').hidden=false;$('#dlg').showModal()}
$('#cl').onclick=()=>$('#dlg').close();
$('#cp').onclick=async()=>{const t=$('#ta');try{await navigator.clipboard.writeText(t.value);toast('Copied')}catch(e){t.select();document.execCommand('copy')}};
$('#dld').onclick=()=>dlBlob(new Blob(['﻿'+$('#ta').value],{type:'text/csv'}),'AS_Wedding_Rooms_by_Arvind_Singh.csv');

/* ================= GUESTS (RSVPs) ================= */
let GF = 'all', GQ = '';
function fillRoom(r,room){Object.assign(D[room],{name:r.n,pax:paxStr(r),g:grpOf(r),note:[r.rl,'+'+r.p].filter(Boolean).join(' · '),rid:r.id})}
function assign(r,room){const old=roomOf(r);if(old){Object.assign(D[old],{name:'',pax:'',g:'',note:'',rid:''});putRoom(old)}
 if(room){fillRoom(r,room);putRoom(room)}r.room=room;putR(r)}
function keyHref(r){const room=roomOf(r),d=D[room];
 const K={n:r.n,r:room,f:d.f,ty:rtype(room),px:paxWords(r),ar:r.ar?`${r.ar}${r.at?', around '+t12(r.at):''}`:'',dp:[r.dp,t12(r.dt)].filter(Boolean).join(', '),fx:r.fx||[]};
 const L=['🔑 *Your room key card*','Ashutosh weds Shrusti','',`Dear ${r.n}, your room is ready.`,'',`🚪 *Room ${room}*, ${d.f}th floor (${K.ty})`,'🏨 Pukhraj Club & Resort, Newa Kheda, Ujjain','📍 '+MAP_RESORT];
 if(K.ar)L.push('🗓 Arrival: '+K.ar);if(K.px)L.push('👥 '+K.px);
 L.push('','Open your key card:',CARDS_URL+'#key-'+enc(K),'','Please show it at the reception. 🙏','Dr. Sarita Singhal & the Singhal Family');
 return waL(r.p,L.join('\n'))}
const gfilt = {all:r=>1,coming:r=>r.a,need:r=>r.a&&r.rm&&!roomOf(r),key:r=>roomOf(r)&&!r.ks,declined:r=>!r.a};
function gTags(r){const t=[],rm=roomOf(r);if(!r.a)return '<span class="tag tn">Not coming</span>';
 if(rm)t.push(r.ks?'<span class="tag tg">Key sent</span>':'<span class="tag ty">Key to send</span>');else if(r.rm)t.push('<span class="tag tr">Needs room</span>');
 if(r.ci)t.push('<span class="tag tg">Arrived</span>');if(r.dr)t.push('<span class="tag tb">Drop</span>');return t.join('')}
const avatar = r => `<div class="avt" style="background:${r.a?GC[grpOf(r)]:'#a68a72'}">${esc(ini(r.n))}</div>`;
P.guests = () => {const L=rlist(),yes=L.filter(r=>r.a),need=yes.filter(r=>r.rm),q=GQ.toLowerCase(),vac=vacant();
 const show=L.filter(gfilt[GF]).filter(r=>!q||[r.n,r.p,r.rl,r.sd,r.mb,roomOf(r)].join(' ').toLowerCase().includes(q));
 return ph('RSVPs',`${L.length} replies · ${yes.length} coming · ${L.length-yes.length} declined`,`<button class="ib" id="g_add" aria-label="Paste an RSVP link">${svg('plus')}</button>`)+`<div class="body">
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="g_q" placeholder="Search name, number or room" value="${esc(GQ)}"></label>
 <div class="chips">${[['all','All'],['coming','Coming'],['need','Need room'],['key','Key to send'],['declined','Declined']].map(([k,l])=>`<button class="chip${GF==k?' on':''}" data-gf="${k}">${l}<b>${L.filter(gfilt[k]).length}</b></button>`).join('')}</div>
 <div class="card stat3"><div><b>${yes.reduce((a,r)=>a+people(r),0)}</b><span>guests</span></div><div><b>${need.filter(roomOf).length}<small style="font-size:13px;color:var(--mute)">/${need.length}</small></b><span>rooms given</span></div><div><b>${L.filter(r=>r.ks).length}</b><span>keys sent</span></div></div>
 <div class="vf" style="justify-content:center;gap:14px"><span>Pickups <b>${yes.filter(r=>r.pk).length}</b></span><span>Drops <b>${yes.filter(r=>r.dr).length}</b></span><span>Vacant rooms <b>${vac.length}</b></span></div>
 <div class="card list" style="margin-top:10px">${show.map(r=>{const rm=roomOf(r);return `<button class="it" data-go="guest/${encodeURIComponent(r.id)}">${avatar(r)}<div class="t"><b>${esc(r.n)}</b><span>${r.a?[GS[grpOf(r)],people(r)+' people',r.tr&&(r.tr==BAARAT?'Baarat bus':r.tr)+(r.ar?', '+r.ar:'')].filter(Boolean).map(esc).join(' · '):'Declined'+(r.m?' with wishes':'')}</span><div class="tags">${gTags(r)}</div></div>
  ${r.a?`<div class="rn">${rm||'—'}<small>${rm?(T[rm]?T[rm].split(' ')[0]:'Exec room'):r.rm?'Assign':''}</small></div>`:''}</button>`}).join('')||`<div class="empty">${L.length?'No RSVP matches.':'No RSVPs yet. Share the invitation from <b>Invite guests</b>; replies appear here live.'}</div>`}</div></div>`};
B.guests = () => {const q=$('#g_q');q.oninput=()=>{GQ=q.value;const p=q.selectionStart;render();const n=$('#g_q');n.focus();n.setSelectionRange(p,p)};
 $$('[data-gf]').forEach(b=>b.onclick=()=>{GF=b.dataset.gf;render()});$('#g_add').onclick=pasteSheet};
// "guests/need" and "guests/key" come from Home
const _gp = P.guests;P.guests = a => {if(a&&gfilt[a]){GF=a;ARG='';history.replaceState(null,'','#/guests')}return _gp()};

P.guest = id => {const r=R[id];if(!r||r.del)return ph('Guest','Not found','', 'guests')+'<div class="body"><div class="card empty">This RSVP was removed.</div></div>';
 const rm=roomOf(r),vac=vacant(),opts=[...(rm?[rm]:[]),...vac].map(i=>`<option value="${i}"${i==rm?' selected':''}>Room ${i} · ${D[i].f}th floor${T[i]?' · '+T[i]:''}</option>`).join(''),g=grpOf(r);
 const trv=[];if(r.a&&(r.ar||r.tr))trv.push(['train','#eaf1fa','#2563a8',`Arriving ${[r.ar,t12(r.at)].filter(Boolean).join(' · ')||''}`,[r.tr,r.ax].filter(Boolean).join(' · ')+(r.pk?` · pickup ${r.pk=='Yes'?'needed':'from '+r.pk}`:'')]);
 if(r.a&&(r.dp||r.dm))trv.push(['pin','#fbf3e1','#b8862b',`Leaving ${[r.dp,t12(r.dt)].filter(Boolean).join(' · ')}`,[r.dm,r.dx].filter(Boolean).join(' · ')+(r.dr?` · drop ${r.dr=='Yes'?'needed':'to '+r.dr}`:'')]);
 vOf(r).forEach(v=>trv.push([v.k=='bus'?'bus':'train','#fbeef0','#7b1e2b',esc(v.nm),v.px[r.id].s?'Card sent '+when(v.px[r.id].s):'Card not sent yet']));
 return ph(esc(r.n),`Replied ${when(tOf(r))}${r.ref?' · ref '+esc(r.ref):''}`,`<button class="ib" id="gd_menu" aria-label="More">${svg('dots')}</button>`,'guests')+`<div class="body">
 <div class="card" style="padding:14px;display:flex;gap:12px;align-items:center">${avatar(r).replace('class="avt"','class="avt" style="width:48px;height:48px;font-size:16px;background:'+(r.a?GC[g]:'#a68a72')+'"')}<div style="flex:1;min-width:0;font-size:12px;color:var(--mute)"><b style="display:block;font-size:16px;color:var(--ink)">${esc(r.n)}</b>${[r.sd,r.rl].filter(Boolean).map(esc).join(', ')}${r.sd||r.rl?' · ':''}+${esc(r.p)}</div>
  <a class="cbtn call" href="tel:+${esc(r.p)}" aria-label="Call">${svg('phone')}</a><a class="cbtn wab" href="${waL(r.p)}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg('wa')}</a></div>
 ${r.a?`<div class="card stat3" style="margin-top:10px"><div><b>${r.ad||0}</b><span>adults</span></div><div><b>${r.ch||0}</b><span>children</span></div><div><b>${r.rm?'Yes':'No'}</b><span>needs room</span></div></div>
  ${r.mb?`<div class="hint" style="margin-top:8px">With ${esc(r.mb)}</div>`:''}
  ${trv.length?`<div class="sec" style="margin:14px 0 6px"><h3 class="H" style="font-size:19px">Travel</h3></div><div class="card list">${trv.map(t=>`<div class="it"><div class="avt" style="background:${t[1]}">${svg(t[0],t[2])}</div><div class="t"><b>${esc(t[3])}</b><span>${esc(t[4])}</span></div></div>`).join('')}</div>`:''}
  ${(r.fx||[]).length?`<div class="hint">Celebrations: ${r.fx.map(i=>FN[i]?FN[i][0]:'').filter(Boolean).join(', ')}</div>`:''}
  <div class="sec" style="margin:14px 0 6px"><h3 class="H" style="font-size:19px">Room</h3></div>
  <div class="card" style="padding:12px 14px">${rm?`<div style="display:flex;align-items:center;gap:10px"><div class="rm" style="background:${GC[D[rm].g||'f']};width:46px;height:46px;font-size:14px">${rm}</div><div style="flex:1;font-size:12px;color:var(--mute)"><b style="display:block;font-size:15px;color:var(--ink)">${rtype(rm)} · ${D[rm].f}th floor</b>${r.ks?'Key sent '+when(r.ks):'Key not sent yet'}</div><span class="tag ${r.ks?'tg':'ty'}">${r.ks?'Sent':'To send'}</span></div>`
   :`<div style="font-size:13px;color:var(--mute)">${r.rm?'<b style="color:#9b2335">Needs a room</b> · ':'No room asked · '}${vac.length} rooms vacant</div>`}
   <div class="fld"><label>Group</label><select class="inp" id="gd_g">${ORDER.map(k=>`<option value="${k}"${k==g?' selected':''}>${GN[k]}</option>`).join('')}</select></div>
   <div class="btns"><select class="pill out" id="gd_room" aria-label="Room" style="appearance:none;-webkit-appearance:none"><option value="">${rm?'Remove room':'Choose a room'}</option>${opts}</select>
   ${rm?`<a class="pill wa" id="gd_key" href="${keyHref(r)}" target="_blank" rel="noopener">${svg('wa')}${r.ks?'Send key again':'Send key'}</a>`:''}</div></div>
  <div class="card" style="padding:10px 14px;margin-top:10px;display:flex;gap:16px;font-size:13px"><button style="flex:1;display:flex;justify-content:space-between;align-items:center" id="gd_ci">Arrived<span class="tog${r.ci?' on':''}"></span></button>${rm?`<button style="flex:1;display:flex;justify-content:space-between;align-items:center" id="gd_kg">Key given<span class="tog${r.kg?' on':''}"></span></button>`:''}</div>`
 :`<div class="card" style="padding:14px;margin-top:10px;font-size:13px;color:var(--mute)">Can’t make it 🙏</div>`}
 ${r.m?`<div class="msg" style="margin-top:10px">“${esc(r.m)}”</div>`:''}</div>`};
B.guest = id => {const r=R[id];if(!r||r.del)return;
 $('#gd_menu').onclick=()=>openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">${esc(r.n)}</b><div class="btns" style="flex-direction:column"><a class="pill out" href="${waL(r.p)}" target="_blank" rel="noopener">${svg('wa')}Open WhatsApp chat</a><button class="pill danger" id="gd_del">Remove this RSVP</button><button class="pill out" id="gd_x">Cancel</button></div>`,s=>{
  $('#gd_x').onclick=closeSheet;$('#gd_del').onclick=()=>{const rm=roomOf(r);if(!confirm('Remove the RSVP from '+r.n+'?'+(rm?' Room '+rm+' will be set free.':'')))return;
   if(rm){Object.assign(D[rm],{name:'',pax:'',g:'',note:'',rid:''});putRoom(rm)}r.del=1;putR(r);closeSheet();go('guests');toast('RSVP removed')}});
 if(!r.a)return;
 $('#gd_room').onchange=e=>{assign(r,e.target.value);toast(e.target.value?'Room '+e.target.value+' given to '+r.n:'Room removed')};
 $('#gd_g').onchange=e=>{r.g=e.target.value;const rm=roomOf(r);if(rm){D[rm].g=r.g;putRoom(rm)}putR(r)};
 const k=$('#gd_key');if(k)k.onclick=()=>{r.ks=Date.now();putR(r)};
 $('#gd_ci').onclick=()=>{r.ci=r.ci?0:Date.now();putR(r)};const kg=$('#gd_kg');if(kg)kg.onclick=()=>{r.kg=r.kg?0:Date.now();putR(r)}};

/* paste-link import (fallback when a guest's RSVP could not be saved online) */
function pasteSheet(){openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">Add an RSVP from a link</b><div class="hint">Only needed if a guest's WhatsApp message has a "save" link (their phone was offline).</div>
 <div class="fld"><label>Paste the link</label><input class="inp" id="pl" placeholder="…#rsvp-…"></div><div class="btns"><button class="pill out" id="pl_x">Cancel</button><button class="pill solid" id="pl_ok">Save link</button></div>`,()=>{
 $('#pl_x').onclick=closeSheet;$('#pl_ok').onclick=()=>{const m=$('#pl').value.match(/#rsvp-([0-9A-Za-z]+)/);if(!m){toast('Paste the whole link from the guest’s WhatsApp message.');return}closeSheet();askImport(m[1])}})}
function askImport(code){let r;try{r=dec(code)}catch(e){toast('This RSVP link is incomplete. Ask the guest to send it again.');go('guests');return}
 if(!r||!r.n){toast('This RSVP link is incomplete.');go('guests');return}
 if($('#app').hidden){PENDIMP=code;return}
 const p=String(r.p||'').replace(/\D/g,''),old=rlist().find(x=>x.p===p),dup=Object.values(R).find(x=>x.p===p&&x.t===r.t&&!x.del);
 openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">${esc(r.n)}</b><p style="margin:4px 0 8px">${r.a?'Coming · '+paxWords(r)+(r.rm?' · needs a room':''):'Declined'}<br>+${esc(r.p)}${r.sd?' · '+esc(r.sd):''}</p>
 ${dup?'<p class="hint">This RSVP is already saved.</p>':old?'<p class="hint">This guest replied before. Saving adds the new reply and keeps their room.</p>':''}
 <div class="btns"><button class="pill out" id="im_x">Cancel</button><button class="pill solid" id="im_ok">${dup?'Open RSVPs':old?'Update RSVP':'Save RSVP'}</button></div>`,()=>{
  $('#im_x').onclick=()=>{closeSheet();go('guests')};
  $('#im_ok').onclick=()=>{if(!dup){const id='link-'+p+'-'+(r.t||Date.now());const keep=['v','n','p','a','sd','gk','ad','ch','mb','rm','ar','at','tr','ax','pk','dp','dt','dm','dx','dr','fx','m','t','ref'];
   const o={};keep.forEach(k=>{if(r[k]!==undefined)o[k]=r[k]});o.src='link';o.createdAt=serverTimestamp();setDoc(doc(db,'rsvps',id),o).catch(e=>toast('Could not save: '+e.code));toast((old?'RSVP updated for ':'RSVP saved for ')+r.n)}
   closeSheet();go('guests')}})}
let PENDIMP = null;

/* same guest replying twice: carry room, key and check-in over to the newest reply */
function dedupe(){const by={};Object.values(R).filter(r=>!r.del&&r.p).forEach(r=>(by[r.p]=by[r.p]||[]).push(r));
 Object.values(by).filter(a=>a.length>1).forEach(a=>{a.sort((x,y)=>tOf(y)-tOf(x));const n=a[0];
  a.slice(1).forEach(o=>{['room','g','ks','ci','kg'].forEach(k=>{if(o[k]&&!n[k])n[k]=o[k]});
   if(o.room&&D[o.room]&&D[o.room].rid===o.id){fillRoom(n,o.room);putRoom(o.room)}
   VH&&live(VH).forEach(v=>{if(v.px&&v.px[o.id]&&!v.px[n.id]){v.px[n.id]=v.px[o.id];delete v.px[o.id];put('vehicles',v.id,v,false)}});
   o.del=1;o.sup=n.id;putR(o)});putR(n)})}

/* ================= TRAVEL ================= */
let TV = 'veh';
const VF={bus:[['nm','Name','e.g. Baarat bus 1'],['no','Bus number','MP07 AB 1234'],['dt','Date','','date'],['tm','Departs at','','time'],['fr','From','Gwalior'],['to','To','Ujjain'],['pp','Pickup point','e.g. Sanskriti Hotel, Morar'],['dr','Driver name',''],['dp','Driver mobile','10-digit','tel'],['cap','Seats','40','number']],
 train:[['nm','Name','e.g. Train group 1'],['no','Train number','e.g. 12919'],['tn','Train name','e.g. Malwa Express'],['dt','Date','','date'],['fr','From station','Gwalior'],['tm','Departs at','','time'],['to','To station','Ujjain'],['ta','Arrives at','','time'],['co','Coach','e.g. S4 / B2'],['pnr','PNR (if one for the group)','10 digits','tel']]};
function vLine(v){return v.k=='bus'?[v.no&&'Bus '+v.no,v.dr&&'driver '+v.dr,v.dp&&'+'+v.dp,v.pp&&'pickup '+v.pp].filter(Boolean).join(' · '):[v.no&&v.no+(v.tn?' · '+v.tn:''),v.co&&'coach '+v.co,v.pnr&&'PNR '+v.pnr].filter(Boolean).join(' · ')}
function vCard(v){const ids=Object.keys(v.px||{}).filter(i=>R[i]&&!R[i].del),n=ids.reduce((a,i)=>a+people(R[i]),0),sent=ids.filter(i=>v.px[i].s).length,bus=v.k=='bus',cap=+v.cap||0;
 return `<button class="card vh" data-go="veh/${v.id}"><div class="top"><div class="ico" style="background:${bus?'#fbeef0':'#eaf1fa'}">${svg(bus?'bus':'train',bus?'#7b1e2b':'#2563a8')}</div><div class="t"><b>${esc(v.nm)}</b>${esc(vLine(v))||'Tap to add details'}</div>${v.dt?`<span class="tag ty">${sdate(v.dt)}</span>`:''}</div>
 ${v.fr||v.to?`<div class="route"><div class="p"><b>${t12(v.tm)||'—'}</b>${esc(v.fr||'')}</div><div class="ln"></div><div class="p" style="text-align:right"><b>${t12(v.ta)||'&nbsp;'}</b>${esc(v.to||'')}</div></div>`:'<div style="height:10px"></div>'}
 <div class="prog"><i style="width:${bus?(cap?Math.min(100,n/cap*100):0):(ids.length?100:0)}%;${bus?'':'background:#2563a8'}"></i></div>
 <div class="vf"><span>${bus&&cap?`${n} of ${cap} seats · `:`${n} people · `}${ids.length} families</span><span style="font-weight:600;color:${ids.length&&sent==ids.length?'#2f7d4a':'#8a6420'}">${ids.length?(sent==ids.length?sent+' cards sent ✓':(ids.length-sent)+' cards to send'):'Add families ›'}</span></div></button>`}
P.travel = a => {if(a=='drop'||a=='arr'){TV=a;ARG='';history.replaceState(null,'','#/travel')}
 const C=coming(),ba=C.filter(r=>r.tr==BAARAT),vs=live(VH),bb=vs.filter(v=>v.k=='bus'),tt=vs.filter(v=>v.k=='train');
 const arr=C.filter(r=>r.ar||r.tr).sort((a,b)=>((a.ar||'')+(a.at||'')).localeCompare((b.ar||'')+(b.at||''))),drops=C.filter(r=>r.dr),cnt=m=>C.filter(r=>r.tr==m).length;
 const li=(r,sub,right='')=>`<div class="it">${avatar(r)}<div class="t"><b>${esc(r.n)}</b><span>${sub}</span></div>${right}</div>`;
 let inner;
 if(TV=='veh')inner=(bb.length?bb.map(vCard).join(''):'<div class="card empty" style="margin-bottom:10px">No buses yet. Add the baarat bus from Gwalior.</div>')+(tt.length?tt.map(vCard).join(''):'<div class="card empty">No trains yet. Add a train when you book tickets for a group.</div>');
 else if(TV=='arr')inner=`<div class="card list">${arr.map(r=>li(r,[people(r)+' people',r.ar,t12(r.at),r.tr,r.ax].filter(Boolean).map(esc).join(' · ')+(vOf(r).length?' · <b>'+vOf(r).map(v=>esc(v.nm)).join(', ')+'</b>':''))).join('')||'<div class="empty">Arrival details from RSVPs will appear here.</div>'}</div>`;
 else inner=`<div class="card list">${drops.map(r=>li(r,[people(r)+' people',r.dp,t12(r.dt),r.dm,r.dx,r.dr!='Yes'&&'to '+r.dr].filter(Boolean).map(esc).join(' · '),`<a class="cbtn wab" href="${waL(r.p)}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg('wa')}</a>`)).join('')||'<div class="empty">No drops requested yet.</div>'}</div>`;
 return ph('Travel',`${bb.length} buses · ${tt.length} trains · ${ba.reduce((a,r)=>a+people(r),0)} with baarat`)+`<div class="body">
 <div class="card kpi" style="margin-bottom:10px"><div><b class="H">${ba.reduce((a,r)=>a+people(r),0)}</b><span>with baarat (${ba.length})</span></div><div><b class="H">${cnt('Train')}</b><span>families by train</span></div><div><b class="H">${cnt('Flight')}</b><span>by flight</span></div><div><b class="H">${drops.length}</b><span>need a drop</span></div></div>
 <div class="seg">${[['veh','Vehicles'],['arr','Arrivals'],['drop','Drops '+(drops.length?`<b style="color:var(--gold)">${drops.length}</b>`:'')]].map(([k,l])=>`<button data-tv="${k}" class="${TV==k?'on':''}">${l}</button>`).join('')}</div>${inner}<div style="height:60px"></div></div>
 <button class="fab" id="v_add">${svg('plus')}Add bus or train</button>`};
B.travel = () => {$$('[data-tv]').forEach(b=>b.onclick=()=>{TV=b.dataset.tv;render()});
 $('#v_add').onclick=()=>{const vs=live(VH);openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">Add a vehicle</b><div class="btns"><button class="pill solid" id="va_b">${svg('bus')}Bus</button><button class="pill solid" id="va_t">${svg('train')}Train</button></div>`,()=>{
  $('#va_b').onclick=()=>vForm({k:'bus',nm:'Baarat bus '+(vs.filter(v=>v.k=='bus').length+1),fr:'Gwalior',to:'Ujjain',cap:40});
  $('#va_t').onclick=()=>vForm({k:'train',nm:'Train group '+(vs.filter(v=>v.k=='train').length+1),fr:'Gwalior',to:'Ujjain'})})}};
function vForm(v){openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">${v.id?'Edit':'New'} ${v.k}</b><div class="two">${VF[v.k].map(([k,l,phd,t])=>`<div class="fld"><label>${l}</label><input class="inp" data-vf="${k}" type="${t=='tel'?'text':t||'text'}"${t=='tel'||t=='number'?' inputmode="numeric"':''} value="${esc(k=='dp'&&v[k]?String(v[k]).replace(/^91/,''):v[k]||'')}" placeholder="${esc(phd)}"></div>`).join('')}</div>
 <div class="btns">${v.id?'<button class="pill danger" id="ve_d">Delete</button>':''}<button class="pill out" id="ve_x">Cancel</button><button class="pill solid" id="ve_ok">Save ${v.k}</button></div>`,s=>{
 $('#ve_x').onclick=closeSheet;
 $('#ve_ok').onclick=()=>{const o=v.id?VH[v.id]:{id:uid(),px:{}};$$('[data-vf]',s).forEach(i=>o[i.dataset.vf]=i.value.trim());o.k=v.k;if(o.dp)o.dp=ph91(o.dp);if(!o.nm){toast('Give it a name');return}
  VH[o.id]=o;put('vehicles',o.id,o,false);closeSheet();toast((o.k=='bus'?'Bus':'Train')+' saved');rer()};
 const d=$('#ve_d');if(d)d.onclick=()=>{if(!confirm('Delete '+v.nm+'?'))return;const o=VH[v.id];o.del=1;put('vehicles',o.id,o,false);closeSheet();go('travel')}})}
function tcHref(v,r){const x=v.px[r.id]||{};const C={k:v.k,n:r.n,px:paxWords(r),vn:v.nm,no:v.no||'',tn:v.tn||'',d:fdate(v.dt),tm:t12(v.tm),fr:v.fr||'',to:v.to||'',ta:t12(v.ta),pp:v.pp||'',dr:v.dr||'',dp:v.dp||'',co:x.co||v.co||'',pnr:x.pnr||v.pnr||'',st:x.st||''};
 const q=(c,t)=>c?t:null;
 const L=v.k=='bus'?['🚌 *Your bus details*','Ashutosh weds Shrusti','',`Dear ${r.n},`,`*${C.vn}*${C.no?' · Bus '+C.no:''}`,q(C.d,`🗓 ${C.d}${C.tm?', leaves at '+C.tm:''}`),q(C.pp,'📍 Pickup: '+C.pp),q(C.fr&&C.to,`➡️ ${C.fr} → ${C.to}`),q(C.st,'💺 Seat: '+C.st),q(C.dr,`👤 Driver: ${C.dr}${C.dp?' (+'+C.dp+')':''}`)]
 :['🚆 *Your train details*','Ashutosh weds Shrusti','',`Dear ${r.n},`,`*${C.no}${C.tn?' '+C.tn:''}*`,q(C.d,'🗓 '+C.d),q(C.fr,`🚉 ${C.fr} ${C.tm} → ${C.to} ${C.ta}`),q(C.pnr,'🎫 PNR: '+C.pnr),q(C.co||C.st,`💺 ${C.co?'Coach '+C.co:''}${C.co&&C.st?', ':''}${C.st?'Seat '+C.st:''}`)];
 L.push('','Your travel card:',CARDS_URL+'#'+v.k+'-'+enc(C),'','🙏 Dr. Sarita Singhal & the Singhal Family');
 return waL(r.p,L.filter(x=>x!==null).join('\n'))}
P.veh = id => {const v=VH[id];if(!v||v.del)return ph('Vehicle','Not found','','travel')+'<div class="body"><div class="card empty">This vehicle was deleted.</div></div>';
 const ids=Object.keys(v.px||{}).filter(i=>R[i]&&!R[i].del),C=coming().filter(r=>!v.px[r.id]),sug=C.filter(r=>v.k=='bus'?r.tr==BAARAT:r.tr=='Train'),bus=v.k=='bus';
 return ph(esc(v.nm),esc(vLine(v))||(bus?'Bus':'Train'),`<button class="ib" id="vp_e" aria-label="Edit">${svg('edit')}</button>`,'travel')+`<div class="body">
 <div class="card" style="padding:12px 14px"><div class="fld" style="margin:0"><label>Add passengers</label><div class="btns" style="margin-top:4px"><select class="inp" id="vp_add" style="flex:2"><option value="">Choose a family…</option>${sug.length?`<optgroup label="${bus?'Travelling with baarat':'Travelling by train'}">${sug.map(r=>`<option value="${esc(r.id)}">${esc(r.n)} (${people(r)})</option>`).join('')}</optgroup>`:''}<optgroup label="Everyone coming">${C.filter(r=>!sug.includes(r)).map(r=>`<option value="${esc(r.id)}">${esc(r.n)} (${people(r)})</option>`).join('')}</optgroup></select>${sug.length?`<button class="pill out" id="vp_all">Add all ${sug.length}</button>`:''}</div></div></div>
 <div class="sec" style="margin:14px 0 6px"><h3 class="H" style="font-size:19px">${ids.length} families · ${ids.reduce((a,i)=>a+people(R[i]),0)} people</h3></div>
 <div class="card list">${ids.map(i=>{const r=R[i],x=v.px[i];return `<div class="it" data-px="${esc(i)}" style="align-items:flex-start">${avatar(r)}<div class="t"><b>${esc(r.n)} · ${people(r)}</b>
  <div class="pxf">${!bus?`<input class="inp" data-pf="co" value="${esc(x.co||'')}" placeholder="Coach ${esc(v.co||'')}">`:''}<input class="inp" data-pf="st" value="${esc(x.st||'')}" placeholder="${bus?'Seat no(s)':'Seat / berth'}">${!bus?`<input class="inp" data-pf="pnr" value="${esc(x.pnr||'')}" inputmode="numeric" placeholder="PNR ${esc(v.pnr||'')}">`:''}</div>
  <span>${x.s?'Card sent '+when(x.s):'Card not sent'}</span><div class="btns" style="margin-top:6px"><a class="pill wa sm" data-ps="${esc(i)}" href="${tcHref(v,r)}" target="_blank" rel="noopener">${svg('wa')}${x.s?'Send again':'Send card'}</a><button class="pill out sm" data-pr="${esc(i)}">Remove</button></div></div></div>`}).join('')||'<div class="empty">No passengers yet. Add families above.</div>'}</div></div>`};
B.veh = id => {const v=VH[id];if(!v||v.del)return;$('#vp_e').onclick=()=>vForm({...v});
 const add=ids2=>{v.px=v.px||{};ids2.forEach(i=>v.px[i]=v.px[i]||{st:''});put('vehicles',v.id,v,false);rer()};
 $('#vp_add').onchange=e=>{if(e.target.value)add([e.target.value])};const all=$('#vp_all');if(all)all.onclick=()=>add(coming().filter(r=>!v.px[r.id]&&(v.k=='bus'?r.tr==BAARAT:r.tr=='Train')).map(r=>r.id));
 $$('[data-pf]').forEach(inp=>inp.onchange=()=>{const i=inp.closest('[data-px]').dataset.px;v.px[i][inp.dataset.pf]=inp.value.trim();put('vehicles',v.id,v,false);const a=$(`[data-ps="${CSS.escape(i)}"]`);if(a)a.href=tcHref(v,R[i])});
 $$('[data-ps]').forEach(a=>a.onclick=()=>{v.px[a.dataset.ps].s=Date.now();setTimeout(()=>put('vehicles',v.id,v,false),300)});
 $$('[data-pr]').forEach(b=>b.onclick=()=>{delete v.px[b.dataset.pr];put('vehicles',v.id,v,false);rer()})};

/* ================= ALERTS ================= */
const TPL=[['begin','About to begin',e=>`Namaste {name} ji 🙏\n\n${e[0]} begins in 15 minutes at ${e[2]}. Please come down and join us!\n\nAshutosh weds Shrusti`],
 ['food','Food served',e=>`Namaste {name} ji 🙏\n\nLunch / dinner is now being served at ${e[2]}. Please join us.\n\nAshutosh weds Shrusti`],
 ['bus','Bus leaving',e=>`Namaste {name} ji 🙏\n\nThe baarat bus leaves in 30 minutes. Please reach the pickup point on time.\n\nAshutosh weds Shrusti`],
 ['custom','Custom',e=>`Namaste {name} ji 🙏\n\n`]];
const AL={ev:-1,tp:'begin',au:'all',txt:'',sent:{}};let ALX=null;
function audience(){const C=coming();if(AL.au=='rooms')return C.filter(r=>roomOf(r));if(AL.au=='in')return C.filter(r=>r.ci);if(AL.au=='baarat')return C.filter(r=>r.tr==BAARAT);
 if(AL.au.startsWith('v:')){const v=VH[AL.au.slice(2)];return v?C.filter(r=>v.px&&v.px[r.id]):[]}return C}
P.alerts = () => {if(ALX){AL.ev=ALX.ev;AL.tp='begin';AL.txt='';AL.sent={};ALX=null}if(AL.ev<0)AL.ev=nextEv();const e=EVT[AL.ev];
 if(!AL.txt)AL.txt=TPL.find(t=>t[0]==AL.tp)[2](e);const A=audience(),vs=live(VH),C=coming(),nx=A.find(r=>!AL.sent[r.id]),sent=A.filter(r=>AL.sent[r.id]).length;
 const au=[['all','Everyone coming',C.length],['rooms','With rooms',C.filter(r=>roomOf(r)).length],['in','Arrived',C.filter(r=>r.ci).length],['baarat','Baarat',C.filter(r=>r.tr==BAARAT).length],...vs.map(v=>['v:'+v.id,(v.k=='bus'?'🚌 ':'🚆 ')+v.nm,C.filter(r=>v.px&&v.px[r.id]).length])];
 return ph('Alerts','Message guests one by one on WhatsApp')+`<div class="body">
 <div class="fld" style="margin-top:0"><label>Celebration</label><div class="opt">${EVT.map((x,i)=>`<button class="chip${i==AL.ev?' on':''}" data-ae="${i}">${x[0]}</button>`).join('')}</div></div>
 <div class="fld"><label>Message</label><div class="opt">${TPL.map(t=>`<button class="chip${t[0]==AL.tp?' on':''}" data-at="${t[0]}">${t[1]}</button>`).join('')}</div></div>
 <textarea class="msg" id="a_txt" rows="6" style="margin-top:8px">${esc(AL.txt)}</textarea><div class="hint">{name} is replaced with each guest’s name.</div>
 <div class="fld"><label>Send to</label><div class="opt">${au.map(([k,l,n])=>`<button class="chip${AL.au==k?' on':''}" data-au="${esc(k)}">${esc(l)} <b>${n}</b></button>`).join('')}</div></div>
 <div class="card" style="padding:12px 14px;margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:12.5px;gap:8px"><b>Sent ${sent} of ${A.length}</b><span style="color:var(--mute)">${nx?'Next: '+esc(nx.n):''}</span></div>
 <div class="prog" style="margin:6px 0 10px"><i style="width:${A.length?sent/A.length*100:0}%;background:#1f8a4c"></i></div>
 ${nx?`<a class="pill wa" style="padding:10px" id="a_next" href="${waL(nx.p,AL.txt.replace(/\{name\}/g,nx.n))}" target="_blank" rel="noopener">${svg('send')}Send to next guest</a>`:`<div class="pill out" style="padding:10px">${A.length?'✓ Sent to everyone':'No one to send to'}</div>`}</div>
 <div class="btns"><button class="pill out" id="a_copy">${svg('copy')}Copy</button><button class="pill out" id="a_vcf">${svg('dl')}Contacts (.vcf)</button></div>
 <div class="hint">For one-tap sending to everyone: download the contacts, save them on your phone, make a WhatsApp broadcast list with them once, then paste the copied message there.</div>
 <div class="card list" style="margin-top:8px">${A.map(r=>`<div class="it">${avatar(r)}<div class="t"><b>${esc(r.n)}</b><span>${roomOf(r)?'Room '+roomOf(r):'+'+esc(r.p)} · ${people(r)} people</span></div><a class="pill sm ${AL.sent[r.id]?'out':'wa'}" data-as="${esc(r.id)}" href="${waL(r.p,AL.txt.replace(/\{name\}/g,r.n))}" target="_blank" rel="noopener">${AL.sent[r.id]?'✓ Sent':'Send'}</a></div>`).join('')||'<div class="empty">No guests in this group yet.</div>'}</div></div>`};
B.alerts = () => {const nx=audience().find(r=>!AL.sent[r.id]),an=$('#a_next');if(an&&nx)an.onclick=()=>{AL.sent[nx.id]=1;setTimeout(rer,500)};
 $$('[data-ae]').forEach(b=>b.onclick=()=>{AL.ev=+b.dataset.ae;AL.txt='';AL.sent={};render()});
 $$('[data-at]').forEach(b=>b.onclick=()=>{AL.tp=b.dataset.at;AL.txt='';render()});
 $$('[data-au]').forEach(b=>b.onclick=()=>{AL.au=b.dataset.au;render()});
 $('#a_txt').oninput=e=>{AL.txt=e.target.value;$$('[data-as]').forEach(a=>{const r=R[a.dataset.as];a.href=waL(r.p,AL.txt.replace(/\{name\}/g,r.n))});if(an&&nx)an.href=waL(nx.p,AL.txt.replace(/\{name\}/g,nx.n))};
 $$('[data-as]').forEach(a=>a.onclick=()=>{AL.sent[a.dataset.as]=1;setTimeout(rer,500)});
 $('#a_copy').onclick=async()=>{const t=AL.txt.replace(/\{name\} ji/g,'').replace(/\{name\}/g,'').replace(/Namaste\s+🙏/,'Namaste 🙏');try{await navigator.clipboard.writeText(t);toast('Message copied')}catch(e){$('#dlt').textContent='Message';$('#ta').value=t;$('#dld').hidden=true;$('#dlg').showModal()}};
 $('#a_vcf').onclick=()=>{const v=coming().map(r=>`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${r.n} (A&S wedding)\r\nN:${r.n};;;;\r\nTEL;TYPE=CELL:+${r.p}\r\nNOTE:A&S Wedding · ${CREDIT}\r\nEND:VCARD`).join('\r\n');
  if(!v){toast('No guests yet');return}dlBlob(new Blob([v],{type:'text/vcard'}),'AS_Wedding_Contacts_by_Arvind_Singh.vcf')}};

/* ================= CHECK-IN ================= */
let CF = 'all', CQ = '';
P.checkin = () => {const C=coming(),ar=C.filter(r=>r.ci),q=CQ.toLowerCase(),f={all:r=>1,todo:r=>!r.ci,in:r=>r.ci,nokey:r=>roomOf(r)&&!r.kg};
 const L=C.filter(f[CF]).filter(r=>!q||[r.n,r.p,roomOf(r),r.mb].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.n.localeCompare(b.n));
 return ph('Check-in','Pukhraj Club &amp; Resort · front desk')+`<div class="body">
 <div class="card stat3"><div><b>${ar.length}<small style="font-size:13px;color:var(--mute)">/${C.length}</small></b><span>arrived · ${ar.reduce((a,r)=>a+people(r),0)}/${C.reduce((a,r)=>a+people(r),0)} people</span></div><div><b>${C.filter(r=>r.kg).length}</b><span>keys given</span></div><div><b>${C.length-ar.length}</b><span>still to arrive</span></div></div>
 <label class="search" style="margin-top:10px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="c_q" placeholder="Search name, number or room" value="${esc(CQ)}"></label>
 <div class="chips">${[['all','All',0],['todo','To arrive',C.length-ar.length],['in','Arrived',ar.length],['nokey','Key not given',C.filter(f.nokey).length]].map(([k,l,n])=>`<button class="chip${CF==k?' on':''}" data-cf="${k}">${l}${k=='all'?'':`<b>${n}</b>`}</button>`).join('')}</div>
 <div class="card list">${L.map(r=>{const rm=roomOf(r);return `<div class="it">${avatar(r)}<div class="t"><b>${esc(r.n)}</b><span>${people(r)} · ${esc(r.tr==BAARAT?'Baarat bus':r.tr||'')}${!rm&&r.rm?' · <b style="color:#9b2335">room not given</b>':''}</span></div><div class="rn" style="margin-right:4px">${rm||''}</div>
  <button class="tcol" data-ci="${esc(r.id)}"><span class="tog${r.ci?' on':''}"></span>Arrived</button>${rm?`<button class="tcol" data-kg="${esc(r.id)}"><span class="tog${r.kg?' on':''}"></span>Key</button>`:'<span class="tcol" style="width:38px"></span>'}</div>`}).join('')||`<div class="empty">${CF=='todo'?'Everyone has arrived.':'No one here yet.'}</div>`}</div></div>`};
B.checkin = () => {const q=$('#c_q');q.oninput=()=>{CQ=q.value;const p=q.selectionStart;render();const n=$('#c_q');n.focus();n.setSelectionRange(p,p)};
 $$('[data-cf]').forEach(b=>b.onclick=()=>{CF=b.dataset.cf;render()});
 $$('[data-ci]').forEach(b=>b.onclick=()=>{const r=R[b.dataset.ci];r.ci=r.ci?0:Date.now();putR(r)});
 $$('[data-kg]').forEach(b=>b.onclick=()=>{const r=R[b.dataset.kg];r.kg=r.kg?0:Date.now();putR(r)})};

/* ================= TO-DO ================= */
let TF = 'open';
P.todo = () => {const all=live(TK),open=all.filter(t=>!t.dn),done=all.filter(t=>t.dn),wk=new Date(Date.now()+7*864e5).toISOString().slice(0,10),td=today();
 const item=t=>`<div class="it${t.dn?' done':''}"><button class="ck${t.dn?' on':''}" data-tk="${t.id}" aria-label="Done">${t.dn?svg('check'):''}</button><button class="t" data-te="${t.id}"><b>${esc(t.n)}</b><span>${[t.f,t.w].filter(Boolean).map(esc).join(' · ')}</span></button>${t.d&&!t.dn?`<span class="tag ${t.d<=td?'tr':'ty'}">${t.d==td?'Today':t.d<td?'Overdue':sdate(t.d)}</span>`:''}</div>`;
 const sort=a=>a.sort((x,y)=>(x.d||'9').localeCompare(y.d||'9'));
 const blocks=[];const wkL=sort(open.filter(t=>t.d&&t.d<=wk)),later=sort(open.filter(t=>!t.d||t.d>wk));
 if(TF!='done'){if(wkL.length)blocks.push(['This week',wkL]);if(later.length)blocks.push(['Before the wedding',later])}
 if(TF!='open'&&done.length)blocks.push(['Done',done.sort((a,b)=>b.dn-a.dn)]);
 return ph('To-do',`${open.length} open · ${done.length} done`)+`<div class="body">
 <div class="seg">${[['open',`Open <b>${open.length}</b>`],['done','Done '+done.length],['all','All']].map(([k,l])=>`<button data-tf="${k}" class="${TF==k?'on':''}">${l}</button>`).join('')}</div>
 ${blocks.map(([h,a])=>`<div class="gh">${h}</div><div class="card list">${a.map(item).join('')}</div>`).join('')||`<div class="card empty">${TF=='done'?'Nothing ticked off yet.':'No open tasks. Add the first one.'}</div>`}<div style="height:60px"></div></div>
 <button class="fab" id="t_add">${svg('plus')}Add task</button>`};
B.todo = () => {$$('[data-tf]').forEach(b=>b.onclick=()=>{TF=b.dataset.tf;render()});
 $$('[data-tk]').forEach(b=>b.onclick=()=>{const t=TK[b.dataset.tk];t.dn=t.dn?0:Date.now();put('tasks',t.id,t)});
 $$('[data-te]').forEach(b=>b.onclick=()=>tForm({...TK[b.dataset.te]}));$('#t_add').onclick=()=>tForm({n:'',f:'General',w:'',d:''})};
function tForm(t){const names=live(CT).map(c=>c.n);openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">${t.id?'Edit task':'New task'}</b>
 <div class="fld"><label>Task</label><input class="inp" id="t_n" value="${esc(t.n)}" placeholder="e.g. Confirm haldi flowers with decorator"></div>
 <div class="two"><div class="fld"><label>For</label><select class="inp" id="t_f">${TFOR.map(f=>`<option${f==t.f?' selected':''}>${f}</option>`).join('')}</select></div><div class="fld"><label>By</label><input class="inp" id="t_d" type="date" value="${esc(t.d||'')}"></div></div>
 <div class="fld"><label>Who</label><input class="inp" id="t_w" list="t_wl" value="${esc(t.w||'')}" placeholder="Name"><datalist id="t_wl">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>
 <div class="btns">${t.id?'<button class="pill danger" id="t_del">Delete</button>':''}<button class="pill out" id="t_x">Cancel</button><button class="pill solid" id="t_ok">${t.id?'Save':'Add task'}</button></div>`,()=>{
 $('#t_x').onclick=closeSheet;$('#t_ok').onclick=()=>{const n=$('#t_n').value.trim();if(!n){toast('Write the task first');return}const id=t.id||uid();
  TK[id]={...(TK[id]||{dn:0}),id,n,f:$('#t_f').value,w:$('#t_w').value.trim(),d:$('#t_d').value};put('tasks',id,TK[id]);closeSheet();toast(t.id?'Task saved':'Task added');rer()};
 const d=$('#t_del');if(d)d.onclick=()=>{if(!confirm('Delete this task?'))return;const o=TK[t.id];o.del=1;put('tasks',o.id,o);closeSheet()};$('#t_n').focus()})}

/* ================= CONTACTS ================= */
let KQ = '';
const RC = {'Family coordinator':'#7b1e2b',Venue:'#b8862b',Caterer:'#b5532f',Decorator:'#6b7a1f','Pandit ji':'#c2255c',Photographer:'#5b4bb5',Driver:'#2563a8',Transport:'#2563a8',Other:'#a68a72'};
P.contacts = () => {const q=KQ.toLowerCase(),L=live(CT).filter(c=>!q||(c.n+c.ro+(c.p||'')+(c.no||'')).toLowerCase().includes(q)),by={};L.forEach(c=>(by[c.ro]=by[c.ro]||[]).push(c));
 return ph('Contacts',`${live(CT).length} people · call or WhatsApp in one tap`)+`<div class="body">
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="k_q" placeholder="Search contacts" value="${esc(KQ)}"></label>
 ${[...ROLES,...Object.keys(by).filter(r=>!ROLES.includes(r))].filter(r=>by[r]).map(r=>`<div class="gh">${esc(r)}</div><div class="card list">${by[r].sort((a,b)=>a.n.localeCompare(b.n)).map(c=>`<div class="it"><div class="avt" style="background:${RC[c.ro]||'#a68a72'}">${esc(ini(c.n))}</div><button class="t" data-ce="${c.id}"><b>${esc(c.n)}</b><span>${[c.no,c.p&&'+'+c.p].filter(Boolean).map(esc).join(' · ')}</span></button>${c.p?`<a class="cbtn call" href="tel:+${esc(c.p)}" aria-label="Call">${svg('phone')}</a><a class="cbtn wab" href="${waL(c.p)}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg('wa')}</a>`:''}</div>`).join('')}</div>`).join('')
  ||'<div class="card empty" style="margin-top:10px">No contacts yet. Add the venue manager, caterer, pandit ji and drivers so anyone can call them in one tap.</div>'}<div style="height:60px"></div></div>
 <button class="fab" id="k_add">${svg('plus')}Add contact</button>`};
B.contacts = () => {const q=$('#k_q');q.oninput=()=>{KQ=q.value;const p=q.selectionStart;render();const n=$('#k_q');n.focus();n.setSelectionRange(p,p)};
 $('#k_add').onclick=()=>cForm({n:'',ro:'Venue',p:'',no:''});$$('[data-ce]').forEach(b=>b.onclick=()=>cForm({...CT[b.dataset.ce]}))};
function cForm(c){openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">${c.id?'Edit contact':'New contact'}</b>
 <div class="fld"><label>Name</label><input class="inp" id="ce_n" value="${esc(c.n)}" placeholder="e.g. Ramesh ji (venue manager)"></div>
 <div class="two"><div class="fld"><label>Role</label><select class="inp" id="ce_r">${ROLES.map(r=>`<option${r==c.ro?' selected':''}>${r}</option>`).join('')}</select></div><div class="fld"><label>Mobile</label><input class="inp" id="ce_p" inputmode="tel" value="${c.p?esc(c.p.replace(/^91/,'')):''}" placeholder="10-digit number"></div></div>
 <div class="fld"><label>Note</label><input class="inp" id="ce_o" value="${esc(c.no||'')}" placeholder="e.g. Haldi decoration, bus no. MP07 1234"></div>
 <div class="btns">${c.id?'<button class="pill danger" id="ce_d">Delete</button>':''}<button class="pill out" id="ce_x">Cancel</button><button class="pill solid" id="ce_ok">Save</button></div>`,()=>{
 $('#ce_x').onclick=closeSheet;$('#ce_ok').onclick=()=>{const n=$('#ce_n').value.trim();if(!n){toast('Enter a name');return}const id=c.id||uid();
  CT[id]={...(CT[id]||{}),id,n,ro:$('#ce_r').value,p:ph91($('#ce_p').value),no:$('#ce_o').value.trim()};put('contacts',id,CT[id]);closeSheet();toast('Contact saved');rer()};
 const d=$('#ce_d');if(d)d.onclick=()=>{if(!confirm('Delete '+c.n+'?'))return;const o=CT[c.id];o.del=1;put('contacts',o.id,o);closeSheet()};$('#ce_n').focus()})}

/* ================= INVITE GUESTS ================= */
let IM = 'both';
const RSVP_ONLY = `🙏 *Jai Shri Ganesh* 🙏\n\nKindly fill this 1-minute RSVP for the wedding of *Ashutosh* & *Shrusti* (1–2 December 2026, Ujjain), so we can plan your room and travel:\n${RSVP_URL}\n\n*Dr. Sarita Singhal & the Singhal Family*`;
const RSVP_LINE = `\n\n📝 *RSVP* (1 minute, for your room & travel):\n${RSVP_URL}`;
function inviteText(){const inv=META.invite||{};if(IM=='rsvp')return inv.rsvpText||RSVP_ONLY;if(!inv.text)return '';return inv.text+(IM=='both'?RSVP_LINE:'')}
P.invite = () => {const L=rlist(),inv=META.invite||{},has=!!inv.text||IM=='rsvp';
 return ph('Invite guests',`${{both:'Invitation + RSVP',inv:'Invitation only',rsvp:'RSVP only'}[IM]} · replies come in live`)+`<div class="body">
 <div class="card" style="padding:10px;display:flex;gap:12px;align-items:center"><img src="../preview.jpg" alt="Invitation card" style="width:78px;height:112px;object-fit:cover;border-radius:10px;border:1px solid var(--line);flex:none">
 <div style="flex:1;font-size:11.5px;color:var(--mute);line-height:1.35"><b style="display:block;font-size:15px;color:var(--ink)">Wedding invitation</b>Animated card with the A&amp;S door, countdown and venues
 <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><a class="mapb" href="${CARD_URL}" target="_blank" rel="noopener">${svg('eye')}Preview</a><button class="mapb" id="i_qr">${svg('qr')}QR code</button></div></div></div>
 <div class="fld"><label>What to send</label><div class="segy">${[['both','Invitation + RSVP'],['inv','Invitation only'],['rsvp','RSVP only']].map(([k,l])=>`<button data-im="${k}" class="${IM==k?'on':''}">${l}</button>`).join('')}</div></div>
 ${has?`<div class="fld"><label>Message · tap to edit</label><textarea class="msg" id="i_txt" rows="12">${esc(IM=='rsvp'?(inv.rsvpText||RSVP_ONLY):inv.text)}</textarea>
  ${IM=='both'?`<div class="lk" style="margin-top:6px">${svg('plus')}Added at the end: RSVP link ${esc(RSVP_URL)}</div>`:''}<div class="hint" id="i_sv">Changes save for everyone.</div></div>
  <div class="btns"><a class="pill wa" style="flex:2.2;white-space:nowrap" id="i_wa" href="https://wa.me/?text=${encodeURIComponent(inviteText())}" target="_blank" rel="noopener">${svg('wa')}Share on WhatsApp</a><button class="pill out" style="flex:1" id="i_cp">${svg('copy')}Copy</button></div>
  <div style="font-size:11px;color:var(--mute);text-align:center;margin-top:6px">WhatsApp opens — pick a person, a group or a broadcast list</div>`
 :`<div class="card empty" style="margin-top:10px">The invitation message is not saved yet. Import it once from <b>More → Import starting data</b> (file <b>invite_message_final_v2.txt</b>).<div class="rb" style="margin-top:10px"><button class="pill solid" data-go="import">Import starting data</button></div></div>`}
 <div class="sec" style="margin:12px 0 6px"><h3 class="H" style="font-size:19px">Latest replies <span class="new" style="vertical-align:4px">LIVE</span></h3><a href="#/guests">All ${L.length} ›</a></div>
 <div class="card list">${L.slice(0,5).map(r=>`<button class="it" data-go="guest/${encodeURIComponent(r.id)}">${avatar(r)}<div class="t"><b>${esc(r.n)}</b><span>${r.a?`Coming · ${people(r)}${r.rm?' · needs room':''}`:'Can’t make it'}</span></div><div style="font-size:10.5px;color:var(--mute);text-align:right">${ago(tOf(r))}</div></button>`).join('')||'<div class="empty">No replies yet.</div>'}</div></div>`};
let iT = 0;
B.invite = () => {$$('[data-im]').forEach(b=>b.onclick=()=>{IM=b.dataset.im;render()});
 $('#i_qr').onclick=()=>{const u=IM=='rsvp'?RSVP_URL:CARD_URL;openSheet(`<b class="H" style="font-size:22px;color:var(--mar)">${IM=='rsvp'?'RSVP':'Invitation'} QR code</b><div id="qr"></div><div class="lk">${esc(u)}</div><div class="hint">Guests scan this with their phone camera. Long-press the code to save it.</div>${credit()}<div class="btns"><button class="pill out" id="q_x">Close</button></div>`,()=>{
  $('#q_x').onclick=closeSheet;if(window.QRCode)new QRCode($('#qr'),{text:u,width:200,height:200,colorDark:'#3b1417',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});else $('#qr').textContent='QR engine not loaded - check connection'})};
 const ta=$('#i_txt');if(!ta)return;
 ta.oninput=()=>{const k=IM=='rsvp'?'rsvpText':'text';META.invite={...(META.invite||{}),[k]:ta.value};$('#i_wa').href='https://wa.me/?text='+encodeURIComponent(inviteText());$('#i_sv').textContent='Saving…';
  clearTimeout(iT);iT=setTimeout(()=>{setDoc(doc(db,'meta','invite'),{[k]:ta.value,t2:Date.now()},{merge:true}).then(()=>{const s=$('#i_sv');if(s)s.textContent='Saved for everyone.'}).catch(e=>toast('Could not save: '+e.code))},800)};
 $('#i_cp').onclick=async()=>{try{await navigator.clipboard.writeText(inviteText());toast('Message copied')}catch(e){$('#dlt').textContent='Message';$('#ta').value=inviteText();$('#dld').hidden=true;$('#dlg').showModal()}}};

/* ================= MORE ================= */
P.more = () => {const row=(go,ic,bg,st,t,s)=>`<button class="r" data-go="${go}"><div class="ic" style="background:${bg}">${svg(ic,st)}</div><div class="t"><b>${t}</b><span>${s}</span></div><div class="act">Open</div></button>`;
 return ph('More',esc(ME.email))+`<div class="body"><div class="card att">
 ${row('invite','send','#fbeef0','#7b1e2b','Invite guests','Invitation, RSVP link and QR code')}${row('alerts','bell','#fbf3e1','#b8862b','Alerts','Message guests on WhatsApp')}
 ${row('checkin','desk','#fbf3e1','#b8862b','Check-in','Arrived and key given')}${row('todo','todo','#eef3e4','#6b7a1f','To-do','Tasks for the family')}
 ${row('contacts','phone','#eaf1fa','#2563a8','Contacts','Venue, vendors, drivers')}</div>
 <div class="sec"><h3 class="H">Settings</h3></div><div class="card att">
 ${row('orgs','users','#fbeef0','#7b1e2b','Organisers','Who can sign in to this dashboard')}${row('import','up','#fbf1dc','#b8862b','Import starting data','Room plan, contacts and invitation message')}
 <button class="r" id="m_out"><div class="ic" style="background:#f3e7cf">${svg('out','#7d5f50')}</div><div class="t"><b>Sign out</b><span>${esc(ME.email)}</span></div></button></div>
 <div class="hint" style="text-align:center;margin-top:14px">Add to Home screen: open this page in Chrome → ⋮ menu → <b>Add to Home screen</b>.</div></div>`};
B.more = () => {$('#m_out').onclick=()=>{if(confirm('Sign out on this phone?'))signOut(auth)}};

P.orgs = () => {const L=Object.values(ORG).sort((a,b)=>a.id.localeCompare(b.id));
 return ph('Organisers','Only these people can sign in','', 'more')+`<div class="body">
 <div class="card list">${L.map(o=>`<div class="it"><div class="avt" style="background:#7b1e2b">${esc(ini(o.name||o.id))}</div><div class="t"><b>${esc(o.name||o.id)}</b><span>${esc(o.id)}${o.id==ME.email?' · you':''}</span></div>${o.id!=ME.email?`<button class="pill out sm" data-od="${esc(o.id)}">Remove</button>`:''}</div>`).join('')||'<div class="empty">The owner account is built in. Add the groom and other helpers below.</div>'}</div>
 <div class="card" style="padding:12px 14px;margin-top:10px"><b class="H" style="font-size:19px;color:var(--mar)">Add an organiser</b>
 <div class="fld"><label>Name</label><input class="inp" id="o_n" placeholder="e.g. Ashutosh"></div><div class="fld"><label>Email (their Google account)</label><input class="inp" id="o_e" type="email" placeholder="name@gmail.com"></div>
 <div class="btns"><button class="pill solid" id="o_add">Add organiser</button></div><div class="hint">They sign in with <b>Continue with Google</b> using that email. No password needed.</div></div></div>`};
B.orgs = () => {$('#o_add').onclick=()=>{const e=$('#o_e').value.trim().toLowerCase(),n=$('#o_n').value.trim();if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)){toast('Enter a valid email');return}
  setDoc(doc(db,'organisers',e),{name:n||e.split('@')[0],addedBy:ME.email,t2:Date.now()}).then(()=>toast(e+' can now sign in')).catch(x=>toast('Could not add: '+x.code))};
 $$('[data-od]').forEach(b=>b.onclick=()=>{if(!confirm('Remove '+b.dataset.od+'? They will no longer be able to sign in.'))return;deleteDoc(doc(db,'organisers',b.dataset.od)).catch(x=>toast('Could not remove: '+x.code))})};

/* one-time import of the private starting data (never committed to git) */
function seedRooms(seed){const o={};Object.entries(seed.rooms||{}).forEach(([id,r])=>{o[id]={f:+r.floor||+String(id)[0],name:r.name||'',pax:r.pax||'',g:r.name?(r.group||'f'):'',note:r.note||'',rid:''}});return o}
P.import = () => ph('Import starting data','One time · organisers only','', 'more')+`<div class="body">
 <div class="card" style="padding:12px 14px"><b class="H" style="font-size:19px;color:var(--mar)">Rooms &amp; contacts</b><div class="hint">Choose <b>seed_rooms_and_contacts.json</b> from this device. Rooms and contacts are added only if they are empty now.</div>
 <div class="fld"><input class="inp" type="file" id="im_j" accept=".json,application/json"></div><div class="hint">Now: ${Object.keys(D).length} rooms · ${live(CT).length} contacts</div></div>
 <div class="card" style="padding:12px 14px;margin-top:10px"><b class="H" style="font-size:19px;color:var(--mar)">Invitation message</b><div class="hint">Choose <b>invite_message_final_v2.txt</b>. It becomes the default message in Invite guests, word for word.</div>
 <div class="fld"><input class="inp" type="file" id="im_t" accept=".txt,text/plain"></div><div class="hint">Now: ${META.invite&&META.invite.text?'saved ✓':'not saved yet'}</div></div>
 <div class="hint" style="margin-top:10px">The files stay on your device. Only their contents are saved, in the private wedding database.</div></div>`;
B.import = () => {
 $('#im_j').onchange=async e=>{const f=e.target.files[0];if(!f)return;let seed;try{seed=JSON.parse(await f.text())}catch(x){toast('This is not a valid JSON file');return}
  if(!seed.rooms||typeof seed.rooms!='object'){toast('No rooms found in this file');return}
  const b=writeBatch(db);let nr=0,nc=0;const rooms=seedRooms(seed);
  if(!Object.keys(D).length)Object.entries(rooms).forEach(([id,r])=>{b.set(doc(db,'rooms',id),{...r,t2:Date.now()});nr++});
  if(!live(CT).length)(seed.contacts||[]).forEach(c=>{const id=uid()+nc;b.set(doc(db,'contacts',id),{n:c.name||'',ro:ROLES.includes(c.role)?c.role:(c.role||'Other'),p:ph91(c.phone),no:c.note||'',t2:Date.now()});nc++});
  b.set(doc(db,'meta','seed'),{rooms,importedBy:ME.email,t2:Date.now()});
  try{await b.commit();toast(`Imported ${nr} rooms and ${nc} contacts`)}catch(x){toast('Import failed: '+x.code)}e.target.value=''};
 $('#im_t').onchange=async e=>{const f=e.target.files[0];if(!f)return;const text=(await f.text()).replace(/^﻿/,'').replace(/\r\n/g,'\n').replace(/\n+$/,'');
  if(!text.trim()){toast('The file is empty');return}if(META.invite&&META.invite.text&&!confirm('Replace the saved invitation message with this file?'))return;
  try{await setDoc(doc(db,'meta','invite'),{text,importedBy:ME.email,t2:Date.now()},{merge:true});toast('Invitation message saved')}catch(x){toast('Could not save: '+x.code)}e.target.value=''}};

/* ================= AUTH + LIVE SYNC ================= */
const subs = [];
function stopAll(){subs.splice(0).forEach(u=>u());D={};R={};CT={};TK={};VH={};ORG={};META={}}
function listen(coll, fn, meta = false){subs.push(onSnapshot(collection(db,coll),{includeMetadataChanges:meta},s=>{const m={};s.forEach(d=>m[d.id]={...d.data(),id:d.id});fn(m,s.metadata);SEEN[coll]=1;rer()},e=>{console.warn(coll,e.code);if(e.code=='permission-denied')gate('notorg')}))}
let dT = 0;
function startData(){
 listen('rooms',m=>{D={};Object.entries(m).forEach(([id,r])=>D[id]={f:+r.f||+id[0],name:r.name||'',pax:r.pax||'',g:r.g||'',note:r.note||'',rid:r.rid||''})});
 listen('rsvps',(m,md)=>{R=m;LIVE=!md.fromCache;clearTimeout(dT);dT=setTimeout(()=>{if(SEEN.rooms&&SEEN.vehicles)dedupe()},1500)},true);
 listen('contacts',m=>CT=m);listen('tasks',m=>TK=m);listen('vehicles',m=>VH=m);listen('organisers',m=>ORG=m);
 listen('meta',m=>{META={invite:m.invite||null,seed:m.seed||null}})}
function show(id){['boot','login','gate','app'].forEach(x=>$('#'+x).hidden=x!==id)}
function gate(kind){show('gate');stopAll();const u=auth.currentUser;
 $('#gate').innerHTML=`<div class="sh">॥ श्री गणेशाय नमः ॥</div><div class="bigmono H">A&amp;S</div><h1 class="H" style="color:var(--mar)">${kind=='verify'?'Check your email':'Not an organiser'}</h1>
 <div class="card" style="padding:18px;margin-top:16px;font-size:14px">${kind=='verify'?`We sent a link to <b>${esc(u&&u.email)}</b>. Open it once to confirm your email, then come back and tap <b>I have confirmed</b>.`
  :`<b>${esc(u&&u.email)}</b> is not on the organiser list. Ask Arvind to add this email in <b>More → Organisers</b>.`}
 ${kind=='verify'?'<button class="pill solid" id="gv_ok" style="margin-top:14px;width:100%">I have confirmed</button><button class="link" id="gv_re">Send the link again</button>':''}
 <button class="pill out" id="g_out" style="margin-top:12px;width:100%">Sign out</button></div>${credit()}`;
 $('#g_out').onclick=()=>signOut(auth);
 if(kind=='verify'){$('#gv_ok').onclick=async()=>{await u.reload();await u.getIdToken(true);boot(auth.currentUser)};$('#gv_re').onclick=()=>sendEmailVerification(u).then(()=>toast('Link sent')).catch(e=>toast(e.code))}}
async function boot(u){if(!u){stopAll();show('login');return}
 if(!u.emailVerified){gate('verify');return}
 ME={email:u.email.toLowerCase(),displayName:u.displayName||''};
 try{await getDoc(doc(db,'organisers',ME.email))}catch(e){if(e.code=='permission-denied'){gate('notorg');return}}
 stopAll();startData();show('app');if(PENDIMP){const c=PENDIMP;PENDIMP=null;setTimeout(()=>askImport(c),1200)}route()}
onAuthStateChanged(auth,boot);
getRedirectResult(auth).catch(e=>lerr(e));

/* login screen */
const lerr = e => {const m={'auth/invalid-credential':'Wrong email or password.','auth/wrong-password':'Wrong email or password.','auth/user-not-found':'No organiser account with this email.','auth/too-many-requests':'Too many tries. Wait a minute and try again.','auth/network-request-failed':'No internet connection.','auth/popup-closed-by-user':'Sign-in was closed before finishing.','auth/invalid-email':'Enter a valid email.'}[e&&e.code]||(e&&e.code?'Could not sign in ('+e.code+')':'');
 const el=$('#lerr');el.textContent=m;el.hidden=!m};
$('#lshow').onclick=()=>{const p=$('#lp');p.type=p.type=='password'?'text':'password';$('#lshow').textContent=p.type=='password'?'Show':'Hide'};
$('#lf').onsubmit=async e=>{e.preventDefault();lerr(null);const em=$('#le').value.trim(),pw=$('#lp').value;if(!em||!pw){lerr({code:'auth/invalid-email'});return}
 $('#lgo').textContent='Signing in…';try{const c=await signInWithEmailAndPassword(auth,em,pw);if(!c.user.emailVerified)await sendEmailVerification(c.user).catch(()=>{})}catch(x){lerr(x)}$('#lgo').textContent='Sign in'};
$('#lg').onclick=async()=>{lerr(null);const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
 try{await signInWithPopup(auth,p)}catch(x){if(x.code=='auth/popup-blocked'||x.code=='auth/operation-not-supported-in-this-environment')signInWithRedirect(auth,p);else lerr(x)}};
$('#lfp').onclick=async()=>{const em=$('#le').value.trim();if(!em){lerr({code:'auth/invalid-email'});$('#le').focus();return}
 try{await sendPasswordResetEmail(auth,em);toast('Password reset link sent to '+em)}catch(x){lerr(x)}};
