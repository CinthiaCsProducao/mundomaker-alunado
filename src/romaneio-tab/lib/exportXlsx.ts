/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: src/lib/exportXlsx.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
/**
 * Exportador do romaneio em .xlsx — layout aprovado (referência: PH Barra / Shunji).
 *
 * Roda em Node, sem browser: recebe o Manifest pronto e grava o arquivo.
 * Não decide alocação. Se o volume está errado, o problema é no packaging.ts.
 */

import ExcelJS from 'exceljs';
import { Manifest, Volume, EXTERNAL_PACKAGES } from '../types';

import { formatarRelacao, numeroDaLinha, nomeComSerieDeDestino, formatarQuantidade, anoDaLinhaCurto, categoriaDaCaixa, textoDoPacote, nomeComVariante } from './formatoRomaneio';
import { parseSchoolYear } from './schoolYears';
import { ICONES_XLSX } from '../data/iconesXlsx';

const FONTE = 'Calibri';
const VERDE = 'FF00FF00';
const MED: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FF000000' } };

/** Conteúdo vive de B (2) a L (12). A e M são respiros laterais. */
const COL_INI = 2;
const COL_FIM = 12;

/**
 * Largura de cada coluna, medida contra o MAIOR conteúdo que ela recebe.
 *
 * A QNT (H) tinha 8 e passou a receber `1 (embalagem com 14)` — 20 caracteres —
 * quando nasceram o espaguete empacotado e a caixa com vários kits. O nome saía
 * cortado, e só nos introdutórios e no espaguete: nas outras linhas a QNT é um
 * número de um dígito e ninguém via o problema. A C tinha o mesmo aperto, menor:
 * `145 x 53 x 80 cm` (16) numa coluna de 14,57.
 *
 * Os números vêm de uma varredura dos 72 romaneios, coluna por coluna, do texto
 * EXIBIDO (resultado da fórmula, não a fórmula) e ignorando célula mesclada, que
 * se estende por várias colunas. Cada uma leva o maior conteúdo mais uma folga
 * de 2 a 3.
 *
 * O que cresceu na tabela saiu dos RESPIROS A e M, que eram 13 cada: a soma
 * total quase não mudou (203,71 -> 204), então a página continua cabendo na
 * largura sem encolher a fonte. Mexer numa coluna é refazer essa conta.
 */
const LARGURAS: Record<string, number> = {
  A: 8.0,     // respiro esquerdo
  B: 13.0,    // Volume            máx 11  ("Qnt. Volume", do Resumo de Carga)
  C: 18.0,    // Caixa             máx 16  ("145 x 53 x 80 cm", em Embalagens)
  D: 21.0,    // Dimensão          máx 19  (o próprio cabeçalho)
  E: 42.0,    // Produto           máx 39
  F: 12.0,    // Destino           máx  9  ("Professor")
  G: 14.0,    // Tipo              máx 12  ("Introdutório")
  H: 22.0,    // QNT               máx 20  ("1 (embalagem com 14)")
  I: 10.0,    // Peso Kg           máx  7
  J: 12.0,    // Sequência         máx  9  ("Caixa 1/1")
  K: 16.0,    // Relação           máx 13  ("1x Sala Maker")
  L: 8.0,     // Check             em branco, para marcar à mão
  M: 8.0      // respiro direito
};

const CABECALHO = [
  'Volume', 'Caixa', 'Dimensão (CxLxA) CM', 'Produto', 'Destino', 'Tipo',
  'QNT', 'Peso Kg', 'Sequência', 'Relação', 'Check'
];

/** rótulo do tipo de volume -> ícone do gabarito e dimensão impressa */
/** "Caixa Coletiva" é o nome interno; no romaneio a coluna Caixa diz "Coletiva". */
const ROTULO: Record<string, string> = {
  [EXTERNAL_PACKAGES.COLLECTIVE.label]: EXTERNAL_PACKAGES.COLLECTIVE.countFilter,
  [EXTERNAL_PACKAGES.TUBE.countFilter]: 'Tubo',
  [EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter]: 'Caixa plástica',
  [EXTERNAL_PACKAGES.SPAGHETTI.label]: 'Espaguete'
};

