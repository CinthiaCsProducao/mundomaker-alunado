/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: src/lib/formatoRomaneio.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
/**
 * Como o romaneio ESCREVE as coisas. Uma regra, um lugar.
 *
 * Existia duplicado: a tela tinha a conta de grupos e o `.xlsx` do CLI não, e o
 * mesmo romaneio saía "1 x 5 Grupos" no papel e "1x 20 Alunos" na planilha.
 * Quem confere na doca lê os dois e vê contradição.
 */

/**
 * Só o NÚMERO da linha, venha ele como vier.
 *
 * O CLI passa `"3"` e o app passa `"Linha 1"` — o mesmo campo, dois formatos.
 * O título do `.xlsx` montava "Linha " + o campo, e todo romaneio gerado pelo
 * app saía **"Linha Linha 1"**. Quem escreve o título não pode supor o formato
 * de quem preenche: extrai o dígito e pronto.
 */
export function numeroDaLinha(linha: string | undefined): string {
  const digitos = (linha || '').replace(/\D/g, '');
  return digitos || '3';
}

/**
 * O ANO DA LINHA — o "2027" de `Linha 1/2027` e de `(L1.27)`.
 *
 * Não é o ano em que o documento foi emitido. O material da linha 2027 é
 * despachado ao longo de 2026, e o romaneio saía dizendo `Linha 1/2026` porque
 * o ano vinha da data de emissão. Estava errado desde o começo: o planejamento
 * sempre se chamou "Linhas 2027".
 *
 * Decisão da casa em 18/09/2026: **constante**, não campo de tela nem conta
 * automática. Trocar aqui muda o app e o CLI juntos.
 *
 * O preço dessa escolha é alguém precisar lembrar de virar para 2028. Há um
 * teste (`o ano da linha não pode estar no passado`) que passa a falhar quando o
 * relógio ultrapassa este valor — é o aviso que a constante sozinha não dá.
 */
export const ANO_DA_LINHA = 2027;

/** Os dois últimos dígitos, que é como o romaneio escreve: `/27`, `(L1.27)`. */
export const anoDaLinhaCurto = (): string => String(ANO_DA_LINHA).slice(-2);

/**
 * O prefixo de série no nome do produto é a série de DESTINO, não a do catálogo.
 *
 * "Dinossauros" é o nome do projeto; "1º Ano - Dinossauros" é o mesmo projeto
 * indo para o 1º ano. Mandado para o 3º, tem de sair "3º Ano - Dinossauros".
 *
 * O `.xlsx` imprimia `product.name` cru, que carrega o ano do CATÁLOGO. No Arqui
 * isso produzia duas linhas idênticas no mesmo volume — "2º Ano - Introdutório -
 * Cola quente" onze vezes e mais uma —, sendo que as onze vão para o 2º ano e a
 * outra para o 4º. Quem confere na doca não tinha como separar.
 *
 * Só TROCA o prefixo: nome sem prefixo de ano sai intacto, e o rótulo vem de
 * `parseSchoolYear().label`, o mesmo que escreve a faixa do volume — para a
 * linha e a faixa nunca discordarem.
 */
// Aceita as duas grafias: a do catálogo ("EI - ", "5º Ano - ") e a que o próprio
// documento imprime ("Educação Infantil - ", "1º Ensino Médio - "). Sem a
// segunda, renomear um item já renomeado empilharia dois prefixos de série.
const PREFIXO_DE_ANO =
  /^(?:E\.?I\.?|Educa[çc][ãa]o Infantil|\d+\s*[º°ª]\s*(?:Ano|S[ée]rie|Ensino M[ée]dio|E\.?M\.?)|Ensino Infantil(?: I| II| III)?)\s*[-–]\s*/i;

