/* ============================================
   Sunflower — handdrawn ink + watercolor SVG
   states: thriving | healthy | drooping | wilting
   ============================================ */

(function () {
  const CONFIGS = {
    thriving: {
      headX: 100, headY: 70,
      petals: 14, petalLen: 26, petalW: 6.5,
      petalFill: '#d9a857', petalStroke: '#5a3f1d',
      washR: 44, washFill: '#f0c977', washOpacity: 0.55,
      centerR: 12, centerFill: '#5e3b1f',
      stem: 'M100 230 Q 98 170 100 95',
      leaves: [
        { d: 'M100 170 q -32 -6 -42 -26 q 28 -2 42 18', rot: -2,
          vein: 'M100 170 q -22 -8 -38 -24 M86 168 q -4 -10 -10 -16 M82 174 q -10 -4 -16 -10' },
        { d: 'M100 140 q 30 -8 42 -28 q -26 -4 -42 16',  rot: 2,
          vein: 'M100 140 q 22 -8 38 -26 M114 138 q 4 -10 10 -16 M118 144 q 10 -4 16 -10' },
      ],
      potTilt: 0,
      seedDots: true,
      mood: 'thriving',
    },
    healthy: {
      headX: 100, headY: 80,
      petals: 12, petalLen: 22, petalW: 6,
      petalFill: '#caa05b', petalStroke: '#5a3f1d',
      washR: 38, washFill: '#e8c283', washOpacity: 0.5,
      centerR: 11, centerFill: '#5e3b1f',
      stem: 'M100 230 Q 102 175 100 105',
      leaves: [
        { d: 'M100 175 q -28 -4 -38 -22 q 24 -2 38 14', rot: -1,
          vein: 'M100 175 q -20 -6 -34 -20' },
        { d: 'M100 145 q 26 -6 36 -22 q -22 -4 -36 12',  rot: 1,
          vein: 'M100 145 q 20 -6 32 -20' },
      ],
      potTilt: 0,
      seedDots: true,
      mood: 'healthy',
    },
    drooping: {
      headX: 118, headY: 115,
      petals: 10, petalLen: 18, petalW: 5.5,
      petalFill: '#b39265', petalStroke: '#5a3f1d',
      washR: 32, washFill: '#d9bb86', washOpacity: 0.45,
      centerR: 10, centerFill: '#5e3b1f',
      headAngle: 35,
      stem: 'M100 230 Q 100 185 110 155 Q 118 132 118 122',
      leaves: [
        { d: 'M101 188 q -26 4 -38 -10 q 22 -10 38 -2', rot: 4,
          vein: 'M101 188 q -18 0 -32 -8' },
        { d: 'M102 158 q 22 -4 32 -20 q -18 -2 -32 8',  rot: 6,
          vein: 'M102 158 q 16 -4 28 -16' },
      ],
      potTilt: 0,
      seedDots: false,
      mood: 'drooping',
    },
    wilting: {
      headX: 78, headY: 178,
      petals: 8, petalLen: 14, petalW: 5,
      petalFill: '#9a8a6d', petalStroke: '#5a4a32',
      washR: 24, washFill: '#bfae87', washOpacity: 0.4,
      centerR: 8.5, centerFill: '#4a3320',
      headAngle: 110,
      stem: 'M100 230 Q 96 200 88 188 Q 82 184 78 185',
      leaves: [
        { d: 'M99 200 q -24 12 -38 4 q 18 -16 38 -8', rot: 14,
          vein: 'M99 200 q -16 8 -30 4' },
        { d: 'M100 178 q 20 8 32 -2 q -16 -10 -32 -2', rot: 18,
          vein: 'M100 178 q 14 6 26 0' },
      ],
      potTilt: -2,
      seedDots: false,
      mood: 'wilting',
      fallingPetals: true,
    },
  };

  function rand(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function buildPetals(c) {
    let out = '';
    // back-layer petals (slightly offset rotation, more muted) for fullness
    for (let layer = 0; layer < 2; layer++) {
      const isBack = layer === 0;
      const count = c.petals;
      const offset = isBack ? (360 / count) / 2 : 0;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * 360 + (c.headAngle || 0) + offset;
        const jitter = (rand(i + 1 + layer * 31) - 0.5) * 5;
        const lenJ   = (c.petalLen + (rand(i + 7 + layer * 13) - 0.5) * 3) * (isBack ? 0.86 : 1);
        const widthJ = c.petalW + (rand(i + 19 + layer) - 0.5) * 0.8;
        // teardrop petal: base at (headX, headY), tip at (headX, headY-len)
        const cx = c.headX, cy = c.headY;
        const tx = cx, ty = cy - lenJ;
        const d = `M ${cx} ${cy}
                   C ${cx - widthJ*0.9} ${cy - lenJ*0.25}, ${cx - widthJ*0.7} ${cy - lenJ*0.75}, ${tx} ${ty}
                   C ${cx + widthJ*0.7} ${cy - lenJ*0.75}, ${cx + widthJ*0.9} ${cy - lenJ*0.25}, ${cx} ${cy} Z`;
        out += `<path d="${d}"
          fill="${c.petalFill}" stroke="${c.petalStroke}" stroke-width="${isBack ? 0.7 : 0.95}"
          stroke-linejoin="round"
          opacity="${isBack ? 0.72 : 0.94}"
          transform="rotate(${a + jitter} ${c.headX} ${c.headY})" />`;
      }
    }
    return out;
  }

  function buildSeeds(c) {
    if (!c.seedDots) return '';
    let out = '';
    for (let i = 0; i < 9; i++) {
      const angle = rand(i + 11) * Math.PI * 2;
      const r = rand(i + 23) * (c.centerR - 3);
      const cx = c.headX + Math.cos(angle) * r;
      const cy = c.headY + Math.sin(angle) * r;
      out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="0.9" fill="#2b1a0a" opacity="0.8"/>`;
    }
    return out;
  }

  function buildFallingPetals() {
    // 3 small petals on the soil
    return `
      <ellipse cx="55" cy="232" rx="4.5" ry="2" fill="#9a8a6d" stroke="#5a4a32" stroke-width="0.7" transform="rotate(-22 55 232)"/>
      <ellipse cx="138" cy="234" rx="4" ry="1.8" fill="#9a8a6d" stroke="#5a4a32" stroke-width="0.7" transform="rotate(34 138 234)"/>
      <ellipse cx="88" cy="238" rx="4.5" ry="2" fill="#a89878" stroke="#5a4a32" stroke-width="0.7" transform="rotate(8 88 238)"/>
    `;
  }

  function buildLeaves(c) {
    return c.leaves.map(l => `
      <g transform="rotate(${l.rot} 100 170)">
        <path d="${l.d}" fill="#9eb094" stroke="#5c6d52" stroke-width="1.1"
              stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
        <path d="${l.d}" fill="none" stroke="#5c6d52" stroke-width="0.5" opacity="0.35"/>
        ${l.vein ? `<path d="${l.vein}" fill="none" stroke="#4a5a42" stroke-width="0.7" stroke-linecap="round" opacity="0.55"/>` : ''}
      </g>
    `).join('');
  }

  function buildSunflower(state) {
    const c = CONFIGS[state] || CONFIGS.healthy;
    const wobble = 'filter="url(#wobble)"';
    return `
      <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" class="sunflower-svg" preserveAspectRatio="xMidYMax meet">
        <!-- watercolor wash behind head -->
        <circle cx="${c.headX}" cy="${c.headY}" r="${c.washR}"
                fill="${c.washFill}" opacity="${c.washOpacity}" filter="url(#blob)"/>

        <!-- stem -->
        <path d="${c.stem}" stroke="#5c6d52" stroke-width="2.6" fill="none"
              stroke-linecap="round" ${wobble}/>

        <!-- leaves -->
        ${buildLeaves(c)}

        <!-- petals -->
        <g ${wobble}>${buildPetals(c)}</g>

        <!-- head center -->
        <circle cx="${c.headX}" cy="${c.headY}" r="${c.centerR}"
                fill="${c.centerFill}" stroke="#2b1a0a" stroke-width="1.1" ${wobble}/>
        ${buildSeeds(c)}

        <!-- pot (terracotta wash + ink outline) -->
        <g transform="rotate(${c.potTilt} 100 260)">
          <!-- watercolor pot wash -->
          <path d="M52 232 L148 232 L138 290 L62 290 Z"
                fill="#d9a991" opacity="0.55" filter="url(#blob)"/>
          <!-- ink outline -->
          <path d="M52 232 L148 232 L138 290 L62 290 Z"
                fill="#e8c6b8" fill-opacity="0.35"
                stroke="#7a4a3a" stroke-width="1.8"
                stroke-linejoin="round" ${wobble}/>
          <!-- rim line -->
          <path d="M50 232 L150 232" stroke="#7a4a3a" stroke-width="1.8"
                stroke-linecap="round" ${wobble}/>
          <!-- soil ellipse -->
          <ellipse cx="100" cy="232" rx="48" ry="4"
                   fill="#3e2818" opacity="0.55" ${wobble}/>
          <!-- pot hatching texture -->
          <path d="M68 248 L72 286 M88 248 L90 286 M110 248 L110 286 M130 248 L128 286"
                stroke="#7a4a3a" stroke-width="0.6" opacity="0.35" fill="none" ${wobble}/>
        </g>

        ${c.fallingPetals ? buildFallingPetals() : ''}
      </svg>
    `;
  }

  window.renderSunflower = function (el, state) {
    el.innerHTML = buildSunflower(state);
  };

  function hydrate() {
    document.querySelectorAll('[data-sunflower]').forEach(el => {
      const state = el.getAttribute('data-sunflower');
      el.innerHTML = buildSunflower(state);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
})();