/**
 * Altura de desenho dos ícones do gabarito, em pixels.
 *
 * Todos saem nesta altura, com a LARGURA calculada pela proporção de cada
 * arquivo. Antes cada um usava o tamanho nativo do .png — os quatro tinham 118
 * de altura, mas o tubo tem 53 de largura contra 147 da coletiva, e no papel
 * ele ficava perdido no meio da célula. Subir a altura comum aumenta os quatro
 * juntos e o tubo deixa de parecer miniatura, sem distorcer nenhum.
 */
const ALTURA_ICONE = 150;

/** EMU por pixel. É a unidade em que o .xlsx guarda posição de imagem. */
const EMU_POR_PX = 9525;

/**
 * Proporção largura/altura de cada `assets/*.png`.
 *
 * Os quatro ícones foram REDESENHADOS em alta resolução. Os originais tinham
 * 147 × 118 e 53 × 118 — ampliar 53 px de largura não inventa detalhe, e no
 * papel a caixa do tubo saía borrada. As proporções antigas foram mantidas de
 * propósito, então nenhum deles mudou de lugar ou de largura no layout; mudou
 * só a nitidez, e o desenho do espaguete, que agora mostra o SACO em volta dos
 * macarrões (antes pareciam presos por fitas).
 *
 * Trocar um ícone: substitua o `.png` em `assets/`, **confira a proporção
 * aqui** e regenere `src/data/iconesXlsx.ts`. É esta proporção, e não o tamanho
 * do arquivo, que decide largura e posição no gabarito.
 */
const TIPOS: Record<string, { icone: string; proporcao: number }> = {
  [EXTERNAL_PACKAGES.COLLECTIVE.label]: { icone: 'coletiva.png', proporcao: 1000 / 800 },
  [EXTERNAL_PACKAGES.TUBE.countFilter]: { icone: 'tubo.png', proporcao: 600 / 1340 },
  [EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter]: { icone: 'plastica.png', proporcao: 1000 / 800 },
  [EXTERNAL_PACKAGES.SPAGHETTI.label]: { icone: 'espaguete.png', proporcao: 800 / 944 }
};

const DIMENSOES: Record<string, string> = {
  [EXTERNAL_PACKAGES.COLLECTIVE.label]: EXTERNAL_PACKAGES.COLLECTIVE.dimensions,
  [EXTERNAL_PACKAGES.TUBE.countFilter]: EXTERNAL_PACKAGES.TUBE.dimensions,
  [EXTERNAL_PACKAGES.PLASTIC_BOX.countFilter]: EXTERNAL_PACKAGES.PLASTIC_BOX.dimensions,
  [EXTERNAL_PACKAGES.SPAGHETTI.label]: EXTERNAL_PACKAGES.SPAGHETTI.dimensions
};

function larguraPx(coluna: number): number {
  const letra = String.fromCharCode(64 + coluna);
  return Math.round((LARGURAS[letra] ?? 8.43) * 7 + 5);
}


/**
 * Monta a planilha e devolve o Workbook, sem tocar em disco.
 *
 * É esta função que o app usa: o navegador não tem `fs`, e era por isso que
 * existia um segundo exportador de Excel dentro do `ManifestView` — outro
 * layout, outras larguras, retrato em vez de paisagem, células à esquerda. Dois
 * arquivos diferentes para o mesmo romaneio, e só um deles era o aprovado.
 *
 * Quem grava em disco é `exportarRomaneio`, abaixo, que só o CLI chama.
 */
