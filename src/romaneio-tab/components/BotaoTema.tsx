/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/components/BotaoTema.tsx
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import React, { useState } from 'react';
import { Tema, temaSalvo, salvarTema } from '../lib/tema';

/**
 * Sol / lua. Mostra o ícone do tema para onde vai, não o do tema atual — é a
 * convenção: no claro aparece a lua ("clique para escurecer").
 */
export const BotaoTema: React.FC<{ titulo?: boolean }> = ({ titulo }) => {
  const [tema, setTema] = useState<Tema>(() => temaSalvo());

  const trocar = () => {
    const novo: Tema = tema === 'claro' ? 'escuro' : 'claro';
    salvarTema(novo);
    setTema(novo);
  };

  const vaiParaEscuro = tema === 'claro';

  return (
    <button
      type="button"
      onClick={trocar}
      title={vaiParaEscuro ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
      aria-label={vaiParaEscuro ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
      style={{
        width: 30, height: 30, flexShrink: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: '1px solid var(--color-c-line-2)',
        color: 'var(--color-c-dim)',
        transition: 'color .2s var(--suave), border-color .2s var(--suave)'
      }}
    >
      {vaiParaEscuro ? (
        // lua
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // sol
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
        </svg>
      )}
      {titulo && (
        <span style={{ marginLeft: 7, fontSize: 12, fontWeight: 600 }}>
          {vaiParaEscuro ? 'Escuro' : 'Claro'}
        </span>
      )}
    </button>
  );
};
