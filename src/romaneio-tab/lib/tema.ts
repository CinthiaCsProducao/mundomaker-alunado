/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/lib/tema.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
/**
 * Tema claro / escuro da TELA do app.
 *
 * O documento do romaneio não participa: `#printable-area` força branco com
 * tinta preta no `index.css`, nos dois temas e na impressão. É papel de
 * expedição — muda de cor nunca.
 *
 * A escolha vive no `localStorage` e é aplicada em `document.documentElement`
 * como `data-tema`, antes do React montar (ver `main.tsx`). Aplicar depois
 * faria a tela piscar no tema errado a cada abertura.
 */
export type Tema = 'claro' | 'escuro';

const CHAVE = 'romaneio:tema';

/** O tema salvo; sem escolha salva, segue a preferência do sistema. */
export function temaSalvo(): Tema {
  try {
    const guardado = localStorage.getItem(CHAVE);
    if (guardado === 'claro' || guardado === 'escuro') return guardado;
  } catch {
    // localStorage bloqueado (janela anônima, política do navegador): segue o
    // sistema e não guarda nada. Não é motivo para a tela não abrir.
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'escuro';
  } catch { /* empty */ }
  return 'claro';
}

/**
 * Onde o `data-tema` é gravado. No app sozinho é a página inteira; quando o
 * romaneio roda como ABA dentro de outro sistema (`RomaneioTab`), é a caixa da
 * aba — senão trocar o tema daqui pintaria o sistema de fora junto.
 */
let raiz: HTMLElement | null = null;
export function definirRaizDoTema(el: HTMLElement | null): void {
  raiz = el;
}

export function aplicarTema(tema: Tema): void {
  (raiz ?? document.documentElement).setAttribute('data-tema', tema);
}

export function salvarTema(tema: Tema): void {
  aplicarTema(tema);
  try { localStorage.setItem(CHAVE, tema); } catch { /* empty */ }
}
