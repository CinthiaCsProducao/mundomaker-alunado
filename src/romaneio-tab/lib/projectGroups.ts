/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/lib/projectGroups.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
/**
 * Agrupa o catálogo por (ano, projeto, tipo) — a estrutura que a tela usa para
 * desenhar a lista de projetos.
 *
 * A chave é `${ano}___${nome}___${tipo}` e `grupo[0].id` é o id sob o qual a
 * tela guarda as quantidades de aluno e de professor.
 *
 * Cuidado ao mexer na regra de nome: a caixa `professorOnly` de um projeto cai
 * no MESMO grupo da caixa Base do aluno, porque as duas têm `type: 'Base'`. Foi
 * daí que veio o professor em dobro — a tela emitia uma linha de pedido por
 * caixa do grupo, e o motor somava as duas no mesmo slot de sequência.
 */
import { Product } from '../types';

export function limparNomeProjeto(nomeBruto: string): string {
  let nome = nomeBruto.replace(/\s\d\/\d$/, '').trim();

  // Inconsistências conhecidas de OCR do PDF de origem.
  if (nome.includes('Porquinhos')) nome = '(L3.26) Os Três Porquinhos';
  if (nome.includes('maker piggies')) nome = '(L3.26) Three maker piggies';

  nome = nome.replace(/^\(L\d+\.\d+\)\s*/i, '').trim();
  nome = nome.replace(/^\(L-\d+\.\d+\)\s*/i, '').trim();
  return nome;
}

/**
 * Só o nome do projeto, sem a série na frente nem o "- Complementar" no fim.
 *
 *   "1° Ano - Dinossauros - Complementar"        -> "Dinossauros"
 *   "2º Ano - Introdutório - Cola quente"        -> "Cola quente"
 *   "EI - Introdutório - Nosso Primeiro Atelie"  -> "Nosso Primeiro Atelie"
 *   "Os Três Porquinhos"                         -> "Os Três Porquinhos"
 *
 * O último caso não é descuido: `limparNomeProjeto` reescreve Porquinhos e
 * piggies para corrigir OCR e nesse caminho a série já se perde. Por isso o
 * prefixo é opcional aqui — o catálogo não é uniforme.
 */
export function nomeBaseProjeto(nomeLimpo: string): string {
  let nome = nomeLimpo;
  nome = nome.replace(/^\s*(EI|Infantil|\d\s*[º°]?\s*Ano|\d\s*[º°]?\s*(?:EM|Ensino M[ée]dio))\s*-\s*/i, '');
  nome = nome.replace(/^\s*Introdut[óo]rio\s*-\s*/i, '');
  nome = nome.replace(/\s*-\s*Complementar\s*$/i, '');
  return nome.replace(/\s+/g, ' ').trim();
}

export function agruparProjetos(produtos: Product[]): Record<string, Product[]> {
  const grupos: Record<string, Product[]> = {};

  produtos.forEach(produto => {
    const nome = limparNomeProjeto(produto.name);
    const chave = `${produto.year}___${nome}___${produto.type}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(produto);
  });

  Object.values(grupos).forEach(caixas => {
    caixas.sort((a, b) => a.boxNumber.localeCompare(b.boxNumber));
  });

  return Object.keys(grupos).sort((a, b) => {
    const [anoA, nomeA, tipoA] = a.split('___');
    const [anoB, nomeB, tipoB] = b.split('___');
    if (anoA !== anoB) return anoA.localeCompare(anoB);
    if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
    const tA = tipoA.toLowerCase().includes('base') ? 0 : 1;
    const tB = tipoB.toLowerCase().includes('base') ? 0 : 1;
    return tA - tB;
  }).reduce((acc, chave) => {
    acc[chave] = grupos[chave];
    return acc;
  }, {} as Record<string, Product[]>);
}
