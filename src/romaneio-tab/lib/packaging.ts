/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: src/lib/packaging.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import {
  OrderItem,
  Volume,
  PackedItem,
  Manifest,
  ProjectAssignment,
  PhysicalItem,
  SchoolYear,
  EXTERNAL_PACKAGES,
  ExternalPackageType
} from '../types';
import { products as catalogProducts } from '../data/products';
import { parseSchoolYear, compareSchoolYears, formatYearHeader } from './schoolYears';

export const CAPACIDADE_PONTOS = 36;
export const PONTOS_CAIXA_10CM = 5;
export const PONTOS_CAIXA_5CM = 3;
export const PONTOS_SACO = 5;
export const MAX_CAIXAS_10CM = 6;
export const MAX_CAIXAS_5CM = 12;
export const PESO_MAXIMO_KG = 18.000;

/**
 * Exceções pedidas por escola, no arquivo do pedido — nunca o padrão.
 *
 * `professorJuntoComAluno` libera o professor a dividir coletiva com material de
 * aluno. É uma **quebra de regra rígida** (CLAUDE.md, "Material do professor
 * nunca divide volume com material de aluno"), e existe só porque em carga
 * pequena ela economiza volume de verdade: 9 bases de Cinema fecham em 3
 * coletivas e o professor sozinho viraria a 4ª. Com o flag, ele entra numa das
 * três e a carga sai em 3.
 *
 * Ligar o flag não silencia nada: a auditoria continua acusando a mistura, só
 * rebaixada de erro para aviso, para que a quebra fique escrita no romaneio.
 */
export interface OpcoesEmpacotamento {
  professorJuntoComAluno?: boolean;
}

export class ShipmentCoverageError extends Error {
  missingYears: string[];
  missingProjects: string[];
  quantityDifferences: Array<{ project: string; year: string; type: string; expected: number; packed: number }>;

  constructor(details: { missingYears: string[]; missingProjects: string[]; quantityDifferences: any[] }) {
    const yearsStr = details.missingYears.length ? `Anos ausentes: [${details.missingYears.join(', ')}]. ` : '';
    const projsStr = details.missingProjects.length ? `Projetos ausentes: [${details.missingProjects.join(', ')}]. ` : '';
    const diffsStr = details.quantityDifferences.length 
      ? `Divergências: ${details.quantityDifferences.map(d => `${d.project} (${d.year} ${d.type}): esp ${d.expected}, emb ${d.packed}`).join('; ')}`
      : '';
    super(`Erro de Cobertura de Romaneio: ${yearsStr}${projsStr}${diffsStr}`);
    this.name = 'ShipmentCoverageError';
    this.missingYears = details.missingYears;
    this.missingProjects = details.missingProjects;
    this.quantityDifferences = details.quantityDifferences;
  }
}

/**
 * O nome do PROJETO, sem a série, sem a caixa, sem "Complementar".
 *
 * Tem de aceitar as duas grafias de série que existem no sistema: a do catálogo
 * (`EI - `, `5º Ano - `) e a que o documento imprime, que vem de
 * `parseSchoolYear().label` (`Educação Infantil - `, `1º Ensino Médio - `).
 * Só conhecia a primeira, e bastava alguém passar por aqui um nome lido do
 * romaneio para "Educação Infantil - O Canto do Passarinho" virar um projeto
 * diferente de "O Canto do Passarinho" — duas chaves para a mesma coisa, uma
 * faltando e a outra sobrando na conferência.
 */
export function cleanProjectName(name: string): string {
  if (!name) return '';
  let clean = name
    .replace(/^(?:(?:L\d+\.\d+\)\s*)?|(?:L\-\d+\.\d+\)\s*)?)?(?:E\.?I\.?|Educa[çc][ãa]o Infantil|\d+[\º°ª]\s*(?:Ano|S[ée]rie|Ensino M[ée]dio|E\.?M\.?)|Ensino Infantil(?: I| II| III)?)\s*[-–]\s*/i, '')
    .replace(/\s\d\/\d$/, '')
    /*
      Sufixo de VARIANTE que o romaneio acrescenta: "— 38 com furo".

      É decoração de papel, não nome de projeto. Sem tirar, um nome lido de volta
      do documento vira um projeto diferente a cada variante — e a conferência
      acusa "Nossa Água" faltando e "Nossa Água — 38 com furo" sobrando.

      O travessão "—" é usado só para isto: nenhum nome do catálogo tem um.
    */
    .replace(/\s+—\s+\d+\s+.+$/, '')
    .replace(/\s*[-–]\s*Complementar$/i, '')
    .replace(/\s*-\s*Complementar$/i, '')
    .replace(/\s*\(Pacote c\/\s*\d+\)$/i, '')
    .replace(/\s*\(Material do Professor\)$/i, '')
    .replace(/^\(L\-?\d+\.\d+\)\s*/i, '')
    .trim();
  if (clean.includes("Porquinhos")) clean = "Os Três Porquinhos";
  if (clean.includes("maker piggies")) clean = "Three maker piggies";
  return clean;
}

export function extractSequence(prod: any): string {
  if (prod?.boxNumber) {
    const m = String(prod.boxNumber).match(/(\d+\/\d+)/);
    if (m) return m[1];
  }
  if (prod?.name) {
    const nameMatch = String(prod.name).match(/(\d+\/\d+)/);
    if (nameMatch) return nameMatch[1];
  }
  return '1/1';
}

export function getItemHeightCm(prod: any): number {
  if (!prod) return 10;
  const pkg = prod.packagingType || '';
  if (pkg === 'Inspiramaker 10cm') return 10;
  if (pkg === 'Inspiramaker 5cm') return 5;
  if (pkg === 'Saco') return 0;
  return 10;
}

export function getProductPoints(prod: any): number {
  if (!prod) return 0;
  const pkg = prod.packagingType || '';
  if (pkg === 'Inspiramaker 10cm') return 5;
  if (pkg === 'Inspiramaker 5cm') return 3;
  if (pkg === 'Saco') return 5;

  // Havia aqui um `if` por nome de projeto (Comunicamão / Lend a Hand) que
  // retornava 5 — exatamente o mesmo que o retorno abaixo. Código morto: nunca
  // mudou resultado nenhum. Os `if` por nome que de fato pesam estão em
  // `ehSaco`, e esses saem quando o catálogo ganhar o campo próprio.
  return 5;
}

/**
 * O complementar que viaja em saco, e não em caixa rígida.
 *
 * Isto DEVERIA ser campo de catálogo — o CLAUDE.md é explícito: "dado de
 * catálogo nunca vira `if` no código". Vira aqui porque o catálogo ainda não
 * tem o campo, e enquanto não tiver, o reconhecimento por nome mora num lugar
 * só. Estava repetido em três pontos do arquivo, cada um com a sua cópia da
 * lista de nomes — se um projeto novo entrasse em saco, dava para acertar dois
 * e esquecer o terceiro sem quebrar nada visível.
 *
 * Quando o catálogo ganhar `packagingBehavior: 'SACO'` (ou equivalente), é
 * esta função que muda, e mais nada.
 */
export function ehSacoComplementar(prod: { name?: string; packagingType?: string; type?: string } | null | undefined): boolean {
  if (!prod) return false;
  if (prod.packagingType === 'Saco') return true;
  const nome = (prod.name || '').toLowerCase();
  return prod.type === 'Complementar'
    && (nome.includes('comunicamão') || nome.includes('lend a hand'));
}

export function isSpecialPackaging(packagingType: string): boolean {
  return ['Espaguete', 'Caixa Tubo', 'Tubo', 'Caixa Plástica'].includes(packagingType);
}

export function normalizeSchoolYear(p: string): string {
  try {
    const sy = parseSchoolYear(p);
    return sy.label;
  } catch {
    return p || '1º Ano';
  }
}

export function getCycleKey(yearStr: string): "EI" | "FI" | "FII" | "EM" {
  try {
    const sy = parseSchoolYear(yearStr);
    return sy.cycle;
  } catch {
    return "FI";
  }
}

export interface VolumeState {
  ocupacaoPontos: number;
  pesoTotal: number;
  quantidade10cm: number;
  quantidade5cm: number;
  quantidadeSaco: number;
}

/**
 * Peso de UMA unidade física da linha — a caixa inteira, com os kits que leva.
 *
 * `product.weight` é o peso de um kit. Enquanto toda caixa levava um kit só, os
 * dois números eram o mesmo e dava para usar `product.weight` à vontade. Com o
 * Cola quente indo 5 por caixa deixaram de ser: as passadas que simulavam
 * capacidade com `product.weight` achavam que cabia cinco vezes mais peso, e
 * fechavam volume de 20 kg dizendo que estava dentro dos 18.
 */
const pesoUnitario = (it: { product?: { weight?: number }; bundleSize?: number }): number =>
  Number(((it.product?.weight || 0) * (it.bundleSize || 1)).toFixed(3));

export function getVolumeState(vol: Volume): VolumeState {
  let ocupacaoPontos = 0;
  let pesoTotal = 0;
  let quantidade10cm = 0;
  let quantidade5cm = 0;
  let quantidadeSaco = 0;

  vol.items.forEach(it => {
    const q = it.quantity;
    const prod = it.product;
    const heightCm = getItemHeightCm(prod);
    const isSaco = ehSacoComplementar(prod);

    ocupacaoPontos += getProductPoints(prod) * q;
    pesoTotal += (it.totalWeight || Number((q * (prod?.weight || 0)).toFixed(3)));

    if (isSaco) {
      quantidadeSaco += q;
    } else if (heightCm === 10) {
      quantidade10cm += q;
    } else if (heightCm === 5) {
      quantidade5cm += q;
    }
  });

  return {
    ocupacaoPontos,
    pesoTotal: Number(pesoTotal.toFixed(3)),
    quantidade10cm,
    quantidade5cm,
    quantidadeSaco
  };
}

export function canAddItemToVolumeState(
  volume: VolumeState,
  item: { weight: number; product: any }
): boolean {
  const prod = item.product;
  const heightCm = getItemHeightCm(prod);
  const isSaco = ehSacoComplementar(prod);

  const pts = getProductPoints(prod);
  const w = item.weight || prod?.weight || 0;

  const novaOcupacao = volume.ocupacaoPontos + pts;
  const novoPeso = Number((volume.pesoTotal + w).toFixed(3));

  const is10cm = heightCm === 10 && !isSaco;
  const is5cm = heightCm === 5 && !isSaco;

  const novasCaixas10cm = volume.quantidade10cm + (is10cm ? 1 : 0);
  const novasCaixas5cm = volume.quantidade5cm + (is5cm ? 1 : 0);
  const novosSacos = volume.quantidadeSaco + (isSaco ? 1 : 0);

  const total5cmUnits = (novasCaixas10cm * 2) + novasCaixas5cm + (novosSacos * 2);

  if (total5cmUnits > 12) return false;
  if (novaOcupacao > CAPACIDADE_PONTOS) return false;
  if (novoPeso > PESO_MAXIMO_KG) return false;
  if (novasCaixas10cm > MAX_CAIXAS_10CM) return false;
  if (novasCaixas5cm > MAX_CAIXAS_5CM) return false;

  // Saquinho flexível exige ≥ 3 caixas rígidas no volume para proteção
  if (novosSacos > 0 && (novasCaixas10cm + novasCaixas5cm < 3)) {
    return false;
  }

  return true;
}

export function optimizeStudentVolumes(volumes: Volume[]): void {
  // Duas passadas: primeiro só entre séries do mesmo ciclo, que é o arranjo
  // preferido; depois, se ainda houver volume mal aproveitado, entre ciclos
  // diferentes. Misturar séries é para ser evitado, não proibido — o que não
  // pode é despachar volume vazio.
  fundirVolumesDeAluno(volumes, false);
  fundirVolumesDeAluno(volumes, true);

  // Fusão inteira só resolve quando um volume cabe TODO dentro de outro. Esta
  // passada quebra o volume em caixas e as espalha pelas folgas. Ver a nota da
  // função.
  dissolverVolumesDeAluno(volumes);
}

/**
 * Esvazia um volume distribuindo as caixas dele pelas folgas dos outros.
 *
 * `fundirVolumesDeAluno` move volume inteiro: só junta A e B se TUDO de B
 * couber em A. Isso deixa passar o caso mais comum de desperdício. Pedido real
 * que apareceu em teste — 5 caixas do 1º ano, 3 do 4º, 4 do 5º, todas de 10 cm,
 * teto de 6 por volume:
 *
 *   fusão inteira:  [5] [3] [4]  → 5+3=8, 5+4=9, 3+4=7, nenhuma cabe → 3 volumes
 *   dissolvendo:    [5+1] [4+2]                                      → 2 volumes
 *
 * As 12 caixas sempre couberam em 2 volumes; o que faltava era poder partir o
 * grupo do 4º ano entre os dois. Um volume a mais é frete a mais, e três
 * volumes de 4 e 6 caixas ainda viajam pior que dois cheios.
 *
 * Só desmancha o volume se TODAS as caixas dele acharem lugar: esvaziar pela
 * metade não elimina volume nenhum e ainda espalha o projeto. Cada caixa passa
 * por `canAddItemToVolumeState`, então peso, unidades, tetos de 10/5 cm e a
 * proteção do saco continuam valendo um a um.
 */
