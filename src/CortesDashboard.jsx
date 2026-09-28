import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const font  = "'Circular Std','Nunito','Helvetica Neue',Arial,sans-serif";
const fontB = "'Barlow','DIN Round Pro','Segoe UI',system-ui,sans-serif";
const VERDE = "#39DF18";
const PRETO = "#231F20";

const BLOCOS = [
  { key: "base", label: "Base",          qtdKey: "qtd_base" },
  { key: "comp", label: "Complementar",  qtdKey: "qtd_comp" },
  { key: "prof", label: "Professor",     qtdKey: "qtd_prof" },
];

const CAMPOS = [
  { key: "tempo",     label: "Tempo teórico (min)", w: 110 },
  { key: "qtd_silk",  label: "Qtd Silk",            w: 80  },
  { key: "preco_silk",label: "Preço Silk",           w: 90  },
  { key: "custo",     label: "Custo unitário",       w: 100 },
];

const fmt = (v) => v != null && v !== "" ? Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const fmtN = (v) => v != null && v !== "" ? Number(v).toLocaleString("pt-BR") : "—";

function total(row, bloco) {
  const qtd   = Number(row[`qtd_${bloco}`]  || 0);
  const custo = Number(row[`custo_${bloco}`] || 0);
  return qtd * custo;
}

function CelulaEditavel({ value, onSave, moeda }) {
  const [val, setVal] = useState(value ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (!editing) setVal(value ?? ""); }, [value, editing]);

  function commit() {
    setEditing(false);
    const num = val === "" ? null : parseFloat(val.replace(",", "."));
    if (num !== (value == null ? null : Number(value))) onSave(isNaN(num) ? null : num);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setVal(value ?? ""); } }}
        style={{ width: "100%", padding: "3px 6px", border: "1.5px solid " + VERDE, borderRadius: 3, fontSize: 12, fontFamily: fontB, textAlign: "right", boxSizing: "border-box" }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Clique para editar"
      style={{ cursor: "text", minHeight: 22, padding: "2px 4px", textAlign: "right", fontSize: 12, fontFamily: fontB, color: val === "" || val == null ? "#bbb" : PRETO, borderRadius: 3 }}
    >
      {val === "" || val == null ? "—" : moeda ? fmt(val) : fmtN(val)}
    </div>
  );
}

