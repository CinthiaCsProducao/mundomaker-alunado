import { useState } from "react";
import { supabase } from "./supabaseClient";

const font = "'Figtree','Segoe UI',system-ui,sans-serif";
const btn = { border: "none", borderRadius: 4, padding: "7px 12px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" };

function baixarJSON(nome, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Direitos do titular (LGPD art. 18) e trilha de auditoria — somente administradores
export default function LgpdAdmin({ onVoltar }) {
  const [aba, setAba] = useState("titular");
  const [busca, setBusca] = useState("");
  const [res, setRes] = useState(null);
  const [logs, setLogs] = useState(null);
  const [msg, setMsg] = useState("");

  async function buscar() {
    const q = busca.trim();
    if (q.length < 3) { setMsg("Digite ao menos 3 letras."); return; }
    setMsg("");
    const [a, b] = await Promise.all([
      supabase.from("cm_alunos").select("id,nome,responsavel,status").or(`nome.ilike.%${q}%,responsavel.ilike.%${q}%`).limit(50),
      supabase.from("familias_alunos").select("id,aluno,responsavel,status,escola_id").or(`aluno.ilike.%${q}%,responsavel.ilike.%${q}%`).limit(50),
    ]);
    setRes([
      ...(a.data || []).map(x => ({ origem: "cursomaker", id: x.id, aluno: x.nome, responsavel: x.responsavel, status: x.status, rotulo: "Curso Maker" })),
      ...(b.data || []).map(x => ({ origem: "techlab", id: x.id, aluno: x.aluno, responsavel: x.responsavel, status: x.status, rotulo: "TechLab" })),
    ]);
  }
  async function exportar(r) {
    const { data, error } = await supabase.rpc("lgpd_exportar_aluno", { p_origem: r.origem, p_id: r.id });
    if (error) { alert("Erro: " + error.message); return; }
    baixarJSON(`dados_${r.origem}_${r.id}.json`, data);
  }
  async function anonimizar(r) {
    if (!window.confirm(`Anonimizar "${r.aluno}"? Nome, contatos e documentos serão apagados de forma irreversível (os valores financeiros e a frequência permanecem sem identificação).`)) return;
    const { error } = await supabase.rpc("lgpd_anonimizar_aluno", { p_origem: r.origem, p_id: r.id });
    if (error) { alert("Erro: " + error.message); return; }
    setMsg("Anonimizado."); buscar();
  }
  async function carregarLogs() {
    const { data } = await supabase.from("auditoria").select("*").order("criado_em", { ascending: false }).limit(300);
    setLogs(data || []);
  }

  const aba_ = (id, t) => (
    <button onClick={() => { setAba(id); if (id === "log" && !logs) carregarLogs(); }}
      style={{ ...btn, background: aba === id ? "#39DF18" : "#fff", color: "#111", border: "1px solid #DCDDDE" }}>{t}</button>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px", fontFamily: font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>LGPD — Direitos do titular e auditoria</div>
        <button onClick={onVoltar} style={{ ...btn, background: "#111", color: "#fff" }}>Voltar</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{aba_("titular", "Buscar titular")}{aba_("log", "Registro de auditoria")}</div>

      {aba === "titular" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 18 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key === "Enter" && buscar()}
              placeholder="Nome do aluno ou do responsável" style={{ flex: 1, padding: "9px 12px", border: "1px solid #DCDDDE", borderRadius: 4, fontSize: 14 }} />
            <button onClick={buscar} style={{ ...btn, background: "#39DF18", color: "#000" }}>Buscar</button>
          </div>
          {msg && <div style={{ marginTop: 10, fontSize: 13, color: "#148A00" }}>{msg}</div>}
          {res && res.length === 0 && <div style={{ marginTop: 14, color: "#888", fontSize: 13 }}>Nenhum registro encontrado.</div>}
          {res && res.map(r => (
            <div key={r.origem + r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid #eee", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13 }}><b>{r.aluno}</b> · {r.rotulo} · resp.: {r.responsavel || "—"} · {r.status || ""}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => exportar(r)} style={{ ...btn, background: "#111", color: "#fff" }}>Exportar dados (JSON)</button>
                <button onClick={() => anonimizar(r)} style={{ ...btn, background: "#fff", color: "#D81E27", border: "1px solid #D81E27" }}>Anonimizar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === "log" && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 18, overflowX: "auto" }}>
          {!logs ? "Carregando..." : logs.length === 0 ? "Sem registros ainda." : (
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left", color: "#888" }}><th>Quando</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>ID</th></tr></thead>
              <tbody>{logs.map(l => (
                <tr key={l.id} style={{ borderTop: "1px solid #eee" }}>
                  <td>{new Date(l.criado_em).toLocaleString("pt-BR")}</td><td>{l.usuario_email}</td><td>{l.acao}</td><td>{l.entidade}</td><td>{l.entidade_id}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