function dissolverVolumesDeAluno(volumes: Volume[]): void {
  let mudou = true;
  while (mudou) {
    mudou = false;

    const coletivas = () => volumes.filter(
      v => v.category === 'Aluno' && v.type === EXTERNAL_PACKAGES.COLLECTIVE.label
    );

    // Do mais fraco para o mais cheio: o volume com menos caixas é o mais
    // barato de realocar e o que menos se perde ao desmanchar.
    const candidatos = coletivas().sort((a, b) => {
      const qa = a.items.reduce((s, i) => s + i.quantity, 0);
      const qb = b.items.reduce((s, i) => s + i.quantity, 0);
      return qa - qb;
    });

    for (const doador of candidatos) {
      if (!volumes.includes(doador)) continue;

      // Uma caixa por entrada, para poder partir um item de quantidade > 1
      // entre volumes diferentes.
      const unidades: PackedItem[] = [];
      for (const it of doador.items) {
        for (let k = 0; k < it.quantity; k++) {
          unidades.push({ ...it, quantity: 1, totalWeight: pesoUnitario(it) });
        }
      }
      if (unidades.length === 0) continue;

      // Simula sobre estados locais: nada é movido antes de saber que TODAS as
      // caixas acham lugar.
      const receptores = coletivas().filter(v => v !== doador);
      if (receptores.length === 0) continue;

      const estados = new Map<Volume, VolumeState>(
        receptores.map(v => [v, getVolumeState(v)])
      );
      const plano: Array<{ destino: Volume; item: PackedItem }> = [];

      // Caixa mais pesada primeiro: a folga escassa é a de peso, e deixar a
      // pesada para o fim é o que faz o plano falhar por pouco.
      unidades.sort((a, b) => pesoUnitario(b) - pesoUnitario(a));

      let cabeTudo = true;
      for (const unidade of unidades) {
        const alvo = receptores
          .filter(v => canAddItemToVolumeState(
            estados.get(v)!,
            { weight: pesoUnitario(unidade), product: unidade.product }
          ))
          // Mesma série primeiro: mantém o bloco do romaneio coerente quando dá.
          .sort((a, b) => {
            const chave = unidade.targetYearKey;
            const aMesma = chave && a.targetYearKeys?.includes(chave) ? 0 : 1;
            const bMesma = chave && b.targetYearKeys?.includes(chave) ? 0 : 1;
            if (aMesma !== bMesma) return aMesma - bMesma;
            // Depois o mais cheio: fecha volume em vez de espalhar por todos.
            return estados.get(b)!.ocupacaoPontos - estados.get(a)!.ocupacaoPontos;
          })[0];

        if (!alvo) { cabeTudo = false; break; }

        const st = estados.get(alvo)!;
        const peso = pesoUnitario(unidade);
        const altura = getItemHeightCm(unidade.product);
        const saco = ehSacoComplementar(unidade.product);
        estados.set(alvo, {
          ocupacaoPontos: st.ocupacaoPontos + getProductPoints(unidade.product),
          pesoTotal: Number((st.pesoTotal + peso).toFixed(3)),
          quantidade10cm: st.quantidade10cm + (!saco && altura === 10 ? 1 : 0),
          quantidade5cm: st.quantidade5cm + (!saco && altura === 5 ? 1 : 0),
          quantidadeSaco: st.quantidadeSaco + (saco ? 1 : 0)
        });
        plano.push({ destino: alvo, item: unidade });
      }

      if (!cabeTudo) continue;

      for (const { destino, item } of plano) {
        // ESPALHE o item, não o reconstrua campo a campo. Listar os campos à mão
        // deixa cair calado o que for criado depois: foi assim que `bundleSize`
        // sumiu ao mover uma caixa de 5 kits, e ela chegou do outro lado valendo
        // 1 kit — peso e contagem errados, sem erro nenhum aparecer.
        addItemToVolume(destino, { ...item, quantity: 1 });
      }
      for (const v of new Set(plano.map(p => p.destino))) {
        const chaves = new Set([...(v.targetYearKeys || []), ...(doador.targetYearKeys || [])]);
        v.targetYearKeys = Array.from(chaves);
        v.totalWeight = Number(
          v.items.reduce((s, i) => s + (i.totalWeight ?? 0), 0).toFixed(3)
        );
        v.year = buildYearHeading(v);
      }

      volumes.splice(volumes.indexOf(doador), 1);
      mudou = true;
      break;
    }
  }
}

