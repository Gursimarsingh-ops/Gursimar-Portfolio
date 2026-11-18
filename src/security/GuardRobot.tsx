/**
 * Unit S-04 — heavy patrol android in a police uniform.
 *
 * Rendered as layered metal: a dark structural body carries brushed-steel
 * armour plates with individual edge highlights, bevels and rivets. Every
 * major plate has its own specular gradient, so the figure reads as solid
 * machined metal rather than flat vector shapes.
 *
 * The build is deliberately heavy: broad layered pauldrons, a deep chest
 * carapace with segmented abdominal plates, reinforced thighs, knee servos,
 * armoured boots and thick forearms gripping a side-handled baton.
 *
 * Motion is de-synchronised so the unit never looks looped: slow weight shift
 * across the whole body, torso breathing, head scanning that pauses to look
 * forward, a shutter blink, articulated arms, drifting hands and baton sway.
 */
export function GuardRobot({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 340"
      className={className}
      role="img"
      aria-label="Heavy robotic police officer in layered metallic armour holding a side-handled baton"
    >
      <defs>
        {/* Brushed steel, lit from the upper left. */}
        <linearGradient id="gx-steel" x1="0.08" y1="0" x2="0.86" y2="1">
          <stop offset="0%" stopColor="#f2f6fa" />
          <stop offset="14%" stopColor="#c9d3de" />
          <stop offset="42%" stopColor="#96a1af" />
          <stop offset="70%" stopColor="#5d6875" />
          <stop offset="100%" stopColor="#2b333d" />
        </linearGradient>
        <linearGradient id="gx-steel-mid" x1="0.16" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#c3ccd7" />
          <stop offset="38%" stopColor="#8590a0" />
          <stop offset="76%" stopColor="#4c5765" />
          <stop offset="100%" stopColor="#232a33" />
        </linearGradient>
        <linearGradient id="gx-gun" x1="0.2" y1="0" x2="0.84" y2="1">
          <stop offset="0%" stopColor="#4a5563" />
          <stop offset="46%" stopColor="#2c343f" />
          <stop offset="100%" stopColor="#10151b" />
        </linearGradient>
        <linearGradient id="gx-gun-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#333c47" />
          <stop offset="55%" stopColor="#1b222a" />
          <stop offset="100%" stopColor="#0a0d12" />
        </linearGradient>
        <linearGradient id="gx-plate" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#6f7b8a" />
          <stop offset="26%" stopColor="#aab5c2" />
          <stop offset="58%" stopColor="#7d8896" />
          <stop offset="100%" stopColor="#3b4552" />
        </linearGradient>
        <linearGradient id="gx-visor" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#182430" />
          <stop offset="46%" stopColor="#0c141c" />
          <stop offset="100%" stopColor="#04070a" />
        </linearGradient>
        <linearGradient id="gx-gold" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#fbeec2" />
          <stop offset="38%" stopColor="#e2c073" />
          <stop offset="74%" stopColor="#b7933f" />
          <stop offset="100%" stopColor="#7a6127" />
        </linearGradient>
        <linearGradient id="gx-sheen" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.78" />
          <stop offset="34%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="62%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gx-sheen-soft" x1="0" y1="0" x2="0.4" y2="0.9">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gx-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff4a4a" stopOpacity="0" />
          <stop offset="62%" stopColor="#ff5c5c" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ff8a5c" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="gx-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f4ffff" />
          <stop offset="26%" stopColor="#a9f2ff" />
          <stop offset="58%" stopColor="#3ecdf5" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0b7ea8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gx-eye-core" cx="42%" cy="36%" r="62%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="52%" stopColor="#c4f8ff" />
          <stop offset="100%" stopColor="#45d4f2" />
        </radialGradient>
        <radialGradient id="gx-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
          <stop offset="62%" stopColor="#000000" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gx-floor-red" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff3b3b" stopOpacity="0" />
          <stop offset="50%" stopColor="#ff5a5a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gx-cyan-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9cf0ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3fd0f0" stopOpacity="0" />
        </linearGradient>

        <filter id="gx-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="gx-bloom" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id="gx-depth" x="-30%" y="-30%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>

        <clipPath id="gx-visor-clip">
          <rect x="93" y="41.5" width="54" height="17.5" rx="8.75" />
        </clipPath>
        <clipPath id="gx-chest-clip">
          <path d="M82 100 C90 90 104 86 120 86 C136 86 150 90 158 100 L154 146 C150 160 138 166 120 166 C102 166 90 160 86 146 Z" />
        </clipPath>
      </defs>

      {/* ---------------------------- ground contact ---------------------------- */}
      <ellipse cx="120" cy="329" rx="74" ry="12" fill="url(#gx-shadow)" />
      <ellipse cx="120" cy="330" rx="90" ry="9" fill="url(#gx-floor-red)" opacity="0.42" />
      <ellipse cx="120" cy="325" rx="34" ry="4.4" fill="#05080b" opacity="0.75" />

      {/* diffuse silhouette behind the unit for depth */}
      <g filter="url(#gx-depth)" opacity="0.6">
        <path d="M74 96 C76 88 90 82 120 82 C150 82 164 88 166 96 L162 170 C160 184 148 192 120 192 C92 192 80 184 78 170 Z" fill="#04060a" />
        <ellipse cx="120" cy="50" rx="33" ry="34" fill="#04060a" />
      </g>

      <g style={{ animation: "guard-idle 8.4s ease-in-out infinite", transformOrigin: "120px 326px" }}>
        {/* ================================= LEGS ================================= */}
        <g>
          {/* structural thigh and shin cores */}
          <path d="M85 220 C84 240 84 256 85 264 C86 270 90 273 96 273 L110 273 C115 273 118 270 118 264 C119 250 119 236 118 220 Z" fill="url(#gx-gun)" />
          <path d="M155 220 C156 240 156 256 155 264 C154 270 150 273 144 273 L130 273 C125 273 122 270 122 264 C121 250 121 236 122 220 Z" fill="url(#gx-gun)" />

          {/* thigh armour plates, chamfered with a lit leading edge */}
          <path d="M87 224 L116 224 L114 258 L90 258 Z" fill="url(#gx-steel-mid)" />
          <path d="M87 224 L98 224 L96 258 L90 258 Z" fill="url(#gx-sheen-soft)" />
          <path d="M124 224 L153 224 L150 258 L126 258 Z" fill="url(#gx-steel-mid)" />
          <path d="M124 224 L134 224 L132 258 L126 258 Z" fill="url(#gx-sheen-soft)" opacity="0.7" />
          <path d="M87 224 L116 224" stroke="#eef4fa" strokeWidth="0.9" opacity="0.5" />
          <path d="M124 224 L153 224" stroke="#eef4fa" strokeWidth="0.9" opacity="0.38" />
          <path d="M92 240 L112 240" stroke="#131a22" strokeWidth="0.7" opacity="0.6" />
          <path d="M128 240 L148 240" stroke="#131a22" strokeWidth="0.7" opacity="0.6" />
          <circle cx="100" cy="249" r="1.1" fill="#cfd9e4" opacity="0.5" />
          <circle cx="140" cy="249" r="1.1" fill="#cfd9e4" opacity="0.4" />

          {/* knee servo housings */}
          <path d="M89 262 L117 262 L115 279 L91 279 Z" fill="url(#gx-gun-dark)" stroke="#0a0d11" strokeWidth="0.7" />
          <path d="M123 262 L151 262 L149 279 L125 279 Z" fill="url(#gx-gun-dark)" stroke="#0a0d11" strokeWidth="0.7" />
          <circle cx="103" cy="270" r="6.4" fill="url(#gx-steel)" stroke="#0b0f14" strokeWidth="0.8" />
          <circle cx="137" cy="270" r="6.4" fill="url(#gx-steel)" stroke="#0b0f14" strokeWidth="0.8" />
          <circle cx="103" cy="270" r="2.1" fill="#0b1016" />
          <circle cx="137" cy="270" r="2.1" fill="#0b1016" />
          <path d="M100 267 L100 273" stroke="#e6eef6" strokeWidth="0.7" opacity="0.55" />
          <path d="M134 267 L134 273" stroke="#e6eef6" strokeWidth="0.7" opacity="0.45" />
          <rect x="91" y="275" width="26" height="1.6" rx="0.8" fill="#7ee9ff" opacity="0.5" style={{ animation: "guard-led 3.6s ease-in-out infinite" }} />
          <rect x="125" y="275" width="26" height="1.6" rx="0.8" fill="#7ee9ff" opacity="0.4" style={{ animation: "guard-led 3.6s ease-in-out 1.1s infinite" }} />

          {/* shin cores */}
          <path d="M87 282 L87 306 L117 306 L118 282 Z" fill="url(#gx-gun-dark)" />
          <path d="M153 282 L153 306 L123 306 L122 282 Z" fill="url(#gx-gun-dark)" />
          {/* shin guards */}
          <path d="M89 285 L115 285 L114 303 L91 303 Z" fill="url(#gx-plate)" />
          <path d="M125 285 L151 285 L149 303 L126 303 Z" fill="url(#gx-plate)" opacity="0.94" />
          <path d="M89 285 L115 285" stroke="#f4f8fc" strokeWidth="0.8" opacity="0.45" />
          <path d="M125 285 L151 285" stroke="#f4f8fc" strokeWidth="0.8" opacity="0.35" />
          {[291, 295, 299].map((y) => (
            <g key={y}>
              <path d={`M95 ${y} L109 ${y}`} stroke="#0e141a" strokeWidth="0.9" opacity="0.6" />
              <path d={`M131 ${y} L145 ${y}`} stroke="#0e141a" strokeWidth="0.9" opacity="0.6" />
            </g>
          ))}
          {/* ankle actuator */}
          <circle cx="102" cy="305" r="4.4" fill="url(#gx-steel-mid)" stroke="#0b0f14" strokeWidth="0.6" />
          <circle cx="138" cy="305" r="4.4" fill="url(#gx-steel-mid)" stroke="#0b0f14" strokeWidth="0.6" />

          {/* armoured boots: sole, toe cap, buckle, brushing */}
          <path d="M85 303 L82 319 C82 324 86 327 91 327 L115 327 C119 327 121 324 121 319 L119 303 Z" fill="#0a0e13" stroke="#2f3844" strokeWidth="0.9" />
          <path d="M155 303 L158 319 C158 324 154 327 149 327 L125 327 C121 327 119 324 119 319 L121 303 Z" fill="#0a0e13" stroke="#2f3844" strokeWidth="0.9" />
          <path d="M84 316 L120 316" stroke="url(#gx-steel)" strokeWidth="2.6" />
          <path d="M156 316 L120 316" stroke="url(#gx-steel)" strokeWidth="2.6" />
          <path d="M86 308 L114 308 L115 313 L85 313 Z" fill="url(#gx-plate)" opacity="0.9" />
          <path d="M154 308 L126 308 L125 313 L155 313 Z" fill="url(#gx-plate)" opacity="0.86" />
          <path d="M87 323 L117 323" stroke="#4d5765" strokeWidth="0.9" />
          <path d="M153 323 L123 323" stroke="#4d5765" strokeWidth="0.9" />
          <rect x="95" y="309" width="8" height="3.4" rx="1.2" fill="#0b1016" stroke="#6c7784" strokeWidth="0.4" />
          <rect x="137" y="309" width="8" height="3.4" rx="1.2" fill="#0b1016" stroke="#6c7784" strokeWidth="0.4" />
        </g>

        {/* ============================ TORSO + BELT ============================ */}
        <g style={{ animation: "guard-breathe 6.4s ease-in-out infinite", transformOrigin: "120px 186px" }}>
          {/* torso core */}
          <path
            d="M74 96 C76 88 90 82 120 82 C150 82 164 88 166 96 L162 168 C160 182 148 190 120 190 C92 190 80 182 78 168 Z"
            fill="url(#gx-gun)"
            stroke="#39434f"
            strokeWidth="1"
          />

          {/* chest carapace */}
          <path
            d="M82 100 C90 90 104 86 120 86 C136 86 150 90 158 100 L154 146 C150 160 138 166 120 166 C102 166 90 160 86 146 Z"
            fill="url(#gx-steel)"
          />
          <g clipPath="url(#gx-chest-clip)">
            <rect x="78" y="84" width="84" height="88" fill="url(#gx-sheen)" opacity="0.55" />
            <path d="M78 132 L162 112 L162 124 L78 144 Z" fill="#ffffff" opacity="0.07" />
            <path d="M96 84 C104 108 104 144 100 168" stroke="#0f151c" strokeWidth="1" opacity="0.55" fill="none" />
            <path d="M144 84 C136 108 136 144 140 168" stroke="#0f151c" strokeWidth="1" opacity="0.42" fill="none" />
            <path d="M120 86 L120 166" stroke="#10161d" strokeWidth="1.2" opacity="0.7" />
            <path d="M119 88 L119 164" stroke="#eaf2fa" strokeWidth="0.6" opacity="0.35" />
          </g>
          <path d="M82 100 C90 90 104 86 120 86 C136 86 150 90 158 100" stroke="#f6faff" strokeWidth="1" opacity="0.45" fill="none" />

          {/* pectoral detail: rank bars, vents, badge */}
          <g opacity="0.85">
            {[0, 1, 2].map((i) => (
              <rect key={i} x="130" y={120 + i * 4} width="17" height="1.6" rx="0.8" fill="#0d1319" />
            ))}
            <rect x="130" y="118" width="17" height="1.1" rx="0.5" fill="#a8b4c2" opacity="0.4" />
          </g>
          <g transform="translate(98 108)">
            <path
              d="M0 1.5 L9 0 L18 1.5 L18 10 C18 16 13.5 20 9 22 C4.5 20 0 16 0 10 Z"
              fill="url(#gx-gold)"
              stroke="#6d5822"
              strokeWidth="0.8"
            />
            <path d="M9 3.6 L10.6 8 L15.2 8 L11.5 11 L12.9 15.5 L9 12.8 L5.1 15.5 L6.5 11 L2.8 8 L7.4 8 Z" fill="#fff8dd" opacity="0.9" />
            <path d="M9 18.4 L9 20" stroke="#8a7130" strokeWidth="0.7" />
          </g>

          {/* abdominal plates */}
          <path d="M100 146 L140 146 L137 160 L103 160 Z" fill="url(#gx-gun-dark)" stroke="#0c1117" strokeWidth="0.6" />
          <path d="M102 162 L138 162 L135 175 L105 175 Z" fill="url(#gx-gun-dark)" stroke="#0c1117" strokeWidth="0.6" />
          <path d="M104 177 L136 177 L133 188 L107 188 Z" fill="url(#gx-gun-dark)" stroke="#0c1117" strokeWidth="0.6" />
          {[146, 162, 177].map((y, index) => (
            <path key={y} d={`M${101 + index} ${y} L${139 - index} ${y}`} stroke="#b6c2cf" strokeWidth="0.7" opacity="0.32" />
          ))}
          <rect x="110" y="152" width="20" height="1.6" rx="0.8" fill="#7ee9ff" opacity="0.45" style={{ animation: "guard-led 4.2s ease-in-out infinite" }} />

          {/* collar ring and neck cuff */}
          <ellipse cx="120" cy="86" rx="21" ry="5.6" fill="#0b1016" />
          <path d="M99 86 C105 95 135 95 141 86 L147 93 C137 101 103 101 93 93 Z" fill="url(#gx-steel-mid)" stroke="#1a222b" strokeWidth="0.8" />
          <path d="M101 89 C108 96 132 96 139 89" stroke="#f2f7fc" strokeWidth="0.7" opacity="0.4" fill="none" />

          {/* ---------------- shoulder pauldrons (three layered plates) ---------------- */}
          {([-1, 1] as const).map((side) => {
            const flip = side === 1;
            return (
              <g key={side}>
                {/* upper plate */}
                <path
                  d={flip ? "M46 97 C46 82 58 73 73 76 L78 105 C64 112 47 108 46 97 Z" : "M194 97 C194 82 182 73 167 76 L162 105 C176 112 193 108 194 97 Z"}
                  fill="url(#gx-steel)"
                  stroke="#161d25"
                  strokeWidth="1"
                />
                {/* lower plate */}
                <path
                  d={flip ? "M49 105 C61 112 74 111 80 105 L80 119 C70 126 54 122 50 114 Z" : "M191 105 C179 112 166 111 160 105 L160 119 C170 126 186 122 190 114 Z"}
                  fill="url(#gx-steel-mid)"
                  stroke="#141b23"
                  strokeWidth="0.9"
                />
                {/* swept leading edge light */}
                <path
                  d={flip ? "M48 92 C54 82 64 77 74 78" : "M192 92 C186 82 176 77 166 78"}
                  stroke="#ffffff"
                  strokeWidth="1.1"
                  opacity="0.55"
                  fill="none"
                />
                <path
                  d={flip ? "M52 110 C63 115 72 114 78 110" : "M188 110 C177 115 168 114 162 110"}
                  stroke="#dbe5ef"
                  strokeWidth="0.6"
                  opacity="0.35"
                  fill="none"
                />
                {/* rank bars + rivets */}
                {[0, 1].map((i) => (
                  <rect
                    key={i}
                    x={flip ? 55 : 168}
                    y={93 + i * 4}
                    width="15"
                    height="1.6"
                    rx="0.8"
                    fill="#7ee9ff"
                    opacity={i === 0 ? 0.8 : 0.5}
                    style={{ animation: "guard-led 4.8s ease-in-out infinite" }}
                  />
                ))}
                <circle cx={flip ? 60 : 180} cy="104" r="1.2" fill="#e8f1fa" opacity="0.5" />
                <circle cx={flip ? 72 : 168} cy="108" r="1.1" fill="#e8f1fa" opacity="0.35" />
              </g>
            );
          })}

          {/* ------------------------------- duty belt ------------------------------- */}
          <path d="M80 186 L160 186 L158 203 C146 210 94 210 82 203 Z" fill="#080c11" stroke="#2c3541" strokeWidth="1" />
          <path d="M81 188 L159 188" stroke="#8b97a5" strokeWidth="0.8" opacity="0.45" />
          <rect x="108" y="188" width="24" height="16" rx="3" fill="url(#gx-steel)" stroke="#10161d" strokeWidth="0.8" />
          <circle cx="120" cy="196" r="4.2" fill="#0b1016" stroke="#c8d4e0" strokeWidth="0.7" />
          <circle cx="120" cy="196" r="1.4" fill="#7ee9ff" opacity="0.75" style={{ animation: "guard-led 2.8s ease-in-out infinite" }} />
          <rect x="86" y="189" width="15" height="14" rx="2.4" fill="url(#gx-gun-dark)" stroke="#39434f" strokeWidth="0.7" />
          <rect x="139" y="189" width="15" height="14" rx="2.4" fill="url(#gx-gun-dark)" stroke="#39434f" strokeWidth="0.7" />
          <path d="M89 195 L98 195" stroke="#7d8896" strokeWidth="0.6" />
          <path d="M142 195 L151 195" stroke="#7d8896" strokeWidth="0.6" />
          <path d="M86 189 L101 189" stroke="#dfe8f1" strokeWidth="0.6" opacity="0.4" />
          <path d="M139 189 L154 189" stroke="#dfe8f1" strokeWidth="0.6" opacity="0.3" />

          {/* ---------------- pelvis armour ---------------- */}
          <path d="M82 203 L158 203 L154 228 C146 237 94 237 86 228 Z" fill="url(#gx-gun)" stroke="#1b232c" strokeWidth="0.9" />
          <path d="M104 206 L136 206 L132 232 L108 232 Z" fill="url(#gx-steel-mid)" />
          <path d="M104 206 L113 206 L110 232 L108 232 Z" fill="url(#gx-sheen-soft)" opacity="0.7" />
          <path d="M104 206 L136 206" stroke="#f2f8fd" strokeWidth="0.8" opacity="0.4" />
          <circle cx="88" cy="212" r="4" fill="url(#gx-steel-mid)" stroke="#0e141a" strokeWidth="0.6" />
          <circle cx="152" cy="212" r="4" fill="url(#gx-steel-mid)" stroke="#0e141a" strokeWidth="0.6" />
          <path d="M96 224 L144 224" stroke="#0d1319" strokeWidth="0.7" opacity="0.6" />
        </g>

        {/* =============================== LEFT ARM =============================== */}
        <g style={{ animation: "guard-arm-left 8.8s ease-in-out infinite", transformOrigin: "78px 106px" }}>
          {/* shoulder ball */}
          <circle cx="74" cy="110" r="10.5" fill="url(#gx-gun-dark)" stroke="#0c1117" strokeWidth="0.8" />
          <circle cx="74" cy="110" r="5.4" fill="url(#gx-steel-mid)" />
          <circle cx="74" cy="110" r="2" fill="#0b1016" />

          {/* upper arm */}
          <path d="M62 112 C54 128 52 148 54 166 C54 174 59 178 66 177 C72 176 76 170 76 162 L78 118 Z" fill="url(#gx-gun)" stroke="#1a222b" strokeWidth="0.8" />
          <path d="M60 118 C54 132 53 148 55 161 L68 159 L70 122 Z" fill="url(#gx-steel-mid)" opacity="0.9" />
          <path d="M60 118 C55 131 54 146 55 158" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" fill="none" />
          <path d="M57 140 L69 138" stroke="#0e141a" strokeWidth="0.7" opacity="0.55" />
          <circle cx="65" cy="130" r="1.1" fill="#dbe5ef" opacity="0.45" />

          {/* elbow actuator */}
          <circle cx="62" cy="173" r="9" fill="url(#gx-steel)" stroke="#0b1016" strokeWidth="0.9" />
          <circle cx="62" cy="173" r="4.4" fill="#11171e" />
          <circle cx="62" cy="173" r="1.6" fill="#7ee9ff" opacity="0.55" />
          <path d="M58 169 L59 177" stroke="#f2f8fd" strokeWidth="0.7" opacity="0.5" />

          {/* forearm + wrist cuff */}
          <path d="M52 178 C48 192 48 205 50 216 C51 223 56 227 63 227 C70 227 74 223 74 216 L74 182 Z" fill="url(#gx-gun)" stroke="#1a222b" strokeWidth="0.8" />
          <path d="M54 182 L72 182 L70 210 L55 210 Z" fill="url(#gx-steel-mid)" opacity="0.92" />
          <path d="M54 182 L60 182 L58 210 L55 210 Z" fill="url(#gx-sheen-soft)" opacity="0.6" />
          <path d="M54 182 L72 182" stroke="#ffffff" strokeWidth="0.7" opacity="0.45" />
          <path d="M56 196 L69 196" stroke="#0e141a" strokeWidth="0.7" opacity="0.5" />
          <rect x="56" y="213" width="16" height="4" rx="2" fill="url(#gx-plate)" stroke="#0e141a" strokeWidth="0.5" />

          {/* hand */}
          <g style={{ animation: "guard-hand-idle 6.2s ease-in-out infinite", transformOrigin: "63px 232px" }}>
            <path d="M52 224 L52 240 C52 246 57 250 63 250 L70 250 C75 250 78 246 78 241 L78 224 Z" fill="url(#gx-steel)" stroke="#10161d" strokeWidth="0.7" />
            <path d="M52 224 L64 224 L62 244 L53 240 Z" fill="url(#gx-sheen-soft)" opacity="0.55" />
            <path d="M61 231 L61 248" stroke="#3c4653" strokeWidth="0.8" />
            <path d="M67 231 L67 249" stroke="#3c4653" strokeWidth="0.8" />
            <path d="M73 232 L73 248" stroke="#3c4653" strokeWidth="0.8" />
            <path d="M55 246 L75 246" stroke="#2b333d" strokeWidth="0.7" opacity="0.8" />
            <path d="M47 234 C45 238 45 243 47 246" stroke="url(#gx-steel)" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        </g>

        {/* ========================= RIGHT ARM + BATON ========================= */}
        <g style={{ animation: "guard-arm-right 8.8s ease-in-out infinite", transformOrigin: "162px 106px" }}>
          <circle cx="166" cy="110" r="10.5" fill="url(#gx-gun-dark)" stroke="#0c1117" strokeWidth="0.8" />
          <circle cx="166" cy="110" r="5.4" fill="url(#gx-steel-mid)" />
          <circle cx="166" cy="110" r="2" fill="#0b1016" />

          <path d="M178 112 C186 128 188 148 186 166 C186 174 181 178 174 177 C168 176 164 170 164 162 L162 118 Z" fill="url(#gx-gun)" stroke="#1a222b" strokeWidth="0.8" />
          <path d="M180 118 C186 132 187 148 185 161 L172 159 L170 122 Z" fill="url(#gx-steel-mid)" opacity="0.82" />
          <path d="M180 118 C185 131 186 146 185 158" stroke="#ffffff" strokeWidth="0.8" opacity="0.35" fill="none" />
          <path d="M183 140 L171 138" stroke="#0e141a" strokeWidth="0.7" opacity="0.5" />
          <circle cx="175" cy="130" r="1.1" fill="#dbe5ef" opacity="0.35" />

          <circle cx="178" cy="173" r="9" fill="url(#gx-steel)" stroke="#0b1016" strokeWidth="0.9" />
          <circle cx="178" cy="173" r="4.4" fill="#11171e" />
          <circle cx="178" cy="173" r="1.6" fill="#7ee9ff" opacity="0.45" />

          <path d="M188 178 C192 192 192 205 190 216 C189 223 184 227 177 227 C170 227 166 223 166 216 L166 182 Z" fill="url(#gx-gun)" stroke="#1a222b" strokeWidth="0.8" />
          <path d="M186 182 L168 182 L170 210 L185 210 Z" fill="url(#gx-steel-mid)" opacity="0.88" />
          <path d="M186 182 L180 182 L182 210 L185 210 Z" fill="url(#gx-sheen-soft)" opacity="0.5" />
          <path d="M186 182 L168 182" stroke="#ffffff" strokeWidth="0.7" opacity="0.35" />
          <path d="M184 196 L171 196" stroke="#0e141a" strokeWidth="0.7" opacity="0.45" />
          <rect x="168" y="213" width="16" height="4" rx="2" fill="url(#gx-plate)" stroke="#0e141a" strokeWidth="0.5" />
        </g>

        {/* baton and gripping hand travel together */}
        <g style={{ animation: "guard-baton-sway 9.6s ease-in-out infinite", transformOrigin: "178px 232px" }}>
          <path d="M188 224 L188 240 C188 246 183 250 177 250 L170 250 C165 250 162 246 162 241 L162 224 Z" fill="url(#gx-steel)" stroke="#10161d" strokeWidth="0.7" />
          <path d="M188 224 L176 224 L178 244 L187 240 Z" fill="url(#gx-sheen-soft)" opacity="0.5" />
          <path d="M179 231 L179 248" stroke="#3c4653" strokeWidth="0.8" />
          <path d="M173 231 L173 249" stroke="#3c4653" strokeWidth="0.8" />
          <path d="M167 232 L167 248" stroke="#3c4653" strokeWidth="0.8" />
          <path d="M165 246 L185 246" stroke="#2b333d" strokeWidth="0.7" opacity="0.8" />

          {/* side-handled baton */}
          <g transform="rotate(9 175 250)">
            <rect x="168" y="246" width="14" height="30" rx="5.5" fill="#0c1218" stroke="#39434f" strokeWidth="0.8" />
            {[252, 257, 262, 267].map((y) => (
              <path key={y} d={`M169.5 ${y} L180.5 ${y}`} stroke="#616e7d" strokeWidth="0.8" opacity="0.85" />
            ))}
            <rect x="170" y="274" width="10" height="62" rx="4.4" fill="url(#gx-steel-mid)" stroke="#080b0f" strokeWidth="0.7" />
            <rect x="171.6" y="278" width="3" height="54" rx="1.5" fill="#ffffff" opacity="0.28" />
            <rect x="169.6" y="332" width="10.8" height="8" rx="3.6" fill="url(#gx-steel)" stroke="#1d242c" strokeWidth="0.7" />
            <path d="M170.6 334.4 L179.4 334.4" stroke="#ffffff" strokeWidth="0.7" opacity="0.5" />
            {/* side handle */}
            <rect x="181" y="252" width="7" height="17" rx="3.2" fill="url(#gx-gun-dark)" stroke="#0b0f14" strokeWidth="0.6" />
            <circle cx="184.5" cy="270" r="3" fill="url(#gx-steel-mid)" />
          </g>
        </g>

        {/* ================================ HEAD ================================ */}
        <g style={{ animation: "guard-scan-pause 13.5s ease-in-out infinite", transformOrigin: "120px 82px" }}>
          {/* neck column */}
          <rect x="106" y="68" width="28" height="20" rx="6" fill="url(#gx-gun-dark)" stroke="#0a0e13" strokeWidth="0.8" />
          <path d="M110 73 L130 73" stroke="#77838f" strokeWidth="0.8" opacity="0.5" />
          <path d="M110 79 L130 79" stroke="#77838f" strokeWidth="0.7" opacity="0.38" />
          <path d="M110 85 L130 85" stroke="#77838f" strokeWidth="0.7" opacity="0.3" />

          {/* helmet shell */}
          <path
            d="M88 46 C88 26 100 14 120 14 C140 14 152 26 152 46 L151 62 C151 72 140 78 120 78 C100 78 89 72 89 62 Z"
            fill="url(#gx-steel)"
            stroke="#121922"
            strokeWidth="1.1"
          />
          <path
            d="M88 46 C88 26 100 14 120 14 C140 14 152 26 152 46 L151 62 C151 72 140 78 120 78 C100 78 89 72 89 62 Z"
            fill="url(#gx-sheen)"
            opacity="0.55"
          />
          {/* crown seam and crest */}
          <path d="M120 14 L120 34" stroke="#1a222b" strokeWidth="1.2" opacity="0.6" />
          <path d="M96 20 C104 15 112 14 120 14" stroke="#ffffff" strokeWidth="1" opacity="0.55" fill="none" />
          <path d="M144 20 C136 15 128 14 120 14" stroke="#ffffff" strokeWidth="0.8" opacity="0.3" fill="none" />
          <rect x="104" y="10.5" width="32" height="6" rx="3" fill="url(#gx-gun-dark)" stroke="#0b1016" strokeWidth="0.7" />
          <rect x="106" y="11.6" width="28" height="1.6" rx="0.8" fill="#a9d8e8" opacity="0.35" />
          <rect x="116" y="9.6" width="8" height="2.6" rx="1.3" fill="#8ef0ff" opacity="0.8" style={{ animation: "guard-led 3.2s ease-in-out infinite" }} />

          {/* brow housing + visor glass */}
          <path d="M89 44 L151 44 L150 60 C150 68 138 73 120 73 C102 73 90 68 90 60 Z" fill="url(#gx-visor)" stroke="#1a222b" strokeWidth="0.9" />
          <rect x="93" y="41.5" width="54" height="17.5" rx="8.75" fill="#05090d" stroke="#2b3540" strokeWidth="0.9" />
          <rect x="95" y="43" width="50" height="2.4" rx="1.2" fill="#4a5764" opacity="0.45" />

          {/* independent optical units */}
          <g>
            <circle cx="109" cy="50.5" r="9.5" fill="url(#gx-eye)" style={{ animation: "guard-led 3.6s ease-in-out infinite" }} />
            <circle cx="131" cy="50.5" r="9.5" fill="url(#gx-eye)" style={{ animation: "guard-led 3.6s ease-in-out 0.8s infinite" }} />
            <circle cx="109" cy="50.5" r="3.9" fill="url(#gx-eye-core)" filter="url(#gx-soft)" />
            <circle cx="131" cy="50.5" r="3.9" fill="url(#gx-eye-core)" filter="url(#gx-soft)" />
            <circle cx="109" cy="50.5" r="1.5" fill="#ffffff" />
            <circle cx="131" cy="50.5" r="1.5" fill="#ffffff" />
            <path d="M103 46.6 L115 46.6" stroke="#e2fbff" strokeWidth="0.9" opacity="0.75" />
            <path d="M125 46.6 L137 46.6" stroke="#e2fbff" strokeWidth="0.9" opacity="0.6" />
          </g>

          {/* shutter blink */}
          <g style={{ animation: "guard-blink 7.4s ease-in-out infinite", transformOrigin: "120px 50.5px" }} clipPath="url(#gx-visor-clip)">
            <rect x="92" y="40.5" width="56" height="7.5" fill="#0b1117" />
            <rect x="92" y="52.5" width="56" height="7.5" fill="#0b1117" />
          </g>
          {/* visor scan sweep */}
          <g clipPath="url(#gx-visor-clip)">
            <rect x="93" y="41.5" width="11" height="17.5" fill="#c4f6ff" opacity="0.16" style={{ animation: "guard-scanner 7s linear infinite" }} />
            <path d="M93 59 L147 43" stroke="#8fe8ff" strokeWidth="0.6" opacity="0.18" />
          </g>

          {/* jaw guard with grille */}
          <path d="M99 66 L141 66 L137 77 C131 80 109 80 103 77 Z" fill="url(#gx-steel-mid)" stroke="#0b1016" strokeWidth="0.8" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${106 + i * 7} 68.5 L${106 + i * 7} 77`} stroke="#1b232c" strokeWidth="1.1" opacity="0.7" />
          ))}
          <path d="M100 66 L140 66" stroke="#f4f9fd" strokeWidth="0.7" opacity="0.4" />
          {/* cheek plates */}
          <path d="M91 52 C89 60 91 68 95 71 L99 65 L98 54 Z" fill="url(#gx-gun-dark)" stroke="#0b1016" strokeWidth="0.7" />
          <path d="M149 52 C151 60 149 68 145 71 L141 65 L142 54 Z" fill="url(#gx-gun-dark)" stroke="#0b1016" strokeWidth="0.7" />

          {/* ear pods */}
          <rect x="82" y="44" width="9" height="19" rx="4.2" fill="url(#gx-steel-mid)" stroke="#0b1016" strokeWidth="0.8" />
          <rect x="149" y="44" width="9" height="19" rx="4.2" fill="url(#gx-steel-mid)" stroke="#0b1016" strokeWidth="0.8" />
          <circle cx="86.5" cy="53.5" r="2.2" fill="#0c1218" />
          <circle cx="153.5" cy="53.5" r="2.2" fill="#0c1218" />
          <circle cx="86.5" cy="53.5" r="0.9" fill="#7ee9ff" style={{ animation: "guard-led 2.8s ease-in-out infinite" }} />
          <circle cx="153.5" cy="53.5" r="0.9" fill="#7ee9ff" style={{ animation: "guard-led 2.8s ease-in-out 1.4s infinite" }} />

          {/* peaked cap brim */}
          <path d="M84 43 C94 39.6 146 39.6 156 43 C157.4 45.8 146 49 120 49 C94 49 82.6 45.8 84 43 Z" fill="#080c11" stroke="#2a333e" strokeWidth="0.8" />
          <path d="M90 43.6 C100 41.4 140 41.4 150 43.6" stroke="#a4b1be" strokeWidth="0.7" opacity="0.45" fill="none" />
          {/* cap badge */}
          <g transform="translate(120 32)">
            <path d="M0 -5.2 L6.4 -2.6 L6.4 2.6 L0 6 L-6.4 2.6 L-6.4 -2.6 Z" fill="url(#gx-gold)" stroke="#6d5822" strokeWidth="0.7" />
            <circle cx="0" cy="0.2" r="1.7" fill="#fff8dd" opacity="0.92" />
            <path d="M0 -3.2 L0 3.8" stroke="#8a7130" strokeWidth="0.5" />
          </g>
        </g>

        {/* visor spill onto the collar and chest */}
        <path d="M100 78 L140 78 L134 98 L106 98 Z" fill="url(#gx-cyan-spill)" opacity="0.22" filter="url(#gx-bloom)" />

        {/* red siren rim light down the right-hand silhouette */}
        <path d="M166 98 C168 116 164 150 160 176 L154 176 C158 150 162 118 160 98 Z" fill="url(#gx-rim)" opacity="0.4" filter="url(#gx-soft)" />
        <path d="M78 100 C76 120 79 152 84 178" stroke="url(#gx-rim)" strokeWidth="2" opacity="0.22" fill="none" filter="url(#gx-soft)" />
      </g>
    </svg>
  );
}
