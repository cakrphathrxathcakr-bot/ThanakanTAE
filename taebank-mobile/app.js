// VIP_MODEL_BEGIN
/* แก้เกณฑ์และชื่อแรงค์ได้ที่ VIP_LEVELS แห่งเดียว ตัวเลขคอลัมน์แรกเป็นยอดเงินขั้นต่ำหน่วยบาท */
(function (global) {
  'use strict';
  const VIP_LEVELS = [
    [0, 'สมาชิกเริ่มต้น', 'STARTER', 'starter', 'linear-gradient(125deg,#303c44,#182129 70%,#394650)', '#f0f5f8', '#b3c0c9', '#bccbd7'],
    [100, 'บรอนซ์ I', 'BRONZE I', 'bronze', 'linear-gradient(125deg,#b67c5a,#ebbd94 53%,#bc8662)', '#352016', '#654832', '#e5b28a'],
    [150, 'บรอนซ์ II', 'BRONZE II', 'bronze', 'linear-gradient(125deg,#d2a17c,#f2d2ac 48%,#b77e55)', '#352016', '#68472f', '#f0c69e'],
    [200, 'ซิลเวอร์ I', 'SILVER I', 'silver', 'linear-gradient(125deg,#99adb9,#e1eaf0 52%,#afbdc8)', '#1c303c', '#4c626f', '#c4d9e7'],
    [250, 'ซิลเวอร์ II', 'SILVER II', 'silver', 'linear-gradient(125deg,#c3ced8,#f2f6f9 48%,#b3c6d2)', '#233744', '#526b7a', '#e2ecf4'],
    [300, 'โกลด์ I', 'GOLD I', 'gold', 'linear-gradient(125deg,#d0ac61,#edcf89 52%,#b79247)', '#342913', '#64512e', '#e8c67e'],
    [350, 'โกลด์ II', 'GOLD II', 'gold', 'linear-gradient(125deg,#dfbe7b,#f6e3af 48%,#c6a05b)', '#352b18', '#705831', '#f1d795'],
    [400, 'แพลทินัม I', 'PLATINUM I', 'platinum', 'linear-gradient(125deg,#6b7d83,#c3d1cf 50%,#7c9497)', '#193434', '#3e5c60', '#b8d7d4'],
    [500, 'แพลทินัม II', 'PLATINUM II', 'platinum', 'linear-gradient(125deg,#a7bebc,#e8f0ed 52%,#8daab2)', '#203c40', '#4e6b70', '#d6e8e7'],
    [1000, 'ไดมอนด์', 'DIAMOND', 'diamond', 'linear-gradient(125deg,#d3ecf5,#fafcff 45%,#c6ddf5 73%,#c2f0ee)', '#15364e', '#4f6d82', '#caeaff'],
    [2000, 'เอมเมอรัลด์', 'EMERALD', 'emerald', 'linear-gradient(125deg,#124b3d,#20725a 48%,#092d29)', '#e1fae9', '#a6d6bb', '#9ce6bd'],
    [3000, 'แซฟไฟร์', 'SAPPHIRE', 'sapphire', 'linear-gradient(125deg,#142c64,#2b5394 48%,#0b1b3a)', '#edf5ff', '#b1c8ea', '#a9cdf8'],
    [5000, 'วีไอพี', 'VIP', 'vip', 'linear-gradient(125deg,#38294c,#68517f 50%,#21192e)', '#fbf0ff', '#d2badf', '#dab8ee'],
    [6000, 'รูบีวีไอพี', 'RUBY VIP', 'ruby', 'linear-gradient(125deg,#4b1d30,#82354e 50%,#2a1423)', '#fff1eb', '#e4b3bf', '#f0b2bc'],
    [7000, 'เพรสทีจวีไอพี', 'PRESTIGE VIP', 'prestige', 'linear-gradient(125deg,#303226,#141a17 55%,#454334)', '#efe3c4', '#c3b99a', '#e4d19e'],
    [8000, 'อิมพีเรียลวีไอพี', 'IMPERIAL VIP', 'imperial', 'linear-gradient(125deg,#2a254b,#504370 48%,#1a1832)', '#f4e8ca', '#c4b5cf', '#e9d5ae'],
    [9000, 'คราวน์วีไอพี', 'CROWN VIP', 'crown', 'linear-gradient(125deg,#bca06a,#f6e6bd 48%,#ccb57e)', '#34291b', '#6a5737', '#f4dfaa'],
    [10000, 'รอยัลวีไอพี', 'ROYAL VIP', 'royal', 'radial-gradient(ellipse at 18% 0%,#65466f 0%,transparent 63%),linear-gradient(125deg,#32203e,#16121f 58%,#34233e)', '#f5dfaa', '#cdb88f', '#f2d18b']
  ].map((row, index) => Object.freeze({ minimumBaht:row[0], minimumSatang:row[0]*100, name:row[1], label:row[2], family:row[3], background:row[4], ink:row[5], muted:row[6], accent:row[7], index, level:index+1 }));
  Object.freeze(VIP_LEVELS);

  function resolve(balanceSatang) {
    if (!Number.isSafeInteger(balanceSatang)) throw new TypeError('ยอดสำหรับคำนวณแรงค์ต้องเป็นจำนวนเต็มสตางค์');
    let index = 0;
    for (let i=1;i<VIP_LEVELS.length;i++) { if (balanceSatang>=VIP_LEVELS[i].minimumSatang) index=i; else break; }
    const current=VIP_LEVELS[index],next=VIP_LEVELS[index+1]||null;
    const remainingSatang=next?next.minimumSatang-balanceSatang:0;
    const progress=next?Math.max(0,Math.min(100,(balanceSatang-current.minimumSatang)/(next.minimumSatang-current.minimumSatang)*100)):100;
    return Object.freeze({current,next,balanceSatang,remainingSatang,progress,isMax:!next,unlockedCount:index+1});
  }
  function rankMembers(items,balanceFor) {
    const codeCompare=(a,b)=>String(a)<String(b)?-1:String(a)>String(b)?1:0;
    const rows=items.filter(m=>m.status!=='archived').map(member=>{
      const amount=balanceFor(member.code);
      return {member,balanceSatang:amount,tier:resolve(amount),position:0};
    }).sort((a,b)=>b.balanceSatang-a.balanceSatang||codeCompare(a.member.code,b.member.code));
    rows.forEach((row,index)=>{row.position=index&&rows[index-1].balanceSatang===row.balanceSatang?rows[index-1].position:index+1;});
    return rows;
  }
  global.TaeVIP=Object.freeze({levels:VIP_LEVELS,resolve,rankMembers});
})(typeof window!=='undefined'?window:globalThis);
// VIP_MODEL_END