/**
 * O nome do produto carrega SÓ o nome do projeto.
 *
 * "Introdutório" e "Complementar" saem dele: os dois já aparecem na coluna
 * Tipo, e repetir no nome é dizer a mesma coisa duas vezes na mesma linha —
 * `4º Ano - Locomotiva - Complementar` com Tipo "Complementar" ao lado.
 *
 * O `.xlsx` e a tela divergiam nisto: a tela já apagava "- Complementar" do
 * nome e a planilha não. Mesma carga, dois papéis diferentes.
 */
const soONomeDoProjeto = (s: string) => s
  .replace(/\bIntrodut[óo]rio\s*[-–]\s*/gi, '')
  .replace(/\s*[-–]\s*Complementar\s*$/i, '')
  .replace(/\s*\(Material do Professor\)\s*$/i, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

/**
 * A categoria da caixa, como sai na coluna Tipo.
 *
 * Introdutório ocupa o lugar de "Base" — nenhum introdutório tem complementar,
 * então não se perde nada. Vem do campo `introdutorio` do catálogo e não do
 * nome: só os nomes em português trazem a palavra, e pelo nome o mesmo projeto
 * sairia com categorias diferentes em português e em inglês.
 */
export function categoriaDaCaixa(
  produto: { type?: string; introdutorio?: boolean } | undefined
): string {
  if (!produto) return 'Base';
  if (produto.type === 'Complementar') return 'Complementar';
  if (produto.introdutorio) return 'Introdutório';
  return 'Base';
}

/**
 * A série no NOME do projeto sai curta.
 *
 * `parseSchoolYear().label` diz "Educação Infantil", que é o certo para a FAIXA
 * do volume — ali é título e cabe. Dentro do nome do produto ele empurrava a
 * coluna: "Educação Infantil - Intro - Nosso Primeiro Atelie". A casa pediu
 * "EI". A faixa continua por extenso; quem encurta é só o nome.
 */
const ROTULO_CURTO: Record<string, string> = {
  'Educação Infantil': 'EI'
};

/** "1º Ensino Médio" -> "1º EM", pelo mesmo motivo. */
const encurtarSerie = (rotulo: string): string =>
  ROTULO_CURTO[rotulo] ?? rotulo.replace(/^(\d+\s*[º°ª])\s*Ensino M[ée]dio$/i, '$1 EM');

export function nomeComSerieDeDestino(
  nomeDoCatalogo: string,
  rotuloDeDestino: string | undefined
): string {
  if (!nomeDoCatalogo) return nomeDoCatalogo;
  if (!rotuloDeDestino) return soONomeDoProjeto(nomeDoCatalogo);
  const semAno = nomeDoCatalogo.replace(PREFIXO_DE_ANO, '').trim();
  if (semAno === nomeDoCatalogo || !semAno) return soONomeDoProjeto(nomeDoCatalogo);
  return soONomeDoProjeto(`${encurtarSerie(rotuloDeDestino)} - ${semAno}`);
}

/**
 * A coluna QNT.
 *
 * Normalmente é só o número. Quando a caixa leva mais de um kit dentro, quem
 * confere precisa saber o conteúdo sem abrir: `2 (caixa com 5)` são duas caixas
 * de cinco kits cada, dez kits ao todo.
 *
 * O `.xlsx` escrevia `1` fixo em vez da quantidade — passava despercebido
 * porque o único caso era o saco de espaguete, que é sempre um. Com o Cola
 * quente indo a 18 caixas, um `1` fixo faria o papel dizer "1 caixa" para
 * dezoito caixas.
 */
export function formatarQuantidade(
  quantidade: number | string,
  bundleSize: number | undefined,
  embalagem?: string
): number | string {
  if (!bundleSize || bundleSize <= 1) return quantidade;
  const substantivo = embalagem === 'Espaguete' ? 'embalagem' : 'caixa';
  return `${quantidade} (${substantivo} com ${bundleSize})`;
}

/**
 * A QNT de um volume cujo conteúdo vai em VARIANTES.
 *
 * É **um** pacote, com tipos diferentes dentro. A célula é escrita uma vez só e
 * mesclada nas linhas das variantes — como já acontece com Volume, Caixa e
 * Dimensão —, então o papel diz "1 pacote" uma vez e cada linha detalha o que
 * há dentro.
 *
 * O texto que a casa queria, `1 (pacote com 38 com furo + 38 sem furo)`, tem 40
 * caracteres numa coluna de 22: só caberia alargando a QNT em 18 e encolhendo a
 * página inteira na impressão. Dividir a informação entre a QNT e o nome do
 * produto diz a mesma coisa e cabe.
 */
export const textoDoPacote = (totalDeUnidades: number): string =>
  `1 (pacote com ${totalDeUnidades})`;

/**
 * O nome do produto numa linha de variante: `5º Ano - Nossa Água — 38 com furo`.
 *
 * A quantidade mora aqui, e não na QNT, porque a QNT está dizendo o PACOTE.
 */
export const nomeComVariante = (nome: string, quantas: number, variante: string): string =>
  `${nome} — ${quantas} ${variante}`;

/**
 * A coluna RELAÇÃO.
 *
 * A unidade de trabalho é o GRUPO de 4 alunos. Por isso:
 *
 *   4 alunos   -> "1x 4 Alunos"      (uma base atende um grupo)
 *   20 alunos  -> "1 x 5 Grupos"
 *   28 alunos  -> "1 x 7 Grupos"
 *
 * **Acima de 4 alunos NUNCA sai em alunos.** Foi pedido explicitamente: "1x 20
 * Alunos" não pode aparecer de forma alguma. Só a relação de 4 — as bases e os
 * complementares que atendem um grupo — fica em alunos.
 *
 * Se um dia entrar no catálogo um valor que não seja múltiplo de 4 (10 alunos,
 * digamos), arredonda para cima: 3 grupos cobrem 10 alunos, e 2 não. Melhor
 * sobrar material do que faltar — e continua sem escrever "alunos".
 *
 * **A Sala Maker tem UMA grafia no papel: `1x Sala Maker`.** O catálogo trazia
 * duas para a mesma coisa — `1 por sala` na Ilha Mágica e no Enigma, `1x Sala
 * maker` no Nascer do sol e nos Três Porquinhos —, e o romaneio imprimia as duas
 * como vinham: `1x Sala` num projeto e `1x Sala maker` no outro, no mesmo papel.
 * Quem confere na doca lê os dois e não sabe se são a mesma relação.
 * A normalização mora AQUI, e não no catálogo, para que grafia nova que alguém
 * cadastre amanhã já saia certa sem ninguém lembrar de conferir.
 */
const SALA_MAKER = /^1\s*(?:x|por)?\s*sala(\s+maker)?$/i;

export function formatarRelacao(bruto: string | undefined, destino?: string): string {
  if (destino === 'Professor') return '1x Professor';
  if (!bruto) return '';
  if (SALA_MAKER.test(bruto.trim())) return '1x Sala Maker';

  const limpo = bruto.trim()
    .replace(/^1\s*por\s+turma$/i, '1x Turma')
    .replace(/^1\s*por\s+escola$/i, '1x Escola')
    .replace(/^1\s*por\s+sala$/i, '1x Sala');

  // "1 por 6 Grupos" -> "1 x 6 Grupos". Sem isto virava "1x 1 por 6 Grupos".
  const porGrupos = limpo.match(/^1\s*(?:por|x)\s+(\d+)\s+grupos?$/i);
  if (porGrupos) return `1 x ${porGrupos[1]} Grupos`;

  const alunos = limpo.match(/^(\d+)\s*alunos?$/i);
  if (alunos) {
    const n = parseInt(alunos[1], 10);
    return n > 4 ? `1 x ${Math.ceil(n / 4)} Grupos` : `1x ${n} Alunos`;
  }

  if (/^1\s*x/i.test(limpo)) return limpo;
  return '1x ' + limpo.replace(/\balunos\b/i, 'Alunos').replace(/\bsala\b/i, 'Sala');
}
