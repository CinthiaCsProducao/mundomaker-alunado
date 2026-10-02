/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: src/lib/schoolYears.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import { SchoolStage, SchoolYear, SchoolYearKey } from '../types';

export const CANONICAL_SCHOOL_YEARS: Record<SchoolYearKey, SchoolYear> = {
  "EI": {
    stage: "EI",
    grade: null,
    key: "EI",
    label: "Educação Infantil",
    sortRank: 0,
    cycle: "EI"
  },
  "EF:1": {
    stage: "EF",
    grade: 1,
    key: "EF:1",
    label: "1º Ano",
    sortRank: 101,
    cycle: "FI"
  },
  "EF:2": {
    stage: "EF",
    grade: 2,
    key: "EF:2",
    label: "2º Ano",
    sortRank: 102,
    cycle: "FI"
  },
  "EF:3": {
    stage: "EF",
    grade: 3,
    key: "EF:3",
    label: "3º Ano",
    sortRank: 103,
    cycle: "FI"
  },
  "EF:4": {
    stage: "EF",
    grade: 4,
    key: "EF:4",
    label: "4º Ano",
    sortRank: 104,
    cycle: "FI"
  },
  "EF:5": {
    stage: "EF",
    grade: 5,
    key: "EF:5",
    label: "5º Ano",
    sortRank: 105,
    cycle: "FI"
  },
  "EF:6": {
    stage: "EF",
    grade: 6,
    key: "EF:6",
    label: "6º Ano",
    sortRank: 106,
    cycle: "FII"
  },
  "EF:7": {
    stage: "EF",
    grade: 7,
    key: "EF:7",
    label: "7º Ano",
    sortRank: 107,
    cycle: "FII"
  },
  "EF:8": {
    stage: "EF",
    grade: 8,
    key: "EF:8",
    label: "8º Ano",
    sortRank: 108,
    cycle: "FII"
  },
  "EF:9": {
    stage: "EF",
    grade: 9,
    key: "EF:9",
    label: "9º Ano",
    sortRank: 109,
    cycle: "FII"
  },
  "EM:1": {
    stage: "EM",
    grade: 1,
    key: "EM:1",
    label: "1º Ensino Médio",
    sortRank: 201,
    cycle: "EM"
  },
  "EM:2": {
    stage: "EM",
    grade: 2,
    key: "EM:2",
    label: "2º Ensino Médio",
    sortRank: 202,
    cycle: "EM"
  },
  "EM:3": {
    stage: "EM",
    grade: 3,
    key: "EM:3",
    label: "3º Ensino Médio",
    sortRank: 203,
    cycle: "EM"
  }
};

/**
 * Como cada série aparece quando o projeto é em inglês.
 *
 * Padrão da casa: G5 para o Infantil, e o ordinal curto do 1º ao 9º. Escolas
 * bilíngues pedem projeto em inglês para umas séries e em português para
 * outras, na MESMA carga — por isso o rótulo é escolhido por projeto e não
 * pela escola inteira.
 *
 * Ensino Médio segue a contagem contínua norte-americana (1º EM = 10th), que é
 * o que a numeração ordinal implica. AINDA NÃO CONFIRMADO pela expedição —
 * confira antes de mandar um romaneio de Ensino Médio para fora.
 */
export const ROTULO_EM_INGLES: Record<string, string> = {
  'EI': 'G5',
  'EF:1': '1st', 'EF:2': '2nd', 'EF:3': '3rd', 'EF:4': '4th', 'EF:5': '5th',
  'EF:6': '6th', 'EF:7': '7th', 'EF:8': '8th', 'EF:9': '9th',
  'EM:1': '10th', 'EM:2': '11th', 'EM:3': '12th'
};

/** Rótulo da série no idioma do projeto. Cai no português se não souber. */
export function rotuloDaSerie(chaveOuRotulo: string, idioma?: 'pt' | 'en'): string {
  let sy: SchoolYear;
  try { sy = parseSchoolYear(chaveOuRotulo); } catch { return chaveOuRotulo; }
  if (idioma === 'en') return ROTULO_EM_INGLES[sy.key] || sy.label;
  return sy.label;
}

/**
 * O prefixo de série no começo do nome de catálogo: "8º Ano - ", "EI - ".
 *
 * O catálogo usa `º` em uns nomes e `°` (grau) em outros — 43 deles. Os dois
 * entram aqui de propósito, senão metade dos projetos não seria traduzida e o
 * romaneio sairia com séries em dois idiomas na mesma coluna.
 */
const PREFIXO_DE_SERIE =
  /^\s*(EI|E\.I\.|Educa[çc][ãa]o Infantil|Ensino Infantil|\d\s*[º°ªo]?\s*(?:Ano|Ensino M[ée]dio))\s*-\s*/i;

/**
 * Troca a série do nome do projeto para o inglês quando o projeto é em inglês:
 * "8º Ano - Game Designers" vira "8th - Game Designers".
 *
 * Só o prefixo muda — o nome do projeto continua exatamente como está no
 * catálogo. Devolve o nome intacto para projeto em português, para nome sem
 * prefixo de série e para série que não sabemos traduzir.
 */
export function nomeComSerieNoIdioma(nome: string, idioma?: 'pt' | 'en'): string {
  if (idioma !== 'en' || !nome) return nome;
  const m = nome.match(PREFIXO_DE_SERIE);
  if (!m) return nome;
  const rotulo = rotuloDaSerie(m[1], 'en');
  if (!rotulo || rotulo === m[1]) return nome;
  return `${rotulo} - ${nome.slice(m[0].length)}`;
}

