/**
 * Dessine les dix croquis techniques de la page d'accueil.
 *
 *   node scripts/draw-home-sketches.mjs
 *
 * Pourquoi les dessiner plutôt que les chercher : une banque d'images libres
 * ne donne ni la cohérence de trait ni la justesse du sujet. Ici les dix
 * planches sortent de la même main, au même gabarit, dans les couleurs du
 * logo — et aucune licence tierce ne pèse dessus.
 *
 * Le script est la source unique : il écrit les SVG *et*
 * lib/home-images.generated.ts. Pour retoucher une planche, modifier sa
 * fonction ci-dessous et relancer.
 */

import fs from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("public/images/home");
const W = 480;
const H = 300;

/* Palette du logo, reprise telle quelle. */
const INK = "#242249"; // brand-navy : le trait principal
const THIN = "#5b5a7d"; // détails et lignes secondaires
const HATCH = "#a8a7bd"; // hachures de coupe
const ACCENT = "#ffae29"; // brand-orange : cotes et pièce en vedette
const GRID = "#e3e3ec";
const PAPER = "#f7f7fa";

/* Épaisseurs, dans l'esprit d'un plan : contour franc, détail léger. */
const OUTLINE = 2.2;
const DETAIL = 1.2;
const LIGHT = 0.9;

/** Axe de symétrie : trait d'axe mixte, comme sur un plan coté. */
const axisV = (x, y1, y2) =>
  `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${ACCENT}" stroke-width="${LIGHT}" stroke-dasharray="14 4 3 4"/>`;
const axisH = (y, x1, x2) =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${ACCENT}" stroke-width="${LIGHT}" stroke-dasharray="14 4 3 4"/>`;

/** Cote horizontale avec flèches, pour l'aspect « plan » sans surcharger. */
function dimH(x1, x2, y, label) {
  return `
    <g stroke="${ACCENT}" stroke-width="${LIGHT}" fill="none">
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#a)" marker-end="url(#a)"/>
      <line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}"/>
      <line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}"/>
    </g>
    <text x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle" font-family="ui-monospace, monospace"
          font-size="11" fill="${ACCENT}">${label}</text>`;
}

