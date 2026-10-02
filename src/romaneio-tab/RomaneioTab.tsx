/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: scripts/exportar-aba.mjs
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import App from './App';
import { definirRaizDoTema, temaSalvo } from './lib/tema';
import './romaneio-tab.css';

/**
 * O Gerador de Romaneio como aba. Não tem roteamento próprio e não mexe em
 * nada fora da própria caixa: o CSS só vale debaixo de `.romaneio-tab` e o
 * tema claro/escuro é gravado nesta caixa, não na página.
 *
 * `altura` é a altura útil da aba. O app foi feito para ocupar a tela inteira
 * (100vh); dentro de um painel com cabeçalho, passe o que sobra, por exemplo
 * `altura="calc(100vh - 64px)"`.
 */
export default function RomaneioTab({ altura = '100vh' }: { altura?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  // Lido UMA vez, no primeiro render: a aba já nasce no tema certo, sem piscar.
  const [temaInicial] = useState(temaSalvo);

  useLayoutEffect(() => {
    definirRaizDoTema(caixa.current);
    return () => definirRaizDoTema(null);
  }, []);

  return (
    <div
      ref={caixa}
      className="romaneio-tab"
      data-tema={temaInicial}
      style={{ ['--romaneio-altura' as string]: altura, height: altura, overflow: 'auto' } as React.CSSProperties}
    >
      <App />
    </div>
  );
}