/* TaeBank Mobile · UI has no direct permission to write a production database. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => new Intl.NumberFormat('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}).format((Number(value) || 0) / 100);
  const compact = value => new Intl.NumberFormat('en-US', {notation:'compact',maximumFractionDigits:1}).format((Number(value) || 0) / 100);
  const dateFmt = (value, options = {}) => new Date(value).toLocaleDateString('th-TH', {timeZone:'Asia/Bangkok',day:'numeric',month:'short',...options});
  const timeFmt = value => new Date(value).toLocaleTimeString('th-TH', {timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
  const dayKey = value => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const icons = {
    mark:'<path d="M5 6h14M12 6v14M7 11h10"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    activity:'<path d="M4 6h16M4 12h16M4 18h10"/><path d="m18 16 3 3-3 3"/>',
    chart:'<path d="M4 4v16h16M8 15v-4M13 15V7M18 15v-6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tools:'<path d="m14 6 4 4M3 21l7-7M14 3a6 6 0 0 0-7 7l-5 5a3 3 0 0 0 4 4l5-5a6 6 0 0 0 7-7l-4 4-4-4z"/>',
    down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
    up:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:'<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6 6C3.5 8 2 12 2 12s3 7 10 7c2 0 3.8-.6 5.2-1.5M10 5.2c.6-.1 1.3-.2 2-.2 7 0 10 7 10 7a18 18 0 0 1-3 4"/>',
    copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/>',
    logout:'<path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4"/>',
    print:'<path d="M6 9V3h12v6M6 17H3v-8h18v8h-3"/><path d="M6 14h12v7H6zM17 11h1"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    percent:'<path d="m5 19 14-14"/><circle cx="6.5" cy="6.5" r="3"/><circle cx="17.5" cy="17.5" r="3"/>',
    book:'<path d="M4 4h13a3 3 0 0 1 3 3v14H6a3 3 0 0 1-3-3V6a2 2 0 0 1 1-2zM3 17h17M8 7h7M8 11h5"/>',
    edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>',
    undo:'<path d="M3 10h11a6 6 0 0 1 0 12M3 10l6-6M3 10l6 6"/>',
    moon:'<path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10z"/>',
    wallet:'<path d="M20 8V5H5a3 3 0 0 0 0 6h16v10H5a3 3 0 0 1-3-3V8M21 13h-5v5h5"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    refresh:'<path d="M20 7V2l-3 3a8 8 0 1 0 3 9M15 7h5"/>',
    sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
    file:'<path d="M14 2H4v20h16V8zM14 2v6h6M8 12h8M8 16h6"/>'
  };
  const icon = (name, classes = '') => `<svg class="icon ${classes}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
  const brand = () => `<span class="brand-mark">${icon('mark')}</span><span class="brand-word">taebank<span class="brand-dot">.</span></span>`;
  let snapshot = {state:null,session:null,mode:'demo',connection:'loading'};
  let activeView = 'home';
  let historyFilter = 'all', historySearch = '', memberSearch = '', chartDays = 7;
  let showBalance = true, modalCleanup = null, submitting = false, latestWarning = '';
  let loginRole = 'member';
  const app = $('#app'), modal = $('#modal');
  const vipStyle=document.createElement('style');
  vipStyle.id='taebank-vip-styles';
  vipStyle.textContent="/* VIP layer: embedded in app.js so the upgrade needs only one replacement file. */\n.vip-account-card .balance-toggle,.vip-account-card .copy-account { color:var(--vip-muted); }\n.vip-member-levels { display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin-top:6px; }\n.vip-mini-badge svg { width:14px; height:14px; }\n.vip-mini-badge:has(svg)::before { display:none; }\n.vip-leader-meta { display:block; }\n.vip-leader-row { width:100%; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }\n.vip-place[data-place='1'],.vip-place[data-place='2'],.vip-place[data-place='3'] { position:relative; }\n.vip-place[data-place='1']::after,.vip-place[data-place='2']::after,.vip-place[data-place='3']::after { content:attr(data-place); position:absolute; right:-5px; bottom:-4px; display:grid; place-items:center; min-width:17px; height:17px; border-radius:50%; border:1px solid currentColor; color:inherit; background:#20241f; font-size:12px; line-height:1; }\n.vip-max-message { display:flex; align-items:center; gap:10px; }\n.vip-max-message strong,.vip-max-message span { display:block; }\n.vip-max-message span { font-size:12px; }\n.vip-rank-panel > .vip-section-note { margin-top:12px; }\n.vip-progress-hidden .vip-progress-fill { opacity:.16; }\n.vip-account-card,.vip-rank-panel,.vip-ladder-row { --vip-accent:#e7c88a; --vip-edge:rgba(231,200,138,.24); --vip-glow:rgba(231,200,138,.09); }\n.balance-card.vip-account-card { color:var(--vip-ink,#29271f); border-color:var(--vip-edge,#e7c88a); background:var(--vip-bg,linear-gradient(120deg,#bdc7ba,#e1e7d9)); box-shadow:0 16px 46px rgba(0,0,0,.18),0 0 30px var(--vip-glow); }\n.vip-account-card .card-top,.vip-account-card .card-bottom { position:relative; z-index:1; }\n.vip-account-card .card-top { align-items:flex-start; }\n.vip-account-card .card-brand { padding-top:5px; }\n.vip-account-card .card-amount-label,.vip-account-card .account-number { color:var(--vip-muted,#4a5246); }\n.vip-account-card .card-amount-label .icon-btn { color:var(--vip-muted,#4a5246); }\n.vip-account-card .card-amount-label .icon-btn:hover { color:var(--vip-ink); background:rgba(128,128,128,.12); }\n.vip-account-card .card-chip { color:var(--vip-ink); border-color:currentColor; background:rgba(255,255,255,.14); opacity:.68; }\n.vip-account-card .card-decoration { border-color:currentColor; color:var(--vip-ink); opacity:.28; }\n.vip-card-badge { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:32px; max-width:57%; padding:6px 10px; border:1px solid currentColor; border-radius:7px; color:inherit; background:rgba(255,255,255,.07); font-size:12px; font-weight:800; line-height:1.5; letter-spacing:.01em; text-align:right; }\n.vip-card-badge svg { width:16px; height:16px; }\n.vip-account-card[data-vip-family=starter] .card-decoration { border-radius:36%; transform:rotate(25deg); }\n.vip-account-card[data-vip-family=bronze] .card-decoration,.vip-account-card[data-vip-family=silver] .card-decoration { border-style:double; border-width:3px; }\n.vip-account-card[data-vip-family=platinum] .card-decoration,.vip-account-card[data-vip-family=diamond] .card-decoration { border-radius:28px; transform:rotate(45deg); }\n.vip-account-card[data-vip-family=emerald] .card-decoration,.vip-account-card[data-vip-family=sapphire] .card-decoration { border-radius:35%; transform:rotate(34deg); }\n.vip-account-card[data-vip-family=vip] .vip-card-badge,.vip-account-card[data-vip-family=prestige] .vip-card-badge { border-radius:3px 12px 3px 12px; }\n.vip-account-card[data-vip-family=ruby] .card-decoration { border-radius:24%; transform:rotate(45deg); }\n.vip-account-card[data-vip-family=imperial] .vip-card-badge,.vip-account-card[data-vip-family=crown] .vip-card-badge { box-shadow:inset 0 0 0 2px rgba(255,255,255,.1); }\n.balance-card.vip-account-card[data-vip-family=royal] { border:1px solid #c4a565; box-shadow:0 18px 50px rgba(3,0,13,.34),0 0 28px rgba(173,129,220,.08),inset 0 0 0 5px #171125,inset 0 0 0 6px rgba(229,192,122,.31); }\n.vip-account-card[data-vip-family=royal]::after { content:''; position:absolute; z-index:-1; inset:0; pointer-events:none; background:radial-gradient(ellipse at 4% 0%,rgba(216,176,255,.15),transparent 55%),linear-gradient(110deg,transparent 28%,rgba(242,219,173,.08) 47%,transparent 65%); }\n.vip-account-card[data-vip-family=royal] .card-decoration { width:240px; height:240px; top:6px; right:-110px; color:#e5c07a; opacity:.4; border-radius:30%; transform:rotate(45deg); box-shadow:0 0 0 20px rgba(229,192,122,.04),0 0 0 21px rgba(229,192,122,.14),0 0 0 43px rgba(229,192,122,.03),0 0 0 44px rgba(229,192,122,.1); }\n.vip-account-card[data-vip-family=royal] .vip-card-badge { color:#f8dda1; border-color:rgba(239,204,141,.6); background:linear-gradient(120deg,rgba(222,177,85,.15),rgba(42,27,62,.4)); text-shadow:0 1px 12px rgba(243,207,130,.2); }\n.vip-rank-panel { position:relative; overflow:hidden; min-width:0; padding:22px; border:1px solid var(--vip-edge); border-radius:22px; background:radial-gradient(ellipse at 0 0,var(--vip-glow),transparent 75%),#191c19; }\n.vip-rank-panel::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--vip-accent); opacity:.7; }\n.vip-panel-top { display:flex; align-items:center; flex-wrap:wrap; gap:13px; }\n.vip-rank-emblem,.vip-ladder-emblem { display:grid; place-items:center; flex-shrink:0; width:54px; height:58px; border:1px solid var(--vip-edge); border-radius:15px 15px 22px 22px; color:var(--vip-accent); background:linear-gradient(145deg,var(--vip-glow),rgba(0,0,0,.1)); box-shadow:inset 0 1px 0 rgba(255,255,255,.06); }\n.vip-rank-emblem svg { width:31px; height:31px; stroke-width:1.45; }\n.vip-panel-copy { min-width:0; flex:1; }\n.vip-kicker { color:#a3aa9d; font-size:12px; font-weight:600; letter-spacing:.08em; }\n.vip-current-name { color:var(--vip-accent); font-size:21px; font-weight:800; line-height:1.6; letter-spacing:-.025em; overflow-wrap:anywhere; }\n.vip-level-code { color:#a3aa9d; font-size:12px; line-height:1.5; letter-spacing:.07em; }\n.vip-explore { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; gap:4px; min-height:44px; padding:9px 12px; border:1px solid var(--vip-edge); border-radius:11px; color:var(--vip-accent); background:rgba(255,255,255,.025); font-size:12px; font-weight:700; line-height:1.5; transition:background .16s,border-color .16s; }\n.vip-explore:hover { background:var(--vip-glow); }\n.vip-explore svg { width:15px; height:15px; }\n.vip-next-line { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:4px 14px; margin-top:23px; color:#a3aa9d; font-size:12px; line-height:1.7; }\n.vip-next-line strong { color:var(--paper); font-size:13px; font-weight:650; }\n.vip-remaining { margin-top:7px; color:#b6bdb1; font-size:13px; line-height:1.8; }\n.vip-remaining strong { margin:0 4px; color:var(--vip-accent); font-size:27px; line-height:1.5; letter-spacing:-.045em; font-variant-numeric:tabular-nums; }\n.vip-progress-track { height:8px; overflow:hidden; margin-top:15px; border:1px solid rgba(255,255,255,.06); border-radius:10px; background:#2c302a; }\n.vip-progress-fill { display:block; height:100%; max-width:100%; border-radius:inherit; background:linear-gradient(90deg,var(--vip-accent),#fff0ca); box-shadow:0 0 14px var(--vip-glow); transition:width .35s ease; }\n.vip-progress-meta { display:flex; justify-content:space-between; gap:10px; margin-top:8px; color:#a3aa9d; font-size:12px; line-height:1.6; font-variant-numeric:tabular-nums; }\n.vip-max-message { margin-top:18px; padding:13px 15px; border:1px solid var(--vip-edge); border-radius:12px; color:var(--vip-accent); background:var(--vip-glow); font-size:13px; line-height:1.9; }\n.vip-rank-panel[data-vip-max=true] { border-color:rgba(229,192,122,.4); background:radial-gradient(ellipse at top left,rgba(138,91,183,.15),transparent 80%),#1c1826; }\n.vip-rank-panel[data-vip-max=true] .vip-rank-emblem { border-radius:12px; transform:rotate(-3deg); box-shadow:inset 0 0 0 3px #211b2c,0 0 22px rgba(229,192,122,.08); }\n.vip-mini-badge { display:inline-flex; align-items:center; gap:5px; max-width:100%; padding:3px 7px; border:1px solid var(--vip-edge,rgba(231,200,138,.24)); border-radius:6px; color:var(--vip-accent,#e7c88a); background:var(--vip-glow,rgba(231,200,138,.06)); font-size:12px; font-weight:650; line-height:1.5; white-space:normal; vertical-align:middle; }\n.vip-mini-badge::before { content:''; width:5px; height:5px; flex-shrink:0; border-radius:50%; background:currentColor; }\n.vip-position-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 7px; border:1px solid rgba(228,234,220,.12); border-radius:6px; color:#bac3b2; background:rgba(255,255,255,.03); font-size:12px; font-weight:650; line-height:1.5; }\n.member-name .vip-mini-badge { margin:4px 0 0; }\n.vip-leaderboard-list { padding:0 20px 10px; }\n.vip-leader-row { display:flex; align-items:center; gap:12px; padding:16px 0; border-bottom:1px solid var(--line); }\n.vip-leader-row:last-child { border-bottom:0; }\n.vip-place { display:grid; place-items:center; flex-shrink:0; width:34px; min-height:38px; border:1px solid #394032; border-radius:10px; color:#9da793; background:#24291f; font-size:13px; font-weight:800; font-variant-numeric:tabular-nums; }\n.vip-place[data-place='1'] { color:#ffdfa1; border-color:#6c5a35; background:linear-gradient(135deg,#443a24,#29271f); }\n.vip-place[data-place='2'] { color:#e0e6ec; border-color:#525e68; background:linear-gradient(135deg,#333d45,#252b30); }\n.vip-place[data-place='3'] { color:#edbda0; border-color:#654c3e; background:linear-gradient(135deg,#443329,#2f2722); }\n.vip-leader-person { min-width:0; flex:1; }\n.vip-leader-name { display:flex; flex-wrap:wrap; align-items:center; gap:5px; color:#f6f3ea; font-size:14px; font-weight:650; line-height:1.7; overflow-wrap:anywhere; }\n.vip-leader-meta { margin-top:4px; color:#a3aa9d; font-size:12px; line-height:1.6; }\n.vip-leader-value { flex-shrink:0; margin-left:auto; color:#f1e9db; font-size:15px; font-weight:750; line-height:1.6; text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; letter-spacing:-.02em; }\n.vip-leader-value small { display:block; color:#a3aa9d; font-size:12px; font-weight:500; }\n.vip-leader-row.is-self { position:relative; }\n.vip-leader-row.is-self::before { content:''; position:absolute; inset:5px -10px; z-index:0; border:1px solid rgba(231,200,138,.12); border-radius:12px; background:rgba(231,200,138,.035); pointer-events:none; }\n.vip-leader-row.is-self > * { position:relative; }\n.vip-modal-intro { color:#adb4a6; font-size:13px; line-height:1.9; }\n.vip-ladder-summary { display:flex; align-items:center; flex-wrap:wrap; gap:8px 12px; padding:15px; border:1px solid var(--vip-edge,rgba(231,200,138,.2)); border-radius:15px; background:var(--vip-glow,rgba(231,200,138,.05)); color:#e7c88a; font-size:13px; line-height:1.8; }\n.vip-ladder-summary strong { color:var(--paper); font-size:15px; }\n.vip-ladder-summary .vip-mini-badge { margin-left:auto; }\n.vip-ladder-list { display:flex; flex-direction:column; gap:9px; }\n.vip-ladder-row { position:relative; display:flex; align-items:center; gap:12px; min-width:0; padding:14px; border:1px solid rgba(228,234,220,.09); border-radius:15px; background:#181c17; }\n.vip-ladder-emblem { width:43px; height:47px; border-radius:12px 12px 17px 17px; }\n.vip-ladder-emblem svg { width:25px; height:25px; stroke-width:1.5; }\n.vip-ladder-copy { flex:1; min-width:0; }\n.vip-ladder-title { color:var(--vip-accent); font-size:14px; font-weight:750; line-height:1.65; overflow-wrap:anywhere; }\n.vip-ladder-threshold { color:#f6f3ea; font-size:12px; line-height:1.75; font-variant-numeric:tabular-nums; }\n.vip-ladder-note { color:#a3aa9d; font-size:12px; line-height:1.65; }\n.vip-ladder-status { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; gap:4px; max-width:88px; padding:5px 7px; border-radius:6px; color:#a3aa9d; font-size:12px; line-height:1.5; text-align:center; }\n.vip-ladder-status svg { width:14px; height:14px; }\n.vip-ladder-row[data-state=current] { border-color:var(--vip-accent); background:linear-gradient(110deg,var(--vip-glow),transparent 90%),#1c201a; box-shadow:0 0 0 1px var(--vip-edge); }\n.vip-ladder-row[data-state=current] .vip-ladder-status { color:var(--vip-accent); background:var(--vip-glow); }\n.vip-ladder-row[data-state=unlocked] .vip-ladder-status { color:#a8ccae; }\n.vip-ladder-row[data-state=locked] .vip-ladder-emblem { opacity:.64; }\n.vip-ladder-row[data-vip-family=royal] { border-color:rgba(229,192,122,.3); background:radial-gradient(ellipse at left,rgba(138,91,183,.13),transparent 80%),#1d1729; }\n.vip-ladder-row[data-vip-family=royal][data-state=current] { border-color:#e5c07a; box-shadow:inset 0 0 0 3px #1d1729,inset 0 0 0 4px rgba(229,192,122,.2); }\n.vip-ladder-row[data-vip-family=diamond] .vip-ladder-emblem,.vip-ladder-row[data-vip-family=ruby] .vip-ladder-emblem { border-radius:10px; }\n.vip-family-mark { color:var(--vip-accent); font-size:12px; font-weight:700; letter-spacing:.08em; }\n.vip-section-note { margin:0; color:#a3aa9d; font-size:12px; line-height:1.9; }\n.vip-leaderboard-list + .vip-section-note { padding:0 20px 19px; }\n@media(max-width:600px) {\n  .vip-rank-panel { padding:20px; border-radius:20px; }\n  .vip-panel-top { gap:11px; }\n  .vip-rank-emblem { width:48px; height:53px; }\n  .vip-rank-emblem svg { width:27px; height:27px; }\n  .vip-current-name { font-size:20px; }\n  .vip-explore { padding:8px 10px; }\n  .vip-next-line { margin-top:19px; }\n  .vip-remaining strong { font-size:25px; }\n  .vip-card-badge { padding:6px 8px; gap:4px; }\n  .vip-leaderboard-list { padding-left:18px; padding-right:18px; }\n  .vip-leader-row { gap:10px; }\n  .vip-leader-value { font-size:14px; }\n  .vip-ladder-row { gap:10px; padding:12px; }\n  .vip-ladder-emblem { width:38px; height:43px; }\n  .vip-ladder-status { max-width:70px; padding:4px; }\n}\n@media(max-width:374px) {\n  .vip-rank-panel { padding:18px; }\n  .vip-panel-copy { flex:1; flex-basis:0; min-width:0; }\n  .vip-rank-emblem { width:42px; height:48px; }\n  .vip-panel-top { gap:9px; }\n  .vip-current-name { font-size:18px; }\n  .vip-explore { width:auto; margin-top:0; padding:7px 8px; }\n  .vip-card-badge { max-width:55%; padding:5px 6px; }\n  .vip-card-badge svg { width:14px; height:14px; }\n  .vip-leader-row { gap:8px; }\n  .vip-place { width:29px; }\n  .vip-leader-name { font-size:13px; }\n  .vip-leader-value { font-size:13px; }\n  .vip-ladder-row { gap:9px; padding:11px; }\n  .vip-ladder-title { font-size:13px; }\n  .vip-ladder-emblem { width:34px; height:39px; }\n  .vip-ladder-status { max-width:62px; }\n}\n@media(prefers-reduced-motion:reduce) { .vip-progress-fill,.vip-explore { transition:none; } }\n";
  if(!document.getElementById(vipStyle.id))document.head.appendChild(vipStyle);

  const session = () => snapshot.session;
  const isAdmin = () => session()?.role === 'admin';
  const allMembers = () => Object.values(snapshot.state?.members || {});
  const members = () => allMembers().filter(m => m.status !== 'archived');
  const transactions = (code = null) => Object.values(snapshot.state?.transactions || {}).filter(t => !code || t.studentCode === code).sort((a,b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt)) || String(b.id).localeCompare(String(a.id)));
  const ownMember = () => snapshot.state?.members?.[session()?.accountCode];
  const balance = code => window.TaeCore.balance(snapshot.state, code);
  const totalBalance = () => allMembers().reduce((sum,m) => sum + balance(m.code), 0);
  const txTitle = t => t.reversalOf ? 'รายการกลับบัญชี' : t.isInterest ? 'รับดอกเบี้ย' : t.type === 'deposit' ? 'ฝากเงินเข้าบัญชี' : 'ถอนเงินจากบัญชี';
  const txAmount = t => `${t.type === 'deposit' ? '+' : '−'}${fmt(t.amountSatang)}`;
  const accountFmt = code => String(code || '').replace(/^(\d{3})(\d{3})$/, '$1 $2');
  const requestKey = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const nowMonth = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit'}).format(new Date());

  // VIP_UI_BEGIN — CSS and rank UI are bundled here so only app.js needs replacing.
  const vip = window.TaeVIP;
  const vipIcon = (family, classes = '') => {
    const paths = family==='royal'||family==='crown'||family==='imperial' ? '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5z"/><path d="M7 16h10"/><circle cx="12" cy="12" r="1"/>' : family==='diamond'||family==='emerald'||family==='sapphire'||family==='ruby' ? '<path d="m7 3-5 6 10 12L22 9l-5-6zM2 9h20M7 3l5 18 5-18M7 3l5 6 5-6"/>' : family==='vip'||family==='prestige' ? '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>' : '<path d="m12 2 8 5v10l-8 5-8-5V7z"/><path d="m8 12 3 3 5-6"/>';
    return `<svg class="icon ${classes}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  };
  const vipTheme = tier => `--vip-bg:${tier.background};--vip-ink:${tier.ink};--vip-muted:${tier.muted};--vip-accent:${tier.accent};--vip-edge:${tier.accent}44;--vip-glow:${tier.accent}16;`;
  const vipNumber = satang => fmt(satang);
  const vipVisible = () => isAdmin() || showBalance;
  const vipRanking = () => vip.rankMembers(allMembers(),balance);
  function vipBadge(tier) { return `<span class="vip-mini-badge" style="${vipTheme(tier)}">${vipIcon(tier.family)}${esc(tier.name)}</span>`; }
  function vipPanel(code) {
    const m=snapshot.state?.members?.[code]; if(!m)return '';
    const info=vip.resolve(balance(code)),tier=info.current,visible=vipVisible();
    const progressDisplay=info.progress>0&&info.progress<100?Math.min(99.9,info.progress).toFixed(1):String(info.progress);
    const progress=visible?`<div class="vip-progress-track" role="progressbar" aria-label="ความคืบหน้าสู่ ${esc(info.next?.name||'ขั้นสูงสุด')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100,Number(info.progress.toFixed(4)))}"><span class="vip-progress-fill" style="width:${info.progress}%"></span></div>`:`<div class="vip-progress-track vip-progress-hidden" aria-label="ซ่อนความคืบหน้าตามการซ่อนยอดเงิน"><span class="vip-progress-fill" style="width:100%"></span></div>`;
    return `<section class="vip-rank-panel" style="${vipTheme(tier)}" data-vip-family="${tier.family}" data-vip-max="${info.isMax}" data-vip-panel="${esc(code)}"><div class="vip-panel-top"><div class="vip-rank-emblem">${vipIcon(tier.family)}</div><div class="vip-panel-copy"><p class="vip-kicker">${tier.label}</p><h2 class="vip-current-name">${esc(tier.name)}</h2><span class="vip-level-code">LEVEL ${String(tier.level).padStart(2,'0')} / ${vip.levels.length}</span></div><button class="text-btn vip-explore" data-action="vip-ladder" data-code="${esc(code)}">ดูทุกขั้น ${icon('chevron')}</button></div>${info.isMax?`<div class="vip-max-message">${vipIcon('royal')}<div><strong>คุณอยู่ในระดับสูงสุดแล้ว</strong><span>รอยัลวีไอพี · ยอดเงินตั้งแต่ 10,000 บาท</span></div></div>${progress}<div class="vip-progress-meta"><span>ROYAL COLLECTION</span><span>ระดับสูงสุด</span></div>`:`<div class="vip-next-line"><span>ขั้นถัดไป</span><strong>${esc(info.next.name)}</strong></div><p class="vip-remaining">ออมเพิ่มอีก <strong>${visible?`฿${vipNumber(info.remainingSatang)}`:'฿•••,•••'}</strong></p>${progress}<div class="vip-progress-meta"><span>฿${vipNumber(tier.minimumSatang)} → ฿${vipNumber(info.next.minimumSatang)}</span><span>${visible?`${progressDisplay}%`:'ซ่อนความคืบหน้า'}</span></div>`}<p class="vip-section-note">แรงค์ปรับตามยอดเงินคงเหลือปัจจุบัน</p></section>`;
  }
  function vipLeaderboard() {
    if(!isAdmin())return '';
    const rows=vipRanking();
    return `<section class="section-card vip-leaderboard"><div class="section-heading"><div><p class="eyebrow">THE HONOUR ROLL</p><h2 class="section-title">อันดับสมาชิก</h2></div><button class="text-btn" data-action="nav" data-view="members">ดูทั้งหมด ${icon('arrow')}</button></div><div class="vip-leaderboard-list">${rows.slice(0,5).map(r=>`<button class="vip-leader-row" data-action="member-detail" data-code="${esc(r.member.code)}"><span class="vip-place" data-place="${r.position}">${r.position<=3?vipIcon(r.position===1?'royal':r.position===2?'diamond':'starter'):r.position}<span class="sr-only">อันดับ ${r.position}</span></span><span class="vip-leader-person"><span class="vip-leader-name">${esc(r.member.nick||r.member.name)}</span><span class="vip-leader-meta">${vipBadge(r.tier.current)}</span></span><span class="vip-leader-value">฿${fmt(r.balanceSatang)}<small>${esc(accountFmt(r.member.code))}</small></span></button>`).join('')||'<div class="empty-state">ยังไม่มีสมาชิกที่ใช้งาน</div>'}</div><p class="vip-section-note">เรียงตามยอดคงเหลือ · ยอดเท่ากันได้อันดับร่วม</p></section>`;
  }
  function openVIPLadder(code) {
    if(code&&!isAdmin()&&code!==session()?.accountCode)return;
    const m=snapshot.state?.members?.[code];
    const info=m?vip.resolve(balance(code)):null;
    const tier=info?.current||vip.levels[vip.levels.length-1];
    const introduction=info?(info.isMax?'คุณอยู่ในขั้นสูงสุดของ TaeBank แล้ว':`จาก ${info.current.name} สู่ ${info.next.name}${vipVisible()?` · อีก ฿${fmt(info.remainingSatang)}`:''}`):'ทุกก้าวของการออม มีระดับที่สะท้อนตัวคุณ';
    openModal('เส้นทางแรงค์และวีไอพี',`<div class="vip-ladder-summary" style="${vipTheme(tier)}">${vipIcon(tier.family)}<div><p class="vip-kicker">THE PRIVATE COLLECTION</p><strong>${info?esc(tier.name):'18 ระดับสู่รอยัลวีไอพี'}</strong></div></div><p class="vip-modal-intro">${esc(introduction)}</p><div class="vip-ladder-list">${vip.levels.map(level=>{
      const state=info?(level.index===info.current.index?'current':level.index<info.current.index?'unlocked':'locked'):'locked';
      const next=vip.levels[level.index+1];
      const gap=next?next.minimumSatang-level.minimumSatang:0;
      return `<div class="vip-ladder-row" style="${vipTheme(level)}" data-state="${state}" data-vip-family="${level.family}" ${state==='current'?'aria-current="step"':''}><span class="vip-ladder-emblem">${vipIcon(level.family)}</span><div class="vip-ladder-copy"><p class="vip-ladder-title">${esc(level.name)}</p><p class="vip-ladder-threshold">ยอดเงินตั้งแต่ ฿${fmt(level.minimumSatang)}</p><p class="vip-ladder-note">${next?`ช่วงนี้ห่างขั้นถัดไป ฿${fmt(gap)}`:'ระดับสูงสุด · ROYAL VIP'}</p></div><span class="vip-ladder-status">${state==='current'?'คุณอยู่ที่นี่':state==='unlocked'?icon('check'):`${String(level.level).padStart(2,'0')}`}</span></div>`;
    }).join('')}</div><p class="vip-section-note">คำนวณจากยอดคงเหลือ ไม่ใช่ยอดฝากสะสม เมื่อยอดเปลี่ยน แรงค์จะปรับขึ้นหรือลงตามเกณฑ์</p>`);
  }
  function decorateVIPDialog() {
    if(!modal.open||!snapshot.state)return;
    const profile=$('.compact-profile',modal),code=$('[data-action="member-edit"][data-code]',modal)?.dataset.code;
    if(!profile||!code||!snapshot.state.members[code])return;
    const tier=vip.resolve(balance(code)).current;
    const oldBadge=$('.vip-mini-badge',profile);
    if(oldBadge)oldBadge.outerHTML=vipBadge(tier);
    else profile.insertAdjacentHTML('beforeend',vipBadge(tier));
    const oldPanel=$('[data-vip-panel]',modal);
    if(oldPanel)oldPanel.outerHTML=vipPanel(code);
    else profile.insertAdjacentHTML('afterend',vipPanel(code));
  }
  function decorateVIP() {
    if(!session()||!snapshot.state)return;
    if(snapshot.mode!=='demo'&&snapshot.dataReady===false)return;
    if(!isAdmin()) {
      const m=ownMember();if(!m)return;
      const tier=vip.resolve(balance(m.code)).current;
      const card=$('#view .balance-card');
      if(card) {
        card.classList.add('vip-account-card');card.dataset.vipFamily=tier.family;card.style.cssText=vipTheme(tier);
        const badge=$('.card-badge',card);if(badge){badge.className='vip-card-badge';badge.innerHTML=`${vipIcon(tier.family)}<span>${esc(tier.name)}</span>`;}
        const caption=$('.balance-caption');if(caption&&!$('[data-vip-panel]',app))caption.insertAdjacentHTML('afterend',vipPanel(m.code));
      }
      const profile=$('#view .profile-hero');
      if(profile) {
        const badge=$('.badge',profile);if(badge&&m.status!=='archived')badge.outerHTML=vipBadge(tier);
        else if(!$('.vip-mini-badge',profile))profile.insertAdjacentHTML('beforeend',vipBadge(tier));
        const side=$('#view .side-column');if(side&&!$('[data-vip-panel]',side))side.insertAdjacentHTML('afterbegin',vipPanel(m.code));
      }
    }
    if(isAdmin()) {
      const positions=new Map(vipRanking().map(row=>[row.member.code,row.position]));
      app.querySelectorAll('.member-row').forEach(row=>{
        const code=$('[data-code]',row)?.dataset.code; if(!code||!snapshot.state.members[code])return;
        const m=snapshot.state.members[code],tier=vip.resolve(balance(code)).current;
        const main=$('.member-main',row);if(main&&!$('.vip-member-levels',main))main.insertAdjacentHTML('beforeend',`<div class="vip-member-levels">${positions.has(code)?`<span class="vip-position-badge" aria-label="อันดับ ${positions.get(code)}">#${positions.get(code)}</span>`:''}${vipBadge(tier)}</div>`);
      });
      if(activeView==='home') {
        const list=$('#view .main-column .member-list');
        if(list)list.closest('.section-card').outerHTML=vipLeaderboard();
      }
    }
    decorateVIPDialog();
  }
  // VIP_UI_END

  function toast(message, type = 'success') {
    const el = document.createElement('div'); el.className = `toast ${type}`;
    el.innerHTML = `${icon(type === 'error' ? 'info' : 'check')}<span>${esc(message)}</span>`;
    $('#toasts').appendChild(el); setTimeout(() => el.remove(), 5200);
  }
  function friendly(error) { return String(error?.message || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่').replace(/^Firebase:\s*/,''); }
  function download(filename, data, type = 'application/json;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([data], {type}));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function setView(view) {
    activeView = view; render(); window.scrollTo({top:0,behavior:'instant'}); $('#view')?.focus({preventScroll:true});
  }
  function navItems() {
    return isAdmin() ? [['home','home','ภาพรวม'],['members','users','สมาชิก'],['history','activity','รายการ'],['tools','tools','เครื่องมือ']] : [['home','home','ภาพรวม'],['history','activity','รายการ'],['insights','chart','สรุป'],['profile','user','บัญชี']];
  }
  function navMarkup() {
    return navItems().map(([view, name, title]) => `<button class="nav-item ${activeView === view ? 'active' : ''}" data-action="nav" data-view="${view}" ${activeView === view ? 'aria-current="page"' : ''}>${icon(name,'nav-icon')}<span>${title}</span></button>`).join('');
  }
  function render() {
    if (!session()) { renderLogin(); return; }
    const admin = isAdmin();
    app.innerHTML = `<div class="app-shell">
      <aside class="desktop-sidebar"><a class="brand-lockup" href="#" data-action="nav" data-view="home" aria-label="TaeBank หน้าหลัก">${brand()}</a><div class="sidebar-caption">${admin ? 'ADMIN WORKSPACE' : 'YOUR PERSONAL SPACE'}</div><nav aria-label="เมนูหลัก">${navMarkup()}</nav><div class="sidebar-footer"><div class="sidebar-note">${icon('shield')}<span>ทุกยอดเงิน<br><strong>ชัดเจนกว่าเดิม</strong></span></div><button class="button button-ghost button-wide" data-action="logout">${icon('logout')} ออกจากระบบ</button></div></aside>
      <div class="app-main"><header class="topbar"><a class="brand-lockup" href="#" data-action="nav" data-view="home" aria-label="TaeBank หน้าหลัก">${brand()}</a><span class="desktop-only eyebrow">${admin ? 'TAEBANK / ADMIN WORKSPACE' : 'TAEBANK / PERSONAL ACCOUNT'}</span><div class="topbar-actions"><span class="inline-status ${snapshot.connection === 'offline' ? 'offline' : ''}"><i></i><span>${snapshot.mode === 'demo' ? 'DEMO' : snapshot.connection === 'offline' ? 'ออฟไลน์' : snapshot.connection === 'loading' ? 'กำลังเชื่อมต่อ' : 'เชื่อมต่อแล้ว'}</span></span><button class="avatar" data-action="${admin ? 'about' : 'nav'}" ${admin ? '' : 'data-view="profile"'} aria-label="${admin ? 'ข้อมูลผู้ดูแลระบบ' : 'ข้อมูลบัญชี'}">${admin ? 'AD' : esc((ownMember()?.nick || 'T').slice(0,2))}</button></div></header>
      <main id="view" tabindex="-1">${renderView()}</main><footer class="app-footer">TaeBank <span>PRIVATE ACCOUNT · MADE FOR YOU</span></footer></div>
      <nav class="bottom-nav" aria-label="เมนูหลักบนมือถือ">${navMarkup()}</nav></div>`;
    decorateVIP();
  }
  function renderLogin() {
    const demo = snapshot.mode === 'demo', legacy = snapshot.mode === 'legacy';
    let accessForm;
    if (demo) accessForm = `<div class="demo-options"><button class="button button-primary button-wide" data-action="demo-member">เข้าสู่บัญชีตัวอย่าง ${icon('arrow')}</button><button class="button button-secondary button-wide" data-action="demo-admin">${icon('users')} ทดลองหน้าผู้ดูแล</button></div><div class="notice">${icon('info')}<p>ข้อมูลทั้งหมดเป็นข้อมูลจำลอง บันทึกเฉพาะในเบราว์เซอร์นี้</p></div>`;
    else if (legacy) accessForm = `<div class="segmented login-role-tabs"><button class="segment ${loginRole==='member'?'active':''}" data-action="login-role" data-role="member" aria-pressed="${loginRole==='member'}">สมาชิก</button><button class="segment ${loginRole==='admin'?'active':''}" data-action="login-role" data-role="admin" aria-pressed="${loginRole==='admin'}">ผู้ดูแล</button></div><form id="login-form" class="login-form form-stack">${loginRole==='member'?`<div class="field"><label for="login-account">เลขบัญชี / รหัสเดิม 6 หลัก</label><input id="login-account" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" placeholder="••••••" autocomplete="off" required><span class="field-hint">ใช้รหัสเดียวกับเว็บเดิม</span></div>`:`<div class="field"><label for="login-admin-pin">รหัสผู้ดูแลเดิม</label><input id="login-admin-pin" type="password" inputmode="numeric" maxlength="6" minlength="6" placeholder="รหัสผู้ดูแล 6 หลัก" autocomplete="off" required></div><div class="field"><label for="login-master-key">Master Key เดิม</label><input id="login-master-key" type="password" placeholder="Master Key ของผู้ดูแล" autocomplete="off" required></div>`}<p id="login-error" class="form-error" role="alert"></p><button class="button button-primary button-wide" type="submit">เข้าสู่ระบบ ${icon('arrow')}</button></form>`;
    else accessForm = `<form id="login-form" class="login-form form-stack"><div class="field"><label for="login-email">อีเมล</label><input id="login-email" name="email" type="email" placeholder="you@example.com" autocomplete="username" required></div><div class="field"><label for="login-password">รหัสผ่าน</label><input id="login-password" name="password" type="password" placeholder="รหัสผ่านของคุณ" autocomplete="current-password" required minlength="6"></div><p id="login-error" class="form-error" role="alert"></p><button class="button button-primary button-wide" type="submit">เข้าสู่ระบบ ${icon('arrow')}</button></form>`;
    app.innerHTML = `<main id="view" class="login-shell" tabindex="-1"><header class="login-top"><a class="brand-lockup login-brand" href="#" aria-label="TaeBank">${brand()}</a><span class="badge badge-gold">${demo?'รุ่นตัวอย่าง':legacy?'บัญชีเดิม · ดีไซน์ใหม่':'PRIVATE ACCOUNT'}</span></header><div class="login-content"><section class="login-story"><p class="login-kicker"><span></span> A LITTLE MORE CLARITY.</p><h1 class="login-title">ทุกยอดเงิน<br>ชัดเจน<span>กว่าเดิม.</span></h1><p class="login-subtitle">${legacy?'บัญชีเดิม ประวัติเดิม ในพื้นที่ใหม่ของคุณ<br>เชื่อมต่อข้อมูลเดิมโดยตรง ไม่ต้องนำเข้าใหม่':'พื้นที่เล็ก ๆ สำหรับความมั่นใจที่มากขึ้น<br>ดูยอดเงิน ติดตามรายการ และจัดการบัญชีในที่เดียว'}</p><div class="login-card-preview"><div class="balance-card login-sample-card"><div class="card-decoration"></div><div class="card-top"><span class="card-brand">taebank.</span><span class="card-badge">PRIVATE MEMBER</span></div><div><p class="card-amount-label">YOUR EVERYDAY CONFIDENCE</p><div class="balance-amount"><span class="balance-currency">฿</span>${demo?'128,450<span class="amount-decimal">.75</span>':'•••,•••<span class="amount-decimal">.••</span>'}</div></div><div class="card-bottom"><span class="account-number">${demo?'100 &nbsp; 001':'••• &nbsp; •••'}</span><span class="card-chip">${icon('sparkle')}</span></div></div><span class="floating-note">${icon('check')} ${legacy?'ข้อมูลเดิม พร้อมใช้งานในดีไซน์ใหม่':'ทุกการเคลื่อนไหว ดูได้ในมือคุณ'}</span></div></section><section class="login-panel" aria-labelledby="login-heading"><div class="login-panel-icon">${icon('lock')}</div><p class="eyebrow">WELCOME TO YOUR SPACE</p><h2 id="login-heading">ยินดีต้อนรับกลับ</h2><p class="login-panel-subtitle">${demo?'ลองสัมผัส TaeBank โฉมใหม่ได้ทันที':legacy?'เข้าสู่ระบบด้วยรหัสเดิมของคุณ':'เข้าสู่ระบบเพื่อดูบัญชีของคุณ'}</p>${accessForm}<div class="login-trust">${icon(legacy?'refresh':'shield')}<span>${demo?'ยังไม่เชื่อมต่อฐานข้อมูลจริง':legacy?(snapshot.dataReady?'เชื่อมต่อฐานข้อมูลเดิมแล้ว':snapshot.connection==='offline'?'ยังเชื่อมต่อฐานข้อมูลเดิมไม่ได้':'กำลังอ่านข้อมูลเดิม…'):'บัญชีของคุณ เข้าถึงได้ตามสิทธิ์ของคุณ'}</span></div>${legacy&&snapshot.warning?`<p class="form-error">${esc(snapshot.warning)}</p>`:''}</section></div><footer class="login-footer"><span>© ${new Date().getFullYear()} TaeBank</span><span>DESIGNED AROUND YOU.</span></footer></main>`;
  }
  function renderView() {
    if (!snapshot.state) return '<div class="loading-state" role="status">กำลังโหลดข้อมูลบัญชี…</div>';
    if (snapshot.mode !== 'demo' && (snapshot.connection === 'loading' || snapshot.dataReady === false)) return '<div class="loading-state" role="status">กำลังโหลดข้อมูลบัญชีให้ครบถ้วน…</div>';
    if (!isAdmin() && !ownMember()) return `<div class="empty-state">${icon('lock')}<h2>ยังไม่ได้เชื่อมบัญชีสมาชิก</h2><p>กรุณาให้ผู้ดูแลเชื่อมบัญชีกับอีเมลนี้ก่อนเริ่มใช้งาน</p><button class="button button-secondary" data-action="logout">ออกจากระบบ</button></div>`;
    if (activeView === 'history') return historyView();
    if (activeView === 'members' && isAdmin()) return membersView();
    if (activeView === 'tools' && isAdmin()) return toolsView();
    if (activeView === 'insights' && !isAdmin()) return insightsView();
    if (activeView === 'profile' && !isAdmin()) return profileView();
    return isAdmin() ? adminHome() : memberHome();
  }
  function heading(eyebrow, title, extra = '') {
    return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div>${extra ? `<div class="heading-actions">${extra}</div>` : ''}</div>`;
  }
  function demoBanner() { return snapshot.mode === 'demo' ? `<div class="demo-banner">${icon('info')}<span>พื้นที่ทดลอง · ข้อมูลจำลอง ไม่มีการเคลื่อนย้ายเงินจริง</span></div>` : ''; }
  function accountCard(m) {
    const amount = showBalance ? fmt(balance(m.code)) : '•••,•••';
    return `<div class="balance-card"><div class="card-decoration"></div><div class="card-top"><span class="card-brand">taebank.</span><span class="card-badge">PRIVATE ACCOUNT ${icon('sparkle')}</span></div><div class="card-balance"><div class="card-amount-label">ยอดเงินคงเหลือ <button class="balance-toggle" data-action="toggle-balance" aria-label="${showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'}" aria-pressed="${!showBalance}">${icon(showBalance ? 'eye' : 'eyeOff')}</button></div><div class="balance-amount ${showBalance ? '' : 'balance-hidden'}"><span class="balance-currency">฿</span>${esc(amount.split('.')[0])}${showBalance ? `<span class="amount-decimal">.${esc(amount.split('.')[1])}</span>` : ''}</div></div><div class="card-bottom"><div><p class="account-number">${esc(accountFmt(m.code))}<button class="copy-account" data-action="copy" data-code="${esc(m.code)}" aria-label="คัดลอกเลขบัญชี">${icon('copy')}</button></p><p class="card-owner">${esc(m.name || m.nick)}</p></div><span class="card-chip">${icon('mark')}</span></div></div><p class="balance-caption">${icon('shield')} บัญชีส่วนตัวของคุณ <span>THB · บาท</span></p>`;
  }
  function quick(action, name, label, extra = '') { return `<button class="quick-action" data-action="${action}" ${extra}><span class="quick-icon">${icon(name)}</span><span class="quick-label">${label}</span></button>`; }
  function memberHome() {
    const m = ownMember();
    return `${demoBanner()}${heading('YOUR MONEY, AT A GLANCE',`สวัสดี, ${esc(m.nick || 'สมาชิก')}<span class="greeting-dot">.</span>`,`<span class="today-label">${dateFmt(new Date(),{year:'numeric'})}</span>`)}<div class="dashboard-grid"><div class="main-column">${accountCard(m)}<div class="quick-actions">${quick('nav','activity','รายการทั้งหมด','data-view="history"')}${quick('statement','file','ใบแจ้งยอด',`data-code="${m.code}"`)}${quick('copy','copy','เลขบัญชี',`data-code="${m.code}"`)}${quick('nav','user','ข้อมูลบัญชี','data-view="profile"')}</div><section class="section-card"><div class="section-heading"><div><p class="eyebrow">THE LATEST MOVES</p><h2 class="section-title">รายการล่าสุด</h2></div><button class="text-btn" data-action="nav" data-view="history">ดูทั้งหมด ${icon('arrow')}</button></div><div class="transaction-list">${txRows(transactions(m.code).slice(0,5))}</div></section></div><div class="side-column">${insightCard(m.code)}<section class="membership-note"><div class="membership-emblem">${icon('sparkle')}</div><p class="eyebrow">A CLEARER PICTURE</p><h2>ความสบายใจ<br>เริ่มจากความชัดเจน</h2><p>ตรวจสอบยอดและรายการของคุณ<br>ได้ทุกครั้งที่ต้องการ</p><button class="text-btn" data-action="nav" data-view="insights">สำรวจสรุปบัญชี ${icon('arrow')}</button></section></div></div>`;
  }
  function txRows(txs, options = {}) {
    if (!txs.length) return `<div class="empty-state">${icon('activity')}<h3>ยังไม่มีรายการ</h3><p>${options.filtered ? 'ลองเปลี่ยนคำค้นหาหรือประเภทของรายการ' : 'เมื่อมีความเคลื่อนไหว รายการจะแสดงที่นี่'}</p></div>`;
    return txs.map(t => {
      const m = snapshot.state?.members?.[t.studentCode];
      const kind = t.isInterest ? 'interest' : t.type;
      return `<button class="transaction-row" data-action="tx-detail" data-id="${esc(t.id)}"><span class="transaction-icon ${kind}">${icon(t.reversalOf ? 'undo' : t.isInterest ? 'percent' : t.type === 'deposit' ? 'down' : 'up')}</span><span class="transaction-copy"><span class="transaction-title">${esc(options.admin ? `${m?.nick || t.studentCode} · ${txTitle(t)}` : txTitle(t))}</span><span class="transaction-meta">${esc(dateFmt(t.createdAt))} · ${esc(timeFmt(t.createdAt))}${t.reversalOf ? ' · กลับรายการ' : ''}</span></span><span class="transaction-amount ${t.type === 'deposit' ? 'positive' : 'negative'}">${esc(txAmount(t))}<span>บาท</span></span></button>`;
    }).join('');
  }
  function insightCard(code = null) {
    const txs = transactions(code), days = chartDays;
    const dates = Array.from({length:days},(_, i) => { const d = new Date(); d.setDate(d.getDate() - (days-1-i)); return d; });
    const buckets = dates.map(d => ({date:d,value:txs.filter(t=>t.type==='deposit' && dayKey(t.createdAt)===dayKey(d)).reduce((a,t)=>a+t.amountSatang,0)}));
    const groups = days === 30 ? Array.from({length:6},(_,i)=>({date:buckets[i*5].date,value:buckets.slice(i*5,i*5+5).reduce((a,d)=>a+d.value,0)})) : buckets;
    const max = Math.max(1,...groups.map(d=>d.value));
    const sum = buckets.reduce((a,d)=>a+d.value,0);
    return `<section class="section-card insight-card"><div class="section-heading"><div><p class="eyebrow">SMALL STEPS, BIG PICTURE</p><h2 class="section-title">ยอดฝากเข้า</h2></div><div class="segmented" aria-label="ช่วงเวลาสรุป"><button class="segment ${days === 7 ? 'active' : ''}" data-action="chart-range" data-days="7" aria-pressed="${days===7}">7 วัน</button><button class="segment ${days === 30 ? 'active' : ''}" data-action="chart-range" data-days="30" aria-pressed="${days===30}">30 วัน</button></div></div><div class="insight-value">${showBalance || isAdmin() ? `฿${fmt(sum)}` : '฿•••,•••'}</div><p class="insight-subtitle">รวมเงินฝากและดอกเบี้ยใน ${days} วันที่ผ่านมา</p><div class="spark-chart" role="img" aria-label="กราฟยอดฝากเข้า ${days} วัน รวม ${showBalance || isAdmin() ? fmt(sum) : 'ซ่อนยอด'} บาท">${groups.map((d,i)=>`<div class="spark-column"><div class="spark-bar ${i===groups.length-1?'highlight':''}" style="--bar-height:${Math.max(3,Math.round(d.value/max*100))}%" title="${esc(dateFmt(d.date))}: ${showBalance || isAdmin() ? fmt(d.value) : 'ซ่อนยอด'} บาท"></div></div>`).join('')}</div><div class="spark-labels">${groups.map(d=>`<span>${new Date(d.date).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric'})}</span>`).join('')}</div><div class="insight-footer"><span class="legend-dot"></span> วันที่ ${esc(dateFmt(dates[0]))} – ${esc(dateFmt(dates[days-1]))}</div></section>`;
  }
  function stat(label, value, name, note = '') { return `<div class="stat-card"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon">${icon(name)}</span></div><div class="stat-value">${value}</div>${note ? `<p class="stat-note">${note}</p>` : ''}</div>`; }
  function adminHome() {
    const today = dayKey(new Date()); const todays = transactions().filter(t => dayKey(t.createdAt) === today);
    const unprinted = transactions().filter(t => !t.printedAt).length;
    return `${demoBanner()}${heading('THE CONTROL ROOM','ภาพรวมบัญชี<span class="greeting-dot">.</span>',`<button class="button button-primary button-small" data-action="transact">${icon('plus')} ฝาก–ถอน</button>`)}<div class="stat-grid">${stat('ยอดเงินรวมทุกบัญชี',`<span class="currency">฿</span>${fmt(totalBalance())}`,'wallet','ยอดรวมทั้งหมด ไม่เปลี่ยนตามการค้นหา')}${stat('สมาชิกที่ใช้งาน',`${members().length}<span class="stat-unit">บัญชี</span>`,'users',`ทั้งหมด ${allMembers().length} บัญชี`)}${stat('รายการวันนี้',`${todays.length}<span class="stat-unit">รายการ</span>`,'activity',`${dateFmt(new Date())}`)}${stat('รอพิมพ์ลงสมุด',`${unprinted}<span class="stat-unit">รายการ</span>`,'book','ยืนยันสถานะหลังตรวจผลพิมพ์')}</div><div class="quick-actions admin-quick-actions">${quick('transact','wallet','ฝาก–ถอน')}${quick('member-add','plus','เพิ่มสมาชิก')}${quick('interest','percent','จ่ายดอกเบี้ย')}${quick('import','upload','นำเข้าข้อมูล')}</div><div class="dashboard-grid"><div class="main-column"><section class="section-card"><div class="section-heading"><div><p class="eyebrow">ALL THE LATEST</p><h2 class="section-title">ความเคลื่อนไหวล่าสุด</h2></div><button class="text-btn" data-action="nav" data-view="history">ดูทั้งหมด ${icon('arrow')}</button></div><div class="transaction-list">${txRows(transactions().slice(0,6),{admin:true})}</div></section><section class="section-card"><div class="section-heading"><div><p class="eyebrow">YOUR COMMUNITY</p><h2 class="section-title">สมาชิก</h2></div><button class="text-btn" data-action="nav" data-view="members">จัดการ ${icon('arrow')}</button></div><div class="member-list">${memberRows(members().slice(0,3),true)}</div></section></div><div class="side-column">${insightCard()}${distributionCard()}</div></div>`;
  }
  function distributionCard() {
    const sorted = members().map(m=>({...m,balance:balance(m.code)})).filter(m=>m.balance>0).sort((a,b)=>b.balance-a.balance);
    const total = sorted.reduce((a,m)=>a+m.balance,0);
    return `<section class="section-card"><div class="section-heading"><div><p class="eyebrow">WEALTH OVERVIEW</p><h2 class="section-title">สัดส่วนยอดเงิน</h2></div>${icon('chart')}</div><div class="section-body distribution-list">${sorted.length ? sorted.slice(0,5).map((m,i)=>`<div class="distribution-row"><div><span>${esc(m.nick || m.code)}</span><strong>${(m.balance/total*100).toFixed(1)}%</strong></div><div class="distribution-track"><span class="distribution-fill" style="width:${m.balance/total*100}%;opacity:${1-i*.13}"></span></div></div>`).join('') : '<p class="form-note">ยังไม่มียอดเงินในบัญชี</p>'}${sorted.length>5 ? `<p class="form-note">แสดง 5 บัญชีที่มียอดสูงสุด จาก ${sorted.length} บัญชี</p>` : ''}</div></section>`;
  }
  function memberRows(items, compactView = false) {
    if (!items.length) return '<div class="empty-state"><h3>ไม่พบสมาชิก</h3><p>ลองค้นหาด้วยชื่อหรือเลขบัญชีอื่น</p></div>';
    return items.map((m,i)=>`<div class="member-row"><span class="avatar member-avatar" aria-hidden="true">${esc((m.nick || m.name || '?').slice(0,2))}</span><div class="member-main"><p class="member-name">${esc(m.nick || m.name)} ${m.status==='archived' ? '<span class="badge badge-muted">ปิดบัญชี</span>' : ''}</p><p class="member-meta">${esc(accountFmt(m.code))}${!compactView ? ` · ${esc(m.name)}` : ''}</p><p class="member-balance">฿${fmt(balance(m.code))}</p></div><div class="member-actions"><button class="button button-secondary button-small" data-action="member-detail" data-code="${esc(m.code)}" aria-label="ดูบัญชี ${esc(m.nick || m.code)}">${compactView ? icon('chevron') : 'ดูบัญชี'}</button></div></div>`).join('');
  }
  function membersView() {
    return `${demoBanner()}${heading('YOUR COMMUNITY','สมาชิกทั้งหมด',`<button class="button button-primary button-small" data-action="member-add">${icon('plus')} เพิ่มสมาชิก</button>`)}<div class="toolbar"><div class="search-field">${icon('search')}<label class="sr-only" for="member-search">ค้นหาสมาชิก</label><input id="member-search" placeholder="ค้นหาชื่อ หรือเลขบัญชี" value="${esc(memberSearch)}" type="search" autocomplete="off"></div><span id="member-count" class="badge badge-muted">${members().length} บัญชีที่ใช้งาน</span></div><section class="section-card"><div class="section-heading"><h2 class="section-title">บัญชีสมาชิก</h2><span class="form-note">ยอดเงิน · บาท</span></div><div id="member-results" class="member-list">${memberRows(filteredMembers())}</div></section>`;
  }
  function filteredMembers() { const q = memberSearch.trim().toLocaleLowerCase(); return allMembers().filter(m=>[m.code,m.nick,m.name].some(s=>String(s||'').toLocaleLowerCase().includes(q))).sort((a,b)=>(a.status==='archived')-(b.status==='archived') || balance(b.code)-balance(a.code) || a.code.localeCompare(b.code)); }
  function historyView() {
    return `${demoBanner()}${heading('EVERY MOVE MATTERS','รายการเคลื่อนไหว',`<button class="button button-secondary button-small" data-action="statement" ${!isAdmin()?`data-code="${esc(session().accountCode)}"`:''}>${icon('download')} ใบแจ้งยอด</button>`)}<div class="toolbar"><div class="search-field">${icon('search')}<label class="sr-only" for="history-search">ค้นหารายการ</label><input id="history-search" type="search" placeholder="${isAdmin()?'ค้นหาชื่อ เลขบัญชี หรือบันทึก':'ค้นหาประเภทรายการหรือบันทึก'}" value="${esc(historySearch)}"></div></div><div class="history-controls"><div class="filter-chips" aria-label="ประเภทของรายการ">${[['all','ทั้งหมด'],['deposit','ฝากเข้า'],['withdraw','ถอนออก'],['interest','ดอกเบี้ย']].map(([v,title])=>`<button class="chip ${historyFilter===v?'active':''}" data-action="filter" data-filter="${v}" aria-pressed="${historyFilter===v}">${title}</button>`).join('')}</div><div class="field history-date"><label for="history-period" class="sr-only">ช่วงเวลา</label><select id="history-period"><option value="all">ทุกช่วงเวลา</option><option value="7">7 วันที่ผ่านมา</option><option value="30">30 วันที่ผ่านมา</option><option value="90">90 วันที่ผ่านมา</option></select></div></div><section class="section-card"><div class="section-heading"><h2 class="section-title">ประวัติทั้งหมด</h2><span id="history-count" class="badge badge-muted"></span></div><div id="history-results" class="transaction-list"></div></section>`;
  }
  function refreshHistory() {
    const container = $('#history-results'); if (!container) return;
    const period = Number($('#history-period')?.value) || 0, cutoff = Date.now() - period*86400000;
    const q = historySearch.trim().toLocaleLowerCase();
    const list = transactions(isAdmin()?null:session().accountCode).filter(t=> {
      const m = snapshot.state.members[t.studentCode];
      return (historyFilter==='all' || (historyFilter==='interest'?t.isInterest:t.type===historyFilter)) && (!period || Date.parse(t.createdAt)>=cutoff) && (!q || [t.note,t.studentCode,m?.nick,m?.name,txTitle(t)].some(s=>String(s||'').toLocaleLowerCase().includes(q)));
    });
    container.innerHTML = txRows(list,{admin:isAdmin(),filtered:true}); $('#history-count').textContent = `${list.length} รายการ`;
  }
  function insightsView() {
    const code = session().accountCode, txs = transactions(code);
    const deposits = txs.filter(t=>t.type==='deposit').reduce((a,t)=>a+t.amountSatang,0);
    const withdrawals = txs.filter(t=>t.type==='withdraw').reduce((a,t)=>a+t.amountSatang,0);
    const interest = txs.filter(t=>t.isInterest).reduce((a,t)=>a+t.amountSatang,0);
    const amount = n => showBalance ? `฿${fmt(n)}` : '฿•••,•••';
    return `${demoBanner()}${heading('A CLEARER PICTURE','สรุปบัญชีของคุณ',`<button class="icon-btn" data-action="toggle-balance" aria-label="${showBalance?'ซ่อนยอด':'แสดงยอด'}">${icon(showBalance?'eye':'eyeOff')}</button>`)}<div class="stat-grid">${stat('ยอดเงินคงเหลือ',amount(balance(code)),'wallet')}${stat('ฝากเข้าสะสม',amount(deposits),'down','รวมดอกเบี้ยและรายการกลับบัญชี')}${stat('ถอนออกสะสม',amount(withdrawals),'up')}${stat('ดอกเบี้ยที่ได้รับ',amount(interest),'percent')}</div><div class="dashboard-grid"><div class="main-column">${insightCard(code)}</div><div class="side-column"><section class="section-card"><div class="section-heading"><h2 class="section-title">ข้อมูลบัญชี</h2>${icon('book')}</div><div class="section-body review-grid"><div class="review-row"><span>รายการทั้งหมด</span><strong>${txs.length} รายการ</strong></div><div class="review-row"><span>เปิดบัญชีเมื่อ</span><strong>${dateFmt(ownMember().createdAt,{year:'numeric'})}</strong></div><div class="review-row"><span>รายการล่าสุด</span><strong>${txs[0]?dateFmt(txs[0].createdAt):'ยังไม่มี'}</strong></div><button class="button button-secondary button-wide" data-action="statement" data-code="${esc(code)}">${icon('file')} ดูใบแจ้งยอดทั้งหมด</button></div></section></div></div>`;
  }
  function profileView() {
    const m = ownMember();
    return `${demoBanner()}${heading('YOUR PRIVATE SPACE','บัญชีของฉัน')}<div class="dashboard-grid"><div class="main-column"><section class="section-card profile-card"><div class="profile-hero"><span class="avatar profile-avatar">${esc((m.nick||'T').slice(0,2))}</span><h2>${esc(m.nick)}</h2><p>${esc(m.name)}</p><span class="badge badge-gold">${m.status==='archived'?'ปิดบัญชี':'PRIVATE MEMBER'}</span></div><div class="profile-grid"><div class="profile-field"><span>เลขบัญชี</span><strong class="profile-value">${esc(accountFmt(m.code))}</strong></div><div class="profile-field"><span>ชื่อบัญชี</span><strong class="profile-value">${esc(m.name)}</strong></div><div class="profile-field"><span>สกุลเงิน</span><strong class="profile-value">THB · บาทไทย</strong></div><div class="profile-field"><span>วันที่เปิดบัญชี</span><strong class="profile-value">${dateFmt(m.createdAt,{year:'numeric'})}</strong></div></div></section></div><div class="side-column"><section class="section-card settings-list"><button class="settings-row" data-action="copy" data-code="${esc(m.code)}">${icon('copy')}<span>คัดลอกเลขบัญชี</span>${icon('chevron')}</button><button class="settings-row" data-action="statement" data-code="${esc(m.code)}">${icon('file')}<span>ใบแจ้งยอดบัญชี</span>${icon('chevron')}</button><button class="settings-row" data-action="privacy">${icon('shield')}<span>ข้อมูลและความเป็นส่วนตัว</span>${icon('chevron')}</button><button class="settings-row" data-action="logout">${icon('logout')}<span>ออกจากระบบ</span>${icon('chevron')}</button></section><div class="notice">${icon('info')}<p>หากชื่อหรือข้อมูลบัญชีไม่ถูกต้อง กรุณาติดต่อผู้ดูแลเพื่อแก้ไขข้อมูล</p></div></div></div>`;
  }
  function toolsView() {
    const runs = Object.values(snapshot.state.interestRuns || {});
    return `${demoBanner()}${heading('BUILT FOR YOUR WORKFLOW','เครื่องมือผู้ดูแล')}<div class="tool-grid">${tool('interest','percent','จ่ายดอกเบี้ย','ดูยอดก่อนยืนยัน และป้องกันจ่ายซ้ำในเดือนเดิม','จัดการดอกเบี้ย')}${tool('import','upload','นำเข้ารายชื่อ','รองรับ CSV พร้อมตรวจบัญชีซ้ำก่อนบันทึก','นำเข้า CSV')}${tool('export','download','สำรองข้อมูล','ดาวน์โหลดข้อมูลปัจจุบันเป็น JSON เก็บไว้ตรวจสอบ','ดาวน์โหลดข้อมูล')}${tool('report','chart','รายงานภาพรวม','พิมพ์รายงานยอดสมาชิกทั้งหมด หรือบันทึกเป็น PDF','เปิดรายงาน')}${tool('csv-template','file','แบบฟอร์มนำเข้า','ไฟล์ CSV ตัวอย่างพร้อมหัวคอลัมน์ภาษาไทย','ดาวน์โหลดแบบฟอร์ม')}${tool('about','shield','ข้อมูลระบบ',snapshot.mode==='demo'?'กำลังใช้ข้อมูลจำลองที่บันทึกในเบราว์เซอร์':snapshot.mode==='legacy'?'เชื่อมฐานข้อมูลเดิม และใช้วิธีเข้าสู่ระบบเดิม':'เชื่อมต่อ Firebase และกำหนดสิทธิ์ตามบัญชีผู้ใช้','ดูรายละเอียด')}</div><section class="section-card"><div class="section-heading"><h2 class="section-title">รอบจ่ายดอกเบี้ย</h2><span class="badge badge-muted">${runs.length} รอบ</span></div><div class="section-body">${runs.length?runs.map(r=>`<div class="review-row"><span>${esc(r.period || r.id || '-')}</span><strong>${r.inferred ? 'รายการเดิม · อ้างอิงวันที่บันทึก' : r.ratePercent == null ? 'รายการเดิม' : esc(r.ratePercent) + '%'} · ฿${fmt(r.totalInterestSatang ?? r.totalSatang ?? r.totalInterestPaidSatang ?? 0)}</strong></div>`).join(''):'<p class="form-note">ยังไม่มีรอบจ่ายดอกเบี้ย</p>'}</div></section>${snapshot.mode==='demo'?'<button class="button button-ghost demo-reset" data-action="reset-demo">ล้างข้อมูลทดลองและเริ่มใหม่</button>':''}`;
  }
  function tool(action, name, title, description, cta) { return `<section class="section-card tool-card"><div class="tool-icon">${icon(name)}</div><h2>${title}</h2><p>${description}</p><button class="text-btn" data-action="${action}">${cta} ${icon('arrow')}</button></section>`; }

  function openModal(title, body, footer = '', onReady) {
    closeModal();
    modal.innerHTML = `<div class="modal-header"><div><p class="eyebrow">TAEBANK / ${snapshot.mode === 'demo' ? 'DEMO SPACE' : 'PRIVATE SPACE'}</p><h2 class="modal-title" id="modal-title">${title}</h2></div><button class="icon-btn modal-close" data-action="modal-close" aria-label="ปิดหน้าต่าง">${icon('close')}</button></div><div class="modal-body">${body}<p id="modal-error" class="form-error" role="alert"></p></div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}`;
    modal.showModal(); document.body.classList.add('modal-open');
    if (onReady) onReady(modal);
    decorateVIPDialog();
  }
  function closeModal() { if (submitting) return; if (modalCleanup) { modalCleanup(); modalCleanup = null; } modal.close(); document.body.classList.remove('modal-open'); }
  function modalError(error) { const el = $('#modal-error'); if (el) el.textContent = friendly(error); else toast(friendly(error),'error'); }
  async function submitMutation(command, success = 'บันทึกเรียบร้อยแล้ว', after) {
    if (submitting) return;
    submitting = true;
    modal.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=true);
    const error = $('#modal-error'); if(error) error.textContent='';
    try { const result = await window.TaeService.mutate(command); submitting=false; closeModal(); toast(success); if(after) after(result); return result; }
    catch(e) { submitting=false; modal.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=false); modalError(e); }
  }
  function memberOptions(code = '') { return members().map(m=>`<option value="${esc(m.code)}" ${code===m.code?'selected':''}>${esc(m.nick)} · ${esc(accountFmt(m.code))}</option>`).join(''); }
  function transactModal(code = '', type = 'deposit') {
    if (!members().length) { toast('เพิ่มสมาชิกก่อนทำรายการ','error'); return; }
    const key = requestKey('transaction');
    openModal('บันทึกฝาก–ถอน',`<form id="transact-form" class="form-stack"><div class="segmented transact-segments"><button type="button" class="segment ${type==='deposit'?'active':''}" data-type="deposit">${icon('down')} ฝากเข้า</button><button type="button" class="segment ${type==='withdraw'?'active':''}" data-type="withdraw">${icon('up')} ถอนออก</button></div><div class="field"><label for="tx-account">บัญชีสมาชิก</label><select id="tx-account" required>${memberOptions(code)}</select><span id="tx-available" class="field-hint"></span></div><div class="field"><label for="tx-amount">จำนวนเงิน (บาท)</label><input class="amount-input" id="tx-amount" inputmode="decimal" placeholder="0.00" autocomplete="off" required></div><div class="field"><label for="tx-note">บันทึกเพิ่มเติม <span class="optional">ไม่บังคับ</span></label><input id="tx-note" maxlength="160" placeholder="เช่น เงินออมประจำสัปดาห์"></div><div class="notice">${icon('info')}<p>ตรวจชื่อบัญชีและจำนวนเงินก่อนยืนยัน ระบบจะเก็บประวัติของรายการนี้</p></div><button class="button button-primary button-wide" type="submit">ตรวจสอบรายการ ${icon('arrow')}</button></form>`, '', root => {
      const update = () => { $('#tx-available').textContent=`ยอดคงเหลือ ฿${fmt(balance($('#tx-account').value))}`; }; update();
      $('#tx-account').onchange=update;
      root.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type; root.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('active',x===b));});
      $('#transact-form').onsubmit = e => { e.preventDefault(); try {
        const amount = window.TaeCore.moneyToSatang($('#tx-amount').value); const chosen=$('#tx-account').value;
        if(type==='withdraw' && amount>(window.TaeCore.availableBalance?window.TaeCore.availableBalance(snapshot.state,chosen):balance(chosen))) throw new Error('ยอดเงินไม่เพียงพอสำหรับรายการถอนนี้');
        const command={action:'transact',idempotencyKey:key,code:chosen,type,amountSatang:amount,note:$('#tx-note').value.trim()};
        const m=snapshot.state.members[chosen];
        openModal('ตรวจสอบก่อนบันทึก',`<div class="review-amount ${type==='deposit'?'positive':'negative'}">${type==='deposit'?'+':'−'}฿${fmt(amount)}</div><p class="review-subtitle">${type==='deposit'?'ฝากเข้าบัญชี':'ถอนออกจากบัญชี'}</p><div class="review-grid"><div class="review-row"><span>ชื่อบัญชี</span><strong>${esc(m.nick)}</strong></div><div class="review-row"><span>เลขบัญชี</span><strong>${esc(accountFmt(chosen))}</strong></div><div class="review-row"><span>ยอดหลังทำรายการ</span><strong>฿${fmt(balance(chosen)+(type==='deposit'?amount:-amount))}</strong></div><div class="review-row"><span>บันทึก</span><strong>${esc(command.note || '—')}</strong></div></div>`,`<button class="button button-secondary" data-action="modal-close">ยกเลิก</button><button class="button button-primary" id="confirm-transaction">ยืนยันบันทึก ${icon('check')}</button>`,()=>$('#confirm-transaction').onclick=()=>submitMutation(command,'บันทึกรายการเรียบร้อยแล้ว'));
      }catch(error){modalError(error);} };
    });
  }
  function memberModal(code = '') {
    const m = snapshot.state.members[code]; const key=requestKey('member');
    openModal(m?'แก้ไขข้อมูลสมาชิก':'เพิ่มสมาชิกใหม่',`<form id="member-form" class="form-stack"><div class="field"><label for="member-code">เลขบัญชี 6 หลัก</label><input id="member-code" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" value="${esc(m?.code || '')}" placeholder="เช่น 100006" ${m?'readonly':''} required><span class="field-hint">ใช้ตัวเลข 6 หลัก และต้องไม่ซ้ำกับบัญชีเดิม</span></div><div class="field"><label for="member-nick">ชื่อที่แสดง</label><input id="member-nick" value="${esc(m?.nick || '')}" maxlength="40" placeholder="ชื่อเล่นหรือชื่อเรียก" required></div><div class="field"><label for="member-name">ชื่อ–นามสกุล</label><input id="member-name" value="${esc(m?.name || '')}" maxlength="120" placeholder="ชื่อเจ้าของบัญชี" required></div><button type="submit" class="button button-primary button-wide">${m?'บันทึกการแก้ไข':'สร้างบัญชีสมาชิก'} ${icon('check')}</button></form>`,'',()=>{
      $('#member-form').onsubmit=e=>{e.preventDefault(); const chosen=$('#member-code').value.trim(); if(!m && snapshot.state.members[chosen]){modalError(new Error('เลขบัญชีนี้มีอยู่แล้ว'));return;} submitMutation({action:'member.save',idempotencyKey:key,code:chosen,nick:$('#member-nick').value.trim(),name:$('#member-name').value.trim()},'บันทึกข้อมูลสมาชิกแล้ว');};
    });
  }
  function memberDetail(code) {
    const m=snapshot.state.members[code]; if(!m)return;
    openModal('บัญชีสมาชิก',`<div class="profile-hero compact-profile"><span class="avatar profile-avatar">${esc((m.nick||'T').slice(0,2))}</span><h3>${esc(m.nick)}</h3><p>${esc(m.name)}</p><span class="badge badge-muted">${esc(accountFmt(code))}</span><div class="review-amount">฿${fmt(balance(code))}</div></div><div class="detail-actions">${m.status!=='archived'?`<button class="button button-primary" data-action="transact" data-code="${code}">${icon('wallet')} ฝาก–ถอน</button><button class="button button-secondary" data-action="member-edit" data-code="${code}">${icon('edit')} แก้ไข</button>`:''}<button class="button button-secondary" data-action="passbook" data-code="${code}">${icon('book')} พิมพ์สมุด</button><button class="button button-secondary" data-action="statement" data-code="${code}">${icon('file')} ใบแจ้งยอด</button></div><h3 class="detail-heading">รายการล่าสุด</h3><div class="transaction-list detail-transactions">${txRows(transactions(code).slice(0,5))}</div>${m.status!=='archived'?`<button class="button button-ghost button-wide" data-action="archive" data-code="${code}">ปิดบัญชีสมาชิก</button>`:''}`);
  }
  function txDetail(id) {
    const t=snapshot.state.transactions[id]; if(!t)return;
    const m=snapshot.state.members[t.studentCode]; const reversed=Object.values(snapshot.state.transactions).some(x=>x.reversalOf===id);
    openModal('รายละเอียดรายการ',`<div class="transaction-detail-icon transaction-icon ${t.type}">${icon(t.reversalOf?'undo':t.type==='deposit'?'down':'up')}</div><div class="review-amount ${t.type==='deposit'?'positive':'negative'}">${esc(txAmount(t))}</div><p class="review-subtitle">${esc(txTitle(t))}</p><div class="review-grid"><div class="review-row"><span>บัญชี</span><strong>${esc(m?.nick || t.studentCode)} · ${esc(accountFmt(t.studentCode))}</strong></div><div class="review-row"><span>วัน–เวลา</span><strong>${esc(dateFmt(t.createdAt,{year:'numeric'}))} ${esc(timeFmt(t.createdAt))}</strong></div><div class="review-row"><span>บันทึก</span><strong>${esc(t.note || '—')}</strong></div><div class="review-row"><span>สถานะสมุดบัญชี</span><strong>${t.printedAt?'ยืนยันพิมพ์แล้ว':'ยังไม่ยืนยันพิมพ์'}</strong></div><div class="review-row"><span>เลขอ้างอิง</span><strong class="reference-id">${esc(id)}</strong></div>${reversed?'<div class="notice notice-warning">รายการนี้มีรายการกลับบัญชีแล้ว</div>':''}</div>`,isAdmin()&&!reversed&&!t.reversalOf?`<button class="button button-secondary button-wide" id="reverse-entry">${icon('undo')} แก้ไขด้วยรายการกลับบัญชี</button>`:'',()=>{
      if($('#reverse-entry')) $('#reverse-entry').onclick=()=>{
        const key=requestKey('reverse'); openModal('กลับรายการบัญชี',`<p class="form-note">ระบบจะสร้างรายการตรงข้าม ฿${fmt(t.amountSatang)} โดยเก็บรายการเดิมไว้ตรวจสอบ หากทำให้ยอดติดลบ ระบบจะไม่อนุญาต</p><form id="reverse-form" class="form-stack"><div class="field"><label for="reverse-reason">เหตุผล</label><textarea id="reverse-reason" required minlength="3" maxlength="160" placeholder="ระบุเหตุผลที่ต้องกลับรายการ"></textarea></div><button class="button button-danger button-wide" type="submit">ยืนยันกลับรายการ</button></form>`,'',()=>$('#reverse-form').onsubmit=e=>{e.preventDefault();submitMutation({action:'reverse',idempotencyKey:key,transactionId:id,reason:$('#reverse-reason').value.trim()},'สร้างรายการกลับบัญชีแล้ว');});
      };
    });
  }
  function interestModal() {
    const key=requestKey('interest');
    openModal('จ่ายดอกเบี้ยให้สมาชิก',`<form id="interest-form" class="form-stack"><div class="field"><label for="interest-period">รอบจ่ายดอกเบี้ย</label><input id="interest-period" type="month" value="${nowMonth()}" required><span class="field-hint">แต่ละเดือนจ่ายได้หนึ่งรอบ เพื่อป้องกันรายการซ้ำ</span></div><div class="field"><label for="interest-rate">อัตราที่จ่ายในรอบนี้ (%)</label><input id="interest-rate" inputmode="decimal" placeholder="เช่น 0.5" required><span class="field-hint">คำนวณจากยอดคงเหลือปัจจุบัน ไม่ใช่อัตรารายปี</span></div><button class="button button-primary button-wide" type="submit">คำนวณยอดก่อนจ่าย ${icon('arrow')}</button></form>`,'',()=>{
      $('#interest-form').onsubmit=e=>{e.preventDefault();try{
        const raw=$('#interest-rate').value.trim(); if(!/^\d+(?:\.\d{1,6})?$/.test(raw))throw new Error('กรอกอัตราเป็นตัวเลข ทศนิยมไม่เกิน 6 ตำแหน่ง');
        const rate=Number(raw),period=$('#interest-period').value; if(!(rate>0&&rate<=100))throw new Error('อัตราต้องมากกว่า 0 และไม่เกิน 100%');
        if(snapshot.state.interestRuns?.[period])throw new Error('เดือนนี้มีการจ่ายดอกเบี้ยแล้ว');
        const command={action:'interest',idempotencyKey:key,period,ratePercent:raw};
        let previewSequence=0;
        const preview=window.TaeCore.applyMutation(snapshot.state,command,{now:new Date().toISOString(),actor:'preview',idFactory:()=>`preview-${++previewSequence}`});
        const payouts=preview.result.transactionIds.map(id=>{const tx=preview.state.transactions[id];return {m:snapshot.state.members[tx.studentCode],amount:tx.amountSatang};});
        const total=preview.result.totalSatang;
        if(!payouts.length)throw new Error('ไม่มีบัญชีที่ได้รับดอกเบี้ยอย่างน้อย 0.01 บาท');
        openModal('ตรวจสอบรอบจ่ายดอกเบี้ย',`<div class="review-amount">฿${fmt(total)}</div><p class="review-subtitle">${payouts.length} บัญชี · รอบ ${esc(period)} · อัตรา ${esc(raw)}%</p><div class="preview-table-wrap"><table class="preview-table"><thead><tr><th>สมาชิก</th><th>ดอกเบี้ย (บาท)</th></tr></thead><tbody>${payouts.map(x=>`<tr><td>${esc(x.m.nick)}</td><td>${fmt(x.amount)}</td></tr>`).join('')}</tbody></table></div><div class="notice notice-warning">${icon('info')}<p>ยอดนี้คำนวณจากข้อมูลปัจจุบัน หากยอดบัญชีเปลี่ยนก่อนยืนยัน ระบบจะคำนวณจากยอดล่าสุดอีกครั้ง</p></div>`,`<button class="button button-secondary" data-action="modal-close">ยกเลิก</button><button class="button button-primary" id="interest-confirm">ยืนยันจ่ายดอกเบี้ย</button>`,()=>$('#interest-confirm').onclick=()=>submitMutation({action:'interest',idempotencyKey:key,period,ratePercent:raw},'จ่ายดอกเบี้ยรอบนี้เรียบร้อยแล้ว'));
      }catch(error){modalError(error);}};
    });
  }
  function parseCSV(text) {
    text=text.replace(/^\uFEFF/,''); const rows=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++) { const c=text[i]; if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;} else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c; }
    if(quoted)throw new Error('รูปแบบ CSV ไม่ถูกต้อง มีเครื่องหมายคำพูดที่ไม่ปิด');
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);if(rows.length<2)throw new Error('ไม่พบแถวข้อมูลในไฟล์');
    const headers=rows.shift().map(x=>x.trim()); const find=names=>headers.findIndex(h=>names.includes(h));
    const ci=find(['เลขที่บัญชี','เลขบัญชี','code']),ni=find(['ชื่อที่แสดง','ชื่อเล่น','nick','นมัสการ สามเณร..']),fi=find(['ชื่อจริง','ชื่อ–นามสกุล','ชื่อ-นามสกุล','name']),bi=find(['ยอดคงเหลือ','balance']);
    if(ci<0||fi<0||bi<0)throw new Error('ต้องมีคอลัมน์ เลขที่บัญชี, ชื่อจริง และยอดคงเหลือ');
    const seen=new Set(); return rows.map((r,i)=>{const code=String(r[ci]||'').trim(),name=String(r[fi]||'').trim(),nick=String(r[ni]||name).trim(),raw=String(r[bi]||'0').trim();if(!/^\d{6}$/.test(code))throw new Error(`แถว ${i+2}: เลขบัญชีต้องเป็นตัวเลข 6 หลัก`);if(seen.has(code)||snapshot.state.members[code])throw new Error(`แถว ${i+2}: บัญชี ${code} ซ้ำหรือมีอยู่แล้ว`);seen.add(code);if(!name)throw new Error(`แถว ${i+2}: กรุณาระบุชื่อจริง`);const amount=/^0(?:\.0{1,2})?$/.test(raw)?0:window.TaeCore.moneyToSatang(raw);return {code,nick,name,balanceSatang:amount};});
  }
  async function fingerprint(text) {
    if(globalThis.crypto?.subtle) { const bytes=new TextEncoder().encode(text); const digest=await crypto.subtle.digest('SHA-256',bytes); return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
    let hash=2166136261;for(const ch of text){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}return `csv-${(hash>>>0).toString(16)}-${text.length}`;
  }
  function importModal() {
    openModal('นำเข้าบัญชีจาก CSV',`<div class="notice">${icon('info')}<p>ใช้สำหรับเปิดบัญชีใหม่เท่านั้น บัญชีที่มีอยู่แล้วจะไม่ถูกเขียนทับหรือเพิ่มยอดซ้ำ</p></div><div class="field"><label for="csv-file">เลือกไฟล์ CSV (UTF-8)</label><input id="csv-file" type="file" accept=".csv,text/csv"><span class="field-hint">ขนาดไม่เกิน 1 MB และไม่เกิน 300 บัญชีต่อครั้ง</span></div><button class="text-btn" data-action="csv-template">ดาวน์โหลดแบบฟอร์ม ${icon('download')}</button><div id="import-preview"></div>`, '',()=>{
      $('#csv-file').onchange=async e=>{try{
        const file=e.target.files[0];if(!file)return;if(file.size>1024*1024)throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 1 MB');
        const text=await file.text(),rows=parseCSV(text);if(rows.length>300)throw new Error('นำเข้าได้ไม่เกิน 300 บัญชีต่อครั้ง');const batchId=await fingerprint(JSON.stringify(rows)),key=requestKey('import');
        $('#modal-error').textContent='';
        $('#import-preview').innerHTML=`<div class="import-summary"><strong>${rows.length} บัญชี</strong><span>ยอดเปิดรวม ฿${fmt(rows.reduce((a,r)=>a+r.balanceSatang,0))}</span></div><div class="preview-table-wrap"><table class="preview-table"><thead><tr><th>บัญชี / ชื่อ</th><th>ยอดเปิด (บาท)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.code)}<br>${esc(r.nick)}</td><td>${fmt(r.balanceSatang)}</td></tr>`).join('')}</tbody></table></div><button id="confirm-import" class="button button-primary button-wide">ยืนยันนำเข้า ${rows.length} บัญชี</button>`;
        $('#confirm-import').onclick=()=>submitMutation({action:'import',idempotencyKey:key,batchId,rows},'นำเข้าข้อมูลเรียบร้อยแล้ว');
      }catch(error){$('#import-preview').innerHTML='';modalError(error);}};
    });
  }
  function archiveModal(code) {
    const m=snapshot.state.members[code];if(!m)return;
    if(balance(code)!==0){toast('ปิดบัญชีได้เมื่อยอดเงินเป็น 0.00 บาทเท่านั้น','error');return;}
    const key=requestKey('archive');openModal('ปิดบัญชีสมาชิก',`<p>ยืนยันปิดบัญชี <strong>${esc(m.nick)} · ${esc(accountFmt(code))}</strong></p><div class="notice">${icon('info')}<p>ประวัติรายการจะถูกเก็บไว้ตรวจสอบ บัญชีที่ปิดแล้วจะไม่สามารถฝาก–ถอนได้</p></div>`,`<button class="button button-secondary" data-action="modal-close">ยกเลิก</button><button class="button button-danger" id="confirm-archive">ยืนยันปิดบัญชี</button>`,()=>$('#confirm-archive').onclick=()=>submitMutation({action:'member.archive',idempotencyKey:key,code},'ปิดบัญชีเรียบร้อยแล้ว'));
  }

  function printDocument(title, content) {
    const win=window.open('','_blank'); if(!win){toast('เบราว์เซอร์ปิดกั้นหน้าต่างพิมพ์ กรุณาอนุญาตแล้วลองอีกครั้ง','error');return false;}
    win.document.open();win.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:"Noto Sans Thai",Tahoma,sans-serif;color:#17201b;margin:32px;font-size:13px}h1{font-size:30px;letter-spacing:-1px;margin:0 0 6px}h2{font-size:18px}.muted{color:#66736a}.header{display:flex;justify-content:space-between;border-bottom:2px solid #17201b;padding-bottom:20px;margin-bottom:20px;gap:20px}.right{text-align:right}table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}th{background:#eef0e9;text-align:left}th,td{padding:10px 8px;border-bottom:1px solid #dde1d8}td.amount,th.amount{text-align:right}tfoot{font-weight:bold}.footer{margin-top:28px;font-size:11px;color:#66736a}.print-button{background:#17201b;color:white;padding:12px 20px;border:0;border-radius:8px;cursor:pointer;margin-bottom:22px}.demo{padding:10px;background:#fff3d4;margin-bottom:18px}.passbook td{height:25px;padding:3px 8px}.passbook .blank td{color:transparent}@media print{@page{size:A4;margin:14mm}body{margin:0}.print-button{display:none}thead{display:table-header-group}tr{break-inside:avoid}a{color:inherit}}</style></head><body><button class="print-button" onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>${snapshot.mode==='demo'?'<div class="demo">เอกสารตัวอย่าง · ข้อมูลจำลอง ไม่ใช่หลักฐานการรับฝากเงินจริง</div>':''}${content}<p class="footer">จัดทำโดย TaeBank · ${esc(new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}))}<br>เอกสารนี้แสดงข้อมูล ณ เวลาที่จัดทำ</p></body></html>`);win.document.close();return true;
  }
  function statement(code) {
    if(!code&&isAdmin()){
      openModal('เลือกบัญชีสำหรับใบแจ้งยอด',`<div class="field"><label for="statement-account">บัญชีสมาชิก</label><select id="statement-account">${memberOptions()}</select></div>`,`<button class="button button-primary button-wide" id="open-statement">${icon('file')} เปิดใบแจ้งยอด</button>`,()=>$('#open-statement').onclick=()=>statement($('#statement-account').value));return;
    }
    const m=snapshot.state.members[code];if(!m)return;
    const sorted=transactions(code).slice().reverse();let running=0;
    const rows=sorted.map(t=>{running=t.legacyRunningBalanceSatang??(running+(t.type==='deposit'?t.amountSatang:-t.amountSatang));return `<tr><td>${esc(dateFmt(t.createdAt,{year:'numeric'}))}<br><small>${esc(timeFmt(t.createdAt))}</small></td><td>${esc(txTitle(t))}<br><small class="muted">${esc(t.note||'')}</small></td><td class="amount">${t.type==='deposit'?fmt(t.amountSatang):'—'}</td><td class="amount">${t.type==='withdraw'?fmt(t.amountSatang):'—'}</td><td class="amount">${fmt(running)}</td></tr>`;}).join('');
    printDocument(`ใบแจ้งยอด ${code}`,`<div class="header"><div><h1>taebank.</h1><span class="muted">STATEMENT OF ACCOUNT</span></div><div class="right"><strong>${esc(m.name)}</strong><br>เลขบัญชี ${esc(accountFmt(code))}<br>สกุลเงิน THB</div></div><h2>ใบแจ้งยอดบัญชี · ประวัติทั้งหมด</h2><table><thead><tr><th>วัน–เวลา</th><th>รายการ</th><th class="amount">ฝาก (บาท)</th><th class="amount">ถอน (บาท)</th><th class="amount">คงเหลือ (บาท)</th></tr></thead><tbody>${rows || '<tr><td colspan="5">ยังไม่มีรายการ</td></tr>'}</tbody><tfoot><tr><td colspan="4">ยอดเงินคงเหลือ</td><td class="amount">${fmt(running)}</td></tr></tfoot></table>`);
  }
  function report() {
    const rows=allMembers().map(m=>`<tr><td>${esc(accountFmt(m.code))}</td><td>${esc(m.nick)}</td><td>${esc(m.name)}</td><td>${m.status==='archived'?'ปิดบัญชี':'ใช้งาน'}</td><td class="amount">${fmt(balance(m.code))}</td></tr>`).join('');
    printDocument('รายงานภาพรวม TaeBank',`<div class="header"><div><h1>taebank.</h1><span class="muted">ACCOUNT OVERVIEW</span></div><div class="right">${dateFmt(new Date(),{year:'numeric'})}<br>${members().length} บัญชีที่ใช้งาน</div></div><h2>สรุปยอดเงินสมาชิกทั้งหมด</h2><table><thead><tr><th>เลขบัญชี</th><th>ชื่อที่แสดง</th><th>ชื่อบัญชี</th><th>สถานะ</th><th class="amount">ยอดคงเหลือ (บาท)</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4">ยอดเงินรวม</td><td class="amount">${fmt(totalBalance())}</td></tr></tfoot></table>`);
  }
  function passbookModal(code) {
    const m=snapshot.state.members[code];if(!m)return;
    const page=m.pbPage||1,line=m.pbLine||1;
    const pending=transactions(code).filter(t=>!t.printedAt).slice().reverse();const batch=pending.slice(0,25-line);
    openModal('ศูนย์พิมพ์สมุดบัญชี',`<div class="review-grid"><div class="review-row"><span>บัญชี</span><strong>${esc(m.nick)} · ${esc(accountFmt(code))}</strong></div><div class="review-row"><span>ตำแหน่งพิมพ์ถัดไป</span><strong>หน้า ${page} บรรทัด ${line}</strong></div><div class="review-row"><span>รายการรอพิมพ์</span><strong>${pending.length} รายการ</strong></div><div class="review-row"><span>รอบนี้พิมพ์ได้</span><strong>${batch.length} รายการ</strong></div></div><div class="notice notice-warning">${icon('info')}<p>หลังพิมพ์ กรุณาตรวจสมุดแล้วกด “ยืนยันพิมพ์สำเร็จ” ระบบจึงจะเลื่อนตำแหน่งและบันทึกสถานะ</p></div>${batch.length?'':'<p class="form-note">ไม่มีรายการใหม่รอพิมพ์</p>'}`,batch.length?`<button class="button button-primary button-wide" id="prepare-passbook">${icon('print')} เปิดหน้าพิมพ์สมุด</button>`:'',()=>{
      if(!batch.length)return;
      $('#prepare-passbook').onclick=()=>{
        const chronological=transactions(code).slice().reverse();const runningById=new Map();let running=0;chronological.forEach(t=>{running=t.legacyRunningBalanceSatang??(running+(t.type==='deposit'?t.amountSatang:-t.amountSatang));runningById.set(t.id,running);});
        const blanks=Array.from({length:line-1},()=>'<tr class="blank"><td colspan="5">.</td></tr>').join('');
        const rows=batch.map(t=>`<tr><td>${esc(dateFmt(t.createdAt))}</td><td>${t.isInterest?'INT':t.reversalOf?'REV':t.type==='deposit'?'DEP':'WTD'}</td><td class="amount">${t.type==='withdraw'?fmt(t.amountSatang):''}</td><td class="amount">${t.type==='deposit'?fmt(t.amountSatang):''}</td><td class="amount">${fmt(runningById.get(t.id))}</td></tr>`).join('');
        if(!printDocument(`สมุดบัญชี ${code} หน้า ${page}`,`<div class="header"><div><h1>taebank.</h1><p>สมุดบัญชี · หน้า ${page}</p></div><div class="right">${esc(m.name)}<br>${esc(accountFmt(code))}</div></div><table class="passbook"><thead><tr><th>วันที่</th><th>รหัส</th><th class="amount">ถอน</th><th class="amount">ฝาก</th><th class="amount">คงเหลือ</th></tr></thead><tbody>${blanks}${rows}</tbody></table>`))return;
        const key=requestKey('print');
        openModal('ตรวจผลพิมพ์ก่อนยืนยัน',`<div class="review-grid"><div class="review-row"><span>บัญชี</span><strong>${esc(m.nick)}</strong></div><div class="review-row"><span>ตำแหน่ง</span><strong>หน้า ${page} บรรทัด ${line}–${line+batch.length-1}</strong></div><div class="review-row"><span>จำนวน</span><strong>${batch.length} รายการ</strong></div></div><div class="notice notice-warning">${icon('info')}<p>กดยืนยันเมื่อเห็นรายการในสมุดครบและถูกต้องแล้วเท่านั้น หากยกเลิกหน้าต่างพิมพ์ ให้เลือก “ยังไม่สำเร็จ”</p></div>`,`<button class="button button-secondary" data-action="modal-close">ยังไม่สำเร็จ</button><button class="button button-primary" id="confirm-print">ยืนยันพิมพ์สำเร็จ</button>`,()=>$('#confirm-print').onclick=()=>submitMutation({action:'print.confirm',idempotencyKey:key,code,transactionIds:batch.map(t=>t.id),page,line},'ยืนยันผลพิมพ์และอัปเดตตำแหน่งสมุดแล้ว'));
      };
    });
  }
  async function copyAccount(code) { try {if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);toast('คัดลอกเลขบัญชีแล้ว');}else{openModal('เลขบัญชี',`<div class="field"><label for="copy-number">เลือกและคัดลอกเลขบัญชีนี้</label><input id="copy-number" value="${esc(code)}" readonly></div>`,'',()=>$('#copy-number').select());}}catch{openModal('เลขบัญชี',`<div class="field"><label for="copy-number">เลือกและคัดลอกเลขบัญชีนี้</label><input id="copy-number" value="${esc(code)}" readonly></div>`,'',()=>$('#copy-number').select());} }

  document.addEventListener('click', async e => {
    const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();if(submitting)return;
    const action=b.dataset.action,code=b.dataset.code;
    try{
      if(action==='nav'){closeModal();setView(b.dataset.view);refreshHistory();}
      else if(action==='vip-ladder')openVIPLadder(code||session()?.accountCode);
      else if(action==='login-role'){loginRole=b.dataset.role;renderLogin();}
      else if(action==='demo-member'||action==='demo-admin'){b.disabled=true;await window.TaeService.signIn({demoRole:action==='demo-admin'?'admin':'member'});setView('home');}
      else if(action==='logout'){closeModal();activeView='home';await window.TaeService.signOut();toast('ออกจากระบบแล้ว');}
      else if(action==='toggle-balance'){showBalance=!showBalance;render();refreshHistory();}
      else if(action==='copy')await copyAccount(code||session().accountCode);
      else if(action==='modal-close')closeModal();
      else if(action==='chart-range'){chartDays=Number(b.dataset.days);render();}
      else if(action==='filter'){historyFilter=b.dataset.filter;const period=$('#history-period')?.value;render();if(period&&$('#history-period'))$('#history-period').value=period;refreshHistory();}
      else if(action==='tx-detail')txDetail(b.dataset.id);
      else if(action==='transact'&&isAdmin())transactModal(code);
      else if(action==='member-add'&&isAdmin())memberModal();
      else if(action==='member-edit'&&isAdmin())memberModal(code);
      else if(action==='member-detail'&&isAdmin())memberDetail(code);
      else if(action==='interest'&&isAdmin())interestModal();
      else if(action==='import'&&isAdmin())importModal();
      else if(action==='archive'&&isAdmin())archiveModal(code);
      else if(action==='passbook'&&isAdmin())passbookModal(code);
      else if(action==='statement')statement(code||(!isAdmin()?session().accountCode:''));
      else if(action==='report'&&isAdmin())report();
      else if(action==='export'&&isAdmin()){download(`TaeBank-backup-${dayKey(new Date())}.json`,window.TaeService.exportData());toast('ดาวน์โหลดข้อมูลสำรองแล้ว');}
      else if(action==='csv-template'&&isAdmin())download('TaeBank-import-template.csv','\uFEFFเลขที่บัญชี,ชื่อที่แสดง,ชื่อจริง,ยอดคงเหลือ\r\n100006,สมาชิกใหม่,ชื่อ นามสกุล,1000.00\r\n','text/csv;charset=utf-8');
      else if(action==='reset-demo'&&isAdmin()&&snapshot.mode==='demo')openModal('เริ่มข้อมูลทดลองใหม่',`<p>รายการที่คุณทดลองในเบราว์เซอร์นี้จะถูกแทนที่ด้วยข้อมูลตัวอย่างตั้งต้น</p>`,`<button class="button button-secondary" data-action="modal-close">ยกเลิก</button><button class="button button-danger" id="reset-confirm">เริ่มใหม่</button>`,()=>$('#reset-confirm').onclick=async()=>{await window.TaeService.resetDemo();closeModal();toast('คืนข้อมูลตัวอย่างแล้ว');});
      else if(action==='privacy')openModal('ข้อมูลและความเป็นส่วนตัว',`<div class="form-stack"><p>${snapshot.mode==='legacy'?'เว็บนี้ใช้ฐานข้อมูลและวิธีเข้าสู่ระบบเดิม โดยแสดงข้อมูลตามบัญชีที่เลือก สิทธิ์ฐานข้อมูลยังเป็นการตั้งค่าของระบบเดิม':'บัญชีสมาชิกเข้าถึงข้อมูลของตนเอง ส่วนผู้ดูแลจัดการข้อมูลตามสิทธิ์ที่ได้รับ'}</p><p>${snapshot.mode==='demo'?'โหมดนี้เก็บข้อมูลจำลองไว้ในเบราว์เซอร์ ไม่ได้ส่งไปฐานข้อมูลธนาคารจริง คุณล้างข้อมูลได้จากหน้าผู้ดูแล › เครื่องมือ':'ข้อมูลบัญชีเชื่อมต่อกับ Firebase ของผู้ดูแลระบบ หากต้องการแก้ไขข้อมูลส่วนตัว กรุณาติดต่อผู้ดูแล'}</p><p>ควรออกจากระบบทุกครั้งเมื่อใช้เครื่องร่วมกับผู้อื่น</p></div>`);
      else if(action==='about')openModal('TaeBank Mobile',`<div class="profile-hero"><div class="brand-lockup">${brand()}</div><p>ทุกยอดเงิน ชัดเจนกว่าเดิม</p><span class="badge badge-gold">${snapshot.mode==='demo'?'DEMO / ข้อมูลจำลอง':'FIREBASE / เชื่อมต่อระบบจริง'}</span></div><div class="review-grid"><div class="review-row"><span>สิทธิ์ผู้ใช้</span><strong>${isAdmin()?'ผู้ดูแลระบบ':'สมาชิก'}</strong></div><div class="review-row"><span>การจัดเก็บเงิน</span><strong>${snapshot.mode==='legacy'?'รูปแบบข้อมูลเดิม':'จำนวนเต็มหน่วยสตางค์'}</strong></div><div class="review-row"><span>การแก้รายการ</span><strong>เก็บประวัติด้วยรายการกลับบัญชี</strong></div></div>`);
    }catch(error){toast(friendly(error),'error');b.disabled=false;}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='member-search'){memberSearch=e.target.value;$('#member-results').innerHTML=memberRows(filteredMembers());$('#member-count').textContent=`พบ ${filteredMembers().length} บัญชี`;decorateVIP();}
    if(e.target.id==='history-search'){historySearch=e.target.value;refreshHistory();}
  });
  document.addEventListener('change',e=>{if(e.target.id==='history-period')refreshHistory();});
  document.addEventListener('submit',async e=>{
    if(e.target.id!=='login-form')return;e.preventDefault();const button=$('button[type="submit"]',e.target);button.disabled=true;$('#login-error').textContent='';
    try{const credentials=snapshot.mode==='legacy'?(loginRole==='member'?{accountCode:$('#login-account').value.trim()}:{adminPin:$('#login-admin-pin').value,adminMasterKey:$('#login-master-key').value}):{email:$('#login-email').value.trim(),password:$('#login-password').value};await window.TaeService.signIn(credentials);activeView='home';render();}catch(error){$('#login-error').textContent=friendly(error);button.disabled=false;}
  });
  modal.addEventListener('cancel',e=>{if(submitting)e.preventDefault();else document.body.classList.remove('modal-open');});
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  async function init() {
    try{
      const status=await window.TaeService.init();snapshot.mode=status.mode;
      window.TaeService.subscribe(next=>{const oldSession=snapshot.session?.uid;snapshot=next;if(!next.session&&oldSession)activeView='home';render();refreshHistory();if(next.warning&&next.warning!==latestWarning){latestWarning=next.warning;toast(next.warning,'error');}});
      snapshot=window.TaeService.getSnapshot();render();refreshHistory();
    }catch(error){app.innerHTML=`<main class="login-shell"><div class="empty-state">${icon('info')}<h1>ยังเปิดระบบไม่ได้</h1><p>${esc(friendly(error))}</p><p>ตรวจสอบการตั้งค่า หรือเปลี่ยนเป็นโหมดตัวอย่างใน firebase-config.js</p></div></main>`;}
  }
  init();
})();