/** Repère et légende communs à toutes les planches. */
function frame(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="${GRID}" stroke-width="1"/>
    </pattern>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="${HATCH}" stroke-width="1"/>
    </pattern>
    <marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 10 5 0 10z" fill="${ACCENT}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
${body}
  </g>
  <text x="20" y="${H - 16}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="11"
        letter-spacing="1.4" fill="${THIN}">${title.toUpperCase()}</text>
  <line x1="20" y1="${H - 30}" x2="${W - 20}" y2="${H - 30}" stroke="${GRID}" stroke-width="1"/>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Les dix planches                                                    */
/* ------------------------------------------------------------------ */

/** Piston, bielle et chemise, en coupe. */
const pistonAssembly = () => {
  const cx = 235;
  return `
    <!-- chemise, coupe : paroi hachurée de part et d'autre de l'alésage -->
    <rect x="150" y="30" width="16" height="150" fill="url(#hatch)" stroke="${INK}" stroke-width="${DETAIL}"/>
    <rect x="304" y="30" width="16" height="150" fill="url(#hatch)" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M166 30v150M304 30v150" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- chambre de combustion -->
    <path d="M166 42h138" stroke="${THIN}" stroke-width="${LIGHT}" stroke-dasharray="5 4"/>
    <!-- piston -->
    <rect x="168" y="62" width="134" height="72" rx="3" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M174 74h122M174 84h122M174 94h122" stroke="${INK}" stroke-width="${DETAIL}"/>
    <text x="326" y="82" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">segments</text>
    <path d="M300 78h22" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <!-- axe de piston -->
    <circle cx="${cx}" cy="116" r="13" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="${cx}" cy="116" r="6" fill="none" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <!-- bielle -->
    <path d="M222 124 208 212M248 124l14 88" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M${cx} 128v84" stroke="${THIN}" stroke-width="${LIGHT}" stroke-dasharray="4 4"/>
    <!-- tête de bielle -->
    <circle cx="${cx}" cy="228" r="30" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="${cx}" cy="228" r="20" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M205 228h60" stroke="${THIN}" stroke-width="${LIGHT}" stroke-dasharray="4 3"/>
    <!-- renvoi vers la chemise : une cote d'alésage tomberait sur la tête de bielle -->
    <path d="M150 160h-34" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="40" y="164" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">chemise</text>
    ${axisV(cx, 26, 268)}`;
};

/** Alternateur : poulie, carter ventilé, bornes. */
const alternator = () => `
    <!-- poulie -->
    <path d="M96 112v76M112 112v76" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M96 112h16M96 188h16" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M98 128h12M98 142h12M98 156h12M98 170h12" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <rect x="112" y="140" width="34" height="20" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- carter -->
    <circle cx="238" cy="150" r="88" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="238" cy="150" r="70" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="238" cy="150" r="26" fill="none" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="238" cy="150" r="12" fill="none" stroke="${THIN}" stroke-width="${DETAIL}"/>
    ${Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI * 2) / 16;
      const x1 = 238 + Math.cos(a) * 34;
      const y1 = 150 + Math.sin(a) * 34;
      const x2 = 238 + Math.cos(a) * 62;
      const y2 = 150 + Math.sin(a) * 62;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${THIN}" stroke-width="${DETAIL}"/>`;
    }).join("\n    ")}
    <!-- pattes de fixation -->
    <path d="M186 228h34v18h-34zM256 228h34v18h-34z" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- bornes B+ et D+ -->
    <path d="M326 128h30M326 150h38" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="360" cy="128" r="7" fill="${ACCENT}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="368" cy="150" r="7" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <text x="378" y="132" font-family="ui-monospace, monospace" font-size="11" fill="${THIN}">B+</text>
    <text x="382" y="154" font-family="ui-monospace, monospace" font-size="11" fill="${THIN}">D+</text>
    <!-- l'axe s'arrête avant les bornes, sinon il traverse leurs repères -->
    ${axisH(150, 82, 322)}`;

/** Filtre à visser, en coupe : media plissé, tube central, joint. */
const spinOnFilter = () => {
  const CX = 240;
  /** Media plissé : une ligne brisée verticale de chaque côté du tube. */
  const zigzag = (near, far) => {
    const pts = [];
    for (let i = 0; i <= 15; i += 1) {
      pts.push(`${i % 2 ? far : near} ${(98 + i * 7.6).toFixed(1)}`);
    }
    return `M${pts.join("L")}`;
  };
  return `
    <!-- corps embouti -->
    <path d="M172 116a68 34 0 0 1 136 0v100H172z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- media plissé, en un seul tracé par côté -->
    <path d="${zigzag(186, 214)}" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <path d="${zigzag(294, 266)}" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <path d="M186 96v120M294 96v120M214 96v120M266 96v120" stroke="${THIN}" stroke-width="${LIGHT}" stroke-dasharray="3 4"/>
    <!-- tube central perforé -->
    <path d="M226 92v124M254 92v124" stroke="${INK}" stroke-width="${DETAIL}"/>
    ${Array.from({ length: 6 }, (_, i) => {
      const y = 106 + i * 20;
      return `<circle cx="${CX}" cy="${y}" r="3.6" fill="none" stroke="${THIN}" stroke-width="${LIGHT}"/>`;
    }).join("\n    ")}
    <!-- platine filetée -->
    <rect x="166" y="216" width="148" height="24" fill="url(#hatch)" stroke="${INK}" stroke-width="${OUTLINE}"/>
    ${Array.from({ length: 5 }, (_, i) => {
      const x = 222 + i * 9;
      return `<path d="M${x} 240l6-8" stroke="${INK}" stroke-width="${LIGHT}"/>`;
    }).join("\n    ")}
    <!-- trous d'entrée périphériques -->
    <circle cx="192" cy="228" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="288" cy="228" r="6" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- joint torique : la pièce qui décide de l'étanchéité -->
    <rect x="160" y="240" width="160" height="11" rx="5.5" fill="${ACCENT}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M320 246h34" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="358" y="250" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">joint</text>
    <!-- circulation : entrée par la couronne, sortie par le centre.
         Les flèches restent au-dessus du cartouche. -->
    <path d="M192 266v-14" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <path d="M288 266v-14" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <path d="M${CX} 252v14" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <path d="M120 150h44" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="40" y="154" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">media plissé</text>
    ${axisV(CX, 70, 240)}`;
};

/** Barbotin et maillons de chenille. */
const sprocketTrack = () => {
  const cx = 172;
  const cy = 146;
  const R = 74;
  const teeth = Array.from({ length: 14 }, (_, i) => {
    const a = (i * Math.PI * 2) / 14 - Math.PI / 2;
    const s = Math.PI / 14;
    const p = (r, ang) =>
      `${(cx + Math.cos(ang) * r).toFixed(1)} ${(cy + Math.sin(ang) * r).toFixed(1)}`;
    return `M${p(R - 14, a - s * 0.9)}L${p(R, a - s * 0.36)}L${p(R, a + s * 0.36)}L${p(R - 14, a + s * 0.9)}`;
  }).join("");
  const bolts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI * 2) / 6;
    return `<circle cx="${(cx + Math.cos(a) * 40).toFixed(1)}" cy="${(cy + Math.sin(a) * 40).toFixed(1)}" r="5.5" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>`;
  }).join("\n    ");
  // La chenille court sur la tangente basse et vient engrener le barbotin :
  // détachée sur le côté, elle ne racontait rien.
  const railY = cy + R - 4;
  const links = Array.from({ length: 5 }, (_, i) => {
    const x = cx + 54 + i * 46;
    return `<rect x="${x}" y="${railY}" width="40" height="28" rx="7" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="${x + 40}" cy="${railY + 14}" r="6.5" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M${x + 10} ${railY + 28}v7M${x + 30} ${railY + 28}v7" stroke="${THIN}" stroke-width="${LIGHT}"/>`;
  }).join("\n    ");
  return `
    <circle cx="${cx}" cy="${cy}" r="${R - 14}" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="${teeth}" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="${cx}" cy="${cy}" r="26" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${THIN}" stroke-width="${DETAIL}"/>
    ${bolts}
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${ACCENT}" stroke-width="${LIGHT}" stroke-dasharray="6 5"/>
    ${links}
    <text x="${cx + 96}" y="${railY - 10}" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">maillons</text>
    ${axisV(cx, 44, 244)}
    ${axisH(cy, cx - 96, cx + 96)}`;
};

