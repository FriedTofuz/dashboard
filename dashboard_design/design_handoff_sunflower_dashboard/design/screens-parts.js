/* ============================================
   Shared partials used by all SCREENS
   ============================================ */

window.PARTS = (function () {
  // task row — generic
  function task({ num, label, time, state = 'open', note = '' }) {
    const box =
      state === 'done'  ? `<span class="box checked"></span>`
    : state === 'timer' ? `<span class="box timer"></span>`
    :                     `<span class="box"></span>`;
    const labelClass = state === 'done' ? 'strike hand' : 'hand';
    const timerNote = state === 'timer'
      ? `<span class="mono" style="color:var(--terracotta-deep); margin-left:8px">▸ 12:48 elapsed</span>`
      : '';
    return `
      <div class="row gap-3" style="align-items:center; padding:4px 0; min-height:28px">
        ${num != null ? `<span class="num hand-b">${num}.</span>` : `<span class="num"></span>`}
        ${box}
        <span class="${labelClass}" style="font-size:22px; line-height:1.2; flex:1">${label}${time ? ` <span class="muted" style="font-size:18px">— ${time}</span>` : ''}${note ? ` <span class="annot" style="font-size:16px"> ${note}</span>` : ''}</span>
        ${timerNote}
      </div>
    `;
  }

  // rule-of-3 card
  function r3Card({ slot, label, time, state = 'filled', meta = '' }) {
    if (state === 'empty') {
      return `
        <div class="ink-box-dashed col" style="flex:1; padding:18px 18px 16px; min-height:120px; justify-content:space-between">
          <div class="tiny">priority ${slot}</div>
          <div class="hand muted" style="font-size:24px; line-height:1.15; opacity:0.55">what matters most?</div>
          <div class="hand muted" style="font-size:18px; opacity:0.5">— tap to set —</div>
        </div>
      `;
    }
    const checked = state === 'done';
    const running = state === 'running';
    return `
      <div class="ink-box col wash-sage" style="flex:1; padding:16px 18px 14px; min-height:120px; justify-content:space-between; position:relative">
        ${running ? `<div class="tape" style="left:auto; right:18px"></div>` : ''}
        <div class="row" style="justify-content:space-between; align-items:flex-start">
          <div class="tiny">priority ${slot}</div>
          ${checked ? `<span class="hand-b" style="color:var(--terracotta-deep); font-size:22px">✓ done</span>`
            : running ? `<span class="mono" style="color:var(--terracotta-deep)">▸ running 12:48</span>`
            : `<span class="mono muted">${time || ''}</span>`}
        </div>
        <div class="${checked ? 'strike hand' : 'hand'}" style="font-size:26px; line-height:1.1; padding-right:10px">${label}</div>
        <div class="hand muted" style="font-size:18px; line-height:1">${meta || (time ? `est. ${time}` : '')}</div>
      </div>
    `;
  }

  // section header (handwritten, with underline)
  function header(text, sub = '', accent = 'ink') {
    const color = accent === 'sage' ? 'var(--sage-deep)' : accent === 'terra' ? 'var(--terracotta-deep)' : 'var(--ink)';
    return `
      <div class="row" style="align-items:baseline; gap:10px; margin-bottom:6px">
        <span class="hand-b" style="font-size:22px; color:${color}">${text}</span>
        ${sub ? `<span class="hand muted" style="font-size:18px">${sub}</span>` : ''}
      </div>
    `;
  }

  // date pill row (1–5 days)
  function dateStrip(active = 2) {
    const days = [
      { d: 'Mon', n: 11 },
      { d: 'Tue', n: 12 },
      { d: 'Wed', n: 13 },
      { d: 'Thu', n: 14 },
      { d: 'Fri', n: 15 },
    ];
    return `
      <div class="row gap-2" style="align-items:center">
        <span class="hand muted" style="font-size:18px; margin-right:4px">range:</span>
        ${days.map((x, i) => `
          <div class="${i === active ? 'ink-box wash-terra' : 'ink-box-soft'}"
               style="padding:6px 12px 4px; min-width:64px; text-align:center">
            <div class="tiny" style="line-height:1">${x.d}</div>
            <div class="hand-b" style="font-size:22px; line-height:1.1">${x.n}</div>
          </div>
        `).join('')}
        <span class="annot" style="margin-left:10px">← today</span>
        <div style="flex:1"></div>
        <span class="hand muted" style="font-size:18px">drag edges to widen window</span>
      </div>
    `;
  }

  // progress bar with label
  function progressBar({ pct = 38, label = '3 of 8 done · today', sub = '' }) {
    return `
      <div class="col" style="gap:4px">
        <div class="row" style="justify-content:space-between; align-items:baseline">
          <span class="hand" style="font-size:20px">${label}</span>
          <span class="hand-b" style="font-size:20px; color:var(--sage-deep)">${pct}%</span>
        </div>
        <div class="bar"><span style="right:${100 - pct}%"></span></div>
        ${sub ? `<div class="hand muted" style="font-size:16px">${sub}</div>` : ''}
      </div>
    `;
  }

  // sunflower card (illustration only)
  function sunflowerCard(state = 'healthy', height = 360) {
    return `
      <div class="ink-box-soft dotgrid col" style="padding:14px 16px 10px; height:${height}px; position:relative">
        <div class="row" style="justify-content:space-between; align-items:baseline">
          <span class="hand-b" style="font-size:20px">your sunflower</span>
          <span class="tiny">day 23</span>
        </div>
        <div data-sunflower="${state}" style="flex:1; display:flex; align-items:center; justify-content:center; padding:6px 0"></div>
      </div>
    `;
  }

  return { task, r3Card, header, dateStrip, progressBar, sunflowerCard };
})();