export default function CortesDashboard({ onVoltar }) {
  const [envio, setEnvio]     = useState(1);
  const [projetos, setProjetos] = useState([]);   // lista de nomes únicos
  const [rows, setRows]       = useState({});     // { projeto: { ...campos } }
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState({});

  const carregar = useCallback(async () => {
    setLoading(true);

    // 1. Projetos únicos do envio selecionado
    const col = `envio_${envio}`;
    const { data: pe } = await supabase
      .from("projetos_escola")
      .select(col)
      .not(col, "is", null)
      .neq(col, "");

    const unicos = [...new Set((pe || []).map(r => r[col]).filter(Boolean))].sort();
    setProjetos(unicos);

    // 2. Dados salvos
    const { data: cortes } = await supabase
      .from("cortes_conferencia")
      .select("*")
      .eq("envio", envio);

    const mapa = {};
    (cortes || []).forEach(c => { mapa[c.projeto] = c; });

    // Inicializa rows (combina salvos com lista de projetos)
    const inicial = {};
    unicos.forEach(p => {
      inicial[p] = mapa[p] || { projeto: p, envio };
    });
    setRows(inicial);
    setLoading(false);
  }, [envio]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarCampo(projeto, campo, valor) {
    setSalvando(s => ({ ...s, [projeto]: true }));
    const row = rows[projeto] || { projeto, envio };
    const patch = { ...row, [campo]: valor, atualizado_em: new Date().toISOString() };

    if (patch.id) {
      await supabase.from("cortes_conferencia").update(patch).eq("id", patch.id);
    } else {
      const { data } = await supabase.from("cortes_conferencia")
        .upsert({ projeto, envio, [campo]: valor }, { onConflict: "projeto,envio" })
        .select().single();
      if (data) patch.id = data.id;
    }
    setRows(r => ({ ...r, [projeto]: patch }));
    setSalvando(s => ({ ...s, [projeto]: false }));
  }

  // Totais por bloco
  const totBloco = { base: 0, comp: 0, prof: 0 };
  Object.values(rows).forEach(r => {
    totBloco.base += total(r, "base");
    totBloco.comp += total(r, "comp");
    totBloco.prof += total(r, "prof");
  });
  const totGeral = totBloco.base + totBloco.comp + totBloco.prof;

  const thStyle = (align = "right") => ({
    padding: "7px 8px", fontSize: 10, fontWeight: 700, fontFamily: font,
    textTransform: "uppercase", letterSpacing: ".04em", color: "#5a5a5a",
    textAlign: align, whiteSpace: "nowrap", background: "#e8f5e2", borderBottom: "2px solid #c5e6b0",
  });
  const tdStyle = (bold) => ({
    padding: "5px 8px", borderTop: "1px solid #ececec", fontSize: 12,
    fontFamily: fontB, fontWeight: bold ? 700 : 400, verticalAlign: "middle",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7f5", fontFamily: fontB }}>
      {/* Topo */}
      <div style={{ background: PRETO, padding: "0 clamp(16px,3vw,40px)" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "18px 0" }}>
          <div>
            <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", fontFamily: font, padding: 0, marginBottom: 4, display: "block" }}>
              ← Voltar ao Dashboard
            </button>
            <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: font, color: "#fff", margin: 0 }}>
              conferência de cortes
              <span style={{ display: "block", width: 36, height: 3, background: VERDE, borderRadius: 2, marginTop: 8 }} />
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setEnvio(n)}
                style={{ padding: "8px 22px", border: "none", borderRadius: 6, fontWeight: 800, fontFamily: font, fontSize: 13, cursor: "pointer", background: envio === n ? VERDE : "rgba(255,255,255,.12)", color: envio === n ? PRETO : "#fff" }}>
                {n}º Envio
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px clamp(12px,3vw,40px)" }}>
        {loading ? (
          <div style={{ color: "#aaa", padding: 40 }}>Carregando projetos...</div>
        ) : projetos.length === 0 ? (
          <div style={{ color: "#aaa", padding: 40 }}>Nenhum projeto encontrado para o {envio}º envio.</div>
        ) : (
          <>
            {/* Totais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 28 }}>
              {[...BLOCOS.map(b => ({ label: `Total ${b.label}`, valor: totBloco[b.key] })), { label: "Total Geral", valor: totGeral, destaque: true }].map(t => (
                <div key={t.label} style={{ background: t.destaque ? PRETO : "#fff", borderRadius: 8, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.07)", border: t.destaque ? "none" : "1px solid #e8e8e8" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font, color: t.destaque ? VERDE : PRETO }}>
                    R$ {t.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 12, color: t.destaque ? "#aaa" : "#666", marginTop: 2 }}>{t.label}</div>
                </div>
              ))}
            </div>

            {/* Tabela */}
            <div style={{ overflowX: "auto", background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.07)", border: "1px solid #e8e8e8" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ ...thStyle("left"), background: PRETO, color: "#fff", minWidth: 180, position: "sticky", left: 0, zIndex: 2 }}>
                      Projeto
                    </th>
                    {BLOCOS.map(b => (
                      <th key={b.key} colSpan={CAMPOS.length + 2}
                        style={{ ...thStyle("center"), background: b.key === "base" ? "#d9f0c8" : b.key === "comp" ? "#c8e0f0" : "#f0e8c8", borderLeft: "2px solid #fff" }}>
                        {b.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {BLOCOS.map(b => (
                      <>
                        <th key={b.key + "_qtd"} style={{ ...thStyle("right"), minWidth: 70, borderLeft: "2px solid #fff" }}>Qtd</th>
                        {CAMPOS.map(c => (
                          <th key={b.key + "_" + c.key} style={{ ...thStyle("right"), minWidth: c.w }}>{c.label}</th>
                        ))}
                        <th key={b.key + "_tot"} style={{ ...thStyle("right"), minWidth: 110, background: "#c8dfc0" }}>Custo Total</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projetos.map((proj, i) => {
                    const row = rows[proj] || {};
                    const isSalvando = salvando[proj];
                    return (
                      <tr key={proj} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ ...tdStyle(true), position: "sticky", left: 0, background: i % 2 === 0 ? "#fff" : "#fafafa", zIndex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                          {isSalvando && <span style={{ fontSize: 10, color: VERDE }}>●</span>}
                          {proj}
                        </td>
                        {BLOCOS.map(b => (
                          <>
                            <td key={b.key + "_qtd"} style={{ ...tdStyle(false), borderLeft: "2px solid #f0f0f0", minWidth: 70 }}>
                              <CelulaEditavel
                                value={row[`qtd_${b.key}`]}
                                onSave={v => salvarCampo(proj, `qtd_${b.key}`, v)}
                              />
                            </td>
                            {CAMPOS.map(c => (
                              <td key={b.key + "_" + c.key} style={{ ...tdStyle(false), minWidth: c.w }}>
                                <CelulaEditavel
                                  value={row[`${c.key}_${b.key}`]}
                                  moeda={c.key === "preco_silk" || c.key === "custo"}
                                  onSave={v => salvarCampo(proj, `${c.key}_${b.key}`, v)}
                                />
                              </td>
                            ))}
                            <td key={b.key + "_tot"} style={{ ...tdStyle(true), background: b.key === "base" ? "#f0fae8" : b.key === "comp" ? "#eaf4fd" : "#fdf6e8", textAlign: "right", minWidth: 110 }}>
                              {total(row, b.key) > 0 ? "R$ " + fmt(total(row, b.key)) : "—"}
                            </td>
                          </>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f5f5f5", fontWeight: 800 }}>
                    <td style={{ ...tdStyle(true), position: "sticky", left: 0, background: "#f5f5f5", zIndex: 1 }}>TOTAL</td>
                    {BLOCOS.map(b => (
                      <>
                        <td key={b.key + "_qtd"} colSpan={CAMPOS.length + 1} style={{ ...tdStyle(false), borderLeft: "2px solid #f0f0f0" }} />
                        <td key={b.key + "_tot"} style={{ ...tdStyle(true), textAlign: "right", background: b.key === "base" ? "#d9f0c8" : b.key === "comp" ? "#c8e0f0" : "#f0e8c8" }}>
                          R$ {fmt(totBloco[b.key])}
                        </td>
                      </>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#aaa", fontFamily: font }}>
              Clique em qualquer célula para editar. Salvo automaticamente ao sair do campo.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
