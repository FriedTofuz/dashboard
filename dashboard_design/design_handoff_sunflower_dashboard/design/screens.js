/* ============================================
   SCREENS — raw HTML strings for each artboard
   ============================================ */
(function () {
const P = window.PARTS;

/* ---------- 1. DESKTOP DASHBOARD ---------- */
const desktop = `
<div style="width:100%; height:100%; padding:26px 32px; display:grid;
            grid-template-columns: 1fr 460px; gap:24px; box-sizing:border-box; position:relative">

  <!-- LEFT COLUMN -->
  <div class="col gap-4" style="min-width:0">

    <!-- top bar: date + range -->
    <div class="row" style="align-items:center; justify-content:space-between">
      <div class="col">
        <span class="tiny">wednesday</span>
        <span class="hand-b underline-hand" style="font-size:44px; line-height:1">May 13</span>
      </div>
      ${P.dateStrip(2)}
    </div>

    <!-- progress bar -->
    <div class="ink-box-soft col" style="padding:14px 18px">
      ${P.progressBar({ pct: 38, label: "today's progress · 3 of 8 done", sub: "1h 40m of est. 2h 52m logged" })}
    </div>

    <!-- RULE OF 3 -->
    <div class="col" style="gap:8px">
      ${P.header('Rule of 3', '— the three things that would make today a win', 'sage')}
      <div class="row gap-3">
        ${P.r3Card({ slot:1, label:'Finish AAKRUTI concept doc', time:'45min', state:'running' })}
        ${P.r3Card({ slot:2, label:'Workout — strength A',      time:'30min', state:'filled' })}
        ${P.r3Card({ slot:3, label:'Email Harvard SEAS admissions', time:'15min', state:'done' })}
      </div>
    </div>

    <!-- HABITS / RECURRING -->
    <div class="col" style="gap:4px">
      ${P.header('Daily habits', '— quiet, repeating, hold-the-line', 'terra')}
      <div class="ink-box-soft ruled-dense" style="padding:8px 18px 10px; background-color: rgba(192,135,117,0.05)">
        ${P.task({ label: 'Morning pages',          time: '10min', state:'done' })}
        ${P.task({ label: 'Meditate',               time: '12min', state:'done' })}
        ${P.task({ label: 'Read — Bird by Bird',    time: '20min', state:'open' })}
        ${P.task({ label: 'Stretch + mobility',     time: '8min',  state:'open' })}
        ${P.task({ label: 'Duolingo — Japanese',    time: '5min',  state:'open' })}
      </div>
    </div>

    <!-- OPEN TASKS (numbered) -->
    <div class="col" style="gap:4px">
      <div class="ruled" style="padding:6px 8px 8px">
        ${P.task({ num:1, label:'Call dentist re: cleaning',           time:'5min',  state:'open' })}
        ${P.task({ num:2, label:'Refactor billing query',              time:'25min', state:'open' })}
        ${P.task({ num:3, label:'Reply to Anika — Saturday plans',     time:'10min', state:'open', note:'(short!)' })}
        ${P.task({ num:4, label:'Pick up dry cleaning',                time:'10min', state:'open' })}
        ${P.task({ num:5, label:'Order new sketchpad + ink refills',   time:'5min',  state:'open' })}
      </div>
    </div>

    <!-- COMPLETED -->
    <div class="col" style="gap:4px">
      ${P.header('Done', '', 'sage')}
      <div style="padding:2px 8px">
        ${P.task({ label:'Inbox zero',           time:'20min', state:'done' })}
        ${P.task({ label:'Stand-up + notes',     time:'15min', state:'done' })}
        ${P.task({ label:'Submit timesheet',     time:'5min',  state:'done' })}
      </div>
    </div>

    <!-- footer buttons -->
    <div class="row gap-3" style="margin-top:auto; padding-top:8px; align-items:center">
      <button class="ink-box-soft hand" style="background:transparent; padding:6px 16px; font-size:20px; cursor:pointer">+ add task</button>
      <button class="ink-box-soft hand" style="background:transparent; padding:6px 16px; font-size:20px; cursor:pointer">archive</button>
      <button class="ink-box-soft hand" style="background:transparent; padding:6px 16px; font-size:20px; cursor:pointer">settings</button>
      <div style="flex:1"></div>
      <span class="hand muted" style="font-size:18px">last synced · 2 min ago</span>
    </div>
  </div>

  <!-- RIGHT COLUMN -->
  <div class="col gap-4" style="min-width:0">

    <!-- SUNFLOWER -->
    <div class="ink-box-soft dotgrid col" style="padding:14px 16px 0; height:380px; position:relative; overflow:hidden">
      <div class="row" style="justify-content:space-between; align-items:baseline">
        <span class="hand-b" style="font-size:22px">your sunflower</span>
        <span class="tiny">day 23 · drooping</span>
      </div>
      <div class="hand muted" style="font-size:16px; text-align:center; padding:6px 12px 0; line-height:1.15; order:3">
        finish 1 more priority and i'll perk back up by evening.
      </div>
      <div class="sunflower-slot" data-sunflower="drooping" style="flex:1; min-height:0; order:2"></div>
    </div>

    <!-- STATS -->
    <div class="ink-box-soft col" style="padding:14px 18px 16px; gap:10px">
      <div class="row" style="gap:14px">
        <div class="col" style="flex:1">
          <span class="tiny">today</span>
          <span class="hand-b" style="font-size:30px; line-height:1">38<span class="muted" style="font-size:20px">%</span></span>
        </div>
        <div class="col" style="flex:1">
          <span class="tiny">week avg</span>
          <span class="hand-b" style="font-size:30px; line-height:1; color:var(--sage-deep)">73<span class="muted" style="font-size:20px">%</span></span>
        </div>
        <div class="col" style="flex:1.2">
          <span class="tiny">time deficit</span>
          <span class="hand-b" style="font-size:30px; line-height:1; color:var(--terracotta-deep)">−1h 12m</span>
        </div>
      </div>
      <!-- streak strip -->
      <div class="row gap-2" style="align-items:center; margin-top:4px">
        <span class="hand muted" style="font-size:18px">streak</span>
        <div class="row gap-2" style="flex:1; align-items:center">
          ${[1,1,1,1,1,1,1,1,1,0.5,0.5,0.2,0.2,0.2].map(v => `
            <div style="flex:1; height:18px; background:rgba(138,154,130,${0.15 + v*0.55}); border:1px solid rgba(43,38,34,0.2); border-radius:3px; filter:url(#wobble)"></div>
          `).join('')}
        </div>
        <span class="hand-b" style="font-size:20px; color:var(--sage-deep)">9 days</span>
      </div>
    </div>

    <!-- NOTEPAD -->
    <div class="ink-box-soft ruled-margin ruled-dense col" style="padding:14px 18px 14px 70px; flex:1; position:relative; min-height:240px; background-color: rgba(245,239,230,0.6)">
      <div class="hand" style="font-size:21px; line-height:32px; color:var(--ink-soft); white-space:pre-wrap">
ask J. about bay window framing
   — measure before friday

idea: weekend trip to mendocino?
  - cabin? hotel? sleep in car ✗

books — Yoga Sutras · Bird by Bird
       · The Three-Body Problem (vol 2)

⤷ <span style="color:var(--terracotta-deep)">remember:</span> water plants thursday
      </div>
    </div>
  </div>
</div>
`;

/* ---------- 2. TASK STATES ---------- */
function taskCard(inner, label, badge = '') {
  return `
    <div style="width:100%; height:100%; padding:18px 22px; display:flex; flex-direction:column; gap:6px; box-sizing:border-box">
      <div class="row" style="justify-content:space-between; align-items:baseline">
        <span class="tiny">${label}</span>
        ${badge}
      </div>
      <div class="ink-box-soft" style="padding:10px 14px; background:rgba(245,239,230,0.5)">
        ${inner}
      </div>
    </div>
  `;
}

const taskOpen = taskCard(`
  <div class="row gap-3" style="align-items:center">
    <span class="num hand-b">2.</span>
    <span class="box"></span>
    <span class="hand" style="font-size:24px; flex:1; line-height:1.15">Refactor billing query <span class="muted" style="font-size:20px">— 25min</span></span>
    <span class="mono muted">▸ start</span>
  </div>
`, 'state · open');

const taskTimer = taskCard(`
  <div class="row gap-3" style="align-items:center">
    <span class="num hand-b">2.</span>
    <span class="box timer"></span>
    <span class="hand" style="font-size:24px; flex:1; line-height:1.15">Refactor billing query <span class="muted" style="font-size:20px">— 25min</span></span>
    <span class="mono" style="color:var(--terracotta-deep)">▸ 12:48 elapsed</span>
  </div>
  <div class="row" style="margin-top:8px; align-items:center; gap:10px">
    <div class="bar" style="flex:1; height:10px"><span style="right:48%"></span></div>
    <span class="hand muted" style="font-size:18px">12 of 25 min</span>
  </div>
`, 'state · timer running', '<span class="annot">↑ pulsing terracotta dot</span>');

const taskDone = taskCard(`
  <div class="row gap-3" style="align-items:center">
    <span class="num hand-b" style="color:var(--ink-faint)">2.</span>
    <span class="box checked"></span>
    <span class="strike hand" style="font-size:24px; flex:1; line-height:1.15">Refactor billing query <span style="font-size:20px">— 25min</span></span>
    <span class="hand-b" style="color:var(--sage-deep); font-size:20px">+1 ✿</span>
  </div>
  <div class="hand muted" style="font-size:17px; margin-top:4px; padding-left:50px">finished 22min · 3min under est.</div>
`, 'state · completed', '<span class="annot">↑ ink strike, fades to muted</span>');

/* ---------- 3. RULE OF 3 ---------- */
const rule3Empty = `
<div style="width:100%; height:100%; padding:22px 28px; display:flex; flex-direction:column; gap:10px; box-sizing:border-box">
  ${P.header('Rule of 3 — empty', '— pick three. only three. the rest can wait.', 'sage')}
  <div class="row gap-3" style="flex:1">
    ${P.r3Card({ slot:1, state:'empty' })}
    ${P.r3Card({ slot:2, state:'empty' })}
    ${P.r3Card({ slot:3, state:'empty' })}
  </div>
  <div class="hand muted" style="font-size:18px">⤷ ghosted dashed border · placeholder copy at 55% opacity · taps open inline editor</div>
</div>
`;

const rule3Filled = `
<div style="width:100%; height:100%; padding:22px 28px; display:flex; flex-direction:column; gap:10px; box-sizing:border-box">
  ${P.header('Rule of 3 — filled', '— priority 1 is running, 3 is done', 'sage')}
  <div class="row gap-3" style="flex:1">
    ${P.r3Card({ slot:1, label:'Finish AAKRUTI concept doc',      time:'45min', state:'running' })}
    ${P.r3Card({ slot:2, label:'Workout — strength A',            time:'30min', state:'filled' })}
    ${P.r3Card({ slot:3, label:'Email Harvard SEAS admissions',   time:'15min', state:'done' })}
  </div>
  <div class="hand muted" style="font-size:18px">⤷ sage wash · "priority N" stamp top-left · washi tape appears on the running one</div>
</div>
`;

/* ---------- 4. SUNFLOWER STATES ---------- */
function flower(state, title, sub) {
  const triggers = {
    thriving: '✓ all 3 priorities done · bonus tasks too',
    healthy:  '✓ on track · 2/3 priorities done by mid-day',
    drooping: '✗ behind pace · 1/3 priorities · time deficit',
    wilting:  '✗ no priorities done · 3 days in a row',
  };
  return `
    <div style="width:100%; height:100%; padding:20px 22px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box">
      <div class="row" style="justify-content:space-between; align-items:baseline">
        <span class="hand-b" style="font-size:24px; text-transform:lowercase">${title}</span>
        <span class="tiny">state ${'thriving healthy drooping wilting'.split(' ').indexOf(state)+1}/4</span>
      </div>
      <div class="ink-box-soft dotgrid" style="flex:1; padding:6px; display:flex; align-items:center; justify-content:center">
        <div data-sunflower="${state}" style="width:200px; height:300px"></div>
      </div>
      <div class="hand" style="font-size:19px; line-height:1.2">${sub}</div>
      <div class="hand muted" style="font-size:16px; line-height:1.2">trigger: ${triggers[state]}</div>
    </div>
  `;
}

/* ---------- 5. DATE RANGE (5 days) ---------- */
const dayContent = [
  { d:'Mon', n:11, pct:88, deficit:'+22m',  done:7, total:8, flower:'thriving',
    r3:[['done','AAKRUTI research read','30m'], ['done','Workout — push','40m'], ['done','Outline Q3 OKRs','25m']],
    extra: 'shipped early · planted bonus task' },
  { d:'Tue', n:12, pct:71, deficit:'−8m',   done:5, total:7, flower:'healthy',
    r3:[['done','AAKRUTI rough draft','60m'], ['done','Workout — pull','40m'], ['open','Call mom','15m']],
    extra: 'cruise control' },
  { d:'Wed', n:13, pct:38, deficit:'−1h 12m', done:3, total:8, flower:'drooping', today:true,
    r3:[['running','Finish AAKRUTI doc','45m'], ['open','Workout','30m'], ['done','Email SEAS','15m']],
    extra: 'meetings ate the morning' },
  { d:'Thu', n:14, pct:0,  deficit:'—',     done:0, total:6, flower:'healthy', future:true,
    r3:[['open','AAKRUTI review w/ T.','30m'], ['open','Long run · 8km','60m'], ['open','Tax doc upload','20m']],
    extra: 'planned · light meeting day' },
  { d:'Fri', n:15, pct:0,  deficit:'—',     done:0, total:5, flower:'healthy', future:true,
    r3:[['open','Ship AAKRUTI v1','45m'], ['open','Workout · rest','—'], ['open','Cabin booking?','10m']],
    extra: 'protect the afternoon' },
];

const rangeDay = d => `
  <div class="ink-box-soft col" style="flex:1; min-width:0; padding:14px 14px 12px; gap:8px; background:${d.today ? 'rgba(192,135,117,0.06)' : 'transparent'}">
    <div class="row" style="justify-content:space-between; align-items:baseline">
      <div class="col">
        <span class="tiny" style="line-height:1">${d.d}</span>
        <span class="hand-b" style="font-size:32px; line-height:1">${d.n}</span>
      </div>
      <div class="col" style="align-items:flex-end">
        <span class="hand-b" style="font-size:22px; color:${d.future ? 'var(--ink-faint)' : d.pct >= 70 ? 'var(--sage-deep)' : 'var(--terracotta-deep)'}">${d.future ? '—' : d.pct + '%'}</span>
        <span class="hand muted" style="font-size:16px">${d.future ? 'planned' : `${d.done}/${d.total} · ${d.deficit}`}</span>
      </div>
    </div>

    <!-- mini sunflower -->
    <div class="dotgrid" style="height:160px; display:flex; align-items:center; justify-content:center; border-radius:4px; ${d.today ? 'box-shadow: inset 0 0 0 1.5px var(--terracotta-deep); filter: url(#wobble)' : 'opacity:'+(d.future ? 0.55 : 0.95)}">
      <div data-sunflower="${d.flower}" style="width:120px; height:180px"></div>
    </div>

    <!-- progress bar -->
    <div class="bar" style="height:10px"><span style="right:${100 - d.pct}%"></span></div>

    <!-- rule of 3 mini -->
    <div class="col" style="gap:2px">
      <span class="tiny">rule of 3</span>
      ${d.r3.map(([s, t, mins], i) => {
        const cls = s === 'done' ? 'strike hand' : 'hand';
        const dot = s === 'done' ? '✓' : s === 'running' ? '▸' : '○';
        const color = s === 'done' ? 'var(--sage-deep)' : s === 'running' ? 'var(--terracotta-deep)' : 'var(--ink-faint)';
        return `<div class="row" style="gap:6px; align-items:baseline">
          <span style="color:${color}; font-family:'Caveat',cursive; font-size:18px; width:14px">${dot}</span>
          <span class="${cls}" style="font-size:18px; line-height:1.15; flex:1">${t}</span>
          <span class="mono muted">${mins}</span>
        </div>`;
      }).join('')}
    </div>

    <div class="hand muted" style="font-size:16px; line-height:1.15; margin-top:auto; padding-top:6px; border-top:1px dashed var(--rule-strong)">
      ${d.today ? '<span class="annot">← today</span> · ' : ''}${d.extra}
    </div>
  </div>
`;

const range = `
<div style="width:100%; height:100%; padding:24px 28px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box">
  <!-- header -->
  <div class="row" style="align-items:center; justify-content:space-between">
    <div class="col">
      <span class="tiny">range view</span>
      <span class="hand-b" style="font-size:36px; line-height:1">May 11 – 15 · this week</span>
    </div>
    <div class="row gap-3" style="align-items:center">
      <span class="hand muted" style="font-size:18px">window</span>
      <div class="ink-box-soft" style="padding:4px 10px"><span class="hand-b">5 days</span></div>
      <button class="ink-box-soft hand" style="background:transparent; padding:4px 12px; font-size:18px; cursor:pointer">◀ prev week</button>
      <button class="ink-box-soft hand" style="background:transparent; padding:4px 12px; font-size:18px; cursor:pointer">next ▶</button>
    </div>
  </div>

  <!-- summary strip -->
  <div class="row gap-4 ink-box-soft" style="padding:10px 16px; align-items:center">
    <div class="col"><span class="tiny">week avg</span><span class="hand-b" style="font-size:24px; line-height:1; color:var(--sage-deep)">66%</span></div>
    <div class="col"><span class="tiny">priorities done</span><span class="hand-b" style="font-size:24px; line-height:1">8 / 15</span></div>
    <div class="col"><span class="tiny">total deficit</span><span class="hand-b" style="font-size:24px; line-height:1; color:var(--terracotta-deep)">−58m</span></div>
    <div class="col"><span class="tiny">streak</span><span class="hand-b" style="font-size:24px; line-height:1">9 days ✿</span></div>
    <div style="flex:1"></div>
    <span class="hand muted" style="font-size:18px">⤷ wednesday's drooping flower is dragging the average</span>
  </div>

  <!-- 5 day columns -->
  <div class="row gap-3" style="flex:1; min-height:0">
    ${dayContent.map(rangeDay).join('')}
  </div>
</div>
`;

/* ---------- 6. MOBILE PWA ---------- */
const phone = (label, body, activeTab) => `
  <div style="width:100%; height:100%; display:flex; flex-direction:column; box-sizing:border-box; position:relative">
    <!-- status bar -->
    <div class="row" style="padding:10px 22px 4px; align-items:center; justify-content:space-between">
      <span class="mono">9:14</span>
      <span class="mono muted">${label}</span>
      <span class="mono">▮▮▮ 87%</span>
    </div>
    <!-- body -->
    <div class="col" style="flex:1; padding:8px 16px 78px; overflow:hidden; gap:10px">
      ${body}
    </div>
    <!-- tab bar -->
    ${tabBar(activeTab)}
  </div>
`;

const tabBar = (active) => {
  const tabs = [
    { id:'today',   l:'today',   g:'<rect x="6" y="6" width="16" height="16" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
    { id:'range',   l:'range',   g:'<rect x="4" y="9" width="6" height="10" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="11" y="6" width="6" height="13" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="18" y="11" width="6" height="8" stroke="currentColor" stroke-width="1.6" fill="none"/>' },
    { id:'notepad', l:'notepad', g:'<path d="M5 5 L23 5 L23 23 L5 23 Z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M9 11 L19 11 M9 15 L19 15 M9 19 L16 19" stroke="currentColor" stroke-width="1.2" fill="none"/>' },
    { id:'stats',   l:'stats',   g:'<circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M14 14 L14 6 A8 8 0 0 1 21 17 Z" fill="currentColor" opacity="0.3"/>' },
    { id:'archive', l:'archive', g:'<rect x="4" y="6" width="20" height="5" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="6" y="11" width="16" height="11" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M11 15 L17 15" stroke="currentColor" stroke-width="1.4" fill="none"/>' },
  ];
  return `
    <div class="row" style="position:absolute; left:0; right:0; bottom:0; padding:8px 6px 12px; background:var(--paper-warm); border-top:1.4px solid var(--ink); filter:url(#wobble)">
      ${tabs.map(t => `
        <div class="col center" style="flex:1; gap:2px; color:${t.id === active ? 'var(--terracotta-deep)' : 'var(--ink-faint)'}">
          <svg viewBox="0 0 28 28" width="26" height="26" style="filter:url(#wobble)">${t.g}</svg>
          <span class="hand-b" style="font-size:15px; line-height:1">${t.l}</span>
          ${t.id === active ? `<div style="width:14px; height:2px; background:var(--terracotta-deep); border-radius:1px; filter:url(#wobble)"></div>` : `<div style="height:2px"></div>`}
        </div>
      `).join('')}
    </div>
  `;
};

const mHome = phone('today', `
  <!-- header -->
  <div class="row" style="align-items:flex-end; justify-content:space-between">
    <div class="col"><span class="tiny">wed</span><span class="hand-b underline-hand" style="font-size:34px; line-height:1">May 13</span></div>
    <div class="col" style="align-items:flex-end"><span class="tiny">today</span><span class="hand-b" style="font-size:24px; line-height:1; color:var(--sage-deep)">38%</span></div>
  </div>
  <!-- mini progress -->
  <div class="bar" style="height:10px"><span style="right:62%"></span></div>
  <!-- date strip compact -->
  <div class="row gap-2">
    ${['M 11','T 12','W 13','T 14','F 15'].map((x, i) => `
      <div class="${i===2 ? 'ink-box wash-terra' : 'ink-box-soft'}" style="flex:1; padding:4px 0; text-align:center">
        <span class="hand-b" style="font-size:16px">${x}</span>
      </div>
    `).join('')}
  </div>

  <!-- rule of 3 (vertical) -->
  <div class="col" style="gap:6px; margin-top:2px">
    <span class="hand-b" style="font-size:18px; color:var(--sage-deep)">Rule of 3</span>
    <div class="ink-box wash-sage" style="padding:8px 12px">
      <div class="row" style="justify-content:space-between"><span class="tiny">priority 1</span><span class="mono" style="color:var(--terracotta-deep)">▸ 12:48</span></div>
      <div class="hand" style="font-size:20px; line-height:1.1">Finish AAKRUTI concept doc</div>
    </div>
    <div class="ink-box wash-sage" style="padding:8px 12px">
      <div class="row" style="justify-content:space-between"><span class="tiny">priority 2</span><span class="mono muted">30min</span></div>
      <div class="hand" style="font-size:20px; line-height:1.1">Workout — strength A</div>
    </div>
    <div class="ink-box wash-sage" style="padding:8px 12px">
      <div class="row" style="justify-content:space-between"><span class="tiny">priority 3</span><span class="hand-b" style="color:var(--terracotta-deep); font-size:16px">✓ done</span></div>
      <div class="strike hand" style="font-size:20px; line-height:1.1">Email Harvard SEAS</div>
    </div>
  </div>

  <!-- habits -->
  <div class="col" style="gap:2px; margin-top:4px">
    <span class="hand-b" style="font-size:18px; color:var(--terracotta-deep)">habits</span>
    <div style="padding:0 4px">
      ${P.task({ label:'Morning pages', time:'10m', state:'done' })}
      ${P.task({ label:'Meditate',      time:'12m', state:'done' })}
      ${P.task({ label:'Read',          time:'20m', state:'open' })}
    </div>
  </div>

  <!-- today list -->
  <div class="col" style="gap:2px; margin-top:2px">
    <span class="hand-b" style="font-size:18px">today</span>
    <div class="ruled" style="padding:2px 4px">
      ${P.task({ num:1, label:'Call dentist',           time:'5m',  state:'open' })}
      ${P.task({ num:2, label:'Refactor billing query', time:'25m', state:'open' })}
      ${P.task({ num:3, label:'Reply to Anika',         time:'10m', state:'open' })}
    </div>
  </div>
`, 'today');

const mRange = phone('range', `
  <div class="row" style="justify-content:space-between; align-items:flex-end">
    <div class="col"><span class="tiny">this week</span><span class="hand-b" style="font-size:26px; line-height:1">May 11–15</span></div>
    <span class="hand-b" style="font-size:22px; color:var(--sage-deep)">66%</span>
  </div>
  <div class="row" style="gap:6px; margin-top:2px">
    ${['M','T','W','T','F'].map((x,i)=>{
      const pct=[88,71,38,0,0][i]; const flower=['thriving','healthy','drooping','healthy','healthy'][i]; const future = i>2;
      return `
        <div class="ink-box-soft col" style="flex:1; padding:6px 4px; gap:4px; align-items:center; ${i===2?'background:rgba(192,135,117,0.08)':''}">
          <span class="tiny">${x}</span>
          <span class="hand-b" style="font-size:18px; line-height:1">${11+i}</span>
          <div data-sunflower="${flower}" style="width:54px; height:80px; ${future?'opacity:0.45':''}"></div>
          <div class="bar" style="height:6px; width:100%"><span style="right:${100-pct}%"></span></div>
          <span class="hand" style="font-size:14px; line-height:1; color:${future?'var(--ink-faint)':pct>=70?'var(--sage-deep)':'var(--terracotta-deep)'}">${future?'—':pct+'%'}</span>
        </div>
      `;
    }).join('')}
  </div>
  <div class="ink-box-soft col" style="padding:10px 14px; gap:6px; margin-top:4px">
    <span class="tiny">summary</span>
    <div class="row" style="gap:14px">
      <div class="col"><span class="hand muted" style="font-size:14px">priorities</span><span class="hand-b" style="font-size:22px">8/15</span></div>
      <div class="col"><span class="hand muted" style="font-size:14px">deficit</span><span class="hand-b" style="font-size:22px; color:var(--terracotta-deep)">−58m</span></div>
      <div class="col"><span class="hand muted" style="font-size:14px">streak</span><span class="hand-b" style="font-size:22px">9d</span></div>
    </div>
  </div>
  <div class="col" style="gap:4px; margin-top:2px">
    <span class="hand-b" style="font-size:18px">notes from the week</span>
    <div class="hand muted" style="font-size:18px; line-height:1.25">
      ⤷ wednesday's 1:1 ran long — moved billing refactor to thursday.<br/>
      ⤷ habit streak holding through busy stretch.
    </div>
  </div>
`, 'range');

const mNotepad = phone('notepad', `
  <div class="row" style="justify-content:space-between; align-items:flex-end">
    <div class="col"><span class="tiny">scratch · auto-saved</span><span class="hand-b" style="font-size:30px; line-height:1">notepad</span></div>
    <button class="ink-box-soft hand" style="background:transparent; padding:4px 10px; font-size:16px">+ new page</button>
  </div>
  <div class="row gap-2" style="overflow-x:auto">
    <div class="ink-box wash-terra" style="padding:4px 10px"><span class="hand-b" style="font-size:16px">today</span></div>
    <div class="ink-box-soft" style="padding:4px 10px"><span class="hand" style="font-size:16px">aakruti</span></div>
    <div class="ink-box-soft" style="padding:4px 10px"><span class="hand" style="font-size:16px">books</span></div>
    <div class="ink-box-soft" style="padding:4px 10px"><span class="hand" style="font-size:16px">moving</span></div>
  </div>
  <div class="ink-box-soft ruled-margin ruled-dense" style="flex:1; padding:14px 16px 14px 56px; position:relative">
    <div class="hand" style="font-size:20px; line-height:30px; color:var(--ink-soft); white-space:pre-wrap">
ask J. about bay window framing
   measure before friday — bring tape

idea: mendocino this weekend?
  cabin · hotel · sleep in car ✗
  text S. by tomorrow

books to read
  · Yoga Sutras
  · Bird by Bird
  · Three-Body vol 2

<span style="color:var(--terracotta-deep)">remember:</span> water plants thursday
    </div>
  </div>
`, 'notepad');

const mStats = phone('stats', `
  <div class="row" style="justify-content:space-between; align-items:flex-end">
    <div class="col"><span class="tiny">your garden</span><span class="hand-b" style="font-size:30px; line-height:1">Stats</span></div>
    <span class="hand muted" style="font-size:16px">last 30 days</span>
  </div>

  <div class="ink-box-soft dotgrid" style="padding:6px; display:flex; align-items:center; justify-content:center; height:200px">
    <div data-sunflower="drooping" style="width:140px; height:200px"></div>
  </div>
  <div class="hand" style="font-size:18px; text-align:center; line-height:1.2; color:var(--ink-soft)">
    one more priority done today and i perk up.
  </div>

  <!-- numbers grid -->
  <div class="row gap-3">
    <div class="ink-box-soft col" style="flex:1; padding:10px 12px; align-items:flex-start; gap:2px">
      <span class="tiny">today</span><span class="hand-b" style="font-size:28px; line-height:1">38%</span>
    </div>
    <div class="ink-box-soft col" style="flex:1; padding:10px 12px; align-items:flex-start; gap:2px">
      <span class="tiny">week avg</span><span class="hand-b" style="font-size:28px; line-height:1; color:var(--sage-deep)">73%</span>
    </div>
  </div>
  <div class="row gap-3">
    <div class="ink-box-soft col" style="flex:1; padding:10px 12px; align-items:flex-start; gap:2px">
      <span class="tiny">deficit</span><span class="hand-b" style="font-size:28px; line-height:1; color:var(--terracotta-deep)">−1h 12m</span>
    </div>
    <div class="ink-box-soft col" style="flex:1; padding:10px 12px; align-items:flex-start; gap:2px">
      <span class="tiny">streak</span><span class="hand-b" style="font-size:28px; line-height:1">9 days</span>
    </div>
  </div>

  <!-- 30 day streak strip -->
  <div class="col" style="gap:4px; margin-top:2px">
    <span class="tiny">last 30 days</span>
    <div style="display:grid; grid-template-columns: repeat(15, 1fr); gap:4px">
      ${Array.from({length:30}).map((_,i)=>{
        const v = [0.9,0.8,1,0.7,0.85,1,0.9,1,0.8,0.6,0.4,0.7,0.85,1,0.9,1,0.7,0.85,0.95,1,0.6,0.4,0.3,0.7,0.85,1,1,1,0.45,0.4][i];
        return `<div style="aspect-ratio:1; background:rgba(138,154,130,${0.15 + v*0.55}); border:1px solid rgba(43,38,34,0.18); border-radius:3px; filter:url(#wobble)"></div>`;
      }).join('')}
    </div>
  </div>
`, 'stats');

const mArchive = phone('archive', `
  <div class="row" style="justify-content:space-between; align-items:flex-end">
    <div class="col"><span class="tiny">history</span><span class="hand-b" style="font-size:30px; line-height:1">Archive</span></div>
    <div class="ink-box-soft" style="padding:4px 10px"><span class="hand" style="font-size:16px">search ⌕</span></div>
  </div>

  ${[
    { d:'Mon · May 11', pct:88, flower:'thriving', items:['Q3 OKRs outline','AAKRUTI research','Workout — push','Call mom','Inbox zero','Pay rent','Order vitamins'] },
    { d:'Sun · May 10', pct:50, flower:'healthy',  items:['Long walk','Tidy desk','Reply to dad'] },
    { d:'Sat · May 9',  pct:100,flower:'thriving', items:["Farmer's market",'Hike — Mt Tam','Sketch session'] },
    { d:'Fri · May 8',  pct:42, flower:'drooping', items:['Submit timesheet','Standup notes'] },
  ].map(day => `
    <div class="ink-box-soft" style="padding:10px 12px">
      <div class="row" style="justify-content:space-between; align-items:center">
        <div class="row gap-2" style="align-items:center">
          <div data-sunflower="${day.flower}" style="width:34px; height:50px"></div>
          <div class="col">
            <span class="hand-b" style="font-size:18px; line-height:1">${day.d}</span>
            <span class="hand muted" style="font-size:15px">${day.items.length} tasks · ${day.pct}%</span>
          </div>
        </div>
        <span class="hand-b" style="font-size:22px; color:${day.pct>=70?'var(--sage-deep)':'var(--terracotta-deep)'}">${day.pct}%</span>
      </div>
      <div class="hand muted" style="font-size:15px; line-height:1.25; margin-top:4px; padding-left:42px">
        ${day.items.slice(0,3).map(i=>'<span class="strike">'+i+'</span>').join(' · ')}${day.items.length>3?` <span class="annot">+${day.items.length-3} more</span>`:''}
      </div>
    </div>
  `).join('')}
`, 'archive');

/* ---------- export ---------- */
window.SCREENS = {
  desktop,
  taskOpen, taskTimer, taskDone,
  rule3Empty, rule3Filled,
  flower,
  range,
  mHome, mRange, mNotepad, mStats, mArchive,
};
})();
