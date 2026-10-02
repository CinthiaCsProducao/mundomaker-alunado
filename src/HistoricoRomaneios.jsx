import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const BUCKET = "romaneios";
const font = "'Archivo', 'Segoe UI', sans-serif";

function urlPublica(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function baixar(path, nomeArquivo) {
  const res = await fetch(urlPublica(path));
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
  const [baixando, setBaixando] = useState("");

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

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(r =>
      (r.escola || "").toLowerCase().includes(q) ||
      (r.data_romaneio || "").includes(q) ||
      (r.remessa || "").toLowerCase().includes(q)
    );
  }, [lista, busca]);

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

  const btn = { border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", fontFamily: font }}>
      <button onClick={onVoltar}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#555", fontFamily: font, marginBottom: 12 }}>
        ← Voltar ao Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Histórico de Romaneios</h2>
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
          {lista.length === 0 ? "Nenhum romaneio fechado ainda. Feche um romaneio na aba Romaneio para ele aparecer aqui." : "Nada encontrado para essa busca."}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.07)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#111", color: "#fff", textAlign: "left" }}>
                {["Data", "Escola", "Linha", "Remessa", "Volumes", "Peso (kg)", "Fechado por", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrada.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{r.data_romaneio}</td>
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
                      <button onClick={() => handleExcluir(r)} style={{ ...btn, background: "#eee", color: "#555" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            src={urlPublica(visualizando.pdf_path)}
            style={{ flex: 1, width: "100%", border: "none", background: "#fff", borderRadius: "0 0 8px 8px" }}
          />
        </div>
      )}
    </div>
  );
}
