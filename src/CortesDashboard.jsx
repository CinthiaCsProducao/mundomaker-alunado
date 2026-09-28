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
  { key: "base", label: "Base"         },
  { key: "comp", label: "Complementar" },
  { key: "prof", label: "Professor"    },
];

const CAMPOS = [
  { key: "tempo",      label: "Tempo teórico (min)", w: 110 },
  { key: "qtd_silk",   label: "Qtd Silk",            w: 80  },
  { key: "preco_silk", label: "Preço Silk",           w: 90  },
  { key: "custo",      label: "Custo unitário",       w: 100 },
];

// Exceções de quantidade de professor por escola (escola_base_id → regra)
const PROF_EXCECOES = {
  "agostiniano-mendel": { default: 2 },
  "arqui":              { default: 2 },
  "bis":                { s6: 2, s7: 2, s8: 2 },
  "dominus-vivendi":    { default: 2 },
  "lyceu":              { default: 3 },
};

function serieParaChave(serie) {
  const s = (serie || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (/infant|^ei$|ed.*infant|^g\d/.test(s)) return "ei";
  if (/^1[ºo°]?\s*(ano|serie)|^primeiro/.test(s))  return "s1";
  if (/^2[ºo°]?\s*(ano|serie)|^segundo/.test(s))   return "s2";
  if (/^3[ºo°]?\s*(ano|serie)|^terceiro/.test(s))  return "s3";
  if (/^4[ºo°]?\s*(ano|serie)|^quarto/.test(s))    return "s4";
  if (/^5[ºo°]?\s*(ano|serie)|^quinto/.test(s))    return "s5";
  if (/^6[ºo°]?\s*(ano|serie)|^sexto/.test(s))     return "s6";
  if (/^7[ºo°]?\s*(ano|serie)|^setimo/.test(s))    return "s7";
  if (/^8[ºo°]?\s*(ano|serie)|^oitavo/.test(s))    return "s8";
  if (/^9[ºo°]?\s*(ano|serie)|^nono/.test(s))      return "s9";
  if (/^1[ºo°]?\s*(em|serie.*med|medio)/.test(s))  return "em1";
  if (/^2[ºo°]?\s*(em|serie.*med|medio)/.test(s))  return "em2";
  if (/^3[ºo°]?\s*(em|serie.*med|medio)/.test(s))  return "em3";
  return null;
}

function getProfQty(escolaBaseId, serie) {
  const exc = PROF_EXCECOES[escolaBaseId];
  if (!exc) return 1;
  const chave = serieParaChave(serie);
  if (chave && exc[chave] !== undefined) return exc[chave];
  return exc.default !== undefined ? exc.default : 1;
}

function removerAcentos(str) {
  return (str || "").replace(/[áàãâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o").replace(/[úùûü]/g, "u").replace(/[ç]/g, "c")
    .replace(/[ÁÀÃÂ]/g, "A").replace(/[ÉÈÊË]/g, "E").replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÕÔ]/g, "O").replace(/[ÚÙÛÜ]/g, "U").replace(/[Ç]/g, "C");
}

function calcularComplementar(projeto, base, numTurmas, numSalas) {
  const p = removerAcentos((projeto || "").toLowerCase().trim()).replace(/[^a-z0-9 ]/g, "").trim();
  if (p === "nascer do sol"           || p === "here comes the sun")  return numSalas || 0;
  if (p === "nossa agua"              || p === "sustainable me")       return 1;
  if (p === "dinossauros"             || p === "fossil hunters")       return Math.ceil(base / 5);
  if (p === "medalhoes"               || p === "ancient civilization") return Math.ceil(base / 7);
  if (p === "telegrafo"               || p === "can you hear me")      return numTurmas;
  if (p === "navegadores"             || p === "sea explorers")        return 1;
  if (p.includes("atraves da lente") || p === "light camera action")  return Math.ceil(base / 7);
  if (p === "comunicamao"             || p === "lend a hand")          return numTurmas;
  if (p.includes("tres porquinhos")  || p === "three maker piggies")  return numSalas || 0;
  if (p === "locomotiva"              || p === "all aboard")           return numTurmas;
  if (p === "enigma"                  || p === "enigmaker")            return numSalas || 0;
  return 0;
}

const fmt  = (v) => v != null && v !== "" ? Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const fmtN = (v) => v != null && v !== "" ? Number(v).toLocaleString("pt-BR") : "—";

function total(row, bloco) {
  const qtd   = Number(row[`qtd_${bloco}`]  || 0);
  const custo = Number(row[`custo_${bloco}`] || 0);
  return qtd * custo;
}

function CelulaEditavel({ value, onSave, moeda }) {
  const [val, setVal]         = useState(value ?? "");
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
        onKeyDown={e => {
          if (e.key === "Enter")  commit();
          if (e.key === "Escape") { setEditing(false); setVal(value ?? ""); }
        }}
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
  const [envio, setEnvio]           = useState(1);
  const [projetos, setProjetos]     = useState([]);
  const [rows, setRows]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [salvando, setSalvando]     = useState({});
  const [calculando, setCalculando] = useState(false);
  const [calcMsg, setCalcMsg]       = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);

    const col = `envio_${envio}`;
    const { data: pe } = await supabase
      .from("projetos_escola")
      .select(col)
      .not(col, "is", null)
      .neq(col, "");

    const unicos = [...new Set((pe || []).map(r => r[col]).filter(Boolean))].sort();
    setProjetos(unicos);

    const { data: cortes } = await supabase
      .from("cortes_conferencia")
      .select("*")
      .eq("envio", envio);

    const mapa = {};
    (cortes || []).forEach(c => { mapa[c.projeto] = c; });

    const inicial = {};
    unicos.forEach(p => { inicial[p] = mapa[p] || { projeto: p, envio }; });
    setRows(inicial);
    setLoading(false);
  }, [envio]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarCampo(projeto, campo, valor) {
    setSalvando(s => ({ ...s, [projeto]: true }));
    const row   = rows[projeto] || { projeto, envio };
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

  async function calcularQuantidades() {
    setCalculando(true);
    setCalcMsg("Buscando dados do Inspiramaker...");
    try {
      const col = `envio_${envio}`;

      // 1. Todas as linhas de projetos_escola para este envio
      const { data: allPE } = await supabase
        .from("projetos_escola")
        .select(`escola_id, serie, ${col}`)
        .not(col, "is", null)
        .neq(col, "")
        .neq(col, "-");

      if (!allPE || allPE.length === 0) {
        setCalcMsg("Nenhum dado encontrado em projetos_escola.");
        setCalculando(false);
        return;
      }

      const allEscolaIds = [...new Set(allPE.map(r => r.escola_id).filter(Boolean))];

      // 2. Schools linkadas (escola_base_id → school)
      setCalcMsg("Buscando escolas no Inspiramaker...");
      const { data: allSchools } = await supabase
        .from("schools")
        .select("id, escola_base_id, num_salas_maker")
        .in("escola_base_id", allEscolaIds);

      // Map: escola_base_id → school (primeira encontrada)
      const escolaToSchool = {};
      (allSchools || []).forEach(s => {
        if (!escolaToSchool[s.escola_base_id]) escolaToSchool[s.escola_base_id] = s;
      });

      const allSchoolIds = Object.values(escolaToSchool).map(s => s.id);

      if (allSchoolIds.length === 0) {
        setCalcMsg("Nenhuma escola encontrada no Inspiramaker para este envio.");
        setCalculando(false);
        return;
      }

      // 3. grade_classes e classes em batch
      setCalcMsg("Carregando turmas e alunos...");
      const [{ data: allGCs }, { data: allCls }] = await Promise.all([
        supabase.from("grade_classes").select("id, school_id, serie").in("school_id", allSchoolIds),
        supabase.from("classes").select("grade_class_id, school_id, num_alunos").in("school_id", allSchoolIds),
      ]);

      // Maps para acesso rápido
      const gcsBySchool = {};
      (allGCs || []).forEach(gc => {
        if (!gcsBySchool[gc.school_id]) gcsBySchool[gc.school_id] = [];
        gcsBySchool[gc.school_id].push(gc);
      });

      const clsByGC = {};
      (allCls || []).forEach(cl => {
        if (!clsByGC[cl.grade_class_id]) clsByGC[cl.grade_class_id] = [];
        clsByGC[cl.grade_class_id].push(cl);
      });

      // 4. Calcula por projeto
      setCalcMsg("Calculando quantidades por projeto...");
      const resultados = {};
      projetos.forEach(proj => {
        const peForProj = allPE.filter(r => r[col] === proj);
        let totalBase = 0, totalComp = 0, totalProf = 0;

        peForProj.forEach(pe => {
          const school = escolaToSchool[pe.escola_id];
          if (!school) return;

          const chaveSerieProj = serieParaChave(pe.serie);
          const gcs = (gcsBySchool[school.id] || []).filter(
            gc => serieParaChave(gc.serie) === chaveSerieProj
          );

          const base = gcs.reduce((a, gc) => {
            const cls = clsByGC[gc.id] || [];
            return a + cls.reduce((b, c) => b + Math.ceil((c.num_alunos || 0) / 4), 0);
          }, 0);

          const numTurmas = gcs.length;
          const numSalas  = school.num_salas_maker || 0;

          totalBase += base;
          totalComp += calcularComplementar(proj, base, numTurmas, numSalas);
          totalProf += getProfQty(pe.escola_id, pe.serie);
        });

        resultados[proj] = { qtd_base: totalBase, qtd_comp: totalComp, qtd_prof: totalProf };
      });

      // 5. Salva no banco e atualiza estado
      setCalcMsg("Salvando no banco de dados...");
      const newRows = { ...rows };
      for (const proj of projetos) {
        const calc = resultados[proj];
        if (!calc) continue;
        const row   = rows[proj] || { projeto: proj, envio };
        const patch = {
          ...row,
          qtd_base: calc.qtd_base,
          qtd_comp: calc.qtd_comp,
          qtd_prof: calc.qtd_prof,
          atualizado_em: new Date().toISOString(),
        };

        if (patch.id) {
          await supabase.from("cortes_conferencia").update(patch).eq("id", patch.id);
          newRows[proj] = patch;
        } else {
          const { data } = await supabase.from("cortes_conferencia")
            .upsert(
              { projeto: proj, envio, qtd_base: calc.qtd_base, qtd_comp: calc.qtd_comp, qtd_prof: calc.qtd_prof },
              { onConflict: "projeto,envio" }
            )
            .select().single();
          newRows[proj] = { ...patch, ...(data || {}) };
        }
      }

      setRows(newRows);
      setCalcMsg("✓ Quantidades calculadas e salvas com sucesso!");
      setTimeout(() => setCalcMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setCalcMsg("Erro: " + (err.message || "Falha no cálculo."));
    }
    setCalculando(false);
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
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setEnvio(n)}
                style={{ padding: "8px 22px", border: "none", borderRadius: 6, fontWeight: 800, fontFamily: font, fontSize: 13, cursor: "pointer", background: envio === n ? VERDE : "rgba(255,255,255,.12)", color: envio === n ? PRETO : "#fff" }}>
                {n}º Envio
              </button>
            ))}
            <button
              onClick={calcularQuantidades}
              disabled={calculando || loading || projetos.length === 0}
              style={{
                padding: "8px 20px", border: "none", borderRadius: 6, fontWeight: 800,
                fontFamily: font, fontSize: 13, cursor: calculando ? "wait" : "pointer",
                background: calculando ? "rgba(255,255,255,.2)" : "#FFA300",
                color: calculando ? "#fff" : PRETO, whiteSpace: "nowrap",
                opacity: projetos.length === 0 ? 0.5 : 1,
              }}>
              {calculando ? "Calculando..." : "⚡ Calcular Quantidades"}
            </button>
          </div>
        </div>
        {calcMsg && (
          <div style={{ maxWidth: 1600, margin: "0 auto", paddingBottom: 10, fontSize: 12, fontFamily: font, color: calcMsg.startsWith("✓") ? VERDE : calcMsg.startsWith("Erro") ? "#FF6B6B" : "#ffcc66" }}>
            {calcMsg}
          </div>
        )}
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
              {[
                ...BLOCOS.map(b => ({ label: `Total ${b.label}`, valor: totBloco[b.key] })),
                { label: "Total Geral", valor: totGeral, destaque: true },
              ].map(t => (
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
                    const row        = rows[proj] || {};
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
              Clique em qualquer célula para editar — salvo automaticamente ao sair do campo.
              Use <strong style={{ color: "#FFA300" }}>⚡ Calcular Quantidades</strong> para preencher Qtd Base, Comp e Prof automaticamente com base no Inspiramaker.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
