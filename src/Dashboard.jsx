import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const SENHAS = {
  "mm-admin-2026":      { equipe: "Admin", cor: "#39DF18" },
  "mm-producao-2026":   { equipe: "Produção", cor: "#00C7F4" },
  "mm-financeiro-2026": { equipe: "Financeiro", cor: "#FFD902" },
};

const font = "'Circular Std', 'Nunito', 'Helvetica Neue', Arial, sans-serif";

const CLUSTER_PT = {
  Diamond: "Diamante",
  Gold:    "Ouro",
  Silver:  "Prata",
  Bronze:  "Bronze",
};

const CLUSTER_INFO = {
  Diamond: { bg: "#00C7F4", text: "#000", emoji: "💎" },
  Gold:    { bg: "#FFD902", text: "#000", emoji: "🥇" },
  Silver:  { bg: "#e5e5e5", text: "#111", emoji: "🥈" },
  Bronze:  { bg: "#FFA300", text: "#000", emoji: "🥉" },
};

function calcularCluster(total) {
  if (total >= 500) return "Diamond";
  if (total >= 300) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
}

function gerarPDF(escola, detalhes, hist) {
  const clus = escola.cluster || "Bronze";
  const nomeCluster = CLUSTER_PT[clus] || clus;
  const corCluster = CLUSTER_INFO[clus]?.bg || "#FFA300";
  const seriesHtml = detalhes
    ? detalhes.series.map(s => {
        const turmas = detalhes.turmas.filter(t => t.grade_class_id === s.id);
        return `
          <tr><td colspan="3" style="background:#f5f5f5;font-weight:700;padding:8px 14px;font-size:12px;">${s.serie}</td></tr>
          ${turmas.map(t => `<tr><td style="padding:7px 14px 7px 28px;">Turma ${t.turma}</td><td style="padding:7px 14px;">${t.num_alunos} alunos</td><td style="padding:7px 14px;">${t.professor_maker || "—"}</td></tr>`).join("")}
        `;
      }).join("")
    : "<tr><td colspan='3'>Sem dados</td></tr>";

  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Alunado — ${escola.nome}</title>
    <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 24px; max-width: 800px; margin: 0 auto; }
    .print-btn { background: #39DF18; border: none; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 4px; margin-bottom: 20px; }
    .header { background: #39DF18; padding: 20px 24px; border-radius: 4px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; font-weight: 800; } .header p { font-size: 11px; margin-top: 4px; opacity: 0.7; }
    .section { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
    .sec-title { background: #111; color: #fff; padding: 9px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .sec-body { padding: 16px; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .f-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 2px; } .f-val { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; } th, td { padding: 7px 14px; border: 1px solid #e5e5e5; text-align: left; }
    th { background: #f5f5f5; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .total-box { margin-top: 14px; background: #111; color: #39DF18; border-radius: 4px; padding: 14px 18px; }
    .total-num { font-size: 32px; font-weight: 800; } .total-label { font-size: 10px; color: #aaa; text-transform: uppercase; margin-top: 4px; }
    .cluster-badge { display: inline-block; background: ${corCluster}; color: #000; padding: 3px 12px; border-radius: 50px; font-size: 12px; font-weight: 700; }
    .sig-img { max-height: 70px; border: 1px solid #ddd; border-radius: 4px; margin-top: 8px; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
    </style></head><body>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    <div class="header"><h1>mundo maker — Formulário de Alunado</h1><p>Enviado em: ${new Date(escola.data_submissao).toLocaleDateString("pt-BR")}</p></div>
    <div class="section"><div class="sec-title">1. Dados da Escola</div><div class="sec-body"><div class="grid">
      <div><div class="f-label">Nome</div><div class="f-val">${escola.nome}</div></div>
      <div><div class="f-label">Responsável</div><div class="f-val">${escola.responsavel_escola || "—"}</div></div>
      <div><div class="f-label">Telefone</div><div class="f-val">${escola.telefone || "—"}</div></div>
      <div><div class="f-label">CEP</div><div class="f-val">${escola.cep || "—"}</div></div>
      <div><div class="f-label">Rua</div><div class="f-val">${escola.rua || escola.endereco || "—"}</div></div>
      <div><div class="f-label">Número</div><div class="f-val">${escola.numero || "—"}</div></div>
      <div><div class="f-label">Bairro</div><div class="f-val">${escola.bairro || "—"}</div></div>
      <div><div class="f-label">Cidade / Estado</div><div class="f-val">${[escola.cidade, escola.estado].filter(Boolean).join(" — ") || "—"}</div></div>
      <div><div class="f-label">Tipo de Frete</div><div class="f-val">${escola.tipo_frete || "—"}</div></div>
      <div><div class="f-label">Início das Aulas</div><div class="f-val">${escola.data_inicio ? new Date(escola.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div></div>
    </div></div></div>
    <div class="section"><div class="sec-title">2. Programa e Idioma</div><div class="sec-body"><div class="grid">
      <div><div class="f-label">Programa</div><div class="f-val">${escola.programa || "—"}</div></div>
      <div><div class="f-label">Idioma do Material</div><div class="f-val">${escola.idioma_material || "—"}</div></div>
    </div></div></div>
    <div class="section"><div class="sec-title">3. Séries e Turmas</div><div class="sec-body">
      <table><thead><tr><th>Série / Turma</th><th>Alunos</th><th>Professor Maker</th></tr></thead><tbody>${seriesHtml}</tbody></table>
      <div class="total-box"><div class="total-num">${escola.total_alunos?.toLocaleString("pt-BR") || 0}</div>
      <div class="total-label">Total de Alunos &nbsp;|&nbsp; <span class="cluster-badge">${CLUSTER_INFO[clus]?.emoji} ${nomeCluster}</span></div></div>
    </div></div>
    ${hist ? `<div class="section"><div class="sec-title">4. Responsável pelo Preenchimento</div><div class="sec-body">
      <div><div class="f-label">Nome</div><div class="f-val">${hist.responsavel_preenchimento || "—"}</div></div>
      ${hist.assinatura_url ? `<div style="margin-top:12px;"><div class="f-label">Assinatura</div><img class="sig-img" src="${hist.assinatura_url}" /></div>` : ""}
    </div></div>` : ""}
    ${hist && hist.calendario_url ? `<div class="section"><div class="sec-title">5. Calendário Escolar</div><div class="sec-body">
      <div class="f-val">${hist.calendario_nome || "Calendário"}</div>
      <a href="${hist.calendario_url}" target="_blank" style="display:inline-block;margin-top:8px;color:#0066cc;font-size:12px;">🔗 Abrir arquivo</a>
    </div></div>` : ""}
    </body></html>`);
  win.document.close();
}

function ModalDetalhes({ escola, onClose, onDelete, isAdmin }) {
  const [detalhes, setDetalhes] = useState(null);
  const [hist, setHist] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!escola) return;
    setDetalhes(null); setHist(null);
    async function buscar() {
      const [{ data: gc }, { data: cl }, { data: h }] = await Promise.all([
        supabase.from("grade_classes").select("id, serie, ordem").eq("school_id", escola.id).order("ordem"),
        supabase.from("classes").select("grade_class_id, turma, num_alunos, professor_maker").eq("school_id", escola.id),
        supabase.from("alunado_history").select("*").eq("school_id", escola.id).order("data_submissao", { ascending: false }).limit(1).single(),
      ]);
      setDetalhes({ series: gc || [], turmas: cl || [] });
      setHist(h || null);
    }
    buscar();
  }, [escola]);

  if (!escola) return null;
  const seriesComTurmas = detalhes ? detalhes.series.map(s => ({ ...s, turmas: detalhes.turmas.filter(t => t.grade_class_id === s.id) })) : [];
  const clus = escola.cluster || "Bronze";

  const enderecoLinhas = [
    escola.rua && `${escola.rua}${escola.numero ? ", " + escola.numero : ""}${escola.complemento ? " — " + escola.complemento : ""}`,
    escola.bairro,
    [escola.cidade, escola.estado].filter(Boolean).join(" — "),
    escola.cep,
  ].filter(Boolean);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, fontFamily: font }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ background: "#111", padding: "20px 28px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{escola.nome}</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ background: CLUSTER_INFO[clus]?.bg, color: CLUSTER_INFO[clus]?.text, padding: "3px 12px", borderRadius: 50, fontSize: 12, fontWeight: 700 }}>
                {CLUSTER_INFO[clus]?.emoji} {CLUSTER_PT[clus]}
              </span>
              <span style={{ color: "#39DF18", fontWeight: 800, fontSize: 16 }}>{escola.total_alunos?.toLocaleString("pt-BR")} alunos</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Dados da Escola</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 13 }}>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Responsável</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.responsavel_escola || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Telefone</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.telefone || "—"}</div></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Endereço</div>
              <div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{enderecoLinhas.length > 0 ? enderecoLinhas.join(" · ") : (escola.endereco || "—")}</div>
            </div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Tipo de Frete</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.tipo_frete || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Início das Aulas</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.data_inicio ? new Date(escola.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div></div>
          </div>
        </div>

        {(escola.programa || escola.idioma_material) && (
          <div style={{ padding: "16px 28px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 32 }}>
            {escola.programa && <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Programa</div><div style={{ fontWeight: 700, color: "#111", marginTop: 2, fontSize: 13 }}>{escola.programa}</div></div>}
            {escola.idioma_material && <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Idioma</div><div style={{ fontWeight: 700, color: "#111", marginTop: 2, fontSize: 13 }}>{escola.idioma_material}</div></div>}
          </div>
        )}

        {hist && hist.responsavel_preenchimento && (
          <div style={{ padding: "12px 28px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Responsável pelo Preenchimento</div>
            <div style={{ fontWeight: 600, color: "#222", marginTop: 2, fontSize: 13 }}>{hist.responsavel_preenchimento}</div>
          </div>
        )}

        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
            Séries e Turmas ({escola.num_series} série{escola.num_series !== 1 ? "s" : ""}, {escola.num_turmas} turma{escola.num_turmas !== 1 ? "s" : ""})
          </div>
          {!detalhes ? <div style={{ color: "#aaa", fontSize: 13 }}>Carregando...</div>
            : seriesComTurmas.length === 0 ? <div style={{ color: "#aaa", fontSize: 13 }}>Nenhuma série cadastrada.</div>
            : seriesComTurmas.map(serie => (
              <div key={serie.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111", background: "#f5f5f5", padding: "6px 12px", borderRadius: 4, marginBottom: 6 }}>{serie.serie}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 8 }}>
                  {serie.turmas.map((t, i) => (
                    <div key={i} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 6, padding: "8px 14px", fontSize: 12, minWidth: 110 }}>
                      <div style={{ fontWeight: 700, color: "#111" }}>Turma {t.turma}</div>
                      <div style={{ color: "#39DF18", fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{t.num_alunos}</div>
                      <div style={{ color: "#aaa", fontSize: 10 }}>alunos</div>
                      {t.professor_maker && <div style={{ color: "#777", fontSize: 10, marginTop: 4 }}>Prof: {t.professor_maker}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {hist && hist.calendario_url && (
          <div style={{ padding: "14px 28px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.8 }}>Calendário Escolar Anexado</div>
              <div style={{ fontWeight: 600, color: "#222", fontSize: 13, marginTop: 2 }}>{hist.calendario_nome || "Arquivo"}</div>
            </div>
            <a href={hist.calendario_url} target="_blank" rel="noreferrer"
              style={{ background: "#111", color: "#fff", padding: "8px 16px", borderRadius: 4, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              ⬇ Baixar
            </a>
          </div>
        )}

        <div style={{ padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <button onClick={() => gerarPDF(escola, detalhes, hist)}
            style={{ background: "#39DF18", color: "#000", border: "none", borderRadius: 4, padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            🖨️ Gerar PDF
          </button>
          {isAdmin && (!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "#fff", color: "#e53935", border: "1.5px solid #e53935", borderRadius: 4, padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              🗑 Excluir Escola
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#e53935", fontWeight: 600 }}>Confirmar exclusão?</span>
              <button onClick={() => setConfirmDelete(false)} style={{ background: "#f5f5f5", color: "#333", border: "none", borderRadius: 4, padding: "9px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => onDelete(escola.id)} style={{ background: "#e53935", color: "#fff", border: "none", borderRadius: 4, padding: "9px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [logado, setLogado] = useState(false);
  const [equipeLogada, setEquipeLogada] = useState(null);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [manterLogado, setManterLogado] = useState(false);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState("nome");
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("mm_dashboard_equipe");
    if (saved) {
      try {
        const equipe = JSON.parse(saved);
        setLogado(true);
        setEquipeLogada(equipe);
        carregarDados();
      } catch(e) {
        localStorage.removeItem("mm_dashboard_equipe");
      }
    }
  }, []); // eslint-disable-line

  function handleLogin(e) {
    e.preventDefault();
    const acesso = SENHAS[senha];
    if (acesso) {
      if (manterLogado) {
        localStorage.setItem("mm_dashboard_equipe", JSON.stringify(acesso));
      }
      setLogado(true);
      setEquipeLogada(acesso);
      carregarDados();
    } else {
      setErroLogin("Senha incorreta.");
    }
  }

  async function carregarDados() {
    setLoading(true);
    try {
      const { data: schools } = await supabase.from("schools").select("*").order("created_at", { ascending: false });
      const { data: history } = await supabase.from("alunado_history").select("school_id, total_alunos, cluster, data_submissao");
      const { data: classes } = await supabase.from("classes").select("school_id, num_alunos");
      const { data: grade_classes } = await supabase.from("grade_classes").select("id, school_id, serie");
      const escolasComDados = (schools || []).map(escola => {
        const hist = (history || []).find(h => h.school_id === escola.id);
        const turmas = (classes || []).filter(c => c.school_id === escola.id);
        const series = (grade_classes || []).filter(g => g.school_id === escola.id);
        const totalAlunos = turmas.reduce((a, c) => a + (c.num_alunos || 0), 0);
        return { ...escola, total_alunos: hist ? hist.total_alunos : totalAlunos, cluster: hist ? hist.cluster : calcularCluster(totalAlunos), data_submissao: hist ? hist.data_submissao : escola.created_at, num_series: series.length, num_turmas: turmas.length };
      });
      setEscolas(escolasComDados);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleDelete(schoolId) {
    await supabase.from("schools").delete().eq("id", schoolId);
    setEscolaSelecionada(null); carregarDados();
  }

  const escolasFiltradas = escolas
    .filter(e => e.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      if (ordenar === "nome") return a.nome.localeCompare(b.nome);
      if (ordenar === "alunos") return b.total_alunos - a.total_alunos;
      if (ordenar === "data") return new Date(b.data_submissao) - new Date(a.data_submissao);
      return 0;
    });

  const totalAlunos = escolas.reduce((a, e) => a + e.total_alunos, 0);
  const totalEscolas = escolas.length;
  const porCluster = ["Diamond", "Gold", "Silver", "Bronze"].map(c => ({
    cluster: c,
    count: escolas.filter(e => e.cluster === c).length,
    alunos: escolas.filter(e => e.cluster === c).reduce((a, e) => a + e.total_alunos, 0),
  }));

  if (!logado) return (
    <div style={{ minHeight: "100vh", background: "#39DF18", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "48px 56px", maxWidth: 400, width: "100%", margin: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌍</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>mundo maker</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Dashboard de Alunado</div>
        </div>
        <form onSubmit={handleLogin}>
          {erroLogin && <div style={{ background: "#fff0f0", border: "1.5px solid #FF3B41", color: "#cc0000", borderRadius: 4, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{erroLogin}</div>}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Digite a senha"
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 4, fontSize: 14, fontFamily: font, boxSizing: "border-box" }} />
          </div>

          {/* Manter conectado */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}
            onClick={() => setManterLogado(m => !m)}>
            <div style={{ width: 18, height: 18, border: `2px solid ${manterLogado ? "#39DF18" : "#ccc"}`, borderRadius: 3, background: manterLogado ? "#39DF18" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {manterLogado && <span style={{ fontSize: 11, fontWeight: 900, color: "#000" }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: "#555", userSelect: "none" }}>Manter conectado</span>
          </div>

          <button type="submit" style={{ width: "100%", padding: "14px", background: "#39DF18", color: "#000", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 800, fontFamily: font, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: font }}>
      <div style={{ background: "#39DF18", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, border: "3px dashed #000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
            <div style={{ width: 24, height: 24, border: "3px solid #000", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: -7, right: -3, width: 14, height: 14, background: "#000", borderRadius: "50%", color: "#39DF18", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>m</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#000", lineHeight: 1.1 }}>mundo maker</div>
            <div style={{ fontSize: 11, color: "#333" }}>Dashboard de Alunado</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {equipeLogada && <span style={{ background: equipeLogada.cor, color: "#000", padding: "5px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>{equipeLogada.equipe}</span>}
          <button onClick={() => { localStorage.removeItem("mm_dashboard_equipe"); setLogado(false); setEquipeLogada(null); }}
            style={{ background: "#000", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>SAIR</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: 60, color: "#666", fontSize: 16 }}>Carregando dados...</div> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#111", borderRadius: 8, padding: "24px 28px" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalAlunos.toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 12, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Total de Alunos</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: "#111", lineHeight: 1 }}>{totalEscolas}</div>
                <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Escolas Cadastradas</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
              {porCluster.map(({ cluster, count, alunos }) => (
                <div key={cluster} style={{ background: CLUSTER_INFO[cluster].bg, color: CLUSTER_INFO[cluster].text, borderRadius: 8, padding: "20px" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{CLUSTER_INFO[cluster].emoji}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{CLUSTER_PT[cluster]}</div>
                  <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>{alunos.toLocaleString("pt-BR")} alunos</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 8, padding: "24px 28px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Distribuição por Cluster</div>
              {porCluster.map(({ cluster, count }) => {
                const pct = totalEscolas > 0 ? (count / totalEscolas) * 100 : 0;
                return (
                  <div key={cluster} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{CLUSTER_INFO[cluster].emoji} {CLUSTER_PT[cluster]}</span>
                      <span style={{ fontSize: 12, color: "#666" }}>{count} escola{count !== 1 ? "s" : ""} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: 10, background: "#f0f0f0", borderRadius: 5 }}>
                      <div style={{ height: 10, background: CLUSTER_INFO[cluster].bg, borderRadius: 5, width: `${pct}%`, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              <div style={{ background: "#111", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 1.5 }}>Escolas Cadastradas</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar escola..."
                    style={{ padding: "7px 12px", borderRadius: 4, border: "none", fontSize: 13, fontFamily: font, width: 200 }} />
                  <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
                    style={{ padding: "7px 12px", borderRadius: 4, border: "none", fontSize: 13, fontFamily: font, background: "#fff" }}>
                    <option value="nome">Ordenar: Nome</option>
                    <option value="alunos">Ordenar: Alunos</option>
                    <option value="data">Ordenar: Data</option>
                  </select>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      {["Escola", "Programa", "Idioma", "Cluster", "Alunos", "Frete", "Data", "Ações"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {escolasFiltradas.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
                        {busca ? "Nenhuma escola encontrada." : "Nenhuma escola cadastrada ainda."}
                      </td></tr>
                    ) : escolasFiltradas.map((escola, i) => (
                      <tr key={escola.id} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111" }}>{escola.nome}</td>
                        <td style={{ padding: "12px 16px", color: "#555", fontSize: 12 }}>{escola.programa || "—"}</td>
                        <td style={{ padding: "12px 16px", color: "#555", fontSize: 12 }}>{escola.idioma_material || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: CLUSTER_INFO[escola.cluster]?.bg || "#eee", color: CLUSTER_INFO[escola.cluster]?.text || "#000", padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                            {CLUSTER_INFO[escola.cluster]?.emoji} {CLUSTER_PT[escola.cluster] || escola.cluster}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111" }}>{escola.total_alunos.toLocaleString("pt-BR")}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: escola.tipo_frete === "CIF" ? "#e8f5e9" : "#fff3e0", color: escola.tipo_frete === "CIF" ? "#2e7d32" : "#e65100", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            {escola.tipo_frete || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#888", whiteSpace: "nowrap" }}>{new Date(escola.data_submissao).toLocaleDateString("pt-BR")}</td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <button onClick={() => setEscolaSelecionada(escola)}
                            style={{ background: "#111", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                            Ver mais
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ModalDetalhes
        escola={escolaSelecionada}
        onClose={() => setEscolaSelecionada(null)}
        onDelete={handleDelete}
        isAdmin={equipeLogada?.equipe === "Admin"}
      />
    </div>
  );
}