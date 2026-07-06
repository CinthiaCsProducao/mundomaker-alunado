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

function LogoMM({ size = 56, cor = "#111" }) {
  const textFill = cor === "#111" || cor === "#000" ? "#fff" : "#111";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="35" fill="none" stroke={cor} strokeWidth="3" strokeDasharray="8,5" />
      <circle cx="40" cy="40" r="21" fill="none" stroke={cor} strokeWidth="8" />
      <circle cx="57" cy="13" r="9" fill={cor} />
      <text x="57" y="17.5" textAnchor="middle" fill={textFill} fontSize="10" fontWeight="800" fontFamily="Arial,sans-serif">m</text>
    </svg>
  );
}

function gerarPDF(escola, detalhes, hist) {
  const seriesHtml = detalhes
    ? detalhes.series.map(s => {
        const turmas = detalhes.turmas.filter(t => t.grade_class_id === s.id);
        return `
          <tr><td colspan="3" style="background:#f5f5f5;font-weight:700;padding:8px 14px;font-size:12px;">${s.serie}</td></tr>
          ${turmas.map(t => `
            <tr>
              <td style="padding:7px 14px 7px 28px;">Turma ${t.turma}</td>
              <td style="padding:7px 14px;">${t.num_alunos} alunos</td>
              <td style="padding:7px 14px;">${t.professor_maker || "—"}</td>
            </tr>
          `).join("")}
        `;
      }).join("")
    : "<tr><td colspan='3'>Sem dados</td></tr>";

  const fmtDate = (val) => val ? new Date(val + "T12:00:00").toLocaleDateString("pt-BR") : "—";

  const enderecoCompleto = [
    escola.rua && `${escola.rua}${escola.numero ? ", " + escola.numero : ""}${escola.complemento ? " — " + escola.complemento : ""}`,
    escola.bairro,
    [escola.cidade, escola.estado].filter(Boolean).join(" — "),
    escola.cep,
  ].filter(Boolean).join(" · ") || escola.endereco || "—";

  const win = window.open("", "_blank");
  win.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Alunado — ${escola.nome}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; max-width: 800px; margin: 0 auto; }
      .print-btn { background: #39DF18; border: none; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 4px; margin-bottom: 20px; }
      .header { background: #39DF18; padding: 20px 24px; border-radius: 4px; margin-bottom: 20px; }
      .header h1 { font-size: 18px; font-weight: 800; }
      .header p { font-size: 11px; margin-top: 4px; opacity: 0.7; }
      .section { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 16px; page-break-inside: avoid; }
      .sec-title { background: #111; color: #fff; padding: 9px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .sec-body { padding: 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .f-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
      .f-val { font-weight: 600; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { padding: 7px 14px; border: 1px solid #e5e5e5; text-align: left; }
      th { background: #f5f5f5; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .total-box { margin-top: 14px; background: #111; color: #39DF18; border-radius: 4px; padding: 14px 18px; }
      .total-num { font-size: 32px; font-weight: 800; line-height: 1; }
      .total-label { font-size: 10px; color: #aaa; text-transform: uppercase; margin-top: 4px; }
      .sig-img { max-height: 70px; border: 1px solid #ddd; border-radius: 4px; margin-top: 8px; }
      @media print { .print-btn { display: none; } body { padding: 0; } }
    </style>
    </head><body>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    <div class="header">
      <h1>Mundo Maker — Formulário de Alunado</h1>
      <p>Enviado em: ${new Date(escola.data_submissao).toLocaleDateString("pt-BR")}</p>
    </div>
    <div class="section">
      <div class="sec-title">1. Dados da Escola</div>
      <div class="sec-body">
        <div class="grid">
          <div><div class="f-label">Nome</div><div class="f-val">${escola.nome}</div></div>
          <div><div class="f-label">Responsável</div><div class="f-val">${escola.responsavel_escola || "—"}</div></div>
          <div><div class="f-label">Telefone</div><div class="f-val">${escola.telefone || "—"}</div></div>
          <div><div class="f-label">CEP</div><div class="f-val">${escola.cep || "—"}</div></div>
          <div style="grid-column:1/-1"><div class="f-label">Endereço</div><div class="f-val">${enderecoCompleto}</div></div>
          <div><div class="f-label">Tipo de Frete</div><div class="f-val">${escola.tipo_frete || "—"}</div></div>
          <div><div class="f-label">Início das Aulas</div><div class="f-val">${fmtDate(escola.data_inicio)}</div></div>
          <div><div class="f-label">Recebimento do Material</div><div class="f-val">${fmtDate(escola.data_recebimento)}</div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="sec-title">2. Programa e Idioma</div>
      <div class="sec-body">
        <div class="grid">
          <div><div class="f-label">Programa</div><div class="f-val">${escola.programa || "—"}</div></div>
          <div><div class="f-label">Idioma do Material</div><div class="f-val">${escola.idioma_material || "—"}</div></div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="sec-title">3. Séries e Turmas</div>
      <div class="sec-body">
        <table>
          <thead><tr><th>Série / Turma</th><th>Alunos</th><th>Professor Maker</th></tr></thead>
          <tbody>${seriesHtml}</tbody>
        </table>
        <div class="total-box">
          <div class="total-num">${escola.total_alunos?.toLocaleString("pt-BR") || 0}</div>
          <div class="total-label">Total de Alunos</div>
        </div>
      </div>
    </div>
    ${hist ? `
    <div class="section">
      <div class="sec-title">4. Responsável pelo Preenchimento</div>
      <div class="sec-body">
        <div><div class="f-label">Nome</div><div class="f-val">${hist.responsavel_preenchimento || "—"}</div></div>
        ${hist.assinatura_url ? `<div style="margin-top:12px;"><div class="f-label">Assinatura</div><img class="sig-img" src="${hist.assinatura_url}" /></div>` : ""}
      </div>
    </div>
    ` : ""}
    ${hist && hist.calendario_url ? `
    <div class="section">
      <div class="sec-title">5. Calendário Escolar</div>
      <div class="sec-body">
        <div class="f-label">Arquivo Anexado</div>
        <div class="f-val" style="margin-top:4px;">${hist.calendario_nome || "Calendário"}</div>
        <a href="${hist.calendario_url}" target="_blank" style="display:inline-block;margin-top:8px;color:#0066cc;font-size:12px;">🔗 Abrir arquivo</a>
      </div>
    </div>
    ` : ""}
    </body></html>
  `);
  win.document.close();
}

function ModalDetalhes({ escola, onClose, onDelete, isAdmin }) {
  const [detalhes, setDetalhes] = useState(null);
  const [hist, setHist] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!escola) return;
    setDetalhes(null);
    setHist(null);
    async function buscar() {
      const [{ data: gc }, { data: cl }, { data: h }] = await Promise.all([
        supabase.from("grade_classes").select("id, serie, ordem").eq("school_id", escola.id).order("ordem"),
        supabase.from("classes").select("grade_class_id, turma, num_alunos, professor_maker").eq("school_id", escola.id),
        supabase.from("alunado_history").select("*").eq("school_id", escola.id)
          .order("data_submissao", { ascending: false }).limit(1).single(),
      ]);
      setDetalhes({ series: gc || [], turmas: cl || [] });
      setHist(h || null);
    }
    buscar();
  }, [escola]);

  if (!escola) return null;

  const seriesComTurmas = detalhes
    ? detalhes.series.map(s => ({ ...s, turmas: detalhes.turmas.filter(t => t.grade_class_id === s.id) }))
    : [];

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
              <span style={{ color: "#39DF18", fontWeight: 800, fontSize: 16 }}>
                {escola.total_alunos?.toLocaleString("pt-BR")} alunos
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Dados da Escola</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 13 }}>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Responsável</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.responsavel_escola || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Telefone</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.telefone || "—"}</div></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Endereço</div>
              <div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{enderecoLinhas.length > 0 ? enderecoLinhas.join(" · ") : (escola.endereco || "—")}</div>
            </div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Tipo de Frete</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.tipo_frete || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Início das Aulas</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.data_inicio ? new Date(escola.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Recebimento do Material</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.data_recebimento ? new Date(escola.data_recebimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div></div>
          </div>
        </div>
        {(escola.programa || escola.idioma_material) && (
          <div style={{ padding: "16px 28px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 32 }}>
            {escola.programa && <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Programa</div><div style={{ fontWeight: 700, color: "#111", marginTop: 2, fontSize: 13 }}>{escola.programa}</div></div>}
            {escola.idioma_material && <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Idioma do Material</div><div style={{ fontWeight: 700, color: "#111", marginTop: 2, fontSize: 13 }}>{escola.idioma_material}</div></div>}
          </div>
        )}
        {hist && hist.responsavel_preenchimento && (
          <div style={{ padding: "12px 28px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Responsável pelo Preenchimento</div>
            <div style={{ fontWeight: 600, color: "#222", marginTop: 2, fontSize: 13 }}>{hist.responsavel_preenchimento}</div>
          </div>
        )}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
            Séries e Turmas ({escola.num_series} série{escola.num_series !== 1 ? "s" : ""}, {escola.num_turmas} turma{escola.num_turmas !== 1 ? "s" : ""})
          </div>
          {!detalhes ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>Carregando...</div>
          ) : seriesComTurmas.length === 0 ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>Nenhuma série cadastrada.</div>
          ) : (
            seriesComTurmas.map(serie => (
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
            ))
          )}
        </div>
        {hist && hist.calendario_url && (
          <div style={{ padding: "14px 28px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Calendário Escolar Anexado</div>
              <div style={{ fontWeight: 600, color: "#222", fontSize: 13, marginTop: 2 }}>{hist.calendario_nome || "Arquivo"}</div>
            </div>
            <a href={hist.calendario_url} target="_blank" rel="noreferrer"
              style={{ background: "#111", color: "#fff", padding: "8px 16px", borderRadius: 4, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              Baixar
            </a>
          </div>
        )}
        <div style={{ padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <button onClick={() => gerarPDF(escola, detalhes, hist)}
            style={{ background: "#39DF18", color: "#000", border: "none", borderRadius: 4, padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Gerar PDF
          </button>
          {isAdmin && (!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              style={{ background: "#fff", color: "#e53935", border: "1.5px solid #e53935", borderRadius: 4, padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Excluir Escola
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#e53935", fontWeight: 600 }}>Confirmar exclusão?</span>
              <button onClick={() => setConfirmDelete(false)}
                style={{ background: "#f5f5f5", color: "#333", border: "none", borderRadius: 4, padding: "9px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => onDelete(escola.id)}
                style={{ background: "#e53935", color: "#fff", border: "none", borderRadius: 4, padding: "9px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjecaoMaterial({ escolas, onVoltar }) {
  const [subView, setSubView] = useState("datas");

  const porData = {};
  const semData = [];
  escolas.forEach(e => {
    if (e.data_recebimento) {
      if (!porData[e.data_recebimento]) porData[e.data_recebimento] = [];
      porData[e.data_recebimento].push(e);
    } else {
      semData.push(e);
    }
  });

  const datasOrdenadas = Object.keys(porData).sort();

  const porMes = {};
  datasOrdenadas.forEach(dt => {
    const mes = dt.substring(0, 7);
    if (!porMes[mes]) porMes[mes] = { escolas: [], alunos: 0 };
    porData[dt].forEach(e => {
      porMes[mes].escolas.push(e);
      porMes[mes].alunos += e.total_alunos || 0;
    });
  });

  const porFrete = {};
  escolas.forEach(e => {
    const f = e.tipo_frete || "Não informado";
    if (!porFrete[f]) porFrete[f] = { escolas: 0, alunos: 0 };
    porFrete[f].escolas++;
    porFrete[f].alunos += e.total_alunos || 0;
  });

  const porPrograma = {};
  escolas.forEach(e => {
    const p = e.programa || "Não informado";
    if (!porPrograma[p]) porPrograma[p] = { escolas: 0, alunos: 0 };
    porPrograma[p].escolas++;
    porPrograma[p].alunos += e.total_alunos || 0;
  });

  const totalProjetado = datasOrdenadas.reduce((acc, dt) =>
    acc + porData[dt].reduce((a, e) => a + (e.total_alunos || 0), 0), 0);

  const nomeMes = (mes) => {
    const [ano, m] = mes.split("-");
    const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${nomes[parseInt(m) - 1]}/${ano}`;
  };

  const btnStyle = (ativo) => ({
    padding: "8px 16px", borderRadius: 4, border: "none", fontFamily: font,
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    background: ativo ? "#111" : "#f0f0f0",
    color: ativo ? "#fff" : "#555",
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: font, padding: 0, marginBottom: 6 }}>
            Voltar ao Dashboard
          </button>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Projecao de Saida de Material</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Planejamento de entregas, producao e emissao de NF</div>
        </div>
        <div style={{ background: "#111", borderRadius: 8, padding: "16px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalProjetado.toLocaleString("pt-BR")}</div>
          <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", marginTop: 4 }}>Alunos Projetados</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button style={btnStyle(subView === "datas")} onClick={() => setSubView("datas")}>Por Data de Entrega</button>
        <button style={btnStyle(subView === "mensal")} onClick={() => setSubView("mensal")}>Visao Mensal</button>
        <button style={btnStyle(subView === "frete")} onClick={() => setSubView("frete")}>Por Tipo de Frete</button>
        <button style={btnStyle(subView === "programa")} onClick={() => setSubView("programa")}>Por Programa</button>
      </div>

      {subView === "datas" && (
        <div>
          {datasOrdenadas.length === 0 && semData.length === 0 && (
            <div style={{ background: "#fff", borderRadius: 8, padding: 40, textAlign: "center", color: "#aaa" }}>
              Nenhuma escola com data de recebimento cadastrada.
            </div>
          )}
          {datasOrdenadas.map(dt => {
            const lista = porData[dt];
            const totalDia = lista.reduce((a, e) => a + (e.total_alunos || 0), 0);
            const dataFmt = new Date(dt + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
            return (
              <div key={dt} style={{ background: "#fff", borderRadius: 8, marginBottom: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ background: "#111", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#39DF18", textTransform: "capitalize" }}>{dataFmt}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{lista.length} escola{lista.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalDia.toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>alunos</div>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      <th style={{ padding: "8px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Escola</th>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Programa</th>
                      <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Frete</th>
                      <th style={{ padding: "8px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((e, i) => (
                      <tr key={e.id} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 20px", fontWeight: 600, color: "#111" }}>{e.nome}</td>
                        <td style={{ padding: "10px 16px", color: "#555", fontSize: 12 }}>{e.programa || "—"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ background: e.tipo_frete === "CIF" ? "#e8f5e9" : "#fff3e0", color: e.tipo_frete === "CIF" ? "#2e7d32" : "#e65100", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            {e.tipo_frete || "—"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", fontWeight: 800, color: "#39DF18", fontSize: 15, textAlign: "right" }}>{(e.total_alunos || 0).toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid #111", background: "#f5f5f5" }}>
                      <td colSpan={3} style={{ padding: "10px 20px", fontWeight: 700, color: "#111", fontSize: 12 }}>TOTAL DO DIA</td>
                      <td style={{ padding: "10px 16px", fontWeight: 800, color: "#111", fontSize: 15, textAlign: "right" }}>{totalDia.toLocaleString("pt-BR")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
          {semData.length > 0 && (
            <div style={{ background: "#fff8e1", borderRadius: 8, padding: "16px 24px", border: "1.5px dashed #FFD902", marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#9a7c00", marginBottom: 12 }}>
                {semData.length} escola{semData.length !== 1 ? "s" : ""} sem data de recebimento definida
              </div>
              {semData.map(e => (
                <div key={e.id} style={{ fontSize: 13, color: "#555", padding: "4px 0", borderBottom: "1px solid #f0e68c", display: "flex", justifyContent: "space-between" }}>
                  <span>{e.nome}</span>
                  <span style={{ fontWeight: 700, color: "#111" }}>{(e.total_alunos || 0).toLocaleString("pt-BR")} alunos</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subView === "mensal" && (
        <div>
          {Object.keys(porMes).length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 8, padding: 40, textAlign: "center", color: "#aaa" }}>Nenhuma data cadastrada.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {Object.keys(porMes).sort().map(mes => {
                const { escolas: lista, alunos } = porMes[mes];
                const pct = totalProjetado > 0 ? (alunos / totalProjetado) * 100 : 0;
                return (
                  <div key={mes} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                    <div style={{ background: "#111", padding: "16px 20px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#39DF18" }}>{nomeMes(mes)}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{lista.length} escola{lista.length !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1 }}>{alunos.toLocaleString("pt-BR")}</div>
                      <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4, marginBottom: 12 }}>alunos projetados</div>
                      <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3 }}>
                        <div style={{ height: 6, background: "#39DF18", borderRadius: 3, width: `${pct}%` }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{pct.toFixed(0)}% do total</div>
                    </div>
                    <div style={{ padding: "0 20px 16px" }}>
                      {lista.map(e => (
                        <div key={e.id} style={{ fontSize: 12, color: "#555", padding: "3px 0", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{e.nome}</span>
                          <span style={{ fontWeight: 700 }}>{(e.total_alunos || 0).toLocaleString("pt-BR")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subView === "frete" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
            {Object.entries(porFrete).map(([frete, dados]) => (
              <div key={frete} style={{ background: frete === "CIF" ? "#e8f5e9" : frete === "FOB" ? "#fff3e0" : "#f5f5f5", borderRadius: 8, padding: "20px 24px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: frete === "CIF" ? "#2e7d32" : frete === "FOB" ? "#e65100" : "#555", lineHeight: 1 }}>{frete}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1.1, marginTop: 8 }}>{dados.alunos.toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 2 }}>alunos · {dados.escolas} escola{dados.escolas !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ background: "#111", padding: "12px 24px", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Detalhe por Escola</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  <th style={{ padding: "8px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Escola</th>
                  <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Frete</th>
                  <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Data Entrega</th>
                  <th style={{ padding: "8px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Alunos</th>
                </tr>
              </thead>
              <tbody>
                {escolas.sort((a, b) => (a.tipo_frete || "").localeCompare(b.tipo_frete || "")).map((e, i) => (
                  <tr key={e.id} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 20px", fontWeight: 600 }}>{e.nome}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ background: e.tipo_frete === "CIF" ? "#e8f5e9" : "#fff3e0", color: e.tipo_frete === "CIF" ? "#2e7d32" : "#e65100", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                        {e.tipo_frete || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#555", fontSize: 12 }}>{e.data_recebimento ? new Date(e.data_recebimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 800, textAlign: "right" }}>{(e.total_alunos || 0).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subView === "programa" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
            {Object.entries(porPrograma).map(([prog, dados]) => (
              <div key={prog} style={{ background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderTop: "4px solid #39DF18" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 8 }}>{prog}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1 }}>{dados.alunos.toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4 }}>alunos · {dados.escolas} escola{dados.escolas !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ background: "#111", padding: "12px 24px", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Detalhe por Escola</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  <th style={{ padding: "8px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Escola</th>
                  <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Programa</th>
                  <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Idioma</th>
                  <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Data Entrega</th>
                  <th style={{ padding: "8px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Alunos</th>
                </tr>
              </thead>
              <tbody>
                {escolas.sort((a, b) => (a.programa || "").localeCompare(b.programa || "")).map((e, i) => (
                  <tr key={e.id} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 20px", fontWeight: 600 }}>{e.nome}</td>
                    <td style={{ padding: "10px 16px", color: "#555", fontSize: 12 }}>{e.programa || "—"}</td>
                    <td style={{ padding: "10px 16px", color: "#555", fontSize: 12 }}>{e.idioma_material || "—"}</td>
                    <td style={{ padding: "10px 16px", color: "#555", fontSize: 12 }}>{e.data_recebimento ? new Date(e.data_recebimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 800, textAlign: "right" }}>{(e.total_alunos || 0).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [logado, setLogado]           = useState(false);
  const [equipeLogada, setEquipeLogada] = useState(null);
  const [senha, setSenha]             = useState("");
  const [erroLogin, setErroLogin]     = useState("");
  const [manterLogado, setManterLogado] = useState(false);
  const [escolas, setEscolas]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [busca, setBusca]             = useState("");
  const [ordenar, setOrdenar]         = useState("nome");
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [view, setView]               = useState("dashboard");

  useEffect(() => {
    const saved = localStorage.getItem("mm_dashboard_equipe");
    if (saved) {
      try {
        const equipe = JSON.parse(saved);
        setLogado(true);
        setEquipeLogada(equipe);
        carregarDados();
      } catch (e) {
        localStorage.removeItem("mm_dashboard_equipe");
      }
    }
  }, []); // eslint-disable-line

  function handleLogin(e) {
    e.preventDefault();
    const acesso = SENHAS[senha];
    if (acesso) {
      if (manterLogado) localStorage.setItem("mm_dashboard_equipe", JSON.stringify(acesso));
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

      const { data: history } = await supabase.from("alunado_history")
        .select("school_id, total_alunos, cluster, data_submissao")
        .order("data_submissao", { ascending: false });

      const { data: classes }       = await supabase.from("classes").select("school_id, num_alunos");
      const { data: grade_classes } = await supabase.from("grade_classes").select("id, school_id, serie");

      // De-duplicar por NOME: para cada escola única, usa o envio mais recente
      const nomesVistos = new Set();
      const schoolsUnico = [];

      (schools || []).forEach(escola => {
        const nomeNorm = (escola.nome || "").trim().toLowerCase();
        if (!nomesVistos.has(nomeNorm)) {
          nomesVistos.add(nomeNorm);
          const idsNome = (schools || [])
            .filter(s => (s.nome || "").trim().toLowerCase() === nomeNorm)
            .map(s => s.id);
          const histRecente = (history || []).find(h => idsNome.includes(h.school_id));
          const escolaRecente = histRecente
            ? (schools || []).find(s => s.id === histRecente.school_id)
            : escola;
          schoolsUnico.push(escolaRecente || escola);
        }
      });

      const escolasComDados = schoolsUnico.map(escola => {
        const hist      = (history || []).find(h => h.school_id === escola.id);
        const turmas    = (classes || []).filter(c => c.school_id === escola.id);
        const series    = (grade_classes || []).filter(g => g.school_id === escola.id);
        const totalCalc = turmas.reduce((a, c) => a + (c.num_alunos || 0), 0);
        return {
          ...escola,
          total_alunos:   hist ? hist.total_alunos   : totalCalc,
          cluster:        hist ? hist.cluster        : calcularCluster(totalCalc),
          data_submissao: hist ? hist.data_submissao : escola.created_at,
          num_series:     series.length,
          num_turmas:     turmas.length,
        };
      });

      setEscolas(escolasComDados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(schoolId) {
    await supabase.from("schools").delete().eq("id", schoolId);
    setEscolaSelecionada(null);
    carregarDados();
  }

  function handleLogout() {
    localStorage.removeItem("mm_dashboard_equipe");
    setLogado(false);
    setEquipeLogada(null);
    setView("dashboard");
  }

  const escolasFiltradas = escolas
    .filter(e => e.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      if (ordenar === "nome")   return a.nome.localeCompare(b.nome);
      if (ordenar === "alunos") return b.total_alunos - a.total_alunos;
      if (ordenar === "data")   return new Date(b.data_submissao) - new Date(a.data_submissao);
      return 0;
    });

  const totalAlunos  = escolas.reduce((a, e) => a + e.total_alunos, 0);
  const totalEscolas = escolas.length;
  const porCluster   = ["Diamond", "Gold", "Silver", "Bronze"].map(c => ({
    cluster: c,
    count:  escolas.filter(e => e.cluster === c).length,
    alunos: escolas.filter(e => e.cluster === c).reduce((a, e) => a + e.total_alunos, 0),
  }));

  if (!logado) return (
    <div style={{ minHeight: "100vh", background: "#39DF18", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "48px 56px", maxWidth: 400, width: "100%", margin: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <LogoMM size={60} cor="#111" />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111", marginTop: 8 }}>Mundo Maker</div>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Dashboard de Alunado</div>
        </div>
        <form onSubmit={handleLogin}>
          {erroLogin && (
            <div style={{ background: "#fff0f0", border: "1.5px solid #FF3B41", color: "#cc0000", borderRadius: 4, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
              {erroLogin}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Digite a senha"
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 4, fontSize: 14, fontFamily: font, boxSizing: "border-box" }} />
          </div>
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
      <div style={{ background: "#39DF18", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LogoMM size={44} cor="#111" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#000", lineHeight: 1.1 }}>Mundo Maker</div>
            <div style={{ fontSize: 11, color: "#333" }}>Dashboard de Alunado</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setView(view === "projecao" ? "dashboard" : "projecao")}
            style={{ background: view === "projecao" ? "#000" : "rgba(0,0,0,0.12)", color: "#000", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Projecao de Material
          </button>
          {equipeLogada && (
            <span style={{ background: equipeLogada.cor, color: "#000", padding: "5px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
              {equipeLogada.equipe}
            </span>
          )}
          <button onClick={handleLogout}
            style={{ background: "#000", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            SAIR
          </button>
        </div>
      </div>

      {view === "projecao" && (
        <ProjecaoMaterial escolas={escolas} onVoltar={() => setView("dashboard")} />
      )}

      {view === "dashboard" && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#666", fontSize: 16 }}>Carregando dados...</div>
          ) : (
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
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Distribuicao por Cluster</div>
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
                        {["Escola", "Programa", "Idioma", "Cluster", "Alunos", "Frete", "Data", "Acoes"].map(h => (
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
                          <td style={{ padding: "12px 16px", color: "#888", whiteSpace: "nowrap" }}>
                            {new Date(escola.data_submissao).toLocaleDateString("pt-BR")}
                          </td>
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
      )}

      <ModalDetalhes
        escola={escolaSelecionada}
        onClose={() => setEscolaSelecionada(null)}
        onDelete={handleDelete}
        isAdmin={equipeLogada?.equipe === "Admin"}
      />
    </div>
  );
}