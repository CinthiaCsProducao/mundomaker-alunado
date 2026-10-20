import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { urlAssinada, auditar } from "./storageSeguro";

const BUCKET = "romaneios";
const font = "'Archivo', 'Segoe UI', sans-serif";

async function baixar(path, nomeArquivo) {
  const link = await urlAssinada(BUCKET, path);
  if (!link) throw new Error("Sem permissão ou arquivo não encontrado");
  const res = await fetch(link);
  if (!res.ok) throw new Error("Arquivo não encontrado");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nomeSeguro(r, ext) {
  const escola = (r.escola || "Escola").replace(/[^a-zA-Z0-9_-]/g, "_");
  const data = (r.data_romaneio || "").replace(/\//g, "-");
  return `Romaneio_${escola}_${r.remessa || "Aluno"}_${data}.${ext}`;
}

export default function HistoricoRomaneios({ onVoltar }) {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [visualizando, setVisualizando] = useState(null);
  const [srcVis, setSrcVis] = useState("");
  useEffect(() => {
    let vivo = true;
    setSrcVis("");
    if (visualizando) urlAssinada(BUCKET, visualizando.pdf_path).then(u => { if (vivo) setSrcVis(u || ""); });
    return () => { vivo = false; };
  }, [visualizando]);
  const [baixando, setBaixando] = useState("");
  const [qrDe, setQrDe] = useState(null);   // romaneio com o link público aberto
  const [copiado, setCopiado] = useState(false);
  const [cicloSel, setCicloSel] = useState("__aberto__");

  async function carregar() {
    setCarregando(true);
    setErro("");
    const { data, error } = await supabase
      .from("romaneios_historico")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error) setErro("Erro ao carregar histórico: " + error.message);
    setLista(data || []);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  const ciclos = useMemo(
    () => [...new Set(lista.map(r => r.ciclo_nome).filter(Boolean))],
    [lista]
  );

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter(r => {
      const doCiclo =
        cicloSel === "__todos__" ? true :
        cicloSel === "__aberto__" ? !r.ciclo_nome :
        r.ciclo_nome === cicloSel;
      if (!doCiclo) return false;
      if (!q) return true;
      return (r.escola || "").toLowerCase().includes(q) ||
        (r.data_romaneio || "").includes(q) ||
        (r.remessa || "").toLowerCase().includes(q);
    });
  }, [lista, busca, cicloSel]);

  async function handleBaixar(r, tipo) {
    const path = tipo === "pdf" ? r.pdf_path : r.xlsx_path;
    setBaixando(r.id + tipo);
    try {
      await baixar(path, nomeSeguro(r, tipo === "pdf" ? "pdf" : "xlsx"));
    } catch (e) {
      alert("Erro ao baixar: " + e.message);
    }
    setBaixando("");
  }

  async function handleExcluir(r) {
    if (!window.confirm(`Excluir o romaneio de "${r.escola}" do histórico? Esta ação não pode ser desfeita.`)) return;
    await supabase.storage.from(BUCKET).remove([r.pdf_path, r.xlsx_path].filter(Boolean));
    await supabase.from("romaneios_historico").delete().eq("id", r.id);
    carregar();
  }

  const linkPublico = (r) => `${window.location.origin}/r/${r.token_publico}`;

  async function publicarQR(r) {
    const { data: sess } = await supabase.auth.getSession();
    const token = r.token_publico || crypto.randomUUID();
    const { data, error } = await supabase.from("romaneios_historico")
      .update({ token_publico: token, publicado_em: r.publicado_em || new Date().toISOString(), publicado_por: r.publicado_por || sess?.session?.user?.email || null })
      .eq("id", r.id).select().single();
    if (error) { alert("Erro ao publicar: " + error.message); return; }
    auditar("publicar_romaneio", "romaneios_historico", r.id);
    setLista(l => l.map(x => x.id === r.id ? data : x));
    setQrDe(data);
  }

  async function despublicarQR(r) {
    if (!window.confirm("Despublicar? Etiquetas já impressas com esse link deixam de funcionar.")) return;
    const { data, error } = await supabase.from("romaneios_historico")
      .update({ token_publico: null }).eq("id", r.id).select().single();
    if (error) { alert("Erro: " + error.message); return; }
    auditar("despublicar_romaneio", "romaneios_historico", r.id);
    setLista(l => l.map(x => x.id === r.id ? data : x));
    setQrDe(null);
  }

  const btn = { border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", fontFamily: font }}>
      <button onClick={onVoltar}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#555", fontFamily: font, marginBottom: 12 }}>
        ← Voltar ao Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Histórico de Romaneios</h2>
        <select
          value={cicloSel}
          onChange={e => setCicloSel(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13, fontFamily: font, fontWeight: 700 }}
        >
          <option value="__aberto__">Ciclo atual (em aberto)</option>
          {ciclos.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__todos__">Todos os ciclos</option>
        </select>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por escola, data ou remessa..."
          style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13, minWidth: 280, fontFamily: font }}
        />
      </div>

      {erro && <div style={{ background: "#ffebee", color: "#c62828", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{erro}</div>}

      {carregando ? (
        <div style={{ textAlign: "center", padding: 48, color: "#666" }}>Carregando...</div>
      ) : filtrada.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#888", background: "#fff", borderRadius: 8 }}>
          {cicloSel === "__aberto__" && !busca
            ? "Nenhum romaneio fechado no ciclo atual. Feche um romaneio na aba Romaneio para ele aparecer aqui."
            : "Nada encontrado para esse filtro."}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.07)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#111", color: "#fff", textAlign: "left" }}>
                {["Data", "Ciclo", "Escola", "Linha", "Remessa", "Volumes", "Peso (kg)", "Fechado por", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrada.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{r.data_romaneio}</td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{r.ciclo_nome || <span style={{ color: "#1b8f3a", fontWeight: 700 }}>Em aberto</span>}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700 }}>{r.escola}</td>
                  <td style={{ padding: "10px 12px" }}>{r.linha || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{r.remessa}</td>
                  <td style={{ padding: "10px 12px" }}>{r.total_volumes}</td>
                  <td style={{ padding: "10px 12px" }}>{r.peso_total != null ? Number(r.peso_total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{r.criado_por || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => setVisualizando(r)} style={{ ...btn, background: "#111", color: "#fff" }}>👁 Visualizar</button>
                      <button onClick={() => handleBaixar(r, "pdf")} disabled={baixando === r.id + "pdf"} style={{ ...btn, background: "#e53935", color: "#fff" }}>
                        {baixando === r.id + "pdf" ? "..." : "↓ PDF"}
                      </button>
                      <button onClick={() => handleBaixar(r, "xlsx")} disabled={baixando === r.id + "xlsx"} style={{ ...btn, background: "#1b8f3a", color: "#fff" }}>
                        {baixando === r.id + "xlsx" ? "..." : "↓ Excel"}
                      </button>
                      <button onClick={() => (r.token_publico ? setQrDe(r) : publicarQR(r))}
                        title={r.token_publico ? "Link público publicado" : "Publicar o PDF e gerar o link público"}
                        style={{ ...btn, background: r.token_publico ? "#39DF18" : "#fff", color: "#111", border: "1px solid #111" }}>
                        {r.token_publico ? "Link ✓" : "Link"}
                      </button>
                      <button onClick={() => handleExcluir(r)} style={{ ...btn, background: "#eee", color: "#555" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrDe && qrDe.token_publico && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setQrDe(null)}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 24, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Link público do romaneio</div>
            <div style={{ fontSize: 12, color: "#777", marginBottom: 12 }}>{qrDe.escola} · {qrDe.remessa} · {qrDe.data_romaneio}</div>
            <input readOnly value={linkPublico(qrDe)} onFocus={e => e.target.select()}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13, boxSizing: "border-box" }} />
            <div style={{ fontSize: 11, color: "#b26a00", marginTop: 8 }}>Qualquer pessoa com este link vê o PDF deste romaneio. Use-o para gerar o QR code na impressora Zebra.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
              <button onClick={() => despublicarQR(qrDe)} style={{ ...btn, background: "#fff", color: "#D81E27", border: "1px solid #D81E27" }}>Despublicar</button>
              <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(linkPublico(qrDe)); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
                style={{ ...btn, background: "#39DF18", color: "#000" }}>{copiado ? "Copiado ✓" : "Copiar link"}</button>
              <button onClick={() => setQrDe(null)} style={{ ...btn, background: "#fff", color: "#111", border: "1px solid #ccc" }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {visualizando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", flexDirection: "column", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", color: "#fff", padding: "10px 16px", borderRadius: "8px 8px 0 0" }}>
            <strong style={{ fontSize: 14 }}>{visualizando.escola} · {visualizando.remessa} · {visualizando.data_romaneio}</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleBaixar(visualizando, "pdf")} style={{ ...btn, background: "#e53935", color: "#fff" }}>↓ PDF</button>
              <button onClick={() => handleBaixar(visualizando, "xlsx")} style={{ ...btn, background: "#1b8f3a", color: "#fff" }}>↓ Excel</button>
              <button onClick={() => setVisualizando(null)} style={{ ...btn, background: "#fff", color: "#111" }}>✕ Fechar</button>
            </div>
          </div>
          <iframe
            title="Romaneio"
            src={srcVis}
            style={{ flex: 1, width: "100%", border: "none", background: "#fff", borderRadius: "0 0 8px 8px" }}
          />
        </div>
      )}
    </div>
  );
}
