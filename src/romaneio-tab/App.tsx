/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/App.tsx
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import React, { useState } from 'react';
import { OrderInput } from './components/OrderInput';
import { ManifestView } from './components/ManifestView';
import { generateManifest, dividirPorDestino, saiEmDuasRemessas } from './lib/packaging';
import { OrderItem, Manifest } from './types';
import { format } from 'date-fns';

/**
 * Casca do app.
 *
 * Aqui viviam quatro <div> de fundo com `blur(100-140px)` e a animação `blob`
 * rodando sem parar — círculos de até 866 px que o compositor tinha de
 * rasterizar a cada quadro. Era a causa principal do travamento. Saíram, e nada
 * ocupou o lugar: o console não pede atmosfera.
 *
 * O romaneio (ManifestView) mantém o fundo claro próprio. O escuro é da tela de
 * montagem do pedido, não do documento.
 */

/** Uma carga pode virar um romaneio ou dois — ver `saiEmDuasRemessas`. */
type Remessa = { rotulo: 'Aluno' | 'Professor'; manifest: Manifest };

export default function App() {
  const [remessas, setRemessas] = useState<Remessa[] | null>(null);
  const [atual, setAtual] = useState(0);
  const [aviso, setAviso] = useState<string[]>([]);

  const handleGenerate = (items: OrderItem[], schoolName: string, linha?: string) => {
    const date = format(new Date(), 'dd/MM/yyyy');
    const inteiro = generateManifest(items, schoolName, date, linha);

    if (!saiEmDuasRemessas(linha)) {
      setRemessas([{ rotulo: 'Aluno', manifest: inteiro }]);
      setAtual(0);
      setAviso([]);
      return;
    }

    /*
      Linha 1 sai em duas: o professor viaja antes do aluno. Dois romaneios,
      cada um numerado a partir de 1, porque cada envio é uma cotação de frete.

      A ORDEM aqui é a da doca — professor primeiro.
    */
    const { aluno, professor, problemas } = dividirPorDestino(inteiro);
    const lista: Remessa[] = [];
    if (professor.summary.totalVolumes > 0) lista.push({ rotulo: 'Professor', manifest: professor });
    if (aluno.summary.totalVolumes > 0) lista.push({ rotulo: 'Aluno', manifest: aluno });

    setRemessas(lista.length > 0 ? lista : [{ rotulo: 'Aluno', manifest: inteiro }]);
    setAtual(0);
    setAviso(problemas);
  };

  const voltar = () => { setRemessas(null); setAviso([]); setAtual(0); };

  if (remessas) {
    const { rotulo, manifest } = remessas[atual];
    return (
      // Fundo da TELA no tema Console; o documento pinta o próprio branco.
      <div style={{ minHeight: 'var(--romaneio-altura, 100vh)', background: 'var(--color-c-base)', fontFamily: 'var(--font-app)' }}>
        {remessas.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 print:hidden">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-c-soft)' }}>
              Esta carga sai em duas remessas
            </span>
            {remessas.map((r, i) => (
              <button
                key={r.rotulo}
                onClick={() => setAtual(i)}
                className="px-3 py-1.5 rounded text-xs font-bold border transition-colors"
                style={i === atual
                  ? { background: 'var(--color-c-accent)', color: 'var(--color-c-on-accent)', borderColor: 'var(--color-c-accent)' }
                  : { background: 'transparent', color: 'var(--color-c-soft)', borderColor: 'var(--color-c-line)' }}
              >
                {r.rotulo === 'Professor' ? '1º · Professor' : '2º · Aluno'}
                {' · '}{r.manifest.summary.totalVolumes} vol
              </button>
            ))}
          </div>
        )}

        {aviso.length > 0 && (
          <div className="mx-auto mt-4 max-w-3xl rounded border px-4 py-3 text-xs print:hidden"
               style={{ borderColor: 'var(--color-prof)', color: 'var(--color-prof)' }}>
            <strong>Esta carga não pôde ser dividida por inteiro:</strong>
            <ul className="mt-1 list-disc pl-5">{aviso.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}

        {/* `key` força a remontagem: o ManifestView guarda a edição em estado
            próprio, e trocar de remessa sem remontar carregaria a edição de uma
            para a outra. Fica no Fragment porque o componente não é React.FC e
            não declara `key` nas suas props. */}
        <React.Fragment key={rotulo}>
          <ManifestView manifest={manifest} onBack={voltar} />
        </React.Fragment>
      </div>
    );
  }

  return <OrderInput onGenerate={handleGenerate} />;
}