/** Vérin hydraulique double effet, en coupe. */
const hydraulicCylinder = () => `
    <!-- fût, parois en coupe -->
    <rect x="96" y="104" width="212" height="14" fill="url(#hatch)" stroke="${INK}" stroke-width="${DETAIL}"/>
    <rect x="96" y="182" width="212" height="14" fill="url(#hatch)" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M96 104v92M308 104v92" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M96 118h212M96 182h212" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- piston et tige -->
    <rect x="196" y="118" width="26" height="64" fill="url(#hatch)" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <rect x="222" y="142" width="176" height="16" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- chapes -->
    <circle cx="72" cy="150" r="20" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="72" cy="150" r="9" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M92 136h6v28h-6z" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="418" cy="150" r="20" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="418" cy="150" r="9" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- orifices -->
    <path d="M130 104v-22h20v22M266 104v-22h20v22" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M140 60v18" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <path d="M276 78v-18" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <text x="152" y="70" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">P</text>
    <text x="288" y="70" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">T</text>
    ${axisH(150, 46, 444)}
    ${dimH(222, 398, 214, "course")}`;

/** Cabine d'engin, élévation avec arceau. */
const operatorCab = () => `
    <!-- arceau ROPS -->
    <path d="M128 246V118l34-42h150l32 40v130" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- vitrage -->
    <path d="M146 132l24-32h58v88h-82zM244 100h60l22 30v58h-82z" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- montant de porte -->
    <path d="M236 100v146" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M244 196h82v50h-82z" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="252" cy="222" r="5" fill="${ACCENT}" stroke="${INK}" stroke-width="${LIGHT}"/>
    <!-- siège : assise, dossier incliné, manipulateur -->
    <path d="M158 246v-22h50v22z" fill="${PAPER}" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <path d="M158 224l8-52h26l-6 52z" fill="${PAPER}" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <path d="M214 224v-30" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <circle cx="214" cy="190" r="5" fill="${ACCENT}" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <!-- rétroviseur -->
    <path d="M128 128h-22v-18" stroke="${INK}" stroke-width="${DETAIL}"/>
    <rect x="92" y="92" width="18" height="22" rx="3" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- plancher -->
    <path d="M108 246h250" stroke="${INK}" stroke-width="${OUTLINE}"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M${112 + i * 21} 246l-8 12" stroke="${HATCH}" stroke-width="${LIGHT}"/>`).join("\n    ")}`;

/** Faisceau de refroidissement et ventilateur. */
const coolingCore = () => {
  // Ailettes : un seul <path> à commandes multiples. Les fragments `M…v…`
  // laissés nus dans un <g> ne dessinaient rien — ils devenaient du texte.
  const fins = Array.from({ length: 25 }, (_, i) => `M${(104 + i * 7.5).toFixed(1)} 108v88`).join("");
  const FX = 374;
  const FY = 152;
  const blades = Array.from({ length: 5 }, (_, i) => {
    const a = (i * Math.PI * 2) / 5;
    const p = (r, ang) =>
      `${(FX + Math.cos(ang) * r).toFixed(1)} ${(FY + Math.sin(ang) * r).toFixed(1)}`;
    // Pale en goutte : deux arcs entre le moyeu et la jante.
    return `<path d="M${p(16, a - 0.34)}Q${p(40, a + 0.30)} ${p(50, a + 0.62)}Q${p(36, a + 0.10)} ${p(16, a + 0.34)}z"
      fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>`;
  }).join("\n    ");
  return `
    <!-- boîtes à eau -->
    <rect x="96" y="78" width="200" height="30" rx="5" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <rect x="96" y="196" width="200" height="30" rx="5" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- faisceau -->
    <rect x="96" y="108" width="200" height="88" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="${fins}" stroke="${HATCH}" stroke-width="${LIGHT}"/>
    <path d="M96 138h200M96 166h200" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <!-- durites -->
    <path d="M124 78V52h32" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M268 226v26h-32" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M156 52h24" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <path d="M236 252h-24" stroke="${ACCENT}" stroke-width="${DETAIL}" marker-end="url(#a)"/>
    <!-- ventilateur -->
    <circle cx="${FX}" cy="${FY}" r="56" fill="none" stroke="${INK}" stroke-width="${OUTLINE}"/>
    ${blades}
    <circle cx="${FX}" cy="${FY}" r="16" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="${FX}" cy="${FY}" r="6" fill="none" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <text x="${FX - 30}" y="228" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">ventilateur</text>
    ${axisV(196, 64, 242)}`;
};

/** Clé mixte et douille six pans. */
/** Hexagone régulier, pointe en haut. */
const hex = (cx, cy, r) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join("L");

const toolsPlate = () => `
    <!-- clé polygonale double : la fourche ouverte se dessinait mal à cette
         échelle, deux anneaux se lisent immédiatement -->
    <path d="M92 84a38 38 0 0 1 0 76 38 38 0 0 1 0-76z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M${hex(92, 122, 22)}z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M118 106h214v32H118z" fill="${PAPER}" stroke="none"/>
    <path d="M118 106h214M118 138h214" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M150 116h150" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <circle cx="352" cy="122" r="32" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M${hex(352, 122, 18)}z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- douille six pans, en coupe -->
    <path d="M188 204h20v58h-20zM272 204h20v58h-20z" fill="url(#hatch)" stroke="none"/>
    <path d="M188 204h104v58H188z" fill="none" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M208 204v58M272 204v58" stroke="${THIN}" stroke-width="${DETAIL}"/>
    <path d="M212 262l10-16h36l10 16" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- carré d'entraînement -->
    <rect x="222" y="182" width="36" height="22" fill="${ACCENT}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M292 192h44" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="340" y="196" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">carré 1/2"</text>
    <path d="M188 234h-46" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="52" y="238" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">six pans</text>
    ${axisV(240, 172, 268)}`;

/** Pelle hydraulique, élévation. */
const excavator = () => `
    <!-- chenille -->
    <path d="M62 226a24 24 0 0 1 24-24h136a24 24 0 0 1 0 48H86a24 24 0 0 1-24-24z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <circle cx="86" cy="226" r="14" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="222" cy="226" r="14" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    ${[120, 152, 184].map((x) => `<circle cx="${x}" cy="236" r="7.5" fill="none" stroke="${THIN}" stroke-width="${DETAIL}"/>`).join("\n    ")}
    ${Array.from({ length: 15 }, (_, i) => `<path d="M${72 + i * 11} 250v6" stroke="${THIN}" stroke-width="${LIGHT}"/>`).join("\n    ")}
    <!-- tourelle et cabine -->
    <path d="M72 202v-34h146l14 34z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M72 168v-52h50v52" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M80 160v-36h34v36z" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>
    <!-- flèche et balancier -->
    <path d="M182 172 258 78l24 14-58 96z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <path d="M270 86l86 54-14 20-88-52z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- vérins -->
    <path d="M154 178l52-46" stroke="${ACCENT}" stroke-width="${OUTLINE}"/>
    <path d="M248 100l56 34" stroke="${ACCENT}" stroke-width="${OUTLINE}"/>
    <!-- godet : les dents mordent de 6 px dans la lèvre, sinon un liseré de
         fond apparaît entre les deux et elles semblent flotter -->
    ${[0, 1, 2, 3].map((i) => {
      const x = 330 + i * 12;
      const y = 196 - (i * 6) / 3;
      return `<path d="M${x} ${y.toFixed(1)}h10l-5 15z" fill="${PAPER}" stroke="${INK}" stroke-width="${DETAIL}"/>`;
    }).join("\n    ")}
    <path d="M334 148c28 2 44 24 40 48l-46 6c-10-18-8-40 6-54z" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    ${[0, 1, 2, 3].map((i) => {
      const x = 330 + i * 12;
      const y = 196 - (i * 6) / 3;
      return `<path d="M${x} ${y.toFixed(1)}l5 15 5-15" fill="none" stroke="${INK}" stroke-width="${DETAIL}"/>`;
    }).join("\n    ")}
    <!-- sol, tenu au-dessus du cartouche -->
    <path d="M40 258h400" stroke="${INK}" stroke-width="${DETAIL}"/>`;

/** Disjoncteur modulaire sur rail DIN. */
const breakerRail = () => `
    <!-- rail DIN vu en pointillé : il passe derrière l'appareil, la ligne
         cachée est la convention pour ça -->
    <path d="M60 196h44v-30h272v30h44" stroke="${THIN}" stroke-width="${DETAIL}" stroke-dasharray="7 5"/>
    <path d="M104 196v10M376 196v10" stroke="${THIN}" stroke-width="${LIGHT}" stroke-dasharray="4 4"/>
    <path d="M352 181v34h56" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="356" y="230" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">rail 35 mm</text>
    <!-- corps, quatre modules -->
    <rect x="146" y="72" width="188" height="128" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- refends de modules interrompus au droit des inscriptions -->
    <path d="M193 72v18M193 146v54M240 72v18M240 146v54M287 72v18M287 146v54"
          stroke="${THIN}" stroke-width="${LIGHT}" stroke-dasharray="5 4"/>
    <!-- manette, position fermée -->
    <rect x="154" y="104" width="32" height="44" rx="5" fill="${ACCENT}" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M170 104v-12" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M162 118h16M162 134h16" stroke="${INK}" stroke-width="${LIGHT}"/>
    <text x="200" y="112" font-family="ui-monospace, monospace" font-size="14" fill="${INK}">C16</text>
    <text x="200" y="130" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">230/400 V</text>
    <!-- bornes à cage -->
    <rect x="156" y="72" width="28" height="16" fill="url(#hatch)" stroke="${INK}" stroke-width="${DETAIL}"/>
    <rect x="156" y="184" width="28" height="16" fill="url(#hatch)" stroke="${INK}" stroke-width="${DETAIL}"/>
    <path d="M170 72V42M170 200v34" stroke="${INK}" stroke-width="${OUTLINE}"/>
    <!-- symbole de coupure -->
    <path d="M228 166h16l26-18" stroke="${INK}" stroke-width="${DETAIL}"/>
    <circle cx="228" cy="166" r="4" fill="${INK}"/>
    <circle cx="274" cy="166" r="4" fill="${INK}"/>
    <path d="M262 182a15 15 0 0 1 14-15" stroke="${THIN}" stroke-width="${LIGHT}"/>
    <text x="296" y="170" font-family="ui-monospace, monospace" font-size="10" fill="${THIN}">1P+N</text>`;

/* ------------------------------------------------------------------ */

const PLATES = [
  { slug: "pieces-moteur", title: "Piston · bielle · chemise", draw: pistonAssembly },
  { slug: "electricite-engin", title: "Alternateur", draw: alternator },
  { slug: "joints-filtres-entretien", title: "Filtre à visser · coupe", draw: spinOnFilter },
  { slug: "transmission-train-roulement", title: "Barbotin · chenille", draw: sprocketTrack },
  { slug: "hydraulique-pneumatique", title: "Vérin double effet · coupe", draw: hydraulicCylinder },
  { slug: "cabine-carrosserie", title: "Cabine · arceau ROPS", draw: operatorCab },
  { slug: "climatisation-chauffage", title: "Faisceau · ventilateur", draw: coolingCore },
  { slug: "outillage-accessoires", title: "Clé polygonale · douille", draw: toolsPlate },
  { slug: "machines-equipements", title: "Pelle hydraulique", draw: excavator },
  { slug: "electrique-instrumentation", title: "Disjoncteur · rail DIN", draw: breakerRail },
];

await fs.mkdir(OUT, { recursive: true });

const written = [];
for (const plate of PLATES) {
  const file = `${plate.slug}.svg`;
  const svg = frame(plate.title, plate.draw());
  await fs.writeFile(path.join(OUT, file), svg, "utf8");
  written.push({ ...plate, file, bytes: Buffer.byteLength(svg) });
  console.log(`✓ ${file.padEnd(36)} ${(Buffer.byteLength(svg) / 1024).toFixed(1)} Ko`);
}

const module_ = [
  "// Généré par scripts/draw-home-sketches.mjs — ne pas éditer à la main.",
  "",
  "/**",
  " * Croquis techniques de la page d'accueil, un par famille.",
  " *",
  " * Les cartes de l'accueil n'utilisent pas `category.image_url` : cette",
  " * colonne sert au catalogue, où chaque rayon reprend la photo d'un de ses",
  " * propres produits. En vitrine il faut l'inverse — une planche qui dise le",
  " * métier au premier coup d'œil.",
  " *",
  " * Dessins originaux : aucune licence tierce, et un trait identique d'une",
  " * carte à l'autre, ce qu'aucune banque d'images ne donne.",
  " */",
  "export const HOME_IMAGES: Record<string, string> = {",
  ...written.map((p) => `  "${p.slug}": "/images/home/${p.file}",`),
  "};",
  "",
  "export function homeImage(slug: string): string | null {",
  "  return HOME_IMAGES[slug] ?? null;",
  "}",
  "",
].join("\n");

await fs.writeFile(path.resolve("lib/home-images.generated.ts"), module_, "utf8");
console.log(`\n${written.length} planche(s) — ${OUT}`);
console.log("→ lib/home-images.generated.ts");
