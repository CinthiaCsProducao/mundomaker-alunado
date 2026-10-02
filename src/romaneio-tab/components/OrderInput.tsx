/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/components/OrderInput.tsx
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, OrderItem } from '../types';
import { products as defaultProducts } from '../data/products';
import { agruparProjetos, nomeBaseProjeto } from '../lib/projectGroups';
import { generateManifest } from '../lib/packaging';
import { BotaoTema } from './BotaoTema';

interface OrderInputProps {
  onGenerate: (items: OrderItem[], schoolName: string, linha?: string) => void;
}

const SCHOOLS = [
  "Agostiniano Mendel", "Agostiniano São José", "Albertino Gonçalves", "Arqui", "Atitude",
  "Aubrick", "Beacon", "Belo Futuro", "BIS", "Brasil Canadá Perdizes", "Brasil Canadá Santana",
  "Brasília", "Cel Lep", "Colégio Adventista Caratinga", "Dominus Vivendi", "ESC", "Graded", "Inove",
  "Maple Bear Aldeia da Serra", "Maple Bear Araras", "Maple Bear Marília", "Maple Bear Mogi",
  "Maple Bear Morumbi", "Maple Bear Pacaembu", "Master", "Parthenon", "Passos Firmes",
  // PH em caixa alta: é sigla, não nome próprio.
  // Botafogo é UMA unidade só. Havia "PH - Botafogo", "I" e "II" na lista;
  // confirmado com a casa que as duas numeradas não existem.
  "PH - Barra", "PH - Barra II", "PH - Botafogo", "PH - Freguesia",
  "PH - Icaraí II", "PH - Icaraí III", "PH - Jockey", "PH - Piratininga", "PH - Recreio",
  "PH - Ilha Pura", "PH - Tijuca",
  "Shunji Nishimura", "St Paul's", "Step By Step", "The British College of Brazil",
  "Trails School"
].sort((a, b) => a.localeCompare(b));

/**
 * Escolas guardadas no navegador, além das do cadastro.
 *
 * O app guarda toda escola nova que passa por "Fechar romaneio" — por isso um
 * "k" digitado em teste virou sugestão permanente. Duas travas agora: nome de
 * menos de 4 letras não é escola e nunca entra; e o que já entrou pode ser
 * apagado na própria lista, sem precisar limpar dados do navegador.
 *
 * `Colégio Shunji Nishimura` é deste tipo — o cadastro tem "Shunji Nishimura",
 * e a versão com "Colégio" veio de digitação salva.
 */
const CHAVE_ESCOLAS = 'romaneio:escolas';
const ehNomeDeEscola = (s: string) => s.trim().length >= 4;

/* Ícones desenhados aqui para não arrastar uma biblioteca por seis traços. */
const Ico = {
  busca: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>,
  caixa: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="square" {...p}><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></svg>,
  seta: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  check: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5" /></svg>,
  alerta: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>,
  mais: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  x: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  lapis: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>,
  copia: (p: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>,
};

/*
  Object.entries/values sobre um Record perdem o tipo do valor com a `lib` deste
  tsconfig — vinham como `unknown`, e o código antigo contornava repetindo
  `as Record<string, Product[]>` em toda chamada. Dois helpers resolvem no
  singular, e o resto do arquivo fica limpo.
*/
type Grupos = Record<string, Product[]>;
const entradas = (g: Grupos): Array<[string, Product[]]> => Object.entries(g) as Array<[string, Product[]]>;
const valores = (g: Grupos): Product[][] => Object.values(g) as Product[][];

const ordemSerie = (rotulo: string) => {
  const s = (rotulo || '').toLowerCase();
  if (s.includes('infantil') || /\be\.?i\b/.test(s)) return 0;
  const n = parseInt((s.match(/(\d+)/) || ['0'])[1], 10);
  if (s.includes('médio') || /\be\.?m\b/.test(s)) return 100 + n;
  if (s.includes('ano') || s.includes('série')) return n;
  return 50 + n;
};

/** Rótulo curto da série, para caber nos 68 px do trilho. */
const serieCurta = (s: string) => {
  if (/infantil|^\s*e\.?i\b/i.test(s)) return 'EI';
  const n = (s.match(/(\d+)/) || [])[1];
  if (n && /médio|e\.?m\b/i.test(s)) return `${n}M`;
  return n ? `${n}º` : s.slice(0, 3);
};

/*
  Só o RÓTULO na tela. O `packagingType: 'Saco'` continua como está no catálogo,
  porque o motor decide por ele a regra das 3 caixas rígidas em volta. Trocar o
  dado quebraria o empacotamento; trocar a palavra é só leitura.
*/
const etiquetaEmbalagem = (p: Product): { texto: string; cor: string; borda: string } => {
  switch (p.packagingType) {
    case 'Caixa Tubo': return { texto: 'TUBO', cor: 'var(--color-pkg-tubo)', borda: 'var(--color-pkg-tubo-line)' };
    case 'Espaguete': return { texto: 'ESPAGUETE', cor: 'var(--color-pkg-espaguete)', borda: 'var(--color-pkg-espaguete-line)' };
    case 'Caixa Plástica': return { texto: 'PLÁSTICA', cor: 'var(--color-pkg-plastica)', borda: 'var(--color-pkg-plastica-line)' };
    case 'Saco': return { texto: 'EMBALAGEM', cor: 'var(--color-saco)', borda: 'var(--color-pkg-saco-line)' };
    case 'Inspiramaker 5cm': return { texto: '5CM', cor: 'var(--color-pkg-neutro)', borda: 'var(--color-pkg-neutro-line)' };
    default: return { texto: '10CM', cor: 'var(--color-pkg-neutro)', borda: 'var(--color-pkg-neutro-line)' };
  }
};

/** Cor de cada embalagem que viaja em volume próprio. */
const corDaEmbalagem = (tipo: string) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('tubo')) return 'var(--color-pkg-tubo)';
  if (t.includes('plástica') || t.includes('plastica')) return 'var(--color-pkg-plastica)';
  if (t.includes('espaguete')) return 'var(--color-pkg-espaguete)';
  return 'var(--color-c-dim)';
};

/** Unidades de espaço de 5 cm: uma caixa de 10 ocupa 2, o saco ocupa 2. */
const unidades = (p: Product) => {
  if (p.packagingType === 'Saco') return 2;
  if (p.packagingType === 'Inspiramaker 5cm') return 1;
  if (p.packagingType === 'Inspiramaker 10cm') return 2;
  return 0; // tubo, plástica e espaguete não dividem coletiva
};

const mono = 'var(--font-app-mono)';
const colunas = 'minmax(0, 1fr) 72px 62px 62px 62px 88px 116px';
const rotulo: React.CSSProperties = {
  fontFamily: mono, fontSize: 9.5, fontWeight: 600,
  letterSpacing: '.12em', color: 'var(--color-c-faint)'
};

