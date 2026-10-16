CSS = r"""
:root{
  --bg:#0D1B2A; --bg2:#0a1622; --card:#1A2A3A; --card2:#203347; --line:rgba(255,255,255,.09);
  --gold:#C8A84B; --gold2:#e2c776; --text:#E7EDF4; --muted:#9DB0C4; --dim:#6f849a;
  --far:#F28C38; --content:#4DA3FF; --home:#7D8FA3; --dell:#B48CFF; --local:#3CC8A0; --audio:#5FD08A;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:128px}
body{margin:0;background:var(--bg);color:var(--text);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%}
a{color:var(--gold2)}
.sr{position:fixed;top:0;left:0;opacity:0;width:1px;height:1px;pointer-events:none;margin:0}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
section{padding:84px 0;border-top:1px solid var(--line)}
.eyebrow{color:var(--gold);font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:0 0 10px}
h1,h2,h3,h4{margin:0;line-height:1.15;font-weight:700;letter-spacing:-.01em}
h1{font-size:clamp(34px,5.4vw,60px)}
h2{font-size:clamp(28px,3.6vw,40px);margin-bottom:14px}
h3{font-size:20px;margin-bottom:8px}
h4{font-size:15px;margin-bottom:6px}
.lede{font-size:18px;color:var(--muted);max-width:760px;margin:0 0 34px}
.divider{width:56px;height:3px;background:var(--gold);border-radius:2px;margin:18px 0 22px}
.muted{color:var(--muted)} .small{font-size:13px} .tiny{font-size:12px;color:var(--dim)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px}
.grid{display:grid;gap:18px}
.grid>*,.sim>*,.ctlgrid>*{min-width:0}
.g2{grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}

/* ---------- nav ---------- */
.site-nav{position:sticky;top:0;z-index:50;background:rgba(13,27,42,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.site-nav .wrap{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.nav-logos{display:flex;align-items:center;gap:14px;line-height:0}
.nav-logos img{display:block}
.nav-logos .mason{height:34px;width:auto}
.nav-logos .cust{height:42px;width:auto}
.nav-logos .cdw{height:32px;width:auto}
.nav-logos .vr{width:1px;height:30px;background:rgba(255,255,255,.25)}
.nav-links{display:flex;gap:22px;align-items:center}
.nav-links a{color:var(--text);text-decoration:none;font-size:14px;opacity:.85}
.nav-links a:hover{color:var(--gold2);opacity:1}
.burger{display:none;cursor:pointer;padding:8px;border:1px solid var(--line);border-radius:8px;line-height:0}
.burger span{display:block;width:20px;height:2px;background:var(--text);margin:4px 0}
@media (max-width:900px){
  .burger{display:block}
  .nav-links{display:none;position:absolute;top:68px;left:0;right:0;flex-direction:column;align-items:flex-start;gap:0;background:var(--bg2);border-bottom:1px solid var(--line);padding:8px 24px 16px}
  .nav-links a{padding:10px 0;width:100%;border-bottom:1px solid var(--line)}
  #nav-t:checked ~ .page .nav-links{display:flex}
}

/* ---------- option bar (sticky) ---------- */
.optbar{position:sticky;top:68px;z-index:40;background:rgba(10,22,34,.97);border-bottom:1px solid var(--line)}
.optbar .wrap{display:flex;align-items:center;gap:14px;min-height:56px;flex-wrap:wrap;padding-top:8px;padding-bottom:8px}
.optbar .lab{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700}
.pills{display:flex;gap:8px;flex-wrap:wrap}
.pill{cursor:pointer;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:7px 16px;font-size:14px;font-weight:600;color:var(--text);background:transparent;transition:.15s;user-select:none;white-space:nowrap}
.pill small{font-weight:500;color:var(--muted);margin-left:6px}
.pill:hover{border-color:var(--gold)}
#o-good:checked ~ .page label.pill[for=o-good],
#o-better:checked ~ .page label.pill[for=o-better],
#o-best:checked ~ .page label.pill[for=o-best]{background:var(--gold);border-color:var(--gold);color:#0D1B2A}
#o-good:checked ~ .page label.pill[for=o-good] small,
#o-better:checked ~ .page label.pill[for=o-better] small,
#o-best:checked ~ .page label.pill[for=o-best] small{color:#2a2410}
#o-good:focus-visible ~ .page label[for=o-good],
#o-better:focus-visible ~ .page label[for=o-better],
#o-best:focus-visible ~ .page label[for=o-best],
#m-call:focus-visible ~ .page label[for=m-call],
#m-share:focus-visible ~ .page label[for=m-share],
#m-local:focus-visible ~ .page label[for=m-local],
#m-touch:focus-visible ~ .page label[for=m-touch]{outline:2px solid var(--gold2);outline-offset:2px}

/* option / mode visibility: hide whatever does not match the checked radio */
#o-good:checked ~ .page :is(.ob,.ox,.obx){display:none!important}
#o-better:checked ~ .page :is(.og,.ox,.ogx){display:none!important}
#o-best:checked ~ .page :is(.og,.ob,.ogb){display:none!important}
#m-call:checked ~ .page :is(.ms,.ml,.mt){display:none!important}
#m-share:checked ~ .page :is(.mc,.ml,.mt){display:none!important}
#m-local:checked ~ .page :is(.mc,.ms,.mt){display:none!important}
#m-touch:checked ~ .page :is(.mc,.ms,.ml){display:none!important}

/* ---------- hero ---------- */
.hero{padding:70px 0 60px;border-top:0;background:radial-gradient(1200px 500px at 85% -10%,rgba(200,168,75,.16),transparent 60%),radial-gradient(900px 500px at -10% 110%,rgba(77,163,255,.10),transparent 60%)}
.lockup{display:flex;align-items:center;flex-wrap:wrap;gap:18px;margin-bottom:34px;line-height:0}
.lockup img{display:block;height:48px;width:auto}
.lockup .via{color:var(--muted);font-size:13px;line-height:1;letter-spacing:.08em;text-transform:uppercase;padding-left:18px;border-left:1px solid rgba(255,255,255,.25);height:48px;display:flex;align-items:center}
.lockup img.ftai{height:66px}
.lockup img.cdw{height:50px}
.lockup .x{color:var(--gold);font-size:22px;line-height:1;font-weight:300}
.hero h1 span{color:var(--gold)}
.hero .lede{margin-top:20px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:14px;margin-top:36px}
.meta .card{padding:16px 18px}
.meta .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700}
.meta .v{font-size:17px;font-weight:600;margin-top:4px}
.meta .s{font-size:13px;color:var(--muted)}
.howto{display:flex;gap:10px;flex-wrap:wrap;margin-top:26px}
.howto span{background:rgba(200,168,75,.1);border:1px solid rgba(200,168,75,.35);color:var(--gold2);border-radius:999px;padding:6px 14px;font-size:13px}

/* ---------- challenge ---------- */
.issue{display:flex;gap:14px;align-items:flex-start}
.issue .ic{flex:0 0 40px;height:40px;border-radius:10px;background:rgba(200,168,75,.12);display:grid;place-items:center}
.issue p{margin:2px 0 0;color:var(--muted);font-size:14px}
.planbox{background:#08131e;border:1px solid var(--line);border-radius:14px;padding:12px;overflow-x:auto}
.planbox svg{display:block;width:100%;min-width:560px;height:auto}

/* ---------- option cards ---------- */
.optcard{position:relative;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:.15s}
.optcard:hover{border-color:rgba(200,168,75,.6)}
.optcard .tier{font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:var(--gold)}
.optcard h3{font-size:22px;margin:0}
.optcard ul{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:14px}
.optcard li{margin:4px 0}
.optcard .ctl{margin-top:auto;padding-top:12px;border-top:1px solid var(--line);font-size:13px}
.optcard .ctl b{color:var(--text)}
.optcard .sel{font-size:12px;font-weight:700;color:var(--dim);letter-spacing:.08em;text-transform:uppercase}
#o-good:checked ~ .page label.optcard[for=o-good],
#o-better:checked ~ .page label.optcard[for=o-better],
#o-best:checked ~ .page label.optcard[for=o-best]{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 10px 40px rgba(200,168,75,.12)}
#o-good:checked ~ .page label.optcard[for=o-good] .sel,
#o-better:checked ~ .page label.optcard[for=o-better] .sel,
#o-best:checked ~ .page label.optcard[for=o-best] .sel{color:var(--gold)}
.badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--muted);border:1px solid var(--line)}
.badge.gold{background:rgba(200,168,75,.14);color:var(--gold2);border-color:rgba(200,168,75,.4)}
.badge.warn{background:rgba(242,140,56,.12);color:#ffb27a;border-color:rgba(242,140,56,.35)}

/* ---------- simulator ---------- */
.steps-head{display:flex;gap:10px;align-items:center;margin:0 0 10px;font-weight:700}
.steps-head .n{width:26px;height:26px;border-radius:50%;background:var(--gold);color:#0D1B2A;display:grid;place-items:center;font-size:13px;font-weight:800}
.modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px;margin-bottom:22px}
.mode{cursor:pointer;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:12px 14px;background:var(--card);transition:.15s;display:flex;gap:12px;align-items:center}
.mode:hover{border-color:var(--gold)}
.mode b{display:block;font-size:15px}
.mode span{display:block;font-size:12px;color:var(--muted)}
.mode svg{flex:0 0 28px}
#m-call:checked ~ .page label.mode[for=m-call],
#m-share:checked ~ .page label.mode[for=m-share],
#m-local:checked ~ .page label.mode[for=m-local],
#m-touch:checked ~ .page label.mode[for=m-touch]{border-color:var(--gold);background:rgba(200,168,75,.1);box-shadow:inset 0 0 0 1px var(--gold)}
.sim{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:22px;align-items:start}
@media (max-width:980px){.sim{grid-template-columns:minmax(0,1fr)}}
.room{background:#08131e;border:1px solid var(--line);border-radius:16px;padding:12px;overflow-x:auto}
.room svg{display:block;width:100%;min-width:520px;height:auto}
.legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin:12px 4px 2px;font-size:12px;color:var(--muted)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.panel h4{color:var(--gold2);font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px}
.panel ol{margin:0;padding-left:20px}
.panel ol li{margin:0 0 9px;font-size:15px}
.panel ol li::marker{color:var(--gold);font-weight:700}
.panel + .panel{margin-top:14px}
.fe{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:14px}
.fe dt{color:var(--muted);font-weight:600}
.fe dd{margin:0}
.note{border-left:3px solid var(--far);background:rgba(242,140,56,.07);padding:10px 14px;border-radius:0 10px 10px 0;font-size:14px;color:#f3d6bf}
.note.blue{border-color:var(--content);background:rgba(77,163,255,.07);color:#cfe3ff}
.note.gold{border-color:var(--gold);background:rgba(200,168,75,.08);color:#efe2b8}

/* ---------- control section ---------- */
.ctlgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:stretch}
@media (max-width:900px){.ctlgrid{grid-template-columns:minmax(0,1fr)}}
.tapmock{background:#0b0f14;border:10px solid #23272d;border-radius:22px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.45);max-width:520px}
.tapmock .bar{display:flex;justify-content:space-between;font-size:11px;color:#8b98a8;margin-bottom:12px}
.tapmock .t{font-size:13px;color:#c7d2de;font-weight:600;margin-bottom:10px}
.tapgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.tapbtn{cursor:pointer;display:flex;flex-direction:column;gap:4px;border-radius:12px;padding:12px;background:#1a2230;border:1px solid #2b3647;color:#e5ecf4;font-size:13px;font-weight:600;transition:.15s}
.tapbtn em{font-style:normal;font-size:11px;color:#8b98a8;font-weight:500}
.tapbtn:hover{border-color:var(--gold)}
#m-call:checked ~ .page label.tapbtn[for=m-call],
#m-share:checked ~ .page label.tapbtn[for=m-share],
#m-local:checked ~ .page label.tapbtn[for=m-local],
#m-touch:checked ~ .page label.tapbtn[for=m-touch]{background:#2b2a1d;border-color:var(--gold);color:var(--gold2)}
.vol{margin-top:12px;display:flex;align-items:center;gap:10px;font-size:12px;color:#8b98a8}
.vol .track{flex:1;height:6px;border-radius:3px;background:#2b3647;position:relative}
.vol .track::after{content:"";position:absolute;left:0;top:0;bottom:0;width:62%;border-radius:3px;background:var(--gold)}
.tdisp{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}
.tdisp div{background:#141b26;border:1px solid #2b3647;border-radius:8px;padding:6px;font-size:10px;color:#9fb0c4;text-align:center}
.tdisp div b{display:block;color:#e5ecf4;font-size:11px}
.remotes{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}
.remote{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:10px 6px;text-align:center;font-size:11px;color:var(--muted)}
.remote svg{display:block;margin:0 auto 6px}
.who{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
.who td,.who th{padding:9px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.who th{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.big-callout{display:flex;gap:16px;align-items:center;padding:18px 22px;border-radius:14px;margin-bottom:24px;border:1px solid rgba(200,168,75,.4);background:linear-gradient(90deg,rgba(200,168,75,.14),rgba(200,168,75,.03))}
.big-callout b{color:var(--gold2)}

/* ---------- flow ---------- */
.flow{background:#08131e;border:1px solid var(--line);border-radius:16px;padding:14px;overflow-x:auto}
.flow svg{display:block;width:100%;min-width:760px;height:auto}
.walk{counter-reset:w;display:grid;gap:12px;margin-top:20px}
.walk div{counter-increment:w;display:grid;grid-template-columns:34px 1fr;gap:12px;align-items:start;font-size:15px}
.walk div::before{content:counter(w);width:30px;height:30px;border-radius:8px;background:rgba(200,168,75,.14);color:var(--gold2);display:grid;place-items:center;font-weight:800;font-size:14px}
.walk b{color:var(--text)}
.walk p{margin:0;color:var(--muted)}

/* ---------- components ---------- */
.comp{display:flex;flex-direction:column;overflow:hidden;padding:0}
.comp .img{height:150px;display:grid;place-items:center;background:radial-gradient(ellipse at center,#1a2e4a,#0d1b2a)}
.comp .img.light{background:radial-gradient(ellipse at center,#e8eef5,#d0dae6)}
.comp .body{padding:16px 18px 18px}
.comp .where{font-size:12px;color:var(--gold2);font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.comp p{margin:6px 0 0;font-size:14px;color:var(--muted)}

/* ---------- compare ---------- */
.tblwrap{overflow-x:auto;border:1px solid var(--line);border-radius:14px}
table.cmp{width:100%;border-collapse:collapse;min-width:760px;font-size:14px}
.cmp th,.cmp td{padding:13px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.cmp thead th{background:#132334;font-size:13px;position:sticky;top:0}
.cmp thead th small{display:block;color:var(--muted);font-weight:500}
.cmp tbody th{color:var(--muted);font-weight:600;width:22%;background:rgba(255,255,255,.015)}
.cmp tr.grp td{background:#0f1f2f;color:var(--gold);font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;padding:9px 14px}
#o-good:checked ~ .page .cmp .cg,#o-better:checked ~ .page .cmp .cb,#o-best:checked ~ .page .cmp .cx{background:rgba(200,168,75,.08)}
#o-good:checked ~ .page .cmp thead .cg,#o-better:checked ~ .page .cmp thead .cb,#o-best:checked ~ .page .cmp thead .cx{background:#3a3420;color:var(--gold2)}
.yes{color:var(--audio);font-weight:700}
.lim{color:#ffb27a}

/* ---------- misc ---------- */
.checks{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.checks li{position:relative;padding-left:28px;font-size:15px}
.checks li::before{content:"";position:absolute;left:0;top:4px;width:16px;height:16px;border-radius:5px;border:2px solid var(--gold)}
.ticks{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.ticks li{position:relative;padding-left:24px;font-size:14px;color:var(--muted)}
.ticks li::before{content:"✓";position:absolute;left:0;color:var(--gold);font-weight:800}
.ticks li b{color:var(--text)}
.stat{text-align:left}
.stat .n{font-size:40px;font-weight:800;color:var(--gold);line-height:1}
.stat .l{margin-top:8px;color:var(--muted);font-size:14px}
.logo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-top:20px}
.logo-tile img{display:block;max-height:44px;max-width:140px;width:auto;height:auto;object-fit:contain}
.logo-tile{background:#2a3547;border:1px solid rgba(255,255,255,.08);border-radius:12px;height:84px;display:grid;place-items:center;font-weight:800;font-size:18px;letter-spacing:.02em;color:#fff;text-align:center;padding:0 10px}
.contact{display:flex;flex-direction:column;gap:4px}
.contact .r{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:700}
.contact .nm{font-size:19px;font-weight:700}
.contact a{color:var(--text);text-decoration:none;font-size:14px}
footer{padding:46px 0 60px;border-top:1px solid var(--line);background:var(--bg2)}
.foot{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:center}
.foot .logos{display:flex;align-items:center;gap:14px;line-height:0}
.foot .logos img{display:block;height:26px;width:auto;opacity:.85}
.foot .logos img.ftai{height:36px}
.foot .logos img.cdw{height:32px}
@media (max-width:600px){
  .wrap{padding:0 16px}
  section{padding:60px 0}
  .nav-logos .mason{height:28px}.nav-logos .cust{height:34px}.nav-logos .cdw,.nav-logos .cdwv{display:none}
  .lockup .via{border-left:0;padding-left:0;height:auto;width:100%}.lockup img.cdw{height:40px}.lockup img.ftai{height:48px}
  .lockup img{height:36px}
  .optbar .lab{display:none}
  .pill{padding:6px 12px;font-size:13px}.pill small{display:none}
  .remotes{grid-template-columns:repeat(2,1fr)}
  html{scroll-padding-top:120px}
}
@media print{.site-nav,.optbar{position:static}}
"""