export async function montarWorkbook(manifest: Manifest): Promise<ExcelJS.Workbook> {
  // Ano da LINHA, não da data nem do relógio — ver `ANO_DA_LINHA`.
  const anoCurto = anoDaLinhaCurto();
  const prefixo = `(L${(manifest.linha || '3').replace(/\D/g, '') || '3'}.${anoCurto})`;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Romaneio');

  Object.entries(LARGURAS).forEach(([letra, largura]) => {
    ws.getColumn(letra).width = largura;
  });
  ws.getRow(1).height = 15; // respiro do topo

  const mesclar = (linha: number, c1 = COL_INI, c2 = COL_FIM) =>
    ws.mergeCells(linha, c1, linha, c2);

  const bordear = (linha: number, c1 = COL_INI, c2 = COL_FIM) => {
    for (let c = c1; c <= c2; c++) {
      ws.getCell(linha, c).border = { top: MED, bottom: MED, left: MED, right: MED };
    }
  };

  /** Grade da tabela: horizontal em tudo, vertical só nas bordas externas. */
  const grade = (coluna: number): Partial<ExcelJS.Borders> => ({
    top: MED,
    bottom: MED,
    ...(coluna === COL_INI ? { left: MED } : {}),
    ...(coluna === COL_FIM ? { right: MED } : {})
  });

  const centro: Partial<ExcelJS.Alignment> =
    { horizontal: 'center', vertical: 'middle', wrapText: true };

  const faixa = (linha: number, texto: string, tamanho = 14) => {
    mesclar(linha);
    const cel = ws.getCell(linha, COL_INI);
    cel.value = texto;
    cel.font = { name: FONTE, size: tamanho, bold: true };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    cel.alignment = centro;
    bordear(linha);
    ws.getRow(linha).height = 19.5;
  };

  const par = (linha: number, rotulo: string, valor: any, formato?: string) => {
    const a = ws.getCell(linha, COL_INI);
    a.value = rotulo;
    a.font = { name: FONTE, size: 11, bold: true };
    a.alignment = centro;
    const b = ws.getCell(linha, COL_INI + 1);
    b.value = valor;
    b.font = { name: FONTE, size: 11 };
    b.alignment = centro;
    if (formato) b.numFmt = formato;
  };

  // ---- tipos de embalagem presentes, na ordem em que aparecem ----
  const presentes: string[] = [];
  manifest.volumes.forEach(v => {
    if (!presentes.includes(v.type)) presentes.push(v.type);
  });

  // A tabela desce conforme o nº de embalagens; as fórmulas acompanham.
  const primeiraLinhaDados = 4 * presentes.length + 21;

  /*
    ---------------- cabeçalho ----------------

    A linha do título tem três caixas: TÍTULO | (marca da remessa) | LOGOTIPO.

    A do meio só existe quando a carga sai em duas remessas (linha 1: o professor
    viaja antes do aluno). Sem ela, os dois romaneios da mesma escola têm título e
    data iguais e só se distinguem lendo a tabela inteira.

    Ela tem coluna PRÓPRIA de propósito. A primeira versão escreveu a marca na
    mesma célula do logotipo, e imagem no .xlsx flutua ACIMA da célula: o
    logotipo cobria o texto. Aqui os dois ficam lado a lado.
  */
  const temMarca = Boolean(manifest.remessa);
  const fimTitulo = temMarca ? 9 : 10;

  mesclar(2, COL_INI, fimTitulo);
  const titulo = ws.getCell(2, COL_INI);
  titulo.value = `Romaneio de Expedição - Linha ${numeroDaLinha(manifest.linha)}/20${anoCurto}`;
  titulo.font = { name: FONTE, size: 20, bold: true };
  titulo.alignment = centro;
  bordear(2, COL_INI, fimTitulo);

  if (temMarca) {
    const marca = ws.getCell(2, 10);
    marca.value = manifest.remessa === 'Professor' ? 'MATERIAL DO PROFESSOR' : 'MATERIAL DO ALUNO';
    marca.font = { name: FONTE, size: 11, bold: true };
    marca.alignment = centro;
    marca.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
    bordear(2, 10, 10);
  }

  ws.mergeCells(2, 11, 2, 12);
  bordear(2, 11, 12);
  ws.getRow(2).height = 41.25;

  mesclar(3);
  const razao = ws.getCell(3, COL_INI);
  razao.value = 'MundoMaker Educação LTDA';
  razao.font = { name: FONTE, size: 10, bold: true };
  razao.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(3).height = 15.75;

  mesclar(4);
  const escola = ws.getCell(4, COL_INI);
  escola.value = manifest.schoolName;
  escola.font = { name: FONTE, size: 20, bold: true };
  escola.alignment = centro;
  bordear(4);
  ws.getRow(4).height = 27;

  mesclar(5);
  const data = ws.getCell(5, COL_INI);
  /*
    Fórmula, não texto — pedido da casa.

    No arquivo vai `TODAY()`, em inglês: é assim que o .xlsx guarda função, e o
    Excel em português mostra `HOJE()` sozinho. Escrever "HOJE()" aqui gravaria
    um nome que o Excel não reconhece e a célula abriria com erro.

    Consequência a conhecer: a célula passa a mostrar o dia em que o arquivo é
    ABERTO, não o dia em que o romaneio foi emitido. O `result` abaixo é o valor
    gravado, então quem abrir sem recalcular ainda vê a data da emissão.
  */
  const [dd, mm, aaaa] = (manifest.date || '').split('/');
  const dataEmissao = aaaa ? new Date(Number(aaaa), Number(mm) - 1, Number(dd)) : new Date();
  data.value = { formula: 'TODAY()', result: dataEmissao } as any;
  data.numFmt = 'dd/mm/yyyy';
  data.font = { name: FONTE, size: 11, bold: true };
  data.alignment = { horizontal: 'right', vertical: 'middle' };
  bordear(5);
  ws.getRow(5).height = 18.75;

  faixa(6, 'Resumo de Carga');
  par(7, 'Qnt. Volume', { formula: `MAX(B${primeiraLinhaDados}:B500)` }, '#,##0');
  par(8, 'Peso (KG)', { formula: `SUM(I${primeiraLinhaDados}:I500)` }, '#,##0.000');

  faixa(10, 'Embalagens e Medidas C X L X A (CM)');
  let linha = 11;
  for (const tipo of presentes) {
    par(linha, 'Tipo:', ROTULO[tipo] || tipo);
    par(linha + 1, 'Unidade:',
      { formula: `COUNTIF(C${primeiraLinhaDados}:C500,"*${ROTULO[tipo] || tipo}*")` }, '#,##0');
    par(linha + 2, 'Tamanho:', DIMENSOES[tipo] || '');
    linha += 4;
  }

  // ---------------- gabarito ----------------
  const linhaGabarito = 4 * presentes.length + 12;
  faixa(linhaGabarito, 'Gabarito das caixas');
  ws.getRow(linhaGabarito + 1).height = 22;
  // A linha acompanha a altura do desenho (1 px = 0,75 pt) mais uma folga de
  // 6 px. Estava fixa em 84,75 pt = 113 px para imagens de 118: elas vazavam
  // para a linha de baixo, e é por isso que o gabarito parecia desalinhado.
  ws.getRow(linhaGabarito + 2).height = (ALTURA_ICONE + 6) * 0.75;
  ws.getRow(linhaGabarito + 3).height = 21;

  const colunasPorGrupo = presentes.length <= 3 ? 3 : 2;
  presentes.forEach((tipo, i) => {
    const c1 = COL_INI + i * colunasPorGrupo;
    ws.mergeCells(linhaGabarito + 1, c1, linhaGabarito + 1, c1 + colunasPorGrupo - 1);
    const rotulo = ws.getCell(linhaGabarito + 1, c1);
    rotulo.value = ROTULO[tipo] || tipo;
    rotulo.font = { name: FONTE, size: 14, bold: true };
    rotulo.alignment = centro;

    const info = TIPOS[tipo];
    if (!info) return;
    const base64 = ICONES_XLSX[info.icone];
    if (!base64) {
      console.warn(`  aviso: ícone ausente para ${tipo} (${info.icone})`);
      return;
    }

    let altura = ALTURA_ICONE;
    let largura = Math.round(ALTURA_ICONE * info.proporcao);
    const larguraGrupo = Array.from({ length: colunasPorGrupo })
      .reduce<number>((soma, _v, k) => soma + larguraPx(c1 + k), 0);
    if (largura > larguraGrupo - 10) {
      const escala = (larguraGrupo - 10) / largura;
      largura = Math.round(largura * escala);
      altura = Math.round(altura * escala);
    }

    /*
      Posição em EMU explícito, não em fração de coluna.

      `tl: { col: 1.889 }` parecia centrar, e não centrava: o ExcelJS converte a
      parte fracionária pelo próprio modelo de largura, e os 88 px pedidos
      viravam 13 px no arquivo. O desenho ficava 76 px à esquerda do centro do
      grupo — era esta a foto "descentralizada". Com `nativeColOff` em EMU
      (1 px = 9525) o deslocamento é exatamente o calculado, sem intermediário.
    */
    let folga = Math.max(0, Math.round((larguraGrupo - largura) / 2));
    let colImagem = c1;
    while (folga >= larguraPx(colImagem) && colImagem < c1 + colunasPorGrupo - 1) {
      folga -= larguraPx(colImagem);
      colImagem++;
    }

    const id = wb.addImage({ base64, extension: 'png' });
    ws.addImage(id, {
      tl: {
        nativeCol: colImagem - 1,
        nativeColOff: folga * EMU_POR_PX,
        nativeRow: linhaGabarito + 1,
        nativeRowOff: 3 * EMU_POR_PX
      } as any,
      ext: { width: largura, height: altura }
    });
  });

  /*
    O logotipo tem de caber DENTRO da linha 2, senão sai cortado.

    Ele era desenhado no tamanho nativo do arquivo, 140 × 60 px, numa linha de
    41,25 pt = 55 px, começando 6 px abaixo do topo: terminava 11 px depois da
    borda de baixo e a marca saía decepada no papel. Imagem no .xlsx flutua, não
    é conteúdo de célula — ninguém a ajusta por você.

    Agora a altura sai da ALTURA DA LINHA e a largura vem da proporção do
    arquivo, então trocar o logotipo ou a altura da linha não volta a cortar.
  */
  if (ICONES_XLSX['logo.png']) {
    const id = wb.addImage({ base64: ICONES_XLSX['logo.png'], extension: 'png' });
    const PROPORCAO_LOGO = 140 / 60;
    const alturaLinha2 = Math.round(41.25 * 96 / 72);      // pt -> px
    const margem = 4;
    const altura = alturaLinha2 - margem * 2;
    const largura = Math.round(altura * PROPORCAO_LOGO);
    const larguraCaixa = larguraPx(11) + larguraPx(12);    // K + L, onde ele mora
    const recuo = Math.max(0, Math.round((larguraCaixa - largura) / 2));
    ws.addImage(id, {
      tl: { nativeCol: 10, nativeColOff: recuo * EMU_POR_PX, nativeRow: 1, nativeRowOff: margem * EMU_POR_PX } as any,
      ext: { width: largura, height: altura }
    });
  }

  faixa(4 * presentes.length + 17, 'Relação de Projetos e quantidades', 11);

  // ---------------- tabela ----------------
  let atual = primeiraLinhaDados;
  const blocos = agruparPorBloco(manifest.volumes);

  for (const [tituloBloco, volumes] of blocos) {
    mesclar(atual);
    const cel = ws.getCell(atual, COL_INI);
    cel.value = tituloBloco;
    cel.font = { name: FONTE, size: 14, bold: true };
    cel.alignment = centro;
    bordear(atual);
    ws.getRow(atual).height = 18.75;
    atual++;

    CABECALHO.forEach((texto, i) => {
      const c = ws.getCell(atual, COL_INI + i);
      c.value = texto;
      c.font = { name: FONTE, size: 11, bold: true };
      c.alignment = centro;
      c.border = grade(COL_INI + i);
    });
    ws.getRow(atual).height = 30;
    atual++;

    for (const vol of volumes) {
      const primeira = atual;

      /*
        Volume cujo conteúdo vai em VARIANTES é UM pacote com tipos diferentes
        dentro — o saco do espaguete, com furo e sem furo. A QNT vira
        "1 (pacote com 76)", escrita UMA vez e mesclada nas linhas, e a
        quantidade de cada tipo vai no nome do produto. Escrever
        "1 (pacote com 38 com furo + 38 sem furo)" numa célula só precisaria de
        40 caracteres numa coluna de 22.
      */
      const temVariante = vol.items.some(i => i.variante);
      const totalNoPacote = temVariante
        ? vol.items.reduce((s, i) => s + (i.bundleSize ?? i.quantity), 0) : 0;

      for (const item of vol.items) {
        const qnt = temVariante
          ? null   // escrita uma vez só, mesclada, logo abaixo
          : formatarQuantidade(item.quantity, item.bundleSize, item.product.packagingType);
        let rotuloDestino: string | undefined;
        try { rotuloDestino = item.targetYearKey ? parseSchoolYear(item.targetYearKey).label : undefined; }
        catch { rotuloDestino = undefined; }
        const nomeBase = nomeComSerieDeDestino(item.product.name, rotuloDestino);
        const nome = item.variante
          ? nomeComVariante(nomeBase, item.bundleSize ?? item.quantity, item.variante)
          : nomeBase;
        const valores = [
          null, null, null,
          `${prefixo} ${nome}`,
          item.destination || vol.category,
          categoriaDaCaixa(item.product),
          qnt,
          item.totalWeight,
          item.product.boxNumber ? `Caixa ${item.product.boxNumber}` : '',
          formatarRelacao(item.product.ratio, item.destination || vol.category),
          null
        ];
        valores.forEach((v, i) => {
          const c = ws.getCell(atual, COL_INI + i);
          if (v !== null) c.value = v as any;
          c.font = { name: FONTE, size: 11 };
          c.alignment = centro;
          c.border = grade(COL_INI + i);
        });
        ws.getCell(atual, COL_INI + 7).numFmt = '#,##0.000';
        ws.getRow(atual).height = 15;
        atual++;
      }
      const ultima = atual - 1;
      const fixos: [number, any][] = [
        [0, numeroDoVolume(vol)],
        [1, ROTULO[vol.type] || vol.type],
        [2, DIMENSOES[vol.type] || vol.dimensions],
        // A QNT entra aqui só quando o volume é UM pacote com variantes dentro:
        // assim ela é escrita uma vez e mesclada, como as três de cima.
        ...(temVariante ? [[6, textoDoPacote(totalNoPacote)] as [number, any]] : [])
      ];
      for (const [desloc, valor] of fixos) {
        const col = COL_INI + desloc;
        const c = ws.getCell(primeira, col);
        c.value = valor;
        c.font = { name: FONTE, size: 11 };
        c.alignment = centro;
        c.border = grade(col);
        if (desloc === 0) c.numFmt = '#,##0';
        if (ultima > primeira) {
          ws.mergeCells(primeira, col, ultima, col);
          for (let r = primeira; r <= ultima; r++) ws.getCell(r, col).border = grade(col);
        }
      }
    }
    atual += 2;
  }

  // ---------------- assinaturas ----------------
  atual++;
  faixa(atual, 'ASSINATURAS');
  atual += 2;

  const blocosAssinatura: [string, string[]][] = [
    ['CONFERENTE DO FRETE:', ['Nome:', 'RG:', 'Empresa:', 'Cargo:']],
    ['TESTEMUNHA: Conferente MundoMaker', ['Nome:', 'RG:', 'Empresa:']],
    ['CONFERENTE ESCOLA:', ['Nome:', 'RG:', 'Empresa:', 'Cargo:']]
  ];

  for (const [tituloBloco, campos] of blocosAssinatura) {
    ws.mergeCells(atual, COL_INI, atual, COL_INI + 3);
    const t = ws.getCell(atual, COL_INI);
    t.value = tituloBloco;
    t.font = { name: FONTE, size: 11, bold: true, color: { argb: 'FF008000' } };
    t.alignment = { horizontal: 'left', vertical: 'middle' };
    atual++;

    for (const campo of campos) {
      const rot = ws.getCell(atual, COL_INI);
      rot.value = campo;
      rot.font = { name: FONTE, size: 11, bold: true };
      rot.alignment = { horizontal: 'left', vertical: 'middle' };
      ws.mergeCells(atual, COL_INI + 1, atual, COL_INI + 7);
      for (let c = COL_INI + 1; c <= COL_INI + 7; c++) {
        ws.getCell(atual, c).border = { bottom: MED };
      }
      ws.getRow(atual).height = 18.75;
      atual++;
    }
    atual += 2;
    ws.mergeCells(atual, COL_INI + 1, atual, COL_INI + 7);
    const ass = ws.getCell(atual, COL_INI + 1);
    ass.value = 'Assinatura';
    ass.font = { name: FONTE, size: 9, bold: true };
    ass.alignment = { horizontal: 'center', vertical: 'top' };
    for (let c = COL_INI + 1; c <= COL_INI + 7; c++) {
      ws.getCell(atual, c).border = { top: MED };
    }
    atual += 3;
  }

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    printArea: `B1:L${atual}`
  };

  return wb;
}

function numeroDoVolume(vol: Volume): number {
  const bruto = String(vol.volumeNumber);
  const n = parseInt(bruto.split('/')[0] || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

/** Alunos agrupados por ano (na ordem já resolvida pelo packing); professor por último. */
function agruparPorBloco(volumes: Volume[]): Array<[string, Volume[]]> {
  const blocos: Array<[string, Volume[]]> = [];
  for (const vol of volumes) {
    const titulo = vol.category === 'Professor' ? 'Material do professor' : vol.year;
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo[0] === titulo) ultimo[1].push(vol);
    else blocos.push([titulo, [vol]]);
  }
  return blocos;
}