/**
 * Um projeto do cardápio: a caixa Base e a Complementar do MESMO projeto,
 * juntas.
 *
 * Antes cada uma era uma linha própria, e "Comunicamão" aparecia duas vezes
 * seguidas como se fossem dois projetos diferentes. São o mesmo projeto — a
 * complementar é um acessório dele, e o pedido em si trata assim (`base`,
 * `complementar`, `professor` na mesma linha).
 */
interface Projeto {
  id: string;          // chave de exibição: ano___nome
  nome: string;
  serie: string;
  base?: { chave: string; caixas: Product[] };
  comp?: { chave: string; caixas: Product[] };
}

/*
  Campo e Linha vivem FORA do OrderInput de propósito.

  Declarados lá dentro, o React via um tipo de componente novo a cada render e
  desmontava os inputs — o cursor saltava para fora do campo no meio da
  digitação. Fora, o tipo é estável e o React.memo da Linha corta o trabalho:
  com 125 projetos na tela, uma tecla re-renderizava as ~200 entradas.
*/
/*
  O campo vazio quase desaparece, de propósito.

  Com 125 projetos na tela e três campos por linha, a versão anterior desenhava
  ~375 caixinhas com "0" dentro, todas com a mesma força visual do que estava
  preenchido. O olho não achava o pedido no meio do formulário. Agora o vazio é
  um sublinhado fino e o preenchido é sólido, com anel de cor — a diferença é de
  presença, não de leitura: o campo continua clicável e do mesmo tamanho.
*/
const Campo: React.FC<{ valor: number; onChange: (n: number) => void; prof?: boolean }> = ({ valor, onChange, prof }) => {
  const ativo = valor > 0;
  const cor = prof ? 'var(--color-prof)' : 'var(--color-brand-green-deep)';
  return (
    <input
      value={valor || ''} placeholder="0" inputMode="numeric" aria-label={prof ? 'Professor' : 'Aluno'}
      onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
      className="tnum"
      style={{
        width: 58, height: 34, textAlign: 'center', outline: 'none',
        fontFamily: mono, fontSize: ativo ? 15 : 13, fontWeight: 700,
        borderRadius: 9,
        /*
          O campo VAZIO precisa de fundo e borda próprios. No tema escuro ele era
          um véu branco translúcido sobre o painel; no claro, véu branco sobre
          branco é campo invisível — some a caixinha onde se digita.
        */
        background: ativo
          ? (prof ? 'var(--color-prof-soft)' : 'var(--color-c-on-soft)')
          : 'var(--color-c-void)',
        border: `1px solid ${ativo ? (prof ? 'var(--color-prof-deep)' : 'var(--color-c-on-line)') : 'var(--color-c-line-2)'}`,
        boxShadow: ativo ? `0 0 0 3px ${prof ? 'rgba(255,163,0,.14)' : 'rgba(57,223,24,.16)'}` : 'none',
        color: ativo ? cor : 'var(--color-c-faint)'
      }} />
  );
};

const semCampo = (
  <span style={{ fontFamily: mono, fontSize: 13, color: 'var(--color-c-line-2)', textAlign: 'center', display: 'block' }}>—</span>
);

interface LinhaProps {
  projeto: Projeto;
  series: string[];
  qBase: number;
  qComp: number;
  qProf: number;
  onQtd: (id: string, valor: number, professor?: boolean) => void;
  onSerie: (projeto: Projeto, serie: string) => void;
  onEditar: (p: Product) => void;
}

const Linha = React.memo<LinhaProps>(({ projeto, series, qBase, qComp, qProf, onQtd, onSerie, onEditar }) => {
  const { base, comp, nome, serie } = projeto;
  const principal = base?.caixas[0] || comp?.caixas[0];
  if (!principal) return null;

  const idBase = base?.caixas[0].id;
  const idComp = comp?.caixas[0].id;
  const ativo = qBase > 0 || qComp > 0 || qProf > 0;

  const pesoBase = base ? base.caixas.reduce((s, c) => s + (c.professorOnly ? 0 : c.weight), 0) : 0;
  const pesoComp = comp ? comp.caixas.reduce((s, c) => s + c.weight, 0) : 0;
  const caixasProf = base?.caixas.filter(c => c.professorOnly) || [];
  const pesoProf = caixasProf.length > 0 ? caixasProf.reduce((s, c) => s + c.weight, 0) : pesoBase;
  const subtotal = qBase * pesoBase + qComp * pesoComp + qProf * pesoProf;

  const embBase = base ? etiquetaEmbalagem(base.caixas[0]) : null;
  const embComp = comp ? etiquetaEmbalagem(comp.caixas[0]) : null;
  const foraDaSerie = principal.year !== serie;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: colunas, gap: 0, alignItems: 'center',
      padding: '0 18px', height: 48, borderBottom: '1px solid var(--color-c-line)',
      background: ativo
        ? 'linear-gradient(90deg, rgba(57,223,24,.10) 0%, rgba(57,223,24,.035) 32%, transparent 72%)'
        : 'transparent'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        {/* Barra de acento com brilho: o marcador tem de ser achável de relance. */}
        <div style={{
          width: 3, height: ativo ? 26 : 0, borderRadius: 2, flexShrink: 0,
          background: 'var(--color-brand-green)',
          boxShadow: ativo ? '0 0 6px rgba(57,223,24,.45)' : 'none'
        }} />
        <span style={{
          fontSize: 15, letterSpacing: '-.01em',
          fontWeight: ativo ? 600 : 450,
          color: ativo ? 'var(--color-c-text)' : 'var(--color-c-dim)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{nome}</span>

        {/* Programa fora da linha regular — Maker Lab Class e afins. */}
        {principal.programa && (
          <span title={`Projeto do programa ${principal.programa}`}
            style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-pkg-plastica)', border: '1px solid var(--color-pkg-plastica-line)', background: 'var(--color-c-void)', padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {principal.programa.toUpperCase()}
          </span>
        )}
        {embBase && (
          <span style={{ fontFamily: mono, fontSize: 9, color: embBase.cor, border: `1px solid ${embBase.borda}`, padding: '1px 5px', flexShrink: 0 }}>{embBase.texto}</span>
        )}
        {/*
          A embalagem é palpite, e isso tem de estar visível ANTES de fechar o
          romaneio — não só no aviso da auditoria, depois de gerado.
        */}
        {principal.embalagemAConfirmar && (
          <span title="Embalagem ainda não confirmada pela expedição; o volume foi calculado com a medida de 10 cm"
            style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-prof)', border: '1px dashed var(--color-prof-deep)', background: 'var(--color-prof-soft)', padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            EMB. A CONFIRMAR
          </span>
        )}
        {principal.pesoAConfirmar && (
          <span title="Peso ainda não informado; o produto entra com um peso simbólico"
            style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-prof)', border: '1px dashed var(--color-prof-deep)', background: 'var(--color-prof-soft)', padding: '1px 5px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            PESO A CONFIRMAR
          </span>
        )}
        {/*
          Conta só as caixas do ALUNO. A caixa professorOnly cai no mesmo grupo
          Base do catálogo, e incluí-la fazia o Comunicamão anunciar "2 cx"
          quando o aluno recebe uma só.
        */}
        {base && base.caixas.filter(c => !c.professorOnly).length > 1 && (
          <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-c-faint)', flexShrink: 0 }}>
            {base.caixas.filter(c => !c.professorOnly).length} cx
          </span>
        )}
        {embComp && (
          <span title="Embalagem complementar deste projeto"
            style={{ fontFamily: mono, fontSize: 9, color: embComp.cor, border: `1px dashed ${embComp.borda}`, padding: '1px 5px', flexShrink: 0 }}>
            +{embComp.texto}
          </span>
        )}
        {foraDaSerie && (
          <span title={`Projeto do catálogo de ${principal.year}, sendo enviado para ${serie}`}
            style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-prof)', border: '1px solid var(--color-prof-deep)', padding: '1px 5px', flexShrink: 0 }}>
            DE {principal.year.replace(' Ano', 'º')}
          </span>
        )}
      </div>

      <span className="tnum" style={{ fontFamily: mono, fontSize: 12, color: ativo ? 'var(--color-c-dim)' : 'var(--color-c-faint)', textAlign: 'right' }}>
        {pesoBase > 0 ? pesoBase.toFixed(3).replace('.', ',') : '—'}
      </span>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {idBase ? <Campo valor={qBase} onChange={n => onQtd(idBase, n)} /> : semCampo}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {idComp ? <Campo valor={qComp} onChange={n => onQtd(idComp, n)} /> : semCampo}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {idBase ? <Campo valor={qProf} onChange={n => onQtd(idBase, n, true)} prof /> : semCampo}
      </div>

      <span className="tnum" style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: ativo ? 'var(--color-c-text)' : 'var(--color-c-faint)', textAlign: 'right' }}>
        {ativo ? subtotal.toFixed(3).replace('.', ',') : '—'}
      </span>

      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
        {/*
          Trocar a série é um <select> na própria linha. Antes era um botão que
          abria modal e pedia para DIGITAR o ano — o que também criava uma cópia
          do projeto no catálogo. Aqui é um clique e reversível.
        */}
        <select value={serie} onChange={e => onSerie(projeto, e.target.value)} title="Enviar para outra série"
          style={{
            height: 26, maxWidth: 86, background: 'var(--color-c-void)',
            border: `1px solid ${foraDaSerie ? 'var(--color-prof-deep)' : 'var(--color-c-line)'}`,
            color: foraDaSerie ? 'var(--color-prof)' : 'var(--color-c-faint)',
            fontFamily: mono, fontSize: 10, padding: '0 4px', cursor: 'pointer', outline: 'none'
          }}>
          {series.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {principal.id.startsWith('custom-') && (
          <button type="button" title="Editar" onClick={() => onEditar(principal)}
            style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--color-c-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
            <Ico.lapis width={13} height={13} />
          </button>
        )}
      </div>
    </div>
  );
});
Linha.displayName = 'Linha';