function fundirVolumesDeAluno(volumes: Volume[], permitirCruzarCiclo: boolean): void {
  let changed = true;
  while (changed) {
    changed = false;
    const studentCollective = volumes.filter(
      v => v.category === 'Aluno' && v.type === EXTERNAL_PACKAGES.COLLECTIVE.label
    );

    for (let i = 0; i < studentCollective.length; i++) {
      const volA = studentCollective[i];
      if (!volumes.includes(volA)) continue;

      const itemsCountA = volA.items.reduce((sum, item) => sum + item.quantity, 0);

      for (let j = i + 1; j < studentCollective.length; j++) {
        const volB = studentCollective[j];
        if (!volumes.includes(volB)) continue;

        const itemsCountB = volB.items.reduce((sum, item) => sum + item.quantity, 0);

        // NÃO barre a fusão só porque os dois volumes têm 3+ caixas: 3 caixas de
        // um ano + 3 de outro cabem num volume só, e essa é justamente a fusão
        // que mais economiza frete. Quem decide são os tetos, mais abaixo.
        void itemsCountA; void itemsCountB;

        // Extract cycles for both volumes
        const cyclesA = new Set<string>();
        volA.items.forEach(it => {
          const yKey = it.targetYearKey || (it.product?.year ? parseSchoolYear(it.product.year).key : parseSchoolYear(volA.year).key);
          if (yKey) {
            try { cyclesA.add(parseSchoolYear(yKey).cycle); } catch {}
          }
        });

        const cyclesB = new Set<string>();
        volB.items.forEach(it => {
          const yKey = it.targetYearKey || (it.product?.year ? parseSchoolYear(it.product.year).key : parseSchoolYear(volB.year).key);
          if (yKey) {
            try { cyclesB.add(parseSchoolYear(yKey).cycle); } catch {}
          }
        });

        if (cyclesA.size === 0 || cyclesB.size === 0) continue;

        const cyclesArrA = Array.from(cyclesA);
        const cyclesArrB = Array.from(cyclesB);
        const cycleMatch = cyclesArrA.every(cA => cyclesB.has(cA)) && cyclesArrB.every(cB => cyclesA.has(cB));
        if (!cycleMatch && !permitirCruzarCiclo) continue;

        // Check if all items in volB can fit into volA
        const stA = getVolumeState(volA);
        const stB = getVolumeState(volB);

        const total10cm = stA.quantidade10cm + stB.quantidade10cm;
        const total5cm = stA.quantidade5cm + stB.quantidade5cm;
        const totalSacos = stA.quantidadeSaco + stB.quantidadeSaco;
        const totalWeight = Number((volA.totalWeight + volB.totalWeight).toFixed(3));
        const totalPoints = stA.ocupacaoPontos + stB.ocupacaoPontos;
        const totalItemsCount = total10cm + total5cm + totalSacos;

        const total5cmUnits = (total10cm * 2) + total5cm + (totalSacos * 2);

        if (
          total5cmUnits <= 12 &&
          totalPoints <= CAPACIDADE_PONTOS &&
          total10cm <= MAX_CAIXAS_10CM &&
          total5cm <= MAX_CAIXAS_5CM &&
          totalWeight <= PESO_MAXIMO_KG &&
          (totalSacos === 0 || (total10cm + total5cm) >= 3)
        ) {
          // Merge volB items into volA — espalhando, para não perder campo nenhum.
          for (const item of volB.items) {
            addItemToVolume(volA, { ...item });
          }
          sortVolumeItems(volA.items);

          const combinedKeys = Array.from(new Set([...(volA.targetYearKeys || []), ...(volB.targetYearKeys || [])]));
          volA.targetYearKeys = combinedKeys;
          volA.year = buildYearHeading(volA);

          const bIdx = volumes.indexOf(volB);
          if (bIdx >= 0) {
            volumes.splice(bIdx, 1);
          }

          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
}

/**
 * Abre espaço num volume já aberto para o saco caber com 3 rígidas em volta.
 *
 * Estratégia: pega o volume mais cheio do projeto e vai tirando caixas dele —
 * as mais leves primeiro, para mexer o mínimo no peso — até o saco caber. Cada
 * caixa retirada vai para outro volume do mesmo ano que tenha espaço, e só abre
 * volume novo se não houver nenhum.
 *
 * Para de tirar quando o volume doador chegaria a menos de 3 rígidas: nesse
 * ponto trocaríamos um problema pelo outro, e é melhor devolver `false` para o
 * chamador tratar o saco como sobra.
 */
function abrirEspacoParaSaco(
  volumes: Volume[],
  projVols: Volume[],
  saco: PhysicalItem,
  yearKey: string,
  yearLabel: string
): boolean {
  const coletiva = EXTERNAL_PACKAGES.COLLECTIVE.label;
  const cabeSaco = (vol: Volume) => {
    const st = getVolumeState(vol);
    return st.quantidade10cm + st.quantidade5cm >= 3 &&
      canAddItemToVolumeState(st, { weight: saco.unitWeightKg, product: saco.product });
  };

  const candidatos = [...projVols].sort((a, b) => {
    const sa = getVolumeState(a), sb = getVolumeState(b);
    return (sb.quantidade10cm + sb.quantidade5cm) - (sa.quantidade10cm + sa.quantidade5cm);
  });

  const contaRigidas = (v: Volume) => {
    const s = getVolumeState(v);
    return s.quantidade10cm + s.quantidade5cm;
  };

  for (const doador of candidatos) {
    if (!volumes.includes(doador)) continue;

    let ultimoDestino: Volume | null = null;
    let guarda = 12;

    while (guarda-- > 0) {
      if (contaRigidas(doador) <= 3) break;             // doador não pode ceder mais

      // Para quando o saco já cabe E o volume que recebeu as caixas também tem
      // 3. Mover só o mínimo resolvia o saco mas deixava uma coletiva com uma
      // caixa solta batendo dentro — troca de um problema por outro.
      const faltaEspaco = !cabeSaco(doador);
      const destinoFraco = !!ultimoDestino && contaRigidas(ultimoDestino) < 3;
      if (!faltaEspaco && !destinoFraco) break;

      const item = [...doador.items]
        .filter(i => i.product?.packagingType !== 'Saco')
        .sort((a, b) => pesoUnitario(a) - pesoUnitario(b))[0];
      if (!item) break;

      const produto = item.product;
      // Peso da UNIDADE que está sendo movida: uma caixa com 5 kits pesa 5×.
      const peso = pesoUnitario(item);

      if (item.quantity > 1) {
        item.quantity -= 1;
        item.totalWeight = Number((item.quantity * peso).toFixed(3));
      } else {
        doador.items.splice(doador.items.indexOf(item), 1);
      }
      doador.totalWeight = Number((doador.totalWeight - peso).toFixed(3));

      const cabeAqui = (v: Volume) =>
        canAddItemToVolumeState(getVolumeState(v), { weight: peso, product: produto });

      let destino: Volume | null =
        ultimoDestino && volumes.includes(ultimoDestino) && cabeAqui(ultimoDestino)
          ? ultimoDestino
          : volumes.find(v => v !== doador && v.category === 'Aluno' && v.type === coletiva &&
              v.targetYearKeys?.includes(yearKey) && cabeAqui(v)) || null;

      if (!destino) {
        destino = {
          volumeNumber: 0, type: coletiva, dimensions: EXTERNAL_PACKAGES.COLLECTIVE.dimensions,
          items: [], totalWeight: 0, year: yearLabel, category: 'Aluno', targetYearKeys: [yearKey]
        };
        volumes.push(destino);
        projVols.push(destino);
      }

      addItemToVolume(destino, { ...item, quantity: 1, destination: 'Aluno', targetYearKey: yearKey });
      ultimoDestino = destino;
    }

    if (cabeSaco(doador)) {
      addItemToVolume(doador, saco);
      return true;
    }
  }

  return false;
}

export function balancedSizes(totalItems: number, volumeCount: number): number[] {
  if (volumeCount <= 0) return [];
  const base = Math.floor(totalItems / volumeCount);
  const remainder = totalItems % volumeCount;

  return Array.from(
    { length: volumeCount },
    (_, index) => base + (index < remainder ? 1 : 0)
  );
}

/**
 * Expand ProjectAssignments into individual physical items.
 * Ensures ALL physical items inherit `targetYearKey` for sectioning/packing while conserving catalog product name!
 */
/**
 * Quantas unidades de espaguete acompanham CADA kit.
 *
 * São duas, não uma. Estava em aberto no CLAUDE.md desde o início ("consta que
 * a regra seja 2 por base — confirmar antes de mexer") e foi confirmado: 1 base
 * é um pacote com 2, 2 bases um pacote com 4, e assim por diante.
 *
 * Muda peso em toda expedição que leva Nossa Água ou Sustainable me — os dois
 * únicos projetos com espaguete no catálogo.
 */
export const UNIDADES_ESPAGUETE_POR_KIT = 2;

const repeticoesPorKit = (prod: { packagingType?: string }): number =>
  prod?.packagingType === 'Espaguete' ? UNIDADES_ESPAGUETE_POR_KIT : 1;

/**
 * Como as bases de um projeto se dividem em CAIXAS FÍSICAS.
 *
 * Devolve quantas bases vão em cada caixa. Sem `basesPorCaixa` no catálogo a
 * regra é a de sempre — 1 base, 1 caixa — e a função devolve `null` para quem
 * chama seguir pelo caminho antigo.
 *
 * O Cola quente e o Circuito Elétrico levam 5 kits por caixa de 5 cm. A SOBRA
 * tem regra própria, confirmada pela casa:
 *
 *   10 bases -> [5, 5]        exato
 *   12 bases -> [5, 5, 2]     sobrando 2 ou mais, abre caixa nova
 *   91 bases -> [5 ×17, 6]    sobrando 1, ela entra numa caixa que fica com 6
 *    6 bases -> [6]           mesma regra, com uma caixa só
 *    3 bases -> [3]           menos que a capacidade, uma caixa incompleta
 *
 * A soma SEMPRE bate com o pedido: nada é arredondado para cima, porque expedir
 * base a mais é EXCEDENTE na auditoria, não cortesia.
 */
export function caixasDoKit(
  prod: { basesPorCaixa?: number } | undefined,
  quantidade: number
): number[] | null {
  const cap = prod?.basesPorCaixa;
  if (!cap || cap < 2) return null;
  if (quantidade <= 0) return [];
  if (quantidade <= cap) return [quantidade];

  const cheias = Math.floor(quantidade / cap);
  const resto = quantidade % cap;
  if (resto === 0) return Array(cheias).fill(cap);
  if (resto === 1) return [...Array(cheias - 1).fill(cap), cap + 1];
  return [...Array(cheias).fill(cap), resto];
}

export function expandAssignmentsToPhysicalItems(
  assignments: ProjectAssignment[],
  allProducts: typeof catalogProducts = catalogProducts
): PhysicalItem[] {
  const physicalItems: PhysicalItem[] = [];

  assignments.forEach((assignment) => {
    const { id: assignmentId, projectId, catalogYearKey, targetYearKey, baseQuantity, complementQuantity, teacherQuantity } = assignment;
    const targetSy = parseSchoolYear(targetYearKey);
    const catalogSy = parseSchoolYear(catalogYearKey);

    const cleanProjTarget = cleanProjectName(projectId);
    const matchingProds = allProducts.filter(p => cleanProjectName(p.name) === cleanProjTarget);

    /*
      Quantas UNIDADES FÍSICAS uma quantidade pedida vira, e quanto cada uma pesa.

      Três casos, e é aqui que os três se encontram:
      - normal      -> 1 pedido = 1 caixa de `weight` kg
      - espaguete   -> 1 base = 2 unidades (`repeticoesPorKit`)
      - `basesPorCaixa` -> N bases numa caixa só, que pesa N × `weight`

      O peso tem de sair daqui junto com a contagem. Se a caixa com 5 fosse
      emitida com o peso de uma base, a carga inteira sairia cinco vezes mais
      leve e nada acusaria — o romaneio se acha coerente consigo mesmo.
    */
    const unidadesDe = (prod: typeof matchingProds[number]) => (quantidade: number) => {
      const caixas = caixasDoKit(prod, quantidade);
      if (caixas) {
        return caixas.map(bases => ({
          bundleSize: bases,
          peso: Number((bases * (prod.weight || 0)).toFixed(3)),
          variante: undefined as string | undefined
        }));
      }

      /*
        VARIANTES: cada base leva uma unidade de cada tipo, com o seu peso.

        No espaguete do Nossa Água são um com furo (0,220 kg) e um sem furo
        (0,288 kg). Antes era um produto só de 0,254 kg emitido duas vezes — a
        média exata dos dois, então o peso da carga sempre bateu; o que faltava
        era o romaneio dizer o que ia dentro do saco.

        Quem tem variantes NÃO usa `repeticoesPorKit`: a repetição por base é o
        número de variantes, senão sairia o dobro.
      */
      const variantes = (prod as any).variantes as Array<{ rotulo: string; peso: number }> | undefined;
      if (variantes && variantes.length > 0) {
        const out: Array<{ bundleSize: undefined; peso: number; variante: string }> = [];
        for (let q = 0; q < quantidade; q++)
          for (const v of variantes) out.push({ bundleSize: undefined, peso: v.peso, variante: v.rotulo });
        return out;
      }

      const n = quantidade * repeticoesPorKit(prod);
      return Array.from({ length: n }, () => ({
        bundleSize: undefined, peso: prod.weight || 0, variante: undefined as string | undefined
      }));
    };

    // 1. Expand Base student boxes
    if (baseQuantity > 0) {
      const studentBaseProds = matchingProds.filter(p => p.type === 'Base' && !p.professorOnly);
      studentBaseProds.forEach(prod => {
        const seq = extractSequence(prod);
        unidadesDe(prod)(baseQuantity).forEach((u, q) => {
          physicalItems.push({
            id: `phys-${assignmentId}-base-${prod.id}-${q}`,
            assignmentId,
            projectId: cleanProjTarget,
            catalogYearKey: catalogSy.key,
            targetYearKey: targetSy.key,
            destination: 'Aluno',
            type: 'Base',
            sequence: seq,
            packagingType: prod.packagingType,
            unitWeightKg: u.peso,
            bundleSize: u.bundleSize,
            variante: u.variante,
            relation: prod.ratio || '4 alunos',
            product: {
              ...prod, // Keeps original catalog product.name (e.g., "6º Ano - Através da lente")
              year: targetSy.label
            }
          });
        });
      });
    }

    // 2. Expand Complementar student boxes
    if (complementQuantity > 0) {
      const studentCompProds = matchingProds.filter(p => p.type === 'Complementar' && !p.professorOnly);
      studentCompProds.forEach(prod => {
        const seq = extractSequence(prod);
        unidadesDe(prod)(complementQuantity).forEach((u, q) => {
          physicalItems.push({
            id: `phys-${assignmentId}-comp-${prod.id}-${q}`,
            assignmentId,
            projectId: cleanProjTarget,
            catalogYearKey: catalogSy.key,
            targetYearKey: targetSy.key,
            destination: 'Aluno',
            type: 'Complementar',
            sequence: seq,
            packagingType: prod.packagingType,
            unitWeightKg: u.peso,
            bundleSize: u.bundleSize,
            variante: u.variante,
            relation: prod.ratio || '4 alunos',
            product: {
              ...prod,
              year: targetSy.label
            }
          });
        });
      });
    }

    // 3. Expand Teacher items
    if (teacherQuantity > 0) {
      const explicitTeacherProds = matchingProds.filter(p => p.professorOnly === true || p.ratio === '1x Professor');
      const teacherProdsToUse = explicitTeacherProds.length > 0
        ? explicitTeacherProds
        : matchingProds.filter(p => p.type === 'Base' && !p.professorOnly);

      teacherProdsToUse.forEach(prod => {
        const seq = extractSequence(prod);
        unidadesDe(prod)(teacherQuantity).forEach((u, q) => {
          physicalItems.push({
            id: `phys-${assignmentId}-prof-${prod.id}-${q}`,
            assignmentId,
            projectId: cleanProjTarget,
            catalogYearKey: catalogSy.key,
            targetYearKey: targetSy.key,
            destination: 'Professor',
            type: prod.type,
            sequence: seq,
            packagingType: prod.packagingType,
            unitWeightKg: u.peso,
            bundleSize: u.bundleSize,
            variante: u.variante,
            relation: '1x Professor',
            product: {
              ...prod,
              ratio: '1x Professor',
              year: targetSy.label
            }
          });
        });
      });
    }
  });

  return physicalItems;
}

/**
 * @param problemas recebe as inconsistências encontradas, para virarem erro de
 *   auditoria. Não é `throw` de propósito: `App.tsx` chama isto direto no
 *   handler do botão, sem `try`, e uma exceção ali apaga a tela inteira. Erro
 *   de auditoria o operador lê; tela branca ele não.
 */
export function convertOrderItemsToAssignments(
  orderItems: OrderItem[],
  problemas?: string[]
): ProjectAssignment[] {
  const map: Record<string, {
    assignmentId: string;
    cleanProj: string;
    catalogYearKey: string;
    targetYearKey: string;
    baseSeqMap: Record<string, number>;
    compSeqMap: Record<string, number>;
    teacherSeqMap: Record<string, number>;
  }> = {};

  orderItems.forEach((item, idx) => {
    const cleanProj = cleanProjectName(item.product.name);
    let targetSy: SchoolYear;
    try {
      targetSy = parseSchoolYear(item.targetYearKey || item.product.year);
    } catch {
      targetSy = parseSchoolYear('1º Ano');
    }

    let catalogSy: SchoolYear;
    try {
      catalogSy = parseSchoolYear(item.catalogYearKey || item.product.year);
    } catch {
      catalogSy = targetSy;
    }

    const key = `${cleanProj}__${targetSy.key}`;

    if (!map[key]) {
      map[key] = {
        assignmentId: `assign-${idx}`,
        cleanProj,
        catalogYearKey: catalogSy.key,
        targetYearKey: targetSy.key,
        baseSeqMap: {},
        compSeqMap: {},
        teacherSeqMap: {}
      };
    }

    const entry = map[key];
    const seq = extractSequence(item.product);
    const qty = item.quantity || 0;

    if (item.destination === 'Professor') {
      entry.teacherSeqMap[seq] = (entry.teacherSeqMap[seq] || 0) + qty;
    } else if (item.product.type === 'Complementar') {
      entry.compSeqMap[seq] = (entry.compSeqMap[seq] || 0) + qty;
    } else {
      entry.baseSeqMap[seq] = (entry.baseSeqMap[seq] || 0) + qty;
    }
  });

  /*
    Cada caixa de um projeto tem de vir na mesma quantidade: 1/3, 2/3 e 3/3
    são partes de UM kit, e pedir 10 de uma e 12 de outra não é um pedido
    válido, é um erro de digitação. Antes disto o `Math.max` escolhia 12 e
    seguia calado — o romaneio saía com 12 kits e ninguém ficava sabendo.
  */
  const quantidadeUnica = (
    seqMap: Record<string, number>,
    entry: { cleanProj: string; targetYearKey: string },
    rotulo: string
  ): number => {
    const valores = Object.values(seqMap);
    if (valores.length === 0) return 0;
    const distintos = Array.from(new Set(valores));
    if (distintos.length > 1 && problemas) {
      const detalhe = Object.entries(seqMap).map(([s, q]) => `${s}=${q}`).join(', ');
      problemas.push(
        `QUANTIDADE INCONSISTENTE: ${entry.cleanProj} (${entry.targetYearKey}, ${rotulo}) ` +
        `pede quantidades diferentes por caixa (${detalhe}). As caixas de um projeto ` +
        `são partes do mesmo kit e têm de vir na mesma quantidade.`
      );
    }
    return Math.max(...valores);
  };

  return Object.values(map).map(entry => {
    const baseQuantity = quantidadeUnica(entry.baseSeqMap, entry, 'Base');
    const complementQuantity = quantidadeUnica(entry.compSeqMap, entry, 'Complementar');
    const teacherQuantity = quantidadeUnica(entry.teacherSeqMap, entry, 'Professor');

    return {
      id: entry.assignmentId,
      projectId: entry.cleanProj,
      catalogYearKey: entry.catalogYearKey,
      targetYearKey: entry.targetYearKey,
      baseQuantity,
      complementQuantity,
      teacherQuantity
    };
  });
}

function addItemToVolume(vol: Volume, item: PhysicalItem | { product: any; quantity: number; destination?: 'Aluno' | 'Professor'; targetYearKey?: string; catalogYearKey?: string; assignmentId?: string }) {
  const prod = 'product' in item ? item.product : item;
  const qty = 'quantity' in item ? item.quantity : 1;
  const dest = ('destination' in item && item.destination) ? item.destination : (prod.destination || vol.category);
  const unitW = prod.weight || 0;

  /*
    A SÉRIE DE DESTINO faz parte da identidade da linha.

    Antes a busca era só por produto + destino, e duas remessas do MESMO produto
    para séries diferentes viravam uma linha só, com a série da primeira. No
    Brasil Canadá Santana, "Our first Atelier" vai para o Infantil e para o 1º
    ano: os dois kits de professor caíram no mesmo volume, viraram "Infantil,
    quantidade 2", e o 1º ano ficou sem nada no papel.

    A quantidade total saía certa — a escola recebia os dois. Quem mentia era o
    documento, e era a auditoria que pegava, não o motor.
  */
  const alvo = 'targetYearKey' in item ? item.targetYearKey : undefined;

  /*
    O TAMANHO DO PACOTE também faz parte da identidade da linha.

    Um volume pode levar duas caixas de 5 kits e uma de 6 (a regra da sobra do
    Cola quente). Somadas numa linha só, a quantidade viraria 3 e o "(caixa com
    N)" teria de escolher um N — o documento diria 3 caixas de 5, ou 3 de 6, e
    nos dois casos mentiria sobre o conteúdo. Separadas, saem "2 (caixa com 5)"
    e "1 (caixa com 6)", que é o que está dentro.

    O peso segue o pacote: quem tem `bundleSize` pesa `bundleSize × weight`,
    porque `weight` no catálogo é o peso de UMA base.
  */
  const pacote = ('bundleSize' in item ? item.bundleSize : undefined) as number | undefined;
  const pesoDaUnidade = unitW * (pacote || 1);

  const existing = vol.items.find(i =>
    i.product.id === prod.id
    && (i.destination || vol.category) === dest
    && i.targetYearKey === alvo
    && i.bundleSize === pacote);
  if (existing) {
    existing.quantity += qty;
    existing.totalWeight = Number((existing.quantity * pesoDaUnidade).toFixed(3));
  } else {
    vol.items.push({
      product: prod,
      quantity: qty,
      bundleSize: pacote,
      totalWeight: Number((qty * pesoDaUnidade).toFixed(3)),
      destination: dest,
      targetYearKey: 'targetYearKey' in item ? item.targetYearKey : undefined,
      catalogYearKey: 'catalogYearKey' in item ? item.catalogYearKey : undefined,
      assignmentId: 'assignmentId' in item ? item.assignmentId : undefined
    });
  }
  vol.totalWeight = Number((vol.totalWeight + qty * pesoDaUnidade).toFixed(3));
}

export function sortVolumeItems(items: PackedItem[]): void {
  items.sort((a, b) => {
    // 1. Destination: Aluno before Professor
    const destA = a.destination || 'Aluno';
    const destB = b.destination || 'Aluno';
    if (destA !== destB) return destA === 'Aluno' ? -1 : 1;

    // 2. Target year rank
    const yrA = a.targetYearKey ? parseSchoolYear(a.targetYearKey).label : (a.product?.year || '');
    const yrB = b.targetYearKey ? parseSchoolYear(b.targetYearKey).label : (b.product?.year || '');
    const yrCmp = compareSchoolYears(yrA, yrB);
    if (yrCmp !== 0) return yrCmp;

    // 3. Type: Base before Complementar
    const typeA = a.product?.type || 'Base';
    const typeB = b.product?.type || 'Base';
    if (typeA !== typeB) return typeA === 'Base' ? -1 : 1;

    // 4. Sequence box number: 1/3, 2/3, 3/3
    const seqA = extractSequence(a.product);
    const seqB = extractSequence(b.product);
    const matchA = seqA.match(/^(\d+)/);
    const matchB = seqB.match(/^(\d+)/);
    const numA = matchA ? parseInt(matchA[1], 10) : 999;
    const numB = matchB ? parseInt(matchB[1], 10) : 999;
    if (numA !== numB) return numA - numB;

    return (a.product?.name || '').localeCompare(b.product?.name || '');
  });
}

/**
 * Ordena e numera os volumes.
 *
 * A regra que faltava é a **sequência da caixa**: 1/3 tem de sair num volume
 * anterior ao da 2/3, e o tubo 2/2 depois da coletiva 1/2. Antes a ordem era
 * decidida só pelo TIPO de embalagem, e o espaguete tinha prioridade 0 — então
 * o espaguete 2/2 da Nossa Água virava o volume 1 e a coletiva 1/2 o volume 2,
 * de trás para frente na doca.
 *
 * Quando o empacotamento mistura sequências no mesmo volume (permitido, e só
 * acontece quando economiza volume), ordenar pela MENOR sequência de cada
 * volume ainda deixa a leitura progredindo.
 */
function ordenarENumerar(volumes: Volume[]): void {
  /**
   * A ordem das embalagens dentro do bloco da série, como a doca monta a pilha:
   * **coletiva em cima, depois tubo, plástica e espaguete.**
   *
   * Pedido da casa. Antes a ordem era plástica → espaguete → tubo, e — pior — o
   * TIPO só era consultado depois da sequência da caixa. No romaneio do PH Barra
   * isso jogava a coletiva de complementares do Fossil hunters para o volume 14,
   * depois de onze tubos, porque complementar entra numa faixa de sequência
   * acima (+100). Ela tem de ser o volume 3, logo abaixo das outras coletivas.
   */
  const prioridadeTipo = (tipo: string) => {
    if (tipo === EXTERNAL_PACKAGES.COLLECTIVE.label) return 0;
    if (tipo === EXTERNAL_PACKAGES.TUBE.countFilter || tipo === 'Caixa Tubo' || tipo === 'Tubo') return 1;
    if (tipo === EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter || tipo === 'Caixa Plástica') return 2;
    if (tipo === EXTERNAL_PACKAGES.SPAGHETTI.label) return 3;
    return 4;
  };

  /**
   * Sequência do volume, medida no PROJETO DOMINANTE — o que tem mais caixas ali
   * dentro.
   *
   * Duas armadilhas resolvidas aqui, as duas descobertas em varredura:
   *
   * 1. Base e Complementar numeram por conta própria: a 3/3 da Base convive com
   *    uma 1/1 Complementar do mesmo projeto. Somadas na mesma escala, o volume
   *    das 3/3 herdava "sequência 1" e furava a fila. Por isso a Complementar
   *    entra numa faixa acima (+100).
   *
   * 2. Sequências de projetos DIFERENTES não são comparáveis. Num volume misto
   *    com 3 caixas 3/3 do Porquinhos e 2 caixas 1/1 de outro projeto, o 1/1
   *    alheio puxava o mínimo para 1 e jogava o 3/3 do Porquinhos para antes do
   *    seu próprio 2/3. Medir só o projeto dominante resolve.
   */
  const faixaSequencia = (v: Volume): [number, number] => {
    if (v.items.length === 0) return [999, 999];

    const porProjeto = new Map<string, number>();
    v.items.forEach(i => {
      const p = cleanProjectName(i.product?.name || '');
      porProjeto.set(p, (porProjeto.get(p) || 0) + i.quantity);
    });
    const dominante = [...porProjeto.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

    const nums = v.items
      .filter(i => cleanProjectName(i.product?.name || '') === dominante)
      .map(i => {
        const seq = parseInt(extractSequence(i.product).split('/')[0] || '1', 10);
        const tier = i.product?.type === 'Complementar' ? 100 : 0;
        return tier + (Number.isFinite(seq) ? seq : 1);
      });

    return nums.length ? [Math.min(...nums), Math.max(...nums)] : [999, 999];
  };

  /*
    Só o RANK do ano, não o rótulo inteiro.

    `compareSchoolYears` resolve "1º Ano" e "1º Ano e 2º Ano" no mesmo rank e
    desempata pelo texto — o que enfiava o volume misto depois de todos os puros
    do mesmo ano, antes de a sequência ser sequer consultada. Resultado: um tubo
    2/2 puro saía antes da coletiva 1/2 que estava num volume misto.

    Comparando só o rank, o misto fica no bloco do menor ano que carrega (como o
    CLAUDE.md pede) e a ordem das caixas decide dentro do bloco.
  */
  const rankAno = (v: Volume): number => {
    try { return parseSchoolYear(v.year).sortRank; } catch { return 999; }
  };

  /**
   * Quantas séries diferentes o volume carrega. Puro = 1, misto = 2 ou mais.
   *
   * O volume misto fica no FIM do bloco da série menor que ele carrega, nunca
   * no meio. Como o rank dele é o do ano menor, sem esta conta ele se
   * intercalava com os puros: no PH Jockey o volume 2 era 1º+4º, os volumes 3 a
   * 12 voltavam a ser só 1º, e só então vinha o 4º. Lendo na doca, o ano ia e
   * voltava. Agora sai 1º puro do 1 ao 11, o misto no 12, e o 4º a partir do 13.
   *
   * Isto mexe SÓ na ordem — o conteúdo de cada volume e a contagem não mudam.
   */
  const quantasSeries = (v: Volume): number => {
    const chaves = new Set<string>();
    for (const it of v.items) {
      if (it.targetYearKey) { chaves.add(it.targetYearKey); continue; }
      try { if (it.product?.year) chaves.add(parseSchoolYear(it.product.year).key); } catch { /* empty */ }
    }
    return chaves.size || 1;
  };

  /**
   * Assinatura do conteúdo do volume — o desempate final da ordenação.
   *
   * Começa pelo NOME do projeto dominante, para que volumes parecidos fiquem
   * vizinhos na doca, e só então desce ao detalhe (produto, quantidade, pacote).
   * Não depende de nada fora do volume, que é o ponto.
   */
  const conteudoDoVolume = (v: Volume): string => {
    const itens = v.items.map(i =>
      `${cleanProjectName(i.product?.name || '')}|${i.product?.id}|${i.quantity}|${i.bundleSize ?? 1}`).sort();
    const dominante = itens.length ? itens[0].split('|')[0] : '';
    return `${dominante}##${itens.join(',')}`;
  };

  volumes.sort((a, b) => {
    if (a.category !== b.category) return a.category === 'Aluno' ? -1 : 1;

    const ra = rankAno(a), rb = rankAno(b);
    if (ra !== rb) return ra - rb;

    // Puro antes de misto: o volume que junta duas séries fecha o bloco da
    // série menor, em vez de aparecer no meio dela.
    const pa = quantasSeries(a), pb = quantasSeries(b);
    if (pa !== pb) return pa - pb;

    // Volumes da MESMA faixa andam juntos. Entre os mistos de um mesmo bloco há
    // rótulos diferentes ("1º Ano e 2º Ano", "1º Ano e 3º Ano") com o mesmo rank
    // e a mesma contagem de séries; sem esta linha o desempate caía na embalagem
    // e na sequência, e a faixa saía 1º+2º, 1º+3º, 1º+2º de novo. Na doca o ano
    // ia e voltava — o mesmo defeito do PH Jockey, sobrando na parte mista.
    // Em bloco puro o rótulo é idêntico e esta comparação não decide nada.
    const faixa = a.year.localeCompare(b.year);
    if (faixa !== 0) return faixa;

    // A EMBALAGEM manda dentro do bloco, antes da sequência da caixa: todas as
    // coletivas da série, depois todos os tubos. Era o inverso, e uma coletiva
    // de complementares caía atrás de onze tubos.
    const tipo = prioridadeTipo(a.type) - prioridadeTipo(b.type);
    if (tipo !== 0) return tipo;

    // Dentro da mesma embalagem, a sequência das caixas: 1/3 antes de 2/3.
    const [minA, maxA] = faixaSequencia(a);
    const [minB, maxB] = faixaSequencia(b);
    if (minA !== minB) return minA - minB;
    if (maxA !== maxB) return maxA - maxB;

    /*
      ÚLTIMO critério: o que está DENTRO do volume.

      Sem ele sobrava empate — dois volumes do mesmo bloco, mesma mistura, mesma
      embalagem e mesma sequência não tinham como se separar. `Array.sort` é
      estável, então o desempate caía na ordem em que os PROJETOS foram
      informados, que não é propriedade da carga: o CLI recebe na ordem do
      planejamento e o app na ordem alfabética da tela.

      Resultado: a mesma carga saía com numeração diferente nos dois caminhos. No
      Agostiniano Mendel, 6 dos 116 volumes trocavam de etiqueta — o volume 5 era
      o do Cinema no app e o do Circuito Elétrico no script. Carga idêntica,
      papéis que não se conferem um pelo outro.

      A chave é o conteúdo em ordem fixa, então a numeração passa a ser função só
      da carga. Isto NÃO reordena bloco nenhum: só decide dentro de um grupo que
      já empatou em série, mistura, embalagem e sequência.
    */
    return conteudoDoVolume(a).localeCompare(conteudoDoVolume(b));
  });

  renumerarVolumes(volumes);
}

/**
 * Reescreve `1/N` … `N/N` na ordem em que os volumes estão.
 *
 * A auditoria exige que o número bata com a posição (`idx + 1`) e que o total
 * do cabeçalho bata com a contagem. Quem edita o romaneio na tela mexe nisso
 * sem querer: adicionar volume criava `"6"` cru, sem `/N`, e excluir deixava
 * buraco (`1/5, 2/5, 3/5, 5/5`). Nos dois casos o romaneio se reprovava
 * sozinho, por um defeito de numeração e não de carga.
 *
 * Chamar SEMPRE depois de adicionar, excluir ou reordenar volume.
 */
export function renumerarVolumes(volumes: Volume[]): Volume[] {
  const total = volumes.length;
  volumes.forEach((v, i) => { v.volumeNumber = `${i + 1}/${total}`; });
  return volumes;
}

export function buildYearHeading(volume: Volume): string {
  const years = Array.from(new Set(
    volume.items.map(it => {
      if (it.targetYearKey) {
        return parseSchoolYear(it.targetYearKey).label;
      }
      return it.product?.year;
    }).filter(Boolean) as string[]
  ));
  if (years.length === 0) return volume.year || 'Geral';
  return formatYearHeader(years);
}

/**
 * Deterministic packing algorithm taking PhysicalItems
 */
export function packPhysicalItems(
  physicalItems: PhysicalItem[],
  opcoes: OpcoesEmpacotamento = {}
): Volume[] {
  const studentItems = physicalItems.filter(i => i.destination === 'Aluno');
  const teacherItems = physicalItems.filter(i => i.destination === 'Professor');

  const volumes: Volume[] = [];

  // 1. Pack Student Items by Target Year & Cycle
  const studentByYearKey = new Map<string, PhysicalItem[]>();
  studentItems.forEach(item => {
    if (!studentByYearKey.has(item.targetYearKey)) {
      studentByYearKey.set(item.targetYearKey, []);
    }
    studentByYearKey.get(item.targetYearKey)!.push(item);
  });

  const sortedYearKeys = Array.from(studentByYearKey.keys()).sort((a, b) => compareSchoolYears(a, b));

  for (const yearKey of sortedYearKeys) {
    const itemsInYear = studentByYearKey.get(yearKey)!;
    const yearSy = parseSchoolYear(yearKey);

    const standardItems: PhysicalItem[] = [];
    const specialItems: PhysicalItem[] = [];

    itemsInYear.forEach(item => {
      if (item.packagingType === 'Espaguete') {
        return; // Espaguete items are handled in their own dedicated bundle step below
      }
      if (isSpecialPackaging(item.packagingType)) {
        specialItems.push(item);
      } else {
        standardItems.push(item);
      }
    });

    // Handle special student items (Tubo, Caixa Plástica)
    specialItems.forEach(item => {
      let boxType = item.packagingType;
      let boxDim = EXTERNAL_PACKAGES.COLLECTIVE.dimensions;

      if (boxType === 'Caixa Tubo' || boxType === 'Tubo') {
        boxType = EXTERNAL_PACKAGES.TUBE.countFilter;
        boxDim = EXTERNAL_PACKAGES.TUBE.dimensions;
      } else if (boxType === 'Caixa Plástica') {
        boxType = EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter;
        boxDim = EXTERNAL_PACKAGES.PLASTIC_BOX.dimensions;
      }

      volumes.push({
        volumeNumber: 0,
        type: boxType,
        dimensions: boxDim,
        items: [{
          product: item.product,
          quantity: 1,
          totalWeight: item.unitWeightKg,
          destination: 'Aluno',
          targetYearKey: item.targetYearKey,
          catalogYearKey: item.catalogYearKey,
          assignmentId: item.assignmentId
        }],
        totalWeight: item.unitWeightKg,
        year: yearSy.label,
        category: 'Aluno',
        targetYearKeys: [item.targetYearKey]
      });
    });

    // Group standard items by project
    const byProject = new Map<string, PhysicalItem[]>();
    standardItems.forEach(item => {
      if (!byProject.has(item.projectId)) byProject.set(item.projectId, []);
      byProject.get(item.projectId)!.push(item);
    });

    const yearLeftovers: PhysicalItem[] = [];

    for (const [projId, projItems] of byProject.entries()) {
      const sacos = projItems.filter(i => i.packagingType === 'Saco');
      const rigids = projItems.filter(i => i.packagingType !== 'Saco');

      rigids.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'Base' ? -1 : 1;
        const seqA = parseInt(a.sequence.split('/')[0] || '1', 10);
        const seqB = parseInt(b.sequence.split('/')[0] || '1', 10);
        return seqA - seqB;
      });

      const totalRigids = rigids.length;
      if (totalRigids > 0) {
        const novoVolume = (): Volume => ({
          volumeNumber: 0,
          type: EXTERNAL_PACKAGES.COLLECTIVE.label,
          dimensions: EXTERNAL_PACKAGES.COLLECTIVE.dimensions,
          items: [],
          totalWeight: 0,
          year: yearSy.label,
          category: 'Aluno',
          targetYearKeys: [yearKey]
        });

        const cabe = (vol: Volume, u: PhysicalItem) =>
          canAddItemToVolumeState(getVolumeState(vol), { weight: u.unitWeightKg, product: u.product });

        // Empacota de verdade. Duas fases por volume:
        //   1) enche na ordem do catálogo até bater num teto;
        //   2) antes de fechar, completa os slots que sobraram com a unidade
        //      mais leve ainda pendente, mesmo que fora de ordem.
        // A fase 2 é o que evita o volume com slot vago: quando a caixa 1/3
        // (3,539 kg) trava o volume em 5 por peso, ainda cabe uma 3/3 (1,640 kg)
        // no sexto slot. Sem ela, o 1º ano gasta 7 volumes onde bastam 6.
        const montarGrupos = (lista: PhysicalItem[], completar: boolean): PhysicalItem[][] => {
          const pendentes = [...lista];
          const grupos: PhysicalItem[][] = [];

          while (pendentes.length > 0) {
            const vol = novoVolume();
            const grupo: PhysicalItem[] = [];

            while (pendentes.length > 0 && cabe(vol, pendentes[0])) {
              const u = pendentes.shift()!;
              addItemToVolume(vol, u);
              grupo.push(u);
            }

            while (completar) {
              let escolhido = -1;
              let maisLeve = Infinity;
              for (let k = 0; k < pendentes.length; k++) {
                const u = pendentes[k];
                if (cabe(vol, u) && u.unitWeightKg < maisLeve) {
                  maisLeve = u.unitWeightKg;
                  escolhido = k;
                }
              }
              if (escolhido < 0) break;
              const u = pendentes.splice(escolhido, 1)[0];
              addItemToVolume(vol, u);
              grupo.push(u);
            }

            if (grupo.length === 0) {           // item que não cabe sozinho
              const u = pendentes.shift()!;
              grupo.push(u);
            }
            grupos.push(grupo);
          }
          return grupos;
        };

        // Só quebra a ordem do catálogo se isso realmente eliminar um volume.
        const emOrdem = montarGrupos(rigids, false);
        const completo = montarGrupos(rigids, true);
        const grupos = completo.length < emOrdem.length ? completo : emOrdem;

        // Espalha a carga entre os volumes já criados, sem criar volume novo:
        // 6,6,6,1 vira 5,5,5,5. Coletiva com 1 ou 2 caixas amassa no transporte.
        for (let passo = 0; passo < grupos.length * 6; passo++) {
          grupos.sort((a, b) => a.length - b.length);
          const menor = grupos[0];
          const maior = grupos[grupos.length - 1];
          if (maior.length - menor.length < 2) break;

          const volMenor = novoVolume();
          menor.forEach(u => addItemToVolume(volMenor, u));
          const candidato = [...maior]
            .sort((a, b) => a.unitWeightKg - b.unitWeightKg)
            .find(u => cabe(volMenor, u));
          if (!candidato) break;

          maior.splice(maior.indexOf(candidato), 1);
          menor.push(candidato);
        }

        for (const grupo of grupos) {
          grupo.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'Base' ? -1 : 1;
            return parseInt(a.sequence, 10) - parseInt(b.sequence, 10);
          });
          const vol = novoVolume();
          grupo.forEach(u => addItemToVolume(vol, u));
          if (vol.items.length > 0) volumes.push(vol);
        }

        const projVols = volumes.filter(v => v.targetYearKeys?.includes(yearKey)
          && v.type === EXTERNAL_PACKAGES.COLLECTIVE.label && v.category === 'Aluno');

        for (const saco of sacos) {
          let placed = false;
          for (const vol of projVols) {
            const st = getVolumeState(vol);
            if (st.quantidade10cm + st.quantidade5cm >= 3 && canAddItemToVolumeState(st, { weight: saco.unitWeightKg, product: saco.product })) {
              addItemToVolume(vol, saco);
              placed = true;
              break;
            }
          }

          // Tenta outra coletiva de aluno já aberta, mas SÓ DA MESMA SÉRIE.
          //
          // Antes isto aceitava qualquer série, o que economizava um volume de
          // vez em quando — e custava a ordem: o saco do Comunicamão pousava
          // numa coletiva do 2º ano e saía no volume 2 enquanto a base dele
          // ficava no volume 26. Complementar tem de vir depois da base, e a
          // posição do volume segue a série; ficando na série certa, a ordem se
          // resolve sozinha.
          if (!placed) {
            for (const vol of volumes) {
              if (vol.category !== 'Aluno' || vol.type !== EXTERNAL_PACKAGES.COLLECTIVE.label) continue;
              if (!vol.targetYearKeys?.includes(yearKey)) continue;
              const st = getVolumeState(vol);
              if (st.quantidade10cm + st.quantidade5cm >= 3 &&
                  canAddItemToVolumeState(st, { weight: saco.unitWeightKg, product: saco.product })) {
                addItemToVolume(vol, saco);
                placed = true;
                break;
              }
            }
          }

          // Último recurso: abre espaço remanejando as caixas do próprio
          // projeto. Sem esta etapa o saco saía sozinho, com zero rígidas em
          // volta — justamente a regra que ele existe para cumprir, e o motor
          // reprovava o próprio romaneio. Acontecia sempre que as bases
          // fechavam a coletiva em cheio: 6 caixas de 10 cm ocupam as 12
          // unidades e não sobra espaço para o saco.
          if (!placed) placed = abrirEspacoParaSaco(volumes, projVols, saco, yearKey, yearSy.label);

          if (!placed) yearLeftovers.push(saco);
        }
      } else {
        yearLeftovers.push(...sacos);
      }
    }

    if (yearLeftovers.length > 0) {
      for (const u of yearLeftovers) {
        let placed = false;
        const yearVols = volumes.filter(v => v.category === 'Aluno' && v.type === EXTERNAL_PACKAGES.COLLECTIVE.label && v.targetYearKeys?.includes(yearKey));
        for (const vol of yearVols) {
          const st = getVolumeState(vol);
          if (canAddItemToVolumeState(st, { weight: u.unitWeightKg, product: u.product })) {
            addItemToVolume(vol, u);
            placed = true;
            break;
          }
        }

        if (!placed) {
          const newVol: Volume = {
            volumeNumber: 0,
            type: EXTERNAL_PACKAGES.COLLECTIVE.label,
            dimensions: EXTERNAL_PACKAGES.COLLECTIVE.dimensions,
            items: [],
            totalWeight: 0,
            year: yearSy.label,
            category: 'Aluno',
            targetYearKeys: [yearKey]
          };
          addItemToVolume(newVol, u);
          volumes.push(newVol);
        }
      }
    }
  }

  // 1.5 Optimize student volumes (consolidate subutilized boxes across years within the same school cycle)
  optimizeStudentVolumes(volumes);

  // 2. Pack Teacher Items
  if (teacherItems.length > 0) {
    const specialProfItems: PhysicalItem[] = [];
    const standardProfItems: PhysicalItem[] = [];

    teacherItems.forEach(item => {
      if (item.packagingType === 'Espaguete') {
        return; // Espaguete items are handled in their own dedicated bundle step below
      }
      if (isSpecialPackaging(item.packagingType)) {
        specialProfItems.push(item);
      } else {
        standardProfItems.push(item);
      }
    });

    specialProfItems.forEach(item => {
      let boxType = item.packagingType;
      let boxDim = EXTERNAL_PACKAGES.COLLECTIVE.dimensions;

      if (boxType === 'Caixa Tubo' || boxType === 'Tubo') {
        boxType = EXTERNAL_PACKAGES.TUBE.countFilter;
        boxDim = EXTERNAL_PACKAGES.TUBE.dimensions;
      } else if (boxType === 'Caixa Plástica') {
        boxType = EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter;
        boxDim = EXTERNAL_PACKAGES.PLASTIC_BOX.dimensions;
      }

      const itemSy = parseSchoolYear(item.targetYearKey);

      volumes.push({
        volumeNumber: 0,
        type: boxType,
        dimensions: boxDim,
        items: [{
          product: item.product,
          quantity: 1,
          totalWeight: item.unitWeightKg,
          destination: 'Professor',
          targetYearKey: item.targetYearKey,
          catalogYearKey: item.catalogYearKey,
          assignmentId: item.assignmentId
        }],
        totalWeight: item.unitWeightKg,
        year: itemSy.label,
        category: 'Professor',
        targetYearKeys: [item.targetYearKey]
      });
    });

    // Exceção pedida no arquivo do pedido: o professor pode pegar carona numa
    // coletiva de aluno que já esteja aberta. Só encaixa em volume existente,
    // nunca abre volume novo — então o resultado nunca é pior que o padrão, e
    // quando o professor sozinho seria o último volume, é um volume a menos.
    const professorEmCaronaIdx = new Set<number>();
    if (opcoes.professorJuntoComAluno && standardProfItems.length > 0) {
      standardProfItems.forEach((item, idx) => {
        const candidatos = volumes
          .filter(v => v.category === 'Aluno' && v.type === EXTERNAL_PACKAGES.COLLECTIVE.label)
          .filter(v => canAddItemToVolumeState(
            getVolumeState(v), { weight: item.unitWeightKg, product: item.product }
          ))
          .sort((a, b) => {
            // Mesma série primeiro: mantém o bloco do romaneio coerente.
            const aMesmaSerie = a.targetYearKeys?.includes(item.targetYearKey) ? 0 : 1;
            const bMesmaSerie = b.targetYearKeys?.includes(item.targetYearKey) ? 0 : 1;
            if (aMesmaSerie !== bMesmaSerie) return aMesmaSerie - bMesmaSerie;
            // Depois o mais vazio, para não concentrar carga num volume só.
            return getVolumeState(a).ocupacaoPontos - getVolumeState(b).ocupacaoPontos;
          });

        if (candidatos.length > 0) {
          addItemToVolume(candidatos[0], item);
          // A marca diz "este volume mistura de propósito". Sem ela, só a
          // opção do pedido dizia isso — e quem lesse o volume depois (o
          // documento, a auditoria de outra passada, um teste) via uma
          // mistura sem explicação, indistinguível de um erro do motor.
          candidatos[0].professorJunto = true;
          professorEmCaronaIdx.add(idx);
        }
      });
    }

    const profItemsRestantes = standardProfItems.filter((_, idx) => !professorEmCaronaIdx.has(idx));

    if (profItemsRestantes.length > 0) {
      profItemsRestantes.sort((a, b) => {
        const yrDiff = compareSchoolYears(a.targetYearKey, b.targetYearKey);
        if (yrDiff !== 0) return yrDiff;
        return a.projectId.localeCompare(b.projectId);
      });

      /*
        O volume do professor obedece aos MESMOS tetos do volume de aluno.

        Antes isto fatiava só por contagem — `ceil(total / 6)` e pronto — sem
        olhar peso nenhum. No Agostiniano Mendel são 3 professores dos Três
        Porquinhos, 3 caixas cada: o corte de 6 juntou 3 × 3,539 kg com
        3 × 3,180 kg e fechou um volume de 20,157 kg. Seis caixas cabem em
        espaço; 20 kg não cabem em regra nem nas costas de quem carrega.

        O `balancedSizes` continua valendo como ALVO, para não sobrar um volume
        quase vazio no fim. Mas quem manda é `canAddItemToVolumeState`: não
        coube, abre outro.

        O alvo é `total / 12`, não `total / 6`. O 6 supunha que toda caixa fosse
        de 10 cm — que ocupa 2 unidades, e 6 × 2 dá a capacidade cheia. Quando as
        caixas do professor são de 5 cm cabem 12, e o volume fechava na metade:
        no Agostiniano Mendel eram 6 volumes para 45 unidades e 52,3 kg, um deles
        com uma única caixa de 0,32 kg, onde 4 bastavam. Baixar o alvo não
        afrouxa teto nenhum — peso, unidades e os limites de 10/5 cm continuam
        conferidos caixa a caixa logo abaixo.
      */
      const totalItems = profItemsRestantes.length;
      const sizes = balancedSizes(totalItems, Math.ceil(totalItems / 12));

      let vol: Volume | null = null;
      let vagasNoVolume = 0;
      let idxTamanho = 0;

      for (const u of profItemsRestantes) {
        const cabe = vol !== null
          && vagasNoVolume > 0
          && canAddItemToVolumeState(getVolumeState(vol), { weight: u.unitWeightKg, product: u.product });

        if (!cabe) {
          vol = {
            volumeNumber: 0,
            type: EXTERNAL_PACKAGES.COLLECTIVE.label,
            dimensions: EXTERNAL_PACKAGES.COLLECTIVE.dimensions,
            items: [],
            totalWeight: 0,
            year: parseSchoolYear(u.targetYearKey).label,
            category: 'Professor',
            targetYearKeys: []
          };
          volumes.push(vol);
          vagasNoVolume = sizes[idxTamanho] ?? 6;
          idxTamanho++;
        }

        addItemToVolume(vol!, u);
        vagasNoVolume--;
        vol!.targetYearKeys = Array.from(new Set([...(vol!.targetYearKeys || []), u.targetYearKey]));
      }
    }
  }

  // Handle Espaguete items
  // Espaguete: tudo de um mesmo projeto vai num saco só, que ocupa 1 volume.
  // Separado por destino — material de professor nunca divide volume com aluno.
  const espagueteItems = physicalItems.filter(i => i.packagingType === 'Espaguete');
  if (espagueteItems.length > 0) {
    const sacosEspaguete = new Map<string, PhysicalItem[]>();
    espagueteItems.forEach(item => {
      const chave = `${item.destination}__${item.projectId}__${item.targetYearKey}`;
      if (!sacosEspaguete.has(chave)) sacosEspaguete.set(chave, []);
      sacosEspaguete.get(chave)!.push(item);
    });

    for (const lote of sacosEspaguete.values()) {
      const refItem = lote[0];
      const size = lote.length;
      // Peso do saco = soma dos pesos unitários do catálogo. Nada de constante
      // no código: se o peso do espaguete mudar, muda em products.ts e pronto.
      const packageWeight = Number(
        lote.reduce((acc, u) => acc + (u.unitWeightKg || 0), 0).toFixed(3)
      );
      const refSy = parseSchoolYear(refItem.targetYearKey);
      const cleanName = refItem.product.name
        .replace(/\s*\(?(?:Pacote|Embalagem)\s*(?:c\/|com)?\s*\d+\)?$/i, '')
        .trim();

      /*
        Um SACO, mas uma LINHA por variante.

        O volume continua sendo um só — todas as unidades do projeto vão no mesmo
        saco. O que muda é o detalhamento: com furo e sem furo têm pesos
        diferentes (0,220 e 0,288), e quem monta precisa saber quantos são de
        cada. Numa linha só, `1 (embalagem com 38)` não diz nada disso.

        Sem variantes, continua uma linha só, como sempre foi.
      */
      const porVariante = new Map<string, typeof lote>();
      for (const u of lote) {
        const k = (u as any).variante || '';
        if (!porVariante.has(k)) porVariante.set(k, []);
        porVariante.get(k)!.push(u);
      }

      const itens = [...porVariante.entries()].map(([variante, unidades]) => ({
        product: { ...refItem.product, name: cleanName },
        quantity: 1,
        bundleSize: unidades.length,
        variante: variante || undefined,
        totalWeight: Number(unidades.reduce((a, u) => a + (u.unitWeightKg || 0), 0).toFixed(3)),
        destination: refItem.destination,
        targetYearKey: refItem.targetYearKey,
        catalogYearKey: refItem.catalogYearKey,
        assignmentId: refItem.assignmentId
      }));

      volumes.push({
        volumeNumber: 0,
        type: EXTERNAL_PACKAGES.SPAGHETTI.label,
        dimensions: EXTERNAL_PACKAGES.SPAGHETTI.dimensions,
        items: itens,
        totalWeight: packageWeight,
        year: refSy.label,
        category: refItem.destination,
        targetYearKeys: [refItem.targetYearKey]
      });
      void size;
    }
  }

  volumes.forEach(v => {
    sortVolumeItems(v.items);
    v.year = buildYearHeading(v);
  });

  // Sort volumes: Aluno before Professor, then targetYear sortRank, then type
  juntarCaixaUnicaComProfessor(volumes);

  ordenarENumerar(volumes);

  return volumes;
}

/**
 * Uma caixa de aluno e uma de professor, da mesma série, viajam juntas.
 *
 * O caso é estreito de propósito: exatamente UMA caixa de cada lado. Sem isto,
 * um projeto com 1 base e 1 professor sai em dois volumes carregando uma caixa
 * cada — duas coletivas de 52x38x32 quase vazias, dois fretes, e as duas
 * amassando no caminho.
 *
 * Só junta dentro da MESMA série, porque na doca a conferência é por ano; e só
 * neste caso, porque para o resto a edição manual do romaneio é mais segura do
 * que o motor adivinhar.
 */
function juntarCaixaUnicaComProfessor(volumes: Volume[]): void {
  const coletiva = EXTERNAL_PACKAGES.COLLECTIVE.label;
  const conta = (v: Volume) => v.items.reduce((s, i) => s + i.quantity, 0);

  const solitarios = (categoria: 'Aluno' | 'Professor') =>
    volumes.filter(v => v.category === categoria && v.type === coletiva && conta(v) === 1);

  for (const volAluno of solitarios('Aluno')) {
    if (!volumes.includes(volAluno)) continue;

    const serieAluno = volAluno.targetYearKeys || [];
    if (serieAluno.length !== 1) continue;   // volume misto não entra na regra

    const volProf = solitarios('Professor').find(p => {
      if (!volumes.includes(p)) return false;
      const serieProf = p.targetYearKeys || [];
      if (serieProf.length !== 1 || serieProf[0] !== serieAluno[0]) return false;
      const item = p.items[0];
      return canAddItemToVolumeState(getVolumeState(volAluno), {
        weight: item.totalWeight ?? (item.product?.weight || 0),
        product: item.product
      });
    });
    if (!volProf) continue;

    volProf.items.forEach(item => addItemToVolume(volAluno, { ...item, destination: 'Professor' }));

    volAluno.professorJunto = true;
    volumes.splice(volumes.indexOf(volProf), 1);
  }
}

export function autoHealSaquinhos(volumes: Volume[]): Volume[] {
  const vols: Volume[] = JSON.parse(JSON.stringify(volumes));

  vols.forEach(v => {
    if (v.type !== EXTERNAL_PACKAGES.COLLECTIVE.label) return;
    const st = getVolumeState(v);
    if (st.quantidadeSaco > 0 && st.quantidade10cm + st.quantidade5cm < 3) {
      const saquinhoIdx = v.items.findIndex(it => ehSacoComplementar(it.product));

      if (saquinhoIdx >= 0) {
        const saquinhoItem = v.items[saquinhoIdx];
        
        const targetVol = vols.find(tVol => {
          if (tVol === v || tVol.type !== EXTERNAL_PACKAGES.COLLECTIVE.label) return false;
          const tSt = getVolumeState(tVol);
          return (tSt.quantidade10cm + tSt.quantidade5cm >= 3) && canAddItemToVolumeState(tSt, { weight: saquinhoItem.totalWeight, product: saquinhoItem.product });
        });

        if (targetVol) {
          v.items.splice(saquinhoIdx, 1);
          addItemToVolume(targetVol, saquinhoItem);
        }
      }
    }
  });

  return vols.filter(v => v.items.length > 0);
}

export function buildManifestFromVolumes(
  volumes: Volume[],
  assignments: ProjectAssignment[],
  expectedPhysicalItems: PhysicalItem[],
  schoolName: string,
  date: string,
  linha?: string,
  opcoes: OpcoesEmpacotamento = {}
): Manifest {
  volumes.forEach(v => {
    sortVolumeItems(v.items);
    v.year = buildYearHeading(v);
  });

  ordenarENumerar(volumes);

  volumes.forEach((v) => {
    v.totalWeight = Number(v.items.reduce((acc, item) => {
      const itemW = item.totalWeight !== undefined ? item.totalWeight : Number((item.quantity * pesoUnitario(item)).toFixed(3));
      return acc + itemW;
    }, 0).toFixed(3));
  });

  const totalWeight = Number(volumes.reduce((acc, v) => acc + v.totalWeight, 0).toFixed(3));
  const coletivaVolumes = volumes.filter(v => v.type === EXTERNAL_PACKAGES.COLLECTIVE.label).length;
  const coletivaWeight = Number(volumes.filter(v => v.type === EXTERNAL_PACKAGES.COLLECTIVE.label).reduce((acc, v) => acc + v.totalWeight, 0).toFixed(3));
  const otherVolumes = volumes.filter(v => v.type !== EXTERNAL_PACKAGES.COLLECTIVE.label).length;
  const otherWeight = Number(volumes.filter(v => v.type !== EXTERNAL_PACKAGES.COLLECTIVE.label).reduce((acc, v) => acc + v.totalWeight, 0).toFixed(3));

  const types: Record<string, { count: number; weight: number }> = {};
  volumes.forEach(v => {
    let typeName = v.type;
    if (typeName === 'Tubo') typeName = 'Caixa Tubo';
    if (!types[typeName]) {
      types[typeName] = { count: 0, weight: 0 };
    }
    types[typeName].count += 1;
    types[typeName].weight = Number((types[typeName].weight + v.totalWeight).toFixed(3));
  });

  const manifest: Manifest = {
    schoolName,
    date,
    linha,
    volumes,
    summary: {
      totalVolumes: volumes.length,
      totalWeight,
      coletivaVolumes,
      coletivaWeight,
      otherVolumes,
      otherWeight,
      types
    },
    originalAssignments: assignments,
    expectedPhysicalItems
  };

  manifest.audit = auditManifest(manifest, expectedPhysicalItems, assignments, opcoes);
  return manifest;
}

export function generateManifestFromAssignments(
  assignments: ProjectAssignment[],
  schoolName: string,
  date: string,
  linha?: string,
  opcoes: OpcoesEmpacotamento = {}
): Manifest {
  const expectedPhysicalItems = expandAssignmentsToPhysicalItems(assignments, catalogProducts);

  // Attempt 1: Standard Packing
  const volumes = packPhysicalItems(expectedPhysicalItems, opcoes);
  const manifest = buildManifestFromVolumes(volumes, assignments, expectedPhysicalItems, schoolName, date, linha, opcoes);

  if (manifest.audit?.status === 'APROVADO') {
    return manifest;
  }

  // Attempt 2: Auto-Heal Saquinhos
  const healedVolumes = autoHealSaquinhos(volumes);
  const healedManifest = buildManifestFromVolumes(healedVolumes, assignments, expectedPhysicalItems, schoolName, date, linha, opcoes);
  if (healedManifest.audit?.status === 'APROVADO') {
    return healedManifest;
  }

  return (healedManifest.audit?.errors.length || 0) < (manifest.audit?.errors.length || 0) ? healedManifest : manifest;
}

export function generateManifest(
  orderItems: OrderItem[],
  schoolName: string,
  date: string,
  linha?: string,
  opcoes: OpcoesEmpacotamento = {}
): Manifest {
  const problemasDoPedido: string[] = [];
  const assignments = convertOrderItemsToAssignments(orderItems, problemasDoPedido);
  const manifest = generateManifestFromAssignments(assignments, schoolName, date, linha, opcoes);

  // Pedido inconsistente reprova a carga: o motor empacotou alguma coisa, mas
  // não necessariamente o que a escola pediu.
  if (problemasDoPedido.length > 0 && manifest.audit) {
    manifest.audit.errors.push(...problemasDoPedido);
    manifest.audit.status = 'REPROVADO';
  }
  return manifest;
}

export function auditManifest(
  manifest: Manifest,
  expectedPhysicalItems?: PhysicalItem[],
  originalAssignments?: ProjectAssignment[],
  opcoes: OpcoesEmpacotamento = {}
) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const volumeAudits: Array<{
    volumeNumber: string;
    type: string;
    caixas10cm: number;
    caixas5cm: number;
    sacos: number;
    points: number;
    weight: number;
    projects: string;
    status: 'APROVADO' | 'REPROVADO';
    reasons: string[];
  }> = [];

  const projectAudits: Array<{
    projectName: string;
    year: string;
    baseRequested: number;
    baseShipped: number;
    compRequested: number;
    compShipped: number;
    profRequested: number;
    profShipped: number;
    status: 'APROVADO' | 'REPROVADO';
    reasons: string[];
  }> = [];

  let totalCalculatedWeight = 0;

  manifest.volumes.forEach((vol, idx) => {
    const volReasons: string[] = [];
    let caixas10cm = 0;
    let caixas5cm = 0;
    let sacos = 0;
    let specialCount = 0;
    let volWeight = 0;
    const projectSet = new Set<string>();

    vol.items.forEach(item => {
      const q = item.quantity;
      const pkg = item.product?.packagingType || '';
      const pName = item.product?.name || '';
      const w = item.totalWeight || Number((q * pesoUnitario(item)).toFixed(3));
      volWeight += w;

      const cleanName = cleanProjectName(pName);
      projectSet.add(cleanName);

      if (isSpecialPackaging(pkg as string) || (pkg as string) === 'Espaguete' || (pkg as string) === 'Caixa Tubo' || (pkg as string) === 'Tubo' || (pkg as string) === 'Caixa Plástica' || vol.type === EXTERNAL_PACKAGES.SPAGHETTI.label || vol.type === EXTERNAL_PACKAGES.TUBE.countFilter || vol.type === EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter) {
        specialCount += q;
      } else if (pkg === 'Inspiramaker 10cm') {
        caixas10cm += q;
      } else if (pkg === 'Inspiramaker 5cm') {
        caixas5cm += q;
      } else if (pkg === 'Saco') {
        sacos += q;
      } else {
        caixas10cm += q;
      }
    });

    volWeight = Number(volWeight.toFixed(3));
    totalCalculatedWeight += volWeight;

    const points = (caixas10cm * 5) + (caixas5cm * 3) + (sacos * 5);
    const total5cmUnits = (caixas10cm * 2) + caixas5cm + (sacos * 2);

    if (vol.type === EXTERNAL_PACKAGES.COLLECTIVE.label) {
      if (total5cmUnits > 12 || points > CAPACIDADE_PONTOS) {
        volReasons.push(`Ocupação volumétrica ultrapassa o limite da caixa coletiva (máx. 12 un. equivalentes / ${CAPACIDADE_PONTOS} pts; atual: ${total5cmUnits} un. / ${points} pts).`);
      }
      if (caixas10cm > MAX_CAIXAS_10CM) {
        volReasons.push(`Caixas de 10cm excedem o limite de ${MAX_CAIXAS_10CM} (${caixas10cm} caixas).`);
      }
      if (caixas5cm > MAX_CAIXAS_5CM) {
        volReasons.push(`Caixas de 5cm excedem o limite de ${MAX_CAIXAS_5CM} (${caixas5cm} caixas).`);
      }
      if (volWeight > PESO_MAXIMO_KG) {
        volReasons.push(`Peso ultrapassa ${PESO_MAXIMO_KG.toFixed(3)} kg (${volWeight.toFixed(3)} kg).`);
      }
      if (sacos > 0) {
        const totalRigids = caixas10cm + caixas5cm;
        if (totalRigids < 3) {
          // Chegar aqui quase sempre significa que o PEDIDO não comporta a
          // regra, não que o empacotamento falhou: o motor já tenta abrir
          // espaço remanejando as caixas do projeto. Com menos de 3 rígidas na
          // carga inteira não existe arranjo válido — é pergunta para a escola.
          volReasons.push(
            `Embalagem complementar sem proteção: precisa de 3 caixas rígidas no mesmo volume e há ${totalRigids}. ` +
            `Não há arranjo possível com as quantidades pedidas — confirme com a escola se falta base neste projeto.`
          );
        }
      }
      if (specialCount > 0) {
        volReasons.push(`Embalagem avulsa inserida dentro de Caixa Coletiva.`);
      }
    } else {
      /*
        SEM teto de peso aqui, de propósito.

        Os 18 kg valem **só para a caixa coletiva** — confirmado com a casa. Um
        saco de espaguete é volumoso e leve, e a regra existe para a caixa não
        romper no empilhamento, não para o saco. O Lyceu pediu 38 bases de Nossa
        Água: 76 espaguetes, 19,304 kg num saco só. A casa já despachou um com
        50 e confirmou que 76 pode.

        A auditoria reprovava essa carga por uma regra que não era dela.
      */

      /*
        Volume de embalagem exclusiva só tinha o PESO conferido — nada mais.

        "Tubo, caixa plástica e espaguete nunca dividem volume com outra coisa"
        é regra rígida, e até aqui existia só na construção do empacotador. Quem
        mexesse no empacotador, ou editasse o romaneio na tela, quebrava a regra
        sem a auditoria abrir a boca. O mesmo buraco que existia para item extra:
        a garantia não pode depender de quem escreveu o motor.
      */
      const embalagensNoVolume = new Set(
        vol.items.map(it => it.product?.packagingType || '(sem embalagem)')
      );
      if (embalagensNoVolume.size > 1) {
        volReasons.push(
          `Volume de ${vol.type} misturando embalagens (${Array.from(embalagensNoVolume).join(', ')}). ` +
          `Tubo, caixa plástica e espaguete viajam sozinhos.`
        );
      }

      /*
        Cada tubo é um volume: dois tubos são dois volumes.

        Atenção ao nome: o volume de tubo é criado com
        `EXTERNAL_PACKAGES.TUBE.countFilter`, que vale **'Tubo'** — e não com
        `.label`, que vale 'Caixa Tubo'. São os dois únicos campos do
        EXTERNAL_PACKAGES que diferem entre si, e por isso este arquivo compara
        contra as duas grafias em vários pontos. Escrevi esta checagem com
        `.label` primeiro e ela não disparava nunca; só apareceu porque o teste
        cobrava o erro. Comparar pelas duas grafias é o que sobrevive.
      */
      const ehVolumeDeTubo = vol.type === EXTERNAL_PACKAGES.TUBE.countFilter
        || vol.type === EXTERNAL_PACKAGES.TUBE.label;
      if (ehVolumeDeTubo) {
        const tubos = vol.items.reduce((s, it) => s + it.quantity, 0);
        if (tubos !== 1) {
          volReasons.push(`Volume de Caixa Tubo com ${tubos} unidade(s): cada tubo é um volume.`);
        }
      }
    }

    // Regra rígida: material do professor não divide volume com material de
    // aluno. Até aqui isso só era garantido pela construção do empacotador —
    // aluno e professor em passadas separadas — e nunca conferido. Ou seja,
    // quem mexesse no empacotador quebrava a regra em silêncio, que é
    // exatamente a armadilha que o CLAUDE.md descreve. Agora é conferido.
    const destinosNoVolume = new Set(vol.items.map(it => it.destination || vol.category));
    if (destinosNoVolume.has('Aluno') && destinosNoVolume.has('Professor')) {
      const texto = `Volume ${vol.volumeNumber} (${vol.year}): material do professor dividindo volume com material de aluno.`;
      if (vol.professorJunto) {
        warnings.push(`${texto} Uma caixa de cada, mesma série — juntas para não despachar dois volumes quase vazios.`);
      } else if (opcoes.professorJuntoComAluno) {
        warnings.push(`${texto} Exceção autorizada no pedido (professorJuntoComAluno), para economizar volume.`);
      } else {
        volReasons.push('Material do professor dividindo volume com material de aluno.');
      }
    }

    const match = String(vol.volumeNumber).match(/^(\d+)\/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (num !== idx + 1) {
        volReasons.push(`Numeração desordenada: esperado ${idx + 1}/${manifest.volumes.length}, recebido ${vol.volumeNumber}.`);
      }
      if (total !== manifest.volumes.length) {
        volReasons.push(`Total de volumes no cabeçalho (${total}) diverge do total de volumes (${manifest.volumes.length}).`);
      }
    } else {
      volReasons.push(`Numeração em formato inválido: ${vol.volumeNumber}.`);
    }

    const volStatus = volReasons.length === 0 ? 'APROVADO' : 'REPROVADO';
    if (volStatus === 'REPROVADO') {
      errors.push(`Volume ${vol.volumeNumber}: ${volReasons.join(' ')}`);
    }

    volumeAudits.push({
      volumeNumber: String(vol.volumeNumber),
      type: vol.type,
      caixas10cm,
      caixas5cm,
      sacos,
      points,
      weight: volWeight,
      projects: Array.from(projectSet).join(', '),
      status: volStatus,
      reasons: volReasons
    });
  });

  totalCalculatedWeight = Number(totalCalculatedWeight.toFixed(3));
  if (manifest.summary && Math.abs(manifest.summary.totalWeight - totalCalculatedWeight) > 0.005) {
    errors.push(`Peso total no resumo (${manifest.summary.totalWeight} kg) diverge da soma das linhas (${totalCalculatedWeight} kg).`);
  }

  // Audit against physical expectations
  const itemsToCompare = expectedPhysicalItems || manifest.expectedPhysicalItems;
  if (itemsToCompare && itemsToCompare.length > 0) {
    /*
      A auditoria conta BASES, não caixas — dos dois lados.

      Uma caixa do Cola quente leva 5 kits. Contando caixas, 91 bases pedidas
      virariam 18 esperadas contra 18 expedidas: bateria, e bateria mesmo se o
      motor tivesse montado caixas de 4. Contando bases, a conta só fecha se o
      conteúdo estiver certo. Vale a mesma régua do espaguete, que já era assim.
    */
    const expectedKeyCounts: Record<string, number> = {};
    itemsToCompare.forEach(item => {
      const cleanProj = cleanProjectName(item.projectId);
      const key = `${cleanProj}__${item.targetYearKey}__${item.destination}__${item.type}__${item.sequence}`;
      expectedKeyCounts[key] = (expectedKeyCounts[key] || 0) + (item.bundleSize || 1);
    });

    const shippedKeyCounts: Record<string, number> = {};
    manifest.volumes.forEach(vol => {
      vol.items.forEach(item => {
        const cleanProj = cleanProjectName(item.product.name);
        const targetKey = item.targetYearKey || (item.product.year ? parseSchoolYear(item.product.year).key : parseSchoolYear(vol.year).key);
        const dest = item.destination || vol.category;
        const tipo = item.product.type || 'Base';
        const seq = extractSequence(item.product);
        const pkg = item.product.packagingType;

        const key = `${cleanProj}__${targetKey}__${dest}__${tipo}__${seq}`;

        let qty = item.quantity;
        const bSize = item.bundleSize || (pkg === 'Espaguete' ? (function() {
          // Romaneio antigo, gravado antes do campo existir: o tamanho do saco
          // estava só no nome ("... (Pacote c/ 76)").
          const m = item.product.name.match(/\(?(?:Pacote|Embalagem)\s*(?:c\/|com)?\s*(\d+)\)?/i);
          return m ? parseInt(m[1], 10) : 1;
        })() : 1);
        if (bSize > 1) qty = item.quantity * bSize;

        shippedKeyCounts[key] = (shippedKeyCounts[key] || 0) + qty;
      });
    });

    /*
      A comparação é nos DOIS SENTIDOS.

      Até aqui a auditoria percorria só as chaves esperadas, então uma caixa que
      aparecia no romaneio sem estar no pedido era invisível: a chave dela não
      existia do lado esperado e ninguém ia olhar. Reproduzido — um produto
      inventado de 0,1 kg dentro de um volume, e a auditoria devolvia APROVADO
      com zero erros. Inflar a quantidade de um item que existe sempre foi
      pego, porque aí a chave é a mesma; o furo era só para produto novo.

      Isso importa porque a tela de edição deixa adicionar item à mão. A
      garantia que a operação precisa é esta: dá para editar o romaneio, mas
      não dá para fazer ele ficar diferente do pedido sem a auditoria falar.
    */
    const todasAsChaves = Array.from(new Set([
      ...Object.keys(expectedKeyCounts),
      ...Object.keys(shippedKeyCounts)
    ])).sort();

    todasAsChaves.forEach(key => {
      const esperado = expectedKeyCounts[key] || 0;
      const expedido = shippedKeyCounts[key] || 0;
      if (esperado === expedido) return;

      const [proj, yKey, dest, tipo, seq] = key.split('__');
      const onde = `${proj} (${yKey} ${dest} ${tipo} ${seq})`;

      if (esperado === 0) {
        errors.push(`NÃO AUTORIZADO: ${onde} está no romaneio com ${expedido} unidade(s) e não foi pedido.`);
      } else if (expedido > esperado) {
        errors.push(`EXCEDENTE: ${onde} — pedido ${esperado}, expedido ${expedido}.`);
      } else {
        errors.push(`FALTANDO: ${onde} — pedido ${esperado}, expedido ${expedido}.`);
      }
    });
  }

  /*
    Produto com embalagem ainda não confirmada avisa, em toda carga que o leva.

    O `packagingType` dele é palpite conservador, e palpite que não se anuncia
    vira fato. Quem despacha precisa saber que aquele volume foi fechado com uma
    medida por confirmar — é aviso, não erro: o pedido é válido e a carga sai.
  */
  const semEmbalagemConfirmada = new Set<string>();
  manifest.volumes.forEach(vol => {
    vol.items.forEach(it => {
      if (it.product?.embalagemAConfirmar) {
        semEmbalagemConfirmada.add(cleanProjectName(it.product.name));
      }
    });
  });
  if (semEmbalagemConfirmada.size > 0) {
    warnings.push(
      `EMBALAGEM A CONFIRMAR: ${Array.from(semEmbalagemConfirmada).sort().join(', ')}. ` +
      `O volume foi calculado com a medida de uma caixa de 10 cm, que é palpite — ` +
      `confirme com a expedição antes de fechar a carga.`
    );
  }

  // Mesma regra para o peso: produto cadastrado com peso simbólico porque o real não veio.
  const semPesoConfirmado = new Set<string>();
  manifest.volumes.forEach(vol => {
    vol.items.forEach(it => {
      if (it.product?.pesoAConfirmar) semPesoConfirmado.add(cleanProjectName(it.product.name));
    });
  });
  if (semPesoConfirmado.size > 0) {
    warnings.push(
      `PESO A CONFIRMAR: ${Array.from(semPesoConfirmado).sort().join(', ')}. ` +
      `O produto entrou com peso simbólico (1 kg por caixa) — o peso da carga não é o real até o cadastro ser corrigido.`
    );
  }

  const headingVal = validateVolumeHeadings(manifest);
  if (!headingVal.valid) {
    errors.push(...headingVal.errors);
  }

  // ---------------------------------------------------------
  // OPTIMIZATION & SCHOOL CYCLE AUDIT CHECKS
  // ---------------------------------------------------------
  let pureYearVolumesCount = 0;
  let mixedYearVolumesCount = 0;
  let subutilizedVolumesCount = 0;
  let cycleViolationsCount = 0;
  const optimizationNotes: string[] = [];

  manifest.volumes.forEach((vol) => {
    const yearKeysInVol = new Set<string>();
    const cyclesInVol = new Set<string>();

    vol.items.forEach((item) => {
      const yKey = item.targetYearKey || (item.product?.year ? parseSchoolYear(item.product.year).key : parseSchoolYear(vol.year).key);
      if (yKey) {
        yearKeysInVol.add(yKey);
        try {
          const sy = parseSchoolYear(yKey);
          if (sy?.cycle) cyclesInVol.add(sy.cycle);
        } catch { /* empty */ }
      }
    });

    // Check Cycle Lock Violation
    const isTeacherBox = vol.category === 'Professor';

    if (!isTeacherBox && cyclesInVol.size > 1) {
      cycleViolationsCount++;
      const cyclesArr = Array.from(cyclesInVol).map(c => {
        if (c === 'EI') return 'Educação Infantil';
        if (c === 'FI') return 'EF1 (1º ao 5º Ano)';
        if (c === 'FII') return 'EF2 (6º ao 9º Ano)';
        if (c === 'EM') return 'Ensino Médio';
        return c;
      });
      warnings.push(`Volume ${vol.volumeNumber} (${vol.year}): Caixa mista unificando anos de ciclos diferentes (${cyclesArr.join(' e ')}). Recomendado separar ciclos sempre que viável.`);
    }

    // Check Year Mixing Optimization
    if (yearKeysInVol.size > 1) {
      mixedYearVolumesCount++;
      if (!isTeacherBox) {
        const yearLabels = Array.from(yearKeysInVol).map(k => {
          try { return parseSchoolYear(k).label; } catch { return k; }
        });
        optimizationNotes.push(`Volume ${vol.volumeNumber} (${vol.type}): Caixa mista otimizada unificando ${yearLabels.join(' e ')}.`);
      }
    } else if (yearKeysInVol.size === 1) {
      pureYearVolumesCount++;
    }

    // Check Subutilized Volume (< 3 items in collective box)
    if (vol.type === EXTERNAL_PACKAGES.COLLECTIVE.label && vol.category === 'Aluno') {
      const totalBoxesCount = vol.items.reduce((sum, it) => sum + it.quantity, 0);
      if (totalBoxesCount < 3) {
        subutilizedVolumesCount++;
        warnings.push(`Volume ${vol.volumeNumber} (${vol.year}): Caixa coletiva com apenas ${totalBoxesCount} item(ns) (subutilizada). Verifique se pode ser consolidada com outro ano do mesmo ciclo.`);
      }
    }
  });

  /*
    Isto é QUALIDADE DO AGRUPAMENTO, não conformidade — e por isso não pode
    dizer "REPROVADO", que é a palavra do veredito da carga. Misturar ciclos é
    permitido (e às vezes economiza volume): sai como aviso, nunca como erro.
    Antes disto dava para ver "Auditoria: APROVADO" e, logo abaixo,
    "REPROVADO (Violação de Ciclo)" — duas palavras iguais para coisas
    diferentes, na mesma tela.
  */
  const optimizationScore = cycleViolationsCount > 0
    ? `ATENÇÃO (${cycleViolationsCount} volume(s) misturando ciclos)`
    : subutilizedVolumesCount > 0
      ? `ATENÇÃO (${subutilizedVolumesCount} volume(s) com < 3 itens)`
      : 'AGRUPAMENTO EFICIENTE';

  const optimizationMetrics = {
    totalVolumes: manifest.volumes.length,
    pureYearVolumesCount,
    mixedYearVolumesCount,
    subutilizedVolumesCount,
    cycleViolationsCount,
    optimizationScore,
    notes: optimizationNotes.length > 0
      ? optimizationNotes
      : ['Otimização ideal: separação estrita por ano e ciclo escolar sem volumes subutilizados.']
  };

  const overallStatus: 'APROVADO' | 'REPROVADO' = errors.length === 0 ? 'APROVADO' : 'REPROVADO';

  return {
    status: overallStatus,
    volumeAudits,
    projectAudits,
    errors,
    warnings,
    optimizationMetrics
  };
}

