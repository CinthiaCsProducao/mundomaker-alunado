/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/constants/assets.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" width="100%" height="auto" preserveAspectRatio="xRightYMid meet">
  <g transform="translate(20, 20)">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#231f20" stroke-width="4" stroke-dasharray="8 6" />
    <circle cx="50" cy="50" r="25" fill="none" stroke="#231f20" stroke-width="8" />
    <circle cx="85" cy="15" r="15" fill="#231f20" />
    <text x="85" y="20" font-family="Arial, sans-serif" font-weight="bold" font-size="16" fill="white" text-anchor="middle">m</text>
  </g>
  <g transform="translate(140, 65)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-weight="900" font-size="48" fill="#231f20" letter-spacing="-1">mundo</text>
    <text x="0" y="45" font-family="Arial, sans-serif" font-weight="900" font-size="48" fill="#231f20" letter-spacing="-1">maker</text>
  </g>
</svg>`;

const caixaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <polygon points="10,40 50,20 90,40 50,60" fill="#e0b888" stroke="#8c6239" stroke-width="2"/>
  <polygon points="10,40 50,60 50,90 10,70" fill="#c49a6c" stroke="#8c6239" stroke-width="2"/>
  <polygon points="90,40 50,60 50,90 90,70" fill="#a87f52" stroke="#8c6239" stroke-width="2"/>
  <polygon points="30,30 70,50 65,55 25,35" fill="#f4d0a4" opacity="0.7"/>
  <polygon points="50,60 50,90 45,87 45,57" fill="#f4d0a4" opacity="0.7"/>
</svg>`;

const tuboSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <polygon points="35,25 50,15 65,25 50,35" fill="#e0b888" stroke="#8c6239" stroke-width="2" />
  <polygon points="35,25 50,35 50,90 35,80" fill="#c49a6c" stroke="#8c6239" stroke-width="2" />
  <polygon points="65,25 50,35 50,90 65,80" fill="#a87f52" stroke="#8c6239" stroke-width="2" />
  <!-- Open flaps -->
  <polygon points="35,25 20,15 35,10 50,20" fill="#e0b888" stroke="#8c6239" stroke-width="1.5" />
  <polygon points="65,25 80,15 65,10 50,20" fill="#e0b888" stroke="#8c6239" stroke-width="1.5" />
  <polygon points="50,15 35,5 50,0 65,5" fill="#e0b888" stroke="#8c6239" stroke-width="1.5" />
  <polygon points="50,35 35,45 50,55 65,45" fill="#e0b888" stroke="#8c6239" stroke-width="1.5" />
</svg>`;

const caixaPlasticaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <!-- Body Right Panel -->
  <polygon points="50,45 92,32 92,72 50,88" fill="#1f1f1f" />
  <polygon points="50,45 92,32 92,72 50,88" fill="#111111" opacity="0.6"/>

  <!-- Body Left Panel -->
  <polygon points="8,32 50,45 50,88 8,72" fill="#292929" />
  <polygon points="8,32 50,45 50,88 8,72" fill="#111111" opacity="0.4"/>

  <!-- Handle (Left Panel) -->
  <polygon points="17,39 29,42 29,48 17,45" fill="#111" stroke="#000" stroke-width="0.5"/>
  <polygon points="18,40 28,43 28,45 18,42" fill="#000"/>

  <!-- Lid Edge Bottom -->
  <polygon points="6,34 50,47 94,34 94,30 50,43 6,30" fill="#111" />

  <!-- Lid Top -->
  <polygon points="6,30 50,15 94,30 50,43" fill="#242424" stroke="#111" stroke-width="0.5"/>
  <polygon points="12,28 50,17 88,28 50,39" fill="#1f1f1f"/>
  
  <polygon points="12,28 50,17 88,28 50,39" fill="#111111" opacity="0.5"/>

  <!-- Shading and Highlights -->
  <polygon points="6,30 50,43 50,44 6,31" fill="#333" />
</svg>`;

export const LOGO_SVG_RAW = logoSvg;
export const CAIXA_SVG_RAW = caixaSvg;
export const TUBO_SVG_RAW = tuboSvg;
export const CAIXA_PLASTICA_SVG_RAW = caixaPlasticaSvg;

const espagueteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g transform="rotate(10 50 50)">
    <rect x="30" y="10" width="12" height="80" rx="6" fill="#ff6b6b" />
    <rect x="45" y="15" width="12" height="80" rx="6" fill="#4ecdc4" />
    <rect x="60" y="12" width="12" height="80" rx="6" fill="#ffe66d" />
    <rect x="35" y="5" width="12" height="80" rx="6" fill="#a8e6cf" />
    <rect x="55" y="8" width="12" height="80" rx="6" fill="#ff8b94" />
    <path d="M 25 20 Q 50 10 75 25" fill="none" stroke="white" stroke-width="3" opacity="0.6" />
    <path d="M 25 50 Q 50 40 75 55" fill="none" stroke="white" stroke-width="3" opacity="0.6" />
    <path d="M 25 80 Q 50 70 75 85" fill="none" stroke="white" stroke-width="3" opacity="0.6" />
    <rect x="25" y="35" width="50" height="8" fill="#d4a373" opacity="0.8" transform="rotate(-5 50 39)" />
    <rect x="25" y="65" width="50" height="8" fill="#d4a373" opacity="0.8" transform="rotate(-5 50 69)" />
  </g>
</svg>`;

export const ESPAGUETE_SVG_RAW = espagueteSvg;

export const LOGO_SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(logoSvg)))}`;
export const CAIXA_SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(caixaSvg)))}`;
export const TUBO_SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(tuboSvg)))}`;
export const CAIXA_PLASTICA_SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(caixaPlasticaSvg)))}`;
export const ESPAGUETE_SVG = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(espagueteSvg)))}`;