/**
 * Os dois últimos dígitos do ano da DATA DO ROMANEIO — o `26` de `(L3.26)`.
 *
 * Tem de sair da data do documento, não do relógio. Um romaneio datado de
 * 15/01/2027 aberto em 2026 saía com "15/01/2027" no cabeçalho e "(L3.26)" na
 * coluna do produto: o mesmo papel afirmando dois anos, o que é justamente o
 * tipo de divergência que a transportadora usa para questionar a carga.
 *
 * Aceita `dd/mm/aaaa` e `aaaa-mm-dd`. Data ilegível cai no ano corrente, que é
 * o melhor palpite disponível.
 */
export function anoDoRomaneio(data?: string): string {
  const bruto = (data || '').trim();
  const ddmmaaaa = bruto.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/);
  if (ddmmaaaa) return ddmmaaaa[1].slice(-2);
  const iso = bruto.match(/^(\d{4})-\d{1,2}-\d{1,2}/);
  if (iso) return iso[1].slice(-2);
  return String(new Date().getFullYear()).slice(-2);
}

export function parseSchoolYear(raw: string): SchoolYear {
  if (!raw || !raw.trim()) {
    throw new Error('Ano escolar em branco ou não fornecido.');
  }

  const clean = raw.trim();

  // If compound header (e.g., "9º Ano e 1º Ensino Médio" or "1º Ano, 2º Ano"), parse the first part
  if (clean.includes(' e ') || clean.includes(',')) {
    const firstPart = clean.split(/ e |,|\/|\\/)[0].trim();
    if (firstPart && firstPart !== clean) {
      try {
        return parseSchoolYear(firstPart);
      } catch {
        // Fallthrough if firstPart fails
      }
    }
  }

  // Exact key check
  const upperKey = clean.toUpperCase() as SchoolYearKey;
  if (CANONICAL_SCHOOL_YEARS[upperKey]) {
    return CANONICAL_SCHOOL_YEARS[upperKey];
  }

  const lower = clean.toLowerCase();

  // 1. Infantil / EI
  if (
    lower === 'ei' ||
    lower === 'e.i.' ||
    lower === 'e.i' ||
    lower.includes('infantil') ||
    lower.includes('educação infantil') ||
    lower.includes('educacao infantil')
  ) {
    return CANONICAL_SCHOOL_YEARS["EI"];
  }

  // 2. Ensino Médio (check before generic numbers!)
  const isEnsinoMedio =
    lower.includes('médio') ||
    lower.includes('medio') ||
    lower.includes('e.m.') ||
    lower.includes('e.m') ||
    /\bem\b/.test(lower) ||
    lower.includes('em1') ||
    lower.includes('em2') ||
    lower.includes('em3');

  if (isEnsinoMedio) {
    const matchDigit = lower.match(/([123])/);
    if (matchDigit) {
      const g = parseInt(matchDigit[1], 10);
      if (g === 1) return CANONICAL_SCHOOL_YEARS["EM:1"];
      if (g === 2) return CANONICAL_SCHOOL_YEARS["EM:2"];
      if (g === 3) return CANONICAL_SCHOOL_YEARS["EM:3"];
    }
    if (lower.includes('1') || lower.includes('primeir') || lower.includes('1ª') || lower.includes('1º')) return CANONICAL_SCHOOL_YEARS["EM:1"];
    if (lower.includes('2') || lower.includes('segund') || lower.includes('2ª') || lower.includes('2º')) return CANONICAL_SCHOOL_YEARS["EM:2"];
    if (lower.includes('3') || lower.includes('terceir') || lower.includes('3ª') || lower.includes('3º')) return CANONICAL_SCHOOL_YEARS["EM:3"];
    return CANONICAL_SCHOOL_YEARS["EM:1"];
  }

  // 3. Fundamental (EF:1 to EF:9)
  const matchNum = lower.match(/(\d+)/);
  if (matchNum) {
    const num = parseInt(matchNum[1], 10);
    if (num >= 1 && num <= 9) {
      const key = `EF:${num}` as SchoolYearKey;
      if (CANONICAL_SCHOOL_YEARS[key]) {
        return CANONICAL_SCHOOL_YEARS[key];
      }
    }
  }

  throw new Error(`Ano escolar não reconhecido sem ambiguidade: "${raw}"`);
}

export function compareSchoolYears(a: string, b: string): number {
  if (a === b) return 0;
  let syA: SchoolYear | null = null;
  let syB: SchoolYear | null = null;

  try { syA = parseSchoolYear(a); } catch { /* empty */ }
  try { syB = parseSchoolYear(b); } catch { /* empty */ }

  const rankA = syA ? syA.sortRank : 999;
  const rankB = syB ? syB.sortRank : 999;

  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.localeCompare(b);
}

export function formatYearHeader(yearKeysOrLabels: string[]): string {
  if (!yearKeysOrLabels || yearKeysOrLabels.length === 0) return 'Geral';

  const canonicalYears: SchoolYear[] = [];
  const seenKeys = new Set<string>();

  for (const item of yearKeysOrLabels) {
    try {
      const sy = parseSchoolYear(item);
      if (!seenKeys.has(sy.key)) {
        seenKeys.add(sy.key);
        canonicalYears.push(sy);
      }
    } catch {
      if (!seenKeys.has(item)) {
        seenKeys.add(item);
      }
    }
  }

  canonicalYears.sort((a, b) => a.sortRank - b.sortRank);

  const labels = canonicalYears.map(sy => sy.label);

  if (labels.length === 0) return 'Geral';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return labels.slice(0, -1).join(', ') + ' e ' + labels[labels.length - 1];
}