export function sortYears(years: string[]): string[] {
  return [...years].sort((a, b) => compareSchoolYears(a, b));
}

export function validateVolumeHeadings(manifestOrVolumes: Manifest | Volume[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const volumes = Array.isArray(manifestOrVolumes) ? manifestOrVolumes : (manifestOrVolumes?.volumes || []);
  volumes.forEach((vol) => {
    const heading = vol.year || '';
    if (!heading || heading.toLowerCase().includes('misto') || heading.toLowerCase().includes('diverso') || heading.toLowerCase().includes('outro')) {
      errors.push(`Volume ${vol.volumeNumber} possui cabeçalho genérico ou inválido: "${heading}"`);
    }
  });
  return { valid: errors.length === 0, errors };
}

/**
 * Parte a carga em DUAS REMESSAS: material de aluno e material de professor.
 *
 * Na linha 1 os dois não viajam juntos — o professor sai antes. São dois
 * envios, logo dois romaneios: cada um com a sua numeração `1/N`, o seu peso e
 * a sua cotação de frete. Numerar de 1 a N o conjunto e depois cortar ao meio
 * entregaria à transportadora um romaneio que começa no volume 43.
 *
 * Não reempacota nada. Os volumes são os mesmos, na mesma composição — só são
 * separados, renumerados e reauditados, cada metade contra a SUA metade do
 * pedido. Por isso as quantidades continuam conferidas item a item: um kit de
 * professor que sumisse aparece como `FALTANDO` no romaneio do professor.
 *
 * Volume que MISTURE aluno e professor não pode ser dividido — uma caixa não
 * viaja em dois envios. Isso só acontece com `professorJuntoComAluno` ligado no
 * pedido. Nesse caso o volume fica de fora das duas remessas e entra em
 * `problemas`: as duas auditorias reprovam por falta, que é o barulho certo.
 */
export function dividirPorDestino(
  manifest: Manifest,
  opcoes: OpcoesEmpacotamento = {}
): { aluno: Manifest; professor: Manifest; problemas: string[] } {
  const problemas: string[] = [];

  const destinosDoVolume = (v: Volume): Set<string> =>
    new Set(v.items.map(i => i.destination || v.category));

  const deAluno: Volume[] = [];
  const deProfessor: Volume[] = [];

  for (const v of manifest.volumes) {
    const destinos = destinosDoVolume(v);
    if (destinos.size > 1) {
      problemas.push(
        `Volume ${v.volumeNumber} mistura material de aluno e de professor e não pode ser ` +
        `dividido em duas remessas. Gere o romaneio sem "professorJuntoComAluno".`
      );
      continue;
    }
    ([...destinos][0] === 'Professor' ? deProfessor : deAluno).push(v);
  }

  const esperados = manifest.expectedPhysicalItems || [];
  const assignments = manifest.originalAssignments || [];

  const montar = (volumes: Volume[], remessa: 'Aluno' | 'Professor'): Manifest => {
    const m = buildManifestFromVolumes(
      volumes.map(v => ({ ...v, items: v.items.map(i => ({ ...i })) })),
      assignments,
      esperados.filter(i => i.destination === remessa),
      manifest.schoolName,
      manifest.date,
      manifest.linha,
      opcoes
    );
    m.remessa = remessa;
    return m;
  };

  return { aluno: montar(deAluno, 'Aluno'), professor: montar(deProfessor, 'Professor'), problemas };
}

/**
 * Quais linhas saem em DUAS remessas.
 *
 * Hoje só a 1: o material do professor viaja antes do material do aluno. Se a
 * casa passar a despachar a 2 assim, é este conjunto que muda — e muda para o
 * app e para o CLI juntos, porque os dois perguntam aqui.
 *
 * Não é preferência de quem gera: é como a carga sai da doca. Por isso o app
 * decide pela linha e não por caixinha de seleção — caixinha alguém esquece de
 * marcar, e o erro só aparece quando o caminhão já saiu com tudo junto.
 */
export const LINHAS_EM_DUAS_REMESSAS = new Set(['1']);

export function saiEmDuasRemessas(linha: string | undefined): boolean {
  return LINHAS_EM_DUAS_REMESSAS.has((linha || '').replace(/\D/g, ''));
}