export const OrderInput: React.FC<OrderInputProps> = ({ onGenerate }) => {
  const [schoolName, setSchoolName] = useState('');
  const [linha, setLinha] = useState('Linha 3');
  const [sugestoes, setSugestoes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caixaEscola = useRef<HTMLDivElement>(null);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [teacherQuantities, setTeacherQuantities] = useState<Record<string, number>>({});
  const [customYears, setCustomYears] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState('');
  const [serieFiltro, setSerieFiltro] = useState<string | null>(null);

  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editando, setEditando] = useState<Product | null>(null);
  const [duplicando, setDuplicando] = useState<{ chave: string; nome: string } | null>(null);
  const [duplicarPara, setDuplicarPara] = useState('');

  const [customSchools, setCustomSchools] = useState<string[]>(() => {
    try {
      const guardadas: string[] = JSON.parse(localStorage.getItem(CHAVE_ESCOLAS) || '[]');
      const limpas = guardadas.filter(ehNomeDeEscola);
      // Regrava quando havia lixo: só filtrar na leitura deixaria o "k" no
      // armazenamento para sempre, invisível mas presente.
      if (limpas.length !== guardadas.length) {
        try { localStorage.setItem(CHAVE_ESCOLAS, JSON.stringify(limpas)); } catch { /* modo privado */ }
      }
      return limpas;
    } catch { return []; }
  });

  const salvarEscolas = React.useCallback((lista: string[]) => {
    setCustomSchools(lista);
    try { localStorage.setItem(CHAVE_ESCOLAS, JSON.stringify(lista)); } catch { /* modo privado */ }
  }, []);

  const esquecerEscola = React.useCallback((nome: string) => {
    setCustomSchools(prev => {
      const lista = prev.filter(s => s !== nome);
      try { localStorage.setItem(CHAVE_ESCOLAS, JSON.stringify(lista)); } catch { /* modo privado */ }
      return lista;
    });
  }, []);

  const [novo, setNovo] = useState<Partial<Product>>({
    name: '', weight: 0, type: 'Base', boxNumber: '1/1',
    packagingType: 'Inspiramaker 10cm', ratio: '4 alunos', year: '1º Ano'
  });

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixaEscola.current && !caixaEscola.current.contains(e.target as Node)) setSugestoes(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const allProducts = useMemo(() => {
    const ids = new Set(customProducts.map(p => p.id));
    return [...defaultProducts.filter(p => !ids.has(p.id)), ...customProducts];
  }, [customProducts]);

  const grupos = useMemo<Grupos>(() => agruparProjetos(allProducts), [allProducts]);

  const escolas = useMemo(
    () => Array.from(new Set([...SCHOOLS, ...customSchools])).sort((a, b) => a.localeCompare(b)),
    [customSchools]
  );
  const escolasFiltradas = escolas.filter(s => s.toLowerCase().includes(schoolName.toLowerCase()));

  /**
   * O cardápio: um item por PROJETO, com a Base e a Complementar dentro.
   *
   * A chave do catálogo separa por tipo (`ano___nome___Base` e
   * `ano___nome___Complementar`), o que fazia "Comunicamão" aparecer duas vezes
   * seguidas como se fossem projetos distintos. Aqui as duas voltam a ser o
   * mesmo projeto, que é como o pedido sempre tratou.
   */
  const projetos = useMemo<Projeto[]>(() => {
    const mapa = new Map<string, Projeto>();
    entradas(grupos).forEach(([chave, caixas]) => {
      const [anoCatalogo, nomeBruto, tipo] = chave.split('___');
      const nome = nomeBaseProjeto(nomeBruto);
      const serie = customYears[caixas[0].id] || anoCatalogo;
      const id = `${anoCatalogo}___${nome}`;
      if (!mapa.has(id)) mapa.set(id, { id, nome, serie });
      const p = mapa.get(id)!;
      if (tipo === 'Complementar') p.comp = { chave, caixas };
      else p.base = { chave, caixas };
      // A série mostrada segue a da Base quando as duas existem.
      if (tipo === 'Base') p.serie = serie;
    });
    return Array.from(mapa.values());
  }, [grupos, customYears]);

  /* Séries do catálogo, com quantos projetos cada uma tem. */
  const series = useMemo(() => {
    const conta: Record<string, number> = {};
    projetos.forEach(p => { conta[p.serie] = (conta[p.serie] || 0) + 1; });
    return Object.entries(conta).sort(([a], [b]) => ordemSerie(a) - ordemSerie(b));
  }, [projetos]);

  const nomesSeries = useMemo(() => series.map(([s]) => s), [series]);

  const qtdDe = React.useCallback((p: Projeto) => ({
    base: p.base ? (quantities[p.base.caixas[0].id] || 0) : 0,
    comp: p.comp ? (quantities[p.comp.caixas[0].id] || 0) : 0,
    prof: p.base ? (teacherQuantities[p.base.caixas[0].id] || 0) : 0
  }), [quantities, teacherQuantities]);

  /* Quantos projetos marcados por série — o trilho mostra isso. */
  const ativosPorSerie = useMemo(() => {
    const conta: Record<string, number> = {};
    projetos.forEach(p => {
      const q = qtdDe(p);
      if (q.base > 0 || q.comp > 0 || q.prof > 0) conta[p.serie] = (conta[p.serie] || 0) + 1;
    });
    return conta;
  }, [projetos, qtdDe]);

  const porSerie = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    const saida: Record<string, Projeto[]> = {};
    projetos.forEach(p => {
      if (serieFiltro && p.serie !== serieFiltro) return;
      if (alvo && !p.nome.toLowerCase().includes(alvo) && !p.serie.toLowerCase().includes(alvo)) return;
      if (!saida[p.serie]) saida[p.serie] = [];
      saida[p.serie].push(p);
    });
    Object.values(saida).forEach(l => l.sort((a, b) => a.nome.localeCompare(b.nome)));
    return Object.entries(saida).sort(([a], [b]) => ordemSerie(a) - ordemSerie(b));
  }, [projetos, busca, serieFiltro]);

  /* Um professor entra sozinho quando o projeto passa de uma caixa de aluno. */
  const anteriores = useRef<Record<string, number>>({});
  useEffect(() => {
    const pares: Record<string, { baseId?: string; compId?: string }> = {};
    entradas(grupos).forEach(([chave, caixas]) => {
      const [ano, nome, tipo] = chave.split('___');
      const k = `${ano}___${nome}`;
      if (!pares[k]) pares[k] = {};
      if (tipo === 'Base') pares[k].baseId = caixas[0].id;
      else if (tipo === 'Complementar') pares[k].compId = caixas[0].id;
    });

    let mudou = false;
    const proximo = { ...teacherQuantities };
    Object.values(pares).forEach(({ baseId, compId }) => {
      if (!baseId) return;
      const antesBase = anteriores.current[baseId] || 0;
      const antesComp = compId ? (anteriores.current[compId] || 0) : 0;
      const agoraBase = quantities[baseId] || 0;
      const agoraComp = compId ? (quantities[compId] || 0) : 0;
      const entrou = (agoraBase > 1 && antesBase <= 1) || (!!compId && agoraComp > 1 && antesComp <= 1);
      if (entrou && !(proximo[baseId] > 0)) { proximo[baseId] = 1; mudou = true; }
      if (agoraBase === 0 && agoraComp === 0 && proximo[baseId] > 0) { delete proximo[baseId]; mudou = true; }
    });
    if (mudou) setTeacherQuantities(proximo);
    anteriores.current = { ...quantities };
  }, [quantities, grupos]);

  /**
   * Monta as linhas do pedido. Uma função só, usada pela prévia E pela geração.
   * Enquanto eram duas contas separadas, a prévia mostrava 56,810 kg para uma
   * carga que o motor fechava em 48,440 — e ninguém sabia qual das duas mentia.
   */
  const montarItens = React.useCallback((): OrderItem[] => {
    const aluno: OrderItem[] = [];
    const professor: OrderItem[] = [];

    valores(grupos).forEach(caixas => {
      const principal = caixas[0];
      const qa = quantities[principal.id] || 0;
      const qp = teacherQuantities[principal.id] || 0;

      if (qa > 0) {
        caixas.forEach(caixa => {
          if (caixa.professorOnly) return;
          aluno.push({
            product: { ...caixa, year: customYears[principal.id] || caixa.year },
            quantity: qa, destination: 'Aluno'
          });
        });
      }

      if (qp > 0) {
        // Uma linha só. Quais caixas o professor recebe é o motor que decide,
        // lendo o catálogo. Emitir uma por caixa duplicava o kit nos projetos em
        // que a caixa professorOnly e a Base do aluno têm o mesmo 1/1.
        const rep = caixas.find(c => !c.professorOnly) || caixas[0];
        professor.push({
          product: { ...rep, ratio: '1x Professor', year: customYears[principal.id] || rep.year },
          quantity: qp, destination: 'Professor'
        });
      }
    });

    return [...aluno, ...professor];
  }, [grupos, quantities, teacherQuantities, customYears]);

  /**
   * Prévia com o motor de verdade, não com estimativa.
   *
   * Aqui antes se calculava `Math.ceil(caixas / 6)` para adivinhar os volumes —
   * a conta que o CLAUDE.md proíbe porque ignora o peso: cinco caixas de
   * 3,539 kg já estouram os 18 kg. Empacotar de fato custa milissegundos nesta
   * escala e nunca discorda do romaneio final.
   */
  const previa = useMemo(() => {
    const itens = montarItens();
    if (itens.length === 0) return null;
    try {
      const m = generateManifest(itens, schoolName || 'Prévia', '01/01/2000', linha.replace(/\D/g, '') || '3');
      return {
        erro: null as string | null,
        volumes: m.summary.totalVolumes,
        peso: m.summary.totalWeight,
        status: m.audit?.status ?? 'APROVADO',
        erros: m.audit?.errors ?? [],
        avisos: m.audit?.warnings ?? [],
        lista: m.volumes.map(v => {
          const un = v.items.reduce((s, i) => s + unidades(i.product) * i.quantity, 0);
          return {
            numero: String(v.volumeNumber).split('/')[0],
            tipo: v.type,
            serie: v.year,
            professor: v.category === 'Professor',
            peso: v.totalWeight,
            unidades: un,
            saco: v.items.some(i => i.product.packagingType === 'Saco'),
            coletiva: v.type === 'Caixa Coletiva'
          };
        })
      };
    } catch (e) {
      return { erro: e instanceof Error ? e.message : 'Falha ao calcular a prévia' } as any;
    }
  }, [montarItens, schoolName, linha]);

  /** Só as embalagens presentes na carga, na ordem em que aparecem no painel. */
  const legenda = useMemo<Array<[string, string]>>(() => {
    if (!previa || (previa as any).erro) return [];
    const itens: Array<[string, string]> = [];
    const lista = (previa as any).lista as Array<any>;

    if (lista.some(v => v.coletiva && !v.professor)) itens.push(['var(--color-brand-green)', 'ALUNO']);
    if (lista.some(v => v.saco)) itens.push(['var(--color-saco-fill)', 'COMPL']);
    if (lista.some(v => v.professor)) itens.push(['var(--color-prof-fill)', 'PROF']);

    const vistos = new Set<string>();
    lista.filter(v => !v.coletiva).forEach(v => {
      const rotulo = String(v.tipo).replace('Embalagem ', '').toUpperCase();
      if (vistos.has(rotulo)) return;
      vistos.add(rotulo);
      itens.push([corDaEmbalagem(v.tipo), rotulo]);
    });

    return itens;
  }, [previa]);

  const totais = useMemo(() => {
    let nProjetos = 0, base = 0, comp = 0, prof = 0, series = new Set<string>();
    projetos.forEach(p => {
      const q = qtdDe(p);
      if (q.base > 0 || q.comp > 0 || q.prof > 0) { nProjetos++; series.add(p.serie); }
      base += q.base; comp += q.comp; prof += q.prof;
    });
    return { projetos: nProjetos, base, comp, prof, series: series.size };
  }, [projetos, qtdDe]);

  /*
    useCallback aqui não é enfeite: é o que mantém a identidade estável entre
    renders, para o React.memo da Linha valer. Sem ele, toda linha recebe uma
    função nova a cada tecla e o memo nunca corta nada.
  */
  const setQtd = React.useCallback((id: string, valor: number, professor = false) => {
    const n = Math.max(0, Math.floor(valor) || 0);
    const alvo = professor ? setTeacherQuantities : setQuantities;
    alvo(prev => {
      const p = { ...prev };
      if (n === 0) delete p[id]; else p[id] = n;
      return p;
    });
  }, []);

  /**
   * Troca a série de destino do projeto inteiro — Base e Complementar juntas.
   *
   * Grava em `customYears`, que vira o `product.year` na hora de montar o
   * pedido; o motor lê isso como a série de destino. O catálogo não muda: o
   * projeto continua sendo o do ano dele, só está sendo enviado para outro.
   */
  const trocarSerie = React.useCallback((p: Projeto, serie: string) => {
    setCustomYears(prev => {
      const n = { ...prev };
      const ids = [p.base?.caixas[0].id, p.comp?.caixas[0].id].filter(Boolean) as string[];
      const original = (p.base?.caixas[0] || p.comp?.caixas[0])!.year;
      ids.forEach(id => {
        if (serie === original) delete n[id]; else n[id] = serie;
      });
      return n;
    });
  }, []);

  const abrirEditar = React.useCallback((p: Product) => setEditando(p), []);

  const limparTudo = () => { setQuantities({}); setTeacherQuantities({}); setCustomYears({}); setError(null); };

  const gerar = () => {
    const itens = montarItens();
    if (!schoolName.trim()) { setError('Informe o nome da escola antes de gerar o romaneio.'); return; }
    if (itens.length === 0) { setError('Selecione pelo menos um projeto.'); return; }
    setError(null);
    try {
      // A memória continua: escola nova entra na lista para a próxima vez.
      // O que mudou é a trava — "k" digitado em teste não é escola.
      const nome = schoolName.trim();
      if (ehNomeDeEscola(nome) && !escolas.includes(nome)) {
        salvarEscolas([...customSchools, nome]);
      }
      onGenerate(itens, schoolName, linha);
    } catch (err: any) {
      setError(`Erro ao gerar o romaneio: ${err?.message || err}`);
    }
  };

  const salvarNovoProduto = () => {
    if (!novo.name || !novo.weight) return;
    setCustomProducts(prev => [...prev, {
      id: `custom-${Date.now()}`, name: novo.name!, weight: Number(novo.weight),
      type: (novo.type as any) || 'Base', boxNumber: novo.boxNumber || '1/1',
      packagingType: (novo.packagingType as any) || 'Inspiramaker 10cm',
      ratio: novo.ratio || '4 alunos', year: novo.year || '1º Ano'
    }]);
    setShowAddModal(false);
    setNovo({ name: '', weight: 0, type: 'Base', boxNumber: '1/1', packagingType: 'Inspiramaker 10cm', ratio: '4 alunos', year: '1º Ano' });
  };

  const salvarEdicao = () => {
    if (!editando) return;
    setCustomProducts(prev => [...prev.filter(p => p.id !== editando.id), editando]);
    setEditando(null);
  };

  const confirmarDuplicar = () => {
    if (!duplicando || !duplicarPara.trim()) return;
    const destino = duplicarPara.trim();
    const novos = (grupos[duplicando.chave] || []).map((c, i) => ({
      ...c, id: `custom-${Date.now()}-${i}`, year: destino,
      name: c.name.replace(/^\s*(EI|Infantil|\d\s*[º°]?\s*Ano)\s*-\s*/i, `${destino} - `)
    }));
    setCustomProducts(prev => [...prev, ...novos]);
    setDuplicando(null); setDuplicarPara('');
  };

  /* ------------------------------------------------------------------ */

  // `height` (e não minHeight) é o que faz a rolagem vertical acontecer DENTRO
  // da lista em vez de na página — sem isso o cabeçalho da tabela sobe ao rolar.
  //
  // Já o overflowX é `auto`, não `hidden`: com hidden, uma janela mais estreita
  // que o layout não espremia, CORTAVA. Em 648 px ficavam 433 px de fora, sem
  // nenhuma forma de chegar ao painel de prévia. Rolar na horizontal é feio;
  // sumir com metade da ferramenta é pior.
  return (
    <div style={{ height: 'var(--romaneio-altura, 100vh)', overflowX: 'auto', overflowY: 'hidden', background: 'var(--color-c-base)', color: 'var(--color-c-text)', fontFamily: 'var(--font-app)', display: 'flex' }}>

      {/* Trilho de séries */}
      {/*
        flexShrink: 0 é obrigatório aqui.

        O painel da direita já tinha a trava e a coluna do meio tem minWidth, de
        modo que, em janela mais estreita que os 1.148 px do layout, o flexbox
        descontava TUDO deste trilho — ele chegava a 1 pixel de largura, com as
        séries invisíveis. Quem não trava é quem apanha.
      */}
      <nav className="scroll-slim" style={{ width: 68, flexShrink: 0, background: 'var(--color-c-void)', borderRight: '1px solid var(--color-c-line)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0 20px', gap: 3, height: 'var(--romaneio-altura, 100vh)', overflowY: 'auto', zIndex: 20 }}>
        <div style={{ width: 32, height: 32, background: 'var(--color-brand-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, flexShrink: 0 }}>
          <Ico.caixa width={18} height={18} style={{ color: 'var(--color-c-on-accent)' }} />
        </div>

        <button type="button" onClick={() => setSerieFiltro(null)}
          style={{
            width: 48, height: 36, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: serieFiltro === null ? 'var(--color-c-raised)' : 'transparent',
            borderLeft: `2px solid ${serieFiltro === null ? 'var(--color-brand-green)' : 'transparent'}`,
            color: serieFiltro === null ? 'var(--color-brand-green-deep)' : 'var(--color-c-faint)',
            fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: '.04em'
          }}>TODAS</button>

        {series.map(([s, total]) => {
          const ativo = serieFiltro === s;
          const marcados = ativosPorSerie[s] || 0;
          return (
            <button key={s} type="button" onClick={() => setSerieFiltro(ativo ? null : s)} title={`${s} — ${total} projetos`}
              style={{
                width: 48, height: 40, border: 'none', cursor: 'pointer', flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                background: ativo ? 'var(--color-c-raised)' : 'transparent',
                borderLeft: `2px solid ${ativo ? 'var(--color-brand-green)' : 'transparent'}`,
                color: ativo ? 'var(--color-brand-green-deep)' : 'var(--color-c-faint)',
                fontFamily: mono, fontSize: 12, fontWeight: 700, transition: 'background-color .26s var(--suave), color .2s var(--suave)'
              }}>
              {serieCurta(s)}
              <span style={{ fontSize: 9, fontWeight: 500, color: marcados > 0 ? 'var(--color-brand-green-deep)' : 'var(--color-c-faint)' }}>
                {marcados > 0 ? `●${marcados}` : total}
              </span>
            </button>
          );
        })}
      </nav>

      {/*
        As colunas fixas somam 462 px e o padding come 36. Com minWidth menor que
        isso mais uns 260 px de nome, a coluna do projeto colapsa e sobra uma
        letra por linha. Numa tabela de conferência, rolar na horizontal é melhor
        do que ler "C" no lugar de "Comunicamão".
      */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 760, minHeight: 0 }}>

        <header style={{ display: 'flex', alignItems: 'center', gap: 14, height: 58, padding: '0 18px', background: 'var(--color-c-base)', borderBottom: '1px solid var(--color-c-line)', flexShrink: 0, zIndex: 15 }}>
          <div ref={caixaEscola} style={{ position: 'relative', width: 300, flexShrink: 0 }}>
            <input value={schoolName} onChange={e => { setSchoolName(e.target.value); setSugestoes(true); }} onFocus={() => setSugestoes(true)}
              placeholder="Escola de destino"
              style={{ width: '100%', height: 34, background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-c-line-2)', padding: '0 2px', fontFamily: 'var(--font-app)', fontSize: 15, fontWeight: 600, color: 'var(--color-c-text)', outline: 'none' }} />
            {sugestoes && schoolName.length > 0 && escolasFiltradas.length > 0 && (
              <div className="scroll-slim" style={{ position: 'absolute', top: 40, left: 0, right: 0, maxHeight: 260, overflowY: 'auto', background: 'var(--color-c-panel)', border: '1px solid var(--color-c-line-2)', zIndex: 40, padding: 4 }}>
                {escolasFiltradas.slice(0, 40).map(s => {
                  // Só o que o app aprendeu pode ser esquecido; o cadastro fica.
                  const daMemoria = customSchools.includes(s);
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                      <button type="button" onClick={() => { setSchoolName(s); setSugestoes(false); }}
                        style={{ display: 'block', flexGrow: 1, textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', color: 'var(--color-c-dim)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-app)' }}>
                        {s}
                        {daMemoria && (
                          <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-c-faint)', marginLeft: 8 }}>SALVA</span>
                        )}
                      </button>
                      {daMemoria && (
                        <button type="button" title={`Esquecer "${s}"`}
                          onClick={e => { e.stopPropagation(); esquecerEscola(s); }}
                          style={{ width: 26, height: 26, flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--color-c-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginRight: 4 }}>
                          <Ico.x width={12} height={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={rotulo}>LINHA</span>
            {['1', '2', '3'].map(n => {
              const ativo = linha === `Linha ${n}`;
              return (
                <button key={n} type="button" onClick={() => setLinha(`Linha ${n}`)}
                  style={{
                    width: 30, height: 26, cursor: 'pointer', fontFamily: mono, fontSize: 12, fontWeight: 700,
                    background: ativo ? 'var(--color-c-on-soft)' : 'transparent',
                    border: `1px solid ${ativo ? 'var(--color-c-on-line)' : 'var(--color-c-line)'}`,
                    color: ativo ? 'var(--color-brand-green-deep)' : 'var(--color-c-faint)',
                    transition: 'background-color .26s var(--suave), color .2s var(--suave), border-color .26s var(--suave)'
                  }}>{n}</button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-c-panel)', border: '1px solid var(--color-c-line)', height: 34, padding: '0 11px', flexGrow: 1, maxWidth: 340 }}>
            <Ico.busca width={14} height={14} style={{ color: 'var(--color-c-faint)', flexShrink: 0 }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar projeto"
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--color-c-text)', fontFamily: 'var(--font-app)' }} />
            {busca && <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" style={{ border: 'none', background: 'transparent', color: 'var(--color-c-faint)', cursor: 'pointer', padding: 0, display: 'flex' }}><Ico.x width={13} height={13} /></button>}
          </div>

          <div style={{ flexGrow: 1 }} />

          <BotaoTema />

          <button type="button" onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'transparent', border: '1px solid var(--color-c-line-2)', color: 'var(--color-c-dim)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-app)', flexShrink: 0 }}>
            <Ico.mais width={14} height={14} /> Novo projeto
          </button>
          {totais.projetos > 0 && (
            <button type="button" onClick={limparTudo}
              style={{ height: 32, padding: '0 12px', background: 'transparent', border: '1px solid var(--color-c-line)', color: 'var(--color-c-faint)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-app)', flexShrink: 0 }}>Limpar</button>
          )}
        </header>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 18px', background: 'var(--color-danger-deep)', borderBottom: '1px solid #5C1F22', color: '#FFB3B6', fontSize: 13 }}>
            <Ico.alerta width={16} height={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        <div className="scroll-slim" style={{ flexGrow: 1, overflowY: 'auto', position: 'relative' }}>

          {/*
            O cabeçalho mora DENTRO da área de rolagem, grudado no topo.
            Duas coisas de uma vez: continua congelado como no Excel, e a lista
            passa por baixo do vidro — que é o que faz o material refratar
            conteúdo em movimento em vez de um fundo parado. É a única
            superfície de vidro com algo se mexendo atrás, e é fina de propósito
            (28 px), porque o custo do blur acompanha a área.
          */}
          <div style={{ position: 'sticky', top: 0, zIndex: 12, background: 'var(--color-c-void)', borderBottom: '1px solid var(--color-c-line)', display: 'grid', gridTemplateColumns: colunas, gap: 0, alignItems: 'center', padding: '0 18px', height: 32 }}>
            <span style={rotulo}>PROJETO</span>
            <span style={{ ...rotulo, textAlign: 'right' }}>PESO UN.</span>
            <span style={{ ...rotulo, textAlign: 'center' }}>BASE</span>
            <span style={{ ...rotulo, textAlign: 'center' }}>COMPL</span>
            <span style={{ ...rotulo, textAlign: 'center', color: 'var(--color-prof)' }}>PROF</span>
            <span style={{ ...rotulo, textAlign: 'right' }}>SUBTOTAL</span>
            <span style={{ ...rotulo, textAlign: 'right' }}>SÉRIE</span>
          </div>

          {porSerie.length === 0 && (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--color-c-faint)', fontSize: 13.5 }}>
              Nenhum projeto para <span style={{ color: 'var(--color-c-text)' }}>{busca}</span>.
            </div>
          )}

          {porSerie.map(([serie, lista]) => (
            <div key={serie}>
              {/* Gruda logo abaixo do cabeçalho (28 px): sempre se sabe a série. */}
              <div style={{ position: 'sticky', top: 32, zIndex: 8, background: 'var(--color-c-void)', borderTop: '1px solid var(--color-c-line)', borderBottom: '1px solid var(--color-c-line)', padding: '7px 18px' }}>
                <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em', color: 'var(--color-c-text)' }}>{serie.toUpperCase()}</span>
              </div>

              {lista.map(p => {
                const q = qtdDe(p);
                return (
                  <Linha
                    key={p.id} projeto={p} series={nomesSeries}
                    qBase={q.base} qComp={q.comp} qProf={q.prof}
                    onQtd={setQtd} onSerie={trocarSerie} onEditar={abrirEditar}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Painel de montagem */}
      <aside style={{ width: 320, background: 'var(--color-c-void)', borderLeft: '1px solid var(--color-c-line)', display: 'flex', flexDirection: 'column', flexShrink: 0, height: 'var(--romaneio-altura, 100vh)', zIndex: 20 }}>

        {/*
          O número de volumes é a resposta que a tela existe para dar — é ele que
          vira dinheiro de frete. Estava em 34 px disputando espaço com o rótulo;
          agora domina, e o peso vem embaixo como dado de apoio.
        */}
        <div style={{ padding: '18px 18px 15px', borderBottom: '1px solid var(--color-c-line)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="tnum" style={{
              fontFamily: mono, fontSize: 56, fontWeight: 700, lineHeight: .85, letterSpacing: '-.04em',
              color: previa && !previa.erro ? 'var(--color-brand-green-deep)' : 'var(--color-c-faint)'
            }}>
              {previa && !previa.erro ? previa.volumes : '0'}
            </span>
            <span style={{ ...rotulo, fontSize: 10, paddingBottom: 4 }}>
              {previa && !previa.erro && previa.volumes === 1 ? 'VOLUME' : 'VOLUMES'}
            </span>
          </div>
          <div className="tnum" style={{ fontFamily: mono, fontSize: 15, color: 'var(--color-c-text)', marginTop: 8, letterSpacing: '-.01em' }}>
            {previa && !previa.erro ? `${previa.peso.toFixed(3).replace('.', ',')} kg` : '—'}
          </div>
        </div>

        {previa && !previa.erro && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderBottom: '1px solid var(--color-c-line)', background: previa.status === 'APROVADO' ? '#0F1C11' : 'var(--color-danger-deep)' }}>
            {previa.status === 'APROVADO'
              ? <Ico.check width={14} height={14} style={{ color: 'var(--color-brand-green)', flexShrink: 0 }} />
              : <Ico.alerta width={14} height={14} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />}
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: previa.status === 'APROVADO' ? 'var(--color-brand-green)' : 'var(--color-danger)' }}>{previa.status}</span>
            <span style={{ fontSize: 11, color: 'var(--color-c-faint)' }}>
              {previa.status === 'APROVADO' ? '≤ 18 kg · ≤ 12 un' : `${previa.erros.length} problema(s)`}
            </span>
          </div>
        )}

        <div className="scroll-slim" style={{ flexGrow: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {!previa && (
            <span style={{ fontSize: 12.5, color: 'var(--color-c-faint)', lineHeight: 1.6 }}>
              Preencha as quantidades. A montagem dos volumes aparece aqui, calculada pelo mesmo motor que gera o romaneio.
            </span>
          )}

          {previa && previa.erro && (
            <span style={{ fontSize: 12.5, color: 'var(--color-danger)' }}>{previa.erro}</span>
          )}

          {previa && !previa.erro && (
            <>
              <span style={rotulo}>MONTAGEM DOS VOLUMES</span>

              {previa.lista.map(v => (
                <div key={v.numero} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 10.5, color: v.professor ? 'var(--color-prof)' : 'var(--color-c-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      VOL {v.numero} · {v.professor ? 'PROFESSOR' : v.serie}
                    </span>
                    <span className="tnum" style={{ fontFamily: mono, fontSize: 10.5, color: 'var(--color-c-faint)', flexShrink: 0 }}>
                      {v.peso.toFixed(3).replace('.', ',')} kg
                    </span>
                  </div>

                  {v.coletiva ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 2 }}>
                      {Array.from({ length: 12 }, (_, i) => {
                        const cheio = i < v.unidades;
                        const cor = !cheio ? 'transparent'
                          : v.professor ? 'var(--color-prof-fill)'
                            : (v.saco && i >= v.unidades - 2) ? 'var(--color-saco-fill)'
                              : 'var(--color-brand-green)';
                        return <div key={i} style={{ height: 22, background: cor, border: cheio ? 'none' : '1px dashed var(--color-c-line-2)' }} />;
                      })}
                    </div>
                  ) : (
                    <div style={{ height: 22, border: `1px solid ${corDaEmbalagem(v.tipo)}`, background: 'var(--color-c-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '.08em', color: corDaEmbalagem(v.tipo) }}>{v.tipo.toUpperCase()} · VOLUME PRÓPRIO</span>
                    </div>
                  )}

                  {v.coletiva && v.unidades >= 12 && (
                    <span style={{ fontSize: 10, color: 'var(--color-c-faint)' }}>
                      Cheio em espaço, {(18 - v.peso).toFixed(1).replace('.', ',')} kg de folga em peso
                    </span>
                  )}
                </div>
              ))}

              {/*
                Legenda adaptativa: só entra o que está de fato na carga. Antes
                a lista era fixa em ALUNO/COMPL/PROF, então tubo, plástica e
                espaguete apareciam desenhados no painel sem nada explicando o
                que aquela barra colorida era.
              */}
              <div style={{ display: 'flex', gap: 13, paddingTop: 2, flexWrap: 'wrap' }}>
                {legenda.map(([c, t]) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 9, height: 9, background: c }} />
                    <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--color-c-faint)' }}>{t}</span>
                  </div>
                ))}
              </div>

              {previa.avisos.slice(0, 3).map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', borderLeft: '2px solid var(--color-prof)', paddingLeft: 9 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-c-dim)', lineHeight: 1.45 }}>{a}</span>
                </div>
              ))}

              {previa.erros.slice(0, 3).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', borderLeft: '2px solid var(--color-danger)', paddingLeft: 9 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-danger)', lineHeight: 1.45 }}>{e}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Bloco de contagem: quantas caixas de cada papel foram pedidas. */}
        <div style={{ borderTop: '1px solid var(--color-c-line)', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', background: 'var(--color-c-line)', gap: 1 }}>
          {([
            ['PROJETOS', totais.projetos, 'var(--color-c-text)'],
            ['BASE', totais.base, 'var(--color-brand-green)'],
            ['COMPL', totais.comp, 'var(--color-saco)'],
            ['PROF', totais.prof, 'var(--color-prof)']
          ] as Array<[string, number, string]>).map(([k, v, cor]) => (
            <div key={k} style={{ background: 'var(--color-c-void)', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span className="tnum" style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, lineHeight: 1, color: v > 0 ? cor : 'var(--color-c-faint)' }}>{v}</span>
              <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: '.1em', color: 'var(--color-c-faint)' }}>{k}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--color-c-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {totais.series > 1 && (
            <span style={{ fontFamily: mono, fontSize: 10, color: 'var(--color-c-faint)', textAlign: 'center' }}>
              {totais.series} séries nesta carga
            </span>
          )}
          <button type="button" onClick={gerar} disabled={totais.projetos === 0}
            style={{
              height: 50, width: '100%', borderRadius: 12, cursor: totais.projetos === 0 ? 'not-allowed' : 'pointer',
              // Desligado tem de PARECER um botão desligado. Branco sobre painel
              // branco não parecia nada — o botão sumia até alguém digitar.
              border: totais.projetos === 0 ? '1px solid var(--color-c-line-2)' : 'none',
              background: totais.projetos === 0 ? 'var(--color-c-void)' : 'var(--color-brand-green)',
              color: totais.projetos === 0 ? 'var(--color-c-dim)' : 'var(--color-c-on-accent)',
              fontFamily: 'var(--font-app)', fontSize: 14, fontWeight: 700, letterSpacing: '.02em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, transition: 'background-color .3s var(--suave)'
            }}>
            FECHAR ROMANEIO <Ico.seta width={15} height={15} />
          </button>
        </div>
      </aside>

      {showAddModal && (
        <Modal titulo="Novo projeto" onFechar={() => setShowAddModal(false)}>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--color-c-faint)', lineHeight: 1.55 }}>
            Só para projeto que ainda não está no catálogo. Peso e embalagem entram aqui exatamente como na ficha.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>NOME</label>
              <input value={novo.name} onChange={e => setNovo({ ...novo, name: e.target.value })} style={campoModal} placeholder="5º Ano - Nome do projeto" />
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>PESO (KG)</label>
              <input value={novo.weight || ''} onChange={e => setNovo({ ...novo, weight: parseFloat(e.target.value.replace(',', '.')) || 0 })} style={campoModal} placeholder="3.665" />
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>SÉRIE</label>
              <input value={novo.year} onChange={e => setNovo({ ...novo, year: e.target.value })} style={campoModal} />
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>TIPO</label>
              <select value={novo.type} onChange={e => setNovo({ ...novo, type: e.target.value as any })} style={campoModal}>
                <option>Base</option><option>Complementar</option>
              </select>
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>EMBALAGEM</label>
              <select value={novo.packagingType} onChange={e => setNovo({ ...novo, packagingType: e.target.value as any })} style={campoModal}>
                <option>Inspiramaker 10cm</option><option>Inspiramaker 5cm</option>
                <option>Caixa Tubo</option><option>Caixa Plástica</option><option>Espaguete</option><option>Saco</option>
              </select>
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>CAIXA</label>
              <input value={novo.boxNumber} onChange={e => setNovo({ ...novo, boxNumber: e.target.value })} style={campoModal} placeholder="1/1" />
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>RELAÇÃO</label>
              <input value={novo.ratio} onChange={e => setNovo({ ...novo, ratio: e.target.value })} style={campoModal} placeholder="4 alunos" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAddModal(false)} style={btnSec}>Cancelar</button>
            <button type="button" onClick={salvarNovoProduto} style={btnPri}>Adicionar</button>
          </div>
        </Modal>
      )}

      {editando && (
        <Modal titulo="Editar projeto" onFechar={() => setEditando(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>NOME</label>
              <input value={editando.name} onChange={e => setEditando({ ...editando, name: e.target.value })} style={campoModal} />
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>PESO (KG)</label>
              <input value={editando.weight} onChange={e => setEditando({ ...editando, weight: parseFloat(e.target.value.replace(',', '.')) || 0 })} style={campoModal} />
            </div>
            <div>
              <label style={{ ...rotulo, display: 'block', marginBottom: 6 }}>SÉRIE</label>
              <input value={editando.year} onChange={e => setEditando({ ...editando, year: e.target.value })} style={campoModal} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditando(null)} style={btnSec}>Cancelar</button>
            <button type="button" onClick={salvarEdicao} style={btnPri}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const campoModal: React.CSSProperties = {
  width: '100%', height: 36, background: 'var(--color-c-void)',
  border: '1px solid var(--color-c-line-2)', padding: '0 11px', fontSize: 13.5,
  color: 'var(--color-c-text)', outline: 'none', fontFamily: 'var(--font-app)'
};

const btnPri: React.CSSProperties = {
  height: 36, padding: '0 16px', border: 'none', background: 'var(--color-brand-green)',
  color: 'var(--color-c-on-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-app)'
};

const btnSec: React.CSSProperties = {
  height: 36, padding: '0 16px', border: '1px solid var(--color-c-line-2)', background: 'transparent',
  color: 'var(--color-c-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-app)'
};

const Modal: React.FC<{ titulo: string; onFechar: () => void; children: React.ReactNode }> = ({ titulo, onFechar, children }) => (
  <div onClick={onFechar}
    style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(8,11,15,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div onClick={e => e.stopPropagation()}
      style={{ background: 'var(--color-c-panel)', border: '1px solid var(--color-c-line-2)', width: '100%', maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--color-c-line)' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{titulo}</span>
        <button type="button" onClick={onFechar} aria-label="Fechar"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: 'var(--color-c-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  </div>
);
