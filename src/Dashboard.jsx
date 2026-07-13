import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const SENHAS = {
  "mm-admin-2026":      { equipe: "Admin", cor: "#39DF18" },
  "mm-producao-2026":   { equipe: "Producao", cor: "#00C7F4" },
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
  Diamond: { bg: "#00C7F4", text: "#000", emoji: "D" },
  Gold:    { bg: "#FFD902", text: "#000", emoji: "G" },
  Silver:  { bg: "#e5e5e5", text: "#111", emoji: "S" },
  Bronze:  { bg: "#FFA300", text: "#000", emoji: "B" },
};

function calcularCluster(total) {
  if (total >= 500) return "Diamond";
  if (total >= 300) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
}

const SEGMENTOS = ["Infantil", "Fundamental 1", "Fundamental 2", "Ensino Medio", "Outros"];

function removerAcentos(str) {
  return str.replace(/[áàãâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o").replace(/[úùûü]/g, "u").replace(/[ç]/g, "c")
    .replace(/[ÁÀÃÂä]/g, "a").replace(/[ÉÈÊË]/g, "e").replace(/[ÍÌÎÏ]/g, "i")
    .replace(/[ÓÒÕÔÖ]/g, "o").replace(/[ÚÙÛÜ]/g, "u").replace(/[Ç]/g, "c");
}

function categorizarSegmento(serie) {
  const s = removerAcentos((serie || "").toLowerCase());
  if (/berc|maternal|jardim|pre.escola|pre\s*escola|infantil|creche/.test(s) || /^pre$/.test(s.trim())) return "Infantil";
  if (/^[1-5][ao]?\s*ano/.test(s) || /primeiro|segundo|terceiro|quarto|quinto/.test(s)) return "Fundamental 1";
  if (/^[6-9][ao]?\s*ano/.test(s) || /sexto|setimo|oitavo|nono/.test(s)) return "Fundamental 2";
  if (/medio|media|ensino.medio|^[123][ao]\s*serie/.test(s)) return "Ensino Medio";
  return "Outros";
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
    <button class="print-btn" onclick="window.print()">Imprimir / Salvar como PDF</button>
    <div class="header">
      <h1>Mundo Maker — Formulario de Alunado</h1>
      <p>Enviado em: ${new Date(escola.data_submissao).toLocaleDateString("pt-BR")}</p>
    </div>
    <div class="section">
      <div class="sec-title">1. Dados da Escola</div>
      <div class="sec-body">
        <div class="grid">
          <div><div class="f-label">Nome</div><div class="f-val">${escola.nome}</div></div>
          <div><div class="f-label">Responsavel</div><div class="f-val">${escola.responsavel_escola || "—"}</div></div>
          <div><div class="f-label">Telefone</div><div class="f-val">${escola.telefone || "—"}</div></div>
          <div><div class="f-label">CEP</div><div class="f-val">${escola.cep || "—"}</div></div>
          <div style="grid-column:1/-1"><div class="f-label">Endereco</div><div class="f-val">${enderecoCompleto}</div></div>
          <div><div class="f-label">Tipo de Frete</div><div class="f-val">${escola.tipo_frete || "—"}</div></div>
          <div><div class="f-label">Inicio das Aulas</div><div class="f-val">${fmtDate(escola.data_inicio)}</div></div>
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
      <div class="sec-title">3. Series e Turmas</div>
      <div class="sec-body">
        <table>
          <thead><tr><th>Serie / Turma</th><th>Alunos</th><th>Professor Maker</th></tr></thead>
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
      <div class="sec-title">4. Responsavel pelo Preenchimento</div>
      <div class="sec-body">
        <div><div class="f-label">Nome</div><div class="f-val">${hist.responsavel_preenchimento || "—"}</div></div>
        ${hist.assinatura_url ? `<div style="margin-top:12px;"><div class="f-label">Assinatura</div><img class="sig-img" src="${hist.assinatura_url}" /></div>` : ""}
      </div>
    </div>
    ` : ""}
    ${hist && hist.calendario_url ? `
    <div class="section">
      <div class="sec-title">5. Calendario Escolar</div>
      <div class="sec-body">
        <div class="f-label">Arquivo Anexado</div>
        <div class="f-val" style="margin-top:4px;">${hist.calendario_nome || "Calendario"}</div>
        <a href="${hist.calendario_url}" target="_blank" style="display:inline-block;margin-top:8px;color:#0066cc;font-size:12px;">Abrir arquivo</a>
      </div>
    </div>
    ` : ""}
    </body></html>
  `);
  win.document.close();
}

function gerarPDFCiclo(ciclo) {
  const snapshot = ciclo.snapshot || [];
  const fmtDate = (val) => val ? new Date(val).toLocaleDateString("pt-BR") : "—";
  const porCluster = ["Diamond", "Gold", "Silver", "Bronze"].map(c => ({
    cluster: c,
    label: CLUSTER_PT[c],
    count: snapshot.filter(e => e.cluster === c).length,
    alunos: snapshot.filter(e => e.cluster === c).reduce((a, e) => a + (e.total_alunos || 0), 0),
  }));
  const escolasHtml = snapshot.map((e, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}">
      <td style="padding:8px 14px;font-weight:600;">${e.nome}</td>
      <td style="padding:8px 14px;">${e.programa || "—"}</td>
      <td style="padding:8px 14px;">${CLUSTER_PT[e.cluster] || e.cluster || "—"}</td>
      <td style="padding:8px 14px;">${e.tipo_frete || "—"}</td>
      <td style="padding:8px 14px;font-weight:700;text-align:right;">${(e.total_alunos || 0).toLocaleString("pt-BR")}</td>
    </tr>
  `).join("");

  const win = window.open("", "_blank");
  win.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Relatorio — ${ciclo.nome}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; max-width: 900px; margin: 0 auto; }
      .print-btn { background: #39DF18; border: none; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; border-radius: 4px; margin-bottom: 20px; }
      .header { background: #111; color: #fff; padding: 24px 28px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
      .header h1 { font-size: 22px; font-weight: 800; }
      .header .sub { font-size: 12px; color: #aaa; margin-top: 4px; }
      .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
      .kpi { border-radius: 6px; padding: 20px 24px; }
      .kpi-num { font-size: 40px; font-weight: 800; line-height: 1; }
      .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
      .cluster-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
      .cluster-card { border-radius: 6px; padding: 16px; }
      .cluster-num { font-size: 28px; font-weight: 800; }
      .cluster-label { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
      .cluster-alunos { font-size: 11px; margin-top: 4px; opacity: 0.75; }
      .section { border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
      .sec-title { background: #f5f5f5; padding: 10px 18px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { padding: 9px 14px; background: #f0f0f0; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #777; text-align: left; border-bottom: 1px solid #e5e5e5; }
      td { border-bottom: 1px solid #f0f0f0; }
      @media print { .print-btn { display: none; } }
    </style>
    </head><body>
    <button class="print-btn" onclick="window.print()">Imprimir / Salvar como PDF</button>
    <div class="header">
      <div>
        <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Mundo Maker — Relatorio de Ciclo</div>
        <h1>${ciclo.nome}</h1>
        <div class="sub">${fmtDate(ciclo.data_inicio)} ate ${fmtDate(ciclo.data_encerramento)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#aaa;">Total de escolas</div>
        <div style="font-size:28px;font-weight:800;color:#39DF18;">${ciclo.total_escolas || snapshot.length}</div>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi" style="background:#39DF18;">
        <div class="kpi-num">${(ciclo.total_alunos || 0).toLocaleString("pt-BR")}</div>
        <div class="kpi-label">Total de Alunos no Ciclo</div>
      </div>
      <div class="kpi" style="background:#f5f5f5;">
        <div class="kpi-num">${ciclo.total_escolas || snapshot.length}</div>
        <div class="kpi-label">Escolas Cadastradas</div>
      </div>
    </div>
    <div class="cluster-grid">
      ${porCluster.map(c => `
        <div class="cluster-card" style="background:${CLUSTER_INFO[c.cluster].bg};color:${CLUSTER_INFO[c.cluster].text};">
          <div class="cluster-num">${c.count}</div>
          <div class="cluster-label">${c.label}</div>
          <div class="cluster-alunos">${c.alunos.toLocaleString("pt-BR")} alunos</div>
        </div>
      `).join("")}
    </div>
    ${snapshot.length > 0 ? `
    <div class="section">
      <div class="sec-title">Escolas do Ciclo (${snapshot.length})</div>
      <table>
        <thead><tr><th>Escola</th><th>Programa</th><th>Cluster</th><th>Frete</th><th style="text-align:right;">Alunos</th></tr></thead>
        <tbody>${escolasHtml}</tbody>
        <tfoot>
          <tr style="background:#111;">
            <td colspan="4" style="padding:10px 14px;font-weight:700;color:#fff;">TOTAL</td>
            <td style="padding:10px 14px;font-weight:800;color:#39DF18;text-align:right;">${(ciclo.total_alunos || 0).toLocaleString("pt-BR")}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ` : ""}
    </body></html>
  `);
  win.document.close();
}

function ModalEncerrarCiclo({ cicloAtivo, totalAlunos, totalEscolas, escolas, onConfirmar, onClose }) {
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const now = new Date();
    const semestre = now.getMonth() < 6 ? "1" : "2";
    setNome(`Ciclo ${semestre}S ${now.getFullYear()}`);
  }, []);

  const porCluster = ["Diamond", "Gold", "Silver", "Bronze"].map(c => ({
    cluster: c,
    count:  escolas.filter(e => e.cluster === c).length,
    alunos: escolas.filter(e => e.cluster === c).reduce((a, e) => a + (e.total_alunos || 0), 0),
  }));

  async function handleConfirmar() {
    if (!nome.trim() || carregando) return;
    setCarregando(true);
    await onConfirmar(nome.trim());
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20, fontFamily: font }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 520, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
        <div style={{ background: "#e53935", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Encerrar Ciclo</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>Os dados serao salvos no historico e os contadores zerados</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>x</button>
        </div>
        <div style={{ padding: "20px 28px", background: "#fafafa", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Resumo do Ciclo Atual</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div style={{ background: "#111", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalAlunos.toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", marginTop: 4 }}>Total de Alunos</div>
            </div>
            <div style={{ background: "#fff", border: "2px solid #f0f0f0", borderRadius: 8, padding: "16px 20px" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#111", lineHeight: 1 }}>{totalEscolas}</div>
              <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", marginTop: 4 }}>Escolas Cadastradas</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {porCluster.filter(c => c.count > 0).map(({ cluster, count, alunos }) => (
              <div key={cluster} style={{ background: CLUSTER_INFO[cluster].bg, color: CLUSTER_INFO[cluster].text, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700 }}>
                {CLUSTER_PT[cluster]}: {count} escola{count !== 1 ? "s" : ""} - {alunos.toLocaleString("pt-BR")} alunos
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "20px 28px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 8 }}>Nome do Ciclo</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Ciclo 1S 2025"
            style={{ width: "100%", padding: "11px 14px", border: "2px solid #ddd", borderRadius: 6, fontSize: 14, fontFamily: font, boxSizing: "border-box", marginBottom: 14 }}
          />
          <div style={{ background: "#fff8e1", border: "1.5px solid #FFD902", borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#7a6000", lineHeight: 1.5 }}>
            Apos encerrar, os dados serao arquivados no historico e os contadores zerados para um novo ciclo. Esta acao nao pode ser desfeita.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={handleConfirmar} disabled={carregando || !nome.trim()}
              style={{ flex: 2, padding: "12px", background: carregando || !nome.trim() ? "#ccc" : "#e53935", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 800, fontFamily: font, cursor: carregando || !nome.trim() ? "not-allowed" : "pointer" }}>
              {carregando ? "Encerrando..." : "Encerrar e Iniciar Novo Ciclo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalEscolaHistorico({ escola, onClose }) {
  const [envios, setEnvios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [envioSelecionado, setEnvioSelecionado] = useState(null);

  useEffect(() => {
    if (!escola) return;
    async function buscar() {
      setLoading(true);
      const { data: histories } = await supabase
        .from("alunado_history")
        .select("*")
        .eq("school_id", escola.id)
        .order("data_submissao", { ascending: false });

      const [{ data: gc }, { data: cl }] = await Promise.all([
        supabase.from("grade_classes").select("id, serie, ordem").eq("school_id", escola.id).order("ordem"),
        supabase.from("classes").select("grade_class_id, turma, num_alunos, professor_maker").eq("school_id", escola.id),
      ]);
      const items = (histories || []).map(h => ({ ...h, series: gc || [], turmas: cl || [] }));
      setEnvios(items);
      setLoading(false);
    }
    buscar();
  }, [escola]); // eslint-disable-line

  if (!escola) return null;
  const clus = escola.cluster || "Bronze";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 20, fontFamily: font }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ background: "#111", padding: "18px 24px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{escola.nome}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ background: CLUSTER_INFO[clus]?.bg, color: CLUSTER_INFO[clus]?.text, padding: "2px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>{CLUSTER_PT[clus]}</span>
              <span style={{ color: "#39DF18", fontWeight: 700, fontSize: 13 }}>{(escola.total_alunos || 0).toLocaleString("pt-BR")} alunos</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer" }}>x</button>
        </div>

        <div style={{ padding: "16px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Carregando formularios...</div>
          ) : envios.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Nenhum formulario encontrado.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {envios.map((env, idx) => {
                const expanded = envioSelecionado === idx;
                const totalEnv = env.total_alunos || env.turmas.reduce((a, t) => a + (t.num_alunos || 0), 0);
                const seriesComTurmas = env.series.map(s => ({ ...s, turmas: env.turmas.filter(t => t.grade_class_id === s.id) }));
                return (
                  <div key={env.id} style={{ border: "1.5px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ background: "#f9f9f9", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
                          Envio #{envios.length - idx} — {new Date(env.data_submissao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                          {env.responsavel_preenchimento && `Resp: ${env.responsavel_preenchimento} · `}{totalEnv.toLocaleString("pt-BR")} alunos
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => gerarPDF(escola, { series: env.series, turmas: env.turmas }, env)}
                          style={{ background: "#39DF18", color: "#000", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                          PDF
                        </button>
                        {env.calendario_url && (
                          <a href={env.calendario_url} target="_blank" rel="noreferrer"
                            style={{ background: "#00C7F4", color: "#000", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer", textDecoration: "none" }}>
                            Calendario
                          </a>
                        )}
                        <button onClick={() => setEnvioSelecionado(expanded ? null : idx)}
                          style={{ background: "#111", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                          {expanded ? "Fechar" : "Ver Series"}
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ padding: "14px 18px", borderTop: "1px solid #eee" }}>
                        {seriesComTurmas.map(serie => (
                          <div key={serie.id} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#111", background: "#f5f5f5", padding: "5px 10px", borderRadius: 4, marginBottom: 6 }}>{serie.serie}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 8 }}>
                              {serie.turmas.map((t, i) => (
                                <div key={i} style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 6, padding: "7px 12px", fontSize: 12, minWidth: 100 }}>
                                  <div style={{ fontWeight: 700, color: "#111" }}>Turma {t.turma}</div>
                                  <div style={{ color: "#39DF18", fontWeight: 800, fontSize: 15 }}>{t.num_alunos}</div>
                                  {t.professor_maker && <div style={{ color: "#888", fontSize: 10, marginTop: 2 }}>{t.professor_maker}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {env.assinatura_url && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Assinatura</div>
                            <img src={env.assinatura_url} alt="assinatura" style={{ maxHeight: 60, border: "1px solid #ddd", borderRadius: 4 }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalCicloDetalhe({ ciclo, onClose }) {
  const snapshot = ciclo.snapshot || [];
  const fmtDate = (val) => val ? new Date(val).toLocaleDateString("pt-BR") : "—";
  const [escolaHist, setEscolaHist] = useState(null);
  const porCluster = ["Diamond", "Gold", "Silver", "Bronze"].map(c => ({
    cluster: c,
    count:  snapshot.filter(e => e.cluster === c).length,
    alunos: snapshot.filter(e => e.cluster === c).reduce((a, e) => a + (e.total_alunos || 0), 0),
  }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20, fontFamily: font }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ background: "#111", padding: "20px 28px", borderRadius: "10px 10px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{ciclo.nome}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{fmtDate(ciclo.data_inicio)} — {fmtDate(ciclo.data_encerramento)}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>x</button>
        </div>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#111", borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{(ciclo.total_alunos || 0).toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", marginTop: 4 }}>Total de Alunos</div>
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#111", lineHeight: 1 }}>{ciclo.total_escolas || snapshot.length}</div>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4 }}>Escolas Cadastradas</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {porCluster.map(({ cluster, count, alunos }) => (
              <div key={cluster} style={{ background: CLUSTER_INFO[cluster].bg, color: CLUSTER_INFO[cluster].text, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{CLUSTER_PT[cluster]}</div>
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.75 }}>{alunos.toLocaleString("pt-BR")} alunos</div>
              </div>
            ))}
          </div>
        </div>
        {snapshot.length > 0 && (
          <div style={{ padding: "20px 28px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
              Escolas do Ciclo ({snapshot.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    {["Escola", "Programa", "Cluster", "Frete", "Alunos", ""].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.map((e, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{e.nome}</td>
                      <td style={{ padding: "10px 14px", color: "#555", fontSize: 12 }}>{e.programa || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: CLUSTER_INFO[e.cluster]?.bg || "#eee", color: CLUSTER_INFO[e.cluster]?.text || "#000", padding: "2px 8px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                          {CLUSTER_PT[e.cluster] || e.cluster || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: e.tipo_frete === "CIF" ? "#e8f5e9" : "#fff3e0", color: e.tipo_frete === "CIF" ? "#2e7d32" : "#e65100", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {e.tipo_frete || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>{(e.total_alunos || 0).toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => setEscolaHist(e)}
                          style={{ background: "#111", color: "#fff", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer", whiteSpace: "nowrap" }}>
                          Ver PDFs
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #111", background: "#f5f5f5" }}>
                    <td colSpan={4} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 12 }}>TOTAL DO CICLO</td>
                    <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>{(ciclo.total_alunos || 0).toLocaleString("pt-BR")}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => gerarPDFCiclo(ciclo)}
            style={{ background: "#39DF18", color: "#000", border: "none", borderRadius: 4, padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Gerar PDF do Ciclo
          </button>
        </div>
      </div>
      {escolaHist && <ModalEscolaHistorico escola={escolaHist} onClose={() => setEscolaHist(null)} />}
    </div>
  );
}

function HistoricoCiclos({ ciclos, onVoltar }) {
  const [cicloSelecionado, setCicloSelecionado] = useState(null);
  const fmtDate = (val) => val ? new Date(val).toLocaleDateString("pt-BR") : "—";
  const totalGeralAlunos  = ciclos.reduce((a, c) => a + (c.total_alunos || 0), 0);
  const totalGeralEscolas = ciclos.reduce((a, c) => a + (c.total_escolas || 0), 0);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px", fontFamily: font }}>
      <div style={{ marginBottom: 28 }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: font, padding: 0, marginBottom: 8, display: "block" }}>
          Voltar ao Dashboard
        </button>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>Historico de Ciclos</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{ciclos.length} ciclo{ciclos.length !== 1 ? "s" : ""} encerrado{ciclos.length !== 1 ? "s" : ""}</div>
      </div>

      {ciclos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <div style={{ background: "#111", borderRadius: 8, padding: "22px 28px" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalGeralAlunos.toLocaleString("pt-BR")}</div>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", marginTop: 6 }}>Total Historico de Alunos</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 8, padding: "22px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: "#111", lineHeight: 1 }}>{totalGeralEscolas}</div>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 6 }}>Total Historico de Escolas</div>
          </div>
        </div>
      )}

      {ciclos.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 8, padding: "60px 40px", textAlign: "center", color: "#aaa", fontSize: 15, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          Nenhum ciclo encerrado ainda. Os ciclos aparecerao aqui apos serem finalizados.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {ciclos.map(ciclo => {
            const snapshot = ciclo.snapshot || [];
            const porCluster = ["Diamond", "Gold", "Silver", "Bronze"].map(c => ({
              cluster: c,
              count: snapshot.filter(e => e.cluster === c).length,
            }));
            return (
              <div key={ciclo.id} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ background: "#111", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{ciclo.nome}</div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>{fmtDate(ciclo.data_inicio)} — {fmtDate(ciclo.data_encerramento)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{(ciclo.total_alunos || 0).toLocaleString("pt-BR")}</div>
                      <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>alunos</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{ciclo.total_escolas || snapshot.length}</div>
                      <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>escolas</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {porCluster.filter(c => c.count > 0).map(({ cluster, count }) => (
                      <span key={cluster} style={{ background: CLUSTER_INFO[cluster].bg, color: CLUSTER_INFO[cluster].text, padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                        {CLUSTER_PT[cluster]}: {count}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => gerarPDFCiclo(ciclo)}
                      style={{ background: "#39DF18", color: "#000", border: "none", borderRadius: 4, padding: "7px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                      Gerar PDF
                    </button>
                    <button onClick={() => setCicloSelecionado(ciclo)}
                      style={{ background: "#111", color: "#fff", border: "none", borderRadius: 4, padding: "7px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cicloSelecionado && (
        <ModalCicloDetalhe ciclo={cicloSelecionado} onClose={() => setCicloSelecionado(null)} />
      )}
    </div>
  );
}

function EscolasDashboard({ onVoltar }) {
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [escolaSel, setEscolaSel] = useState(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const [{ data: schools }, { data: histories }, { data: allGC }, { data: allCL }] = await Promise.all([
        supabase.from("schools").select("*").order("nome"),
        supabase.from("alunado_history").select("school_id, total_alunos, cluster, data_submissao").order("data_submissao", { ascending: false }),
        supabase.from("grade_classes").select("id, school_id, serie"),
        supabase.from("classes").select("school_id, grade_class_id, num_alunos"),
      ]);

      const nomesVistos = new Set();
      const resultado = [];

      (schools || []).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")).forEach(escola => {
        const nomeNorm = (escola.nome || "").trim().toLowerCase();
        if (nomesVistos.has(nomeNorm)) return;
        nomesVistos.add(nomeNorm);

        const idsNome = (schools || []).filter(s => (s.nome || "").trim().toLowerCase() === nomeNorm).map(s => s.id);
        const histRecente = (histories || []).find(h => idsNome.includes(h.school_id));
        const idAtual = histRecente ? histRecente.school_id : escola.id;
        const dadosEscola = (schools || []).find(s => s.id === idAtual) || escola;

        const turmas = (allCL || []).filter(c => c.school_id === idAtual);
        const series = (allGC || []).filter(g => g.school_id === idAtual);

        const segMap = {};
        SEGMENTOS.forEach(s => { segMap[s] = 0; });
        series.forEach(gc => {
          const seg = categorizarSegmento(gc.serie);
          const turmasGC = turmas.filter(t => t.grade_class_id === gc.id);
          segMap[seg] = (segMap[seg] || 0) + turmasGC.reduce((a, t) => a + (t.num_alunos || 0), 0);
        });

        const totalCalc = turmas.reduce((a, c) => a + (c.num_alunos || 0), 0);
        resultado.push({
          ...dadosEscola,
          total_alunos:   histRecente ? histRecente.total_alunos : totalCalc,
          cluster:        histRecente ? histRecente.cluster : calcularCluster(totalCalc),
          data_submissao: histRecente ? histRecente.data_submissao : dadosEscola.created_at,
          segmentos:      segMap,
        });
      });

      setEscolas(resultado);
      setLoading(false);
    }
    carregar();
  }, []);

  const filtradas = escolas.filter(e => (e.nome || "").toLowerCase().includes(busca.toLowerCase()));
  const totalGeral = escolas.reduce((a, e) => a + (e.total_alunos || 0), 0);
  const segTotais = {};
  SEGMENTOS.forEach(s => { segTotais[s] = escolas.reduce((a, e) => a + (e.segmentos?.[s] || 0), 0); });

  const SEG_COLORS = {
    "Infantil":       "#00C7F4",
    "Fundamental 1":  "#39DF18",
    "Fundamental 2":  "#FFD902",
    "Ensino Medio":   "#FFA300",
    "Outros":         "#ccc",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px", fontFamily: font }}>
      <div style={{ marginBottom: 28 }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: font, padding: 0, marginBottom: 8, display: "block" }}>
          Voltar ao Dashboard
        </button>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>Escolas</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{escolas.length} escola{escolas.length !== 1 ? "s" : ""} cadastrada{escolas.length !== 1 ? "s" : ""} (todos os ciclos)</div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 15 }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "#111", borderRadius: 8, padding: "22px 28px" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalGeral.toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", marginTop: 6 }}>Total de Alunos (todos os ciclos)</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 8, padding: "22px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: "#111", lineHeight: 1 }}>{escolas.length}</div>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 6 }}>Escolas Unicas</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
            {SEGMENTOS.filter(s => s !== "Outros" || segTotais["Outros"] > 0).map(seg => (
              <div key={seg} style={{ background: "#fff", borderRadius: 8, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderTop: `4px solid ${SEG_COLORS[seg]}` }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1 }}>{(segTotais[seg] || 0).toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4, letterSpacing: 0.5 }}>{seg}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: "#111", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 1.5 }}>Lista de Escolas</div>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar escola..."
                style={{ padding: "7px 12px", borderRadius: 4, border: "none", fontSize: 13, fontFamily: font, width: 220 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    {["Escola", "Cluster", "Total", "Infantil", "Fund. 1", "Fund. 2", "Ens. Medio", "Programa", ""].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: h === "Total" || h === "Infantil" || h === "Fund. 1" || h === "Fund. 2" || h === "Ens. Medio" ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>Nenhuma escola encontrada.</td></tr>
                  ) : filtradas.map((e, i) => (
                    <tr key={e.id} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#111", maxWidth: 200 }}>{e.nome}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: CLUSTER_INFO[e.cluster]?.bg || "#eee", color: CLUSTER_INFO[e.cluster]?.text || "#000", padding: "2px 8px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                          {CLUSTER_PT[e.cluster] || e.cluster}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>{(e.total_alunos || 0).toLocaleString("pt-BR")}</td>
                      {["Infantil", "Fundamental 1", "Fundamental 2", "Ensino Medio"].map(seg => (
                        <td key={seg} style={{ padding: "10px 14px", textAlign: "right", color: e.segmentos?.[seg] > 0 ? "#111" : "#ccc" }}>
                          {e.segmentos?.[seg] > 0 ? (e.segmentos[seg]).toLocaleString("pt-BR") : "—"}
                        </td>
                      ))}
                      <td style={{ padding: "10px 14px", color: "#666", fontSize: 12 }}>{e.programa || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => setEscolaSel(e)}
                          style={{ background: "#111", color: "#fff", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 11, fontWeight: 700, fontFamily: font, cursor: "pointer", whiteSpace: "nowrap" }}>
                          Formularios
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #111", background: "#f5f5f5" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 12 }}>TOTAL</td>
                    <td />
                    <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>{totalGeral.toLocaleString("pt-BR")}</td>
                    {["Infantil", "Fundamental 1", "Fundamental 2", "Ensino Medio"].map(seg => (
                      <td key={seg} style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right" }}>{(segTotais[seg] || 0).toLocaleString("pt-BR")}</td>
                    ))}
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {escolaSel && <ModalEscolaHistorico escola={escolaSel} onClose={() => setEscolaSel(null)} />}
    </div>
  );
}

function InspiramakerDashboard({ onVoltar }) {
  const [dados, setDados]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState("");
  const [projetos, setProjetos] = useState({});

  const TURMA_LABELS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"];

  function calcularComplementar(projeto, serie, numSalas) {
    const p         = removerAcentos((projeto || "").toLowerCase().trim()).replace(/[^a-z0-9 ]/g, "").trim();
    const base      = serie.turmas.reduce((a, t) => a + Math.ceil((t.num_alunos || 0) / 4), 0);
    const numTurmas = serie.turmas.length;
    if (p === "nascer do sol"           || p === "here comes the sun")   return numSalas || 0;
    if (p === "nossa agua"              || p === "sustainable me")        return 1;
    if (p === "dinossauros"             || p === "fossil hunters")        return Math.ceil(base / 5);
    if (p === "medalhoes"               || p === "ancient civilization")  return Math.ceil(base / 7);
    if (p === "telegrafo"               || p === "can you hear me")       return numTurmas;
    if (p === "navegadores"             || p === "sea explorers")         return 1;
    if (p.includes("atraves da lente") || p === "light camera action")   return Math.ceil(base / 7);
    if (p === "comunicamao"             || p === "lend a hand")           return numTurmas;
    if (p.includes("tres porquinhos")  || p === "three maker piggies")   return numSalas || 0;
    if (p === "locomotiva"              || p === "all aboard")            return numTurmas;
    if (p === "enigma"                  || p === "enigmaker")             return numSalas || 0;
    return 0;
  }

  async function salvarProjeto(gcId, valor) {
    await supabase.from("grade_classes").update({ projeto: valor }).eq("id", gcId);
  }

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const { data: schools } = await supabase.from("schools").select("*")
        .eq("programa", "MakerLab Oficina").order("nome");

      const { data: histories } = await supabase.from("alunado_history")
        .select("school_id, data_submissao").order("data_submissao", { ascending: false });

      const nomesVistos = new Set();
      const escolasUnicas = [];
      (schools || []).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")).forEach(escola => {
        const nomeNorm = (escola.nome || "").trim().toLowerCase();
        if (nomesVistos.has(nomeNorm)) return;
        nomesVistos.add(nomeNorm);
        const idsNome = (schools || []).filter(s => (s.nome || "").trim().toLowerCase() === nomeNorm).map(s => s.id);
        const histRecente = (histories || []).find(h => idsNome.includes(h.school_id));
        const idAtual = histRecente ? histRecente.school_id : escola.id;
        escolasUnicas.push((schools || []).find(s => s.id === idAtual) || escola);
      });

      if (escolasUnicas.length === 0) { setDados([]); setLoading(false); return; }

      const ids = escolasUnicas.map(e => e.id);
      const [{ data: allGC }, { data: allCL }] = await Promise.all([
        supabase.from("grade_classes").select("id, school_id, serie, ordem, projeto").in("school_id", ids).order("ordem"),
        supabase.from("classes").select("grade_class_id, school_id, turma, num_alunos").in("school_id", ids).order("turma"),
      ]);

      const projetosInit = {};
      (allGC || []).forEach(gc => { if (gc.projeto) projetosInit[gc.id] = gc.projeto; });
      setProjetos(projetosInit);

      const resultado = escolasUnicas.map(escola => {
        const gc = (allGC || []).filter(g => g.school_id === escola.id);
        const cl = (allCL || []).filter(c => c.school_id === escola.id);
        const series = gc.map(s => ({
          gcId: s.id,
          serie: s.serie,
          turmas: cl.filter(t => t.grade_class_id === s.id).sort((a, b) => (a.turma || "").localeCompare(b.turma || "")),
        }));
        return { id: escola.id, nome: escola.nome, idioma: escola.idioma_material || "Portugues", numSalas: escola.num_salas_maker || 0, series };
      // Só exibe escolas que têm pelo menos 1 aluno no ciclo atual
      }).filter(e => e.series.some(s => s.turmas.some(t => (t.num_alunos || 0) > 0)));

      setDados(resultado);
      setLoading(false);
    }
    carregar();
  }, []);

  const filtrados = dados.filter(e => (e.nome || "").toLowerCase().includes(busca.toLowerCase()));
  const maxTurmas = Math.max(1, ...filtrados.flatMap(e => e.series.map(s => s.turmas.length)));
  const labels    = TURMA_LABELS.slice(0, maxTurmas);

  let totalAlunosGeral = 0;
  let totalBaseGeral   = 0;
  let totalProfGeral   = 0;
  let totalCompGeral   = 0;
  filtrados.forEach(e => e.series.forEach(s => {
    totalAlunosGeral += s.turmas.reduce((a, t) => a + (t.num_alunos || 0), 0);
    totalBaseGeral   += s.turmas.reduce((a, t) => a + Math.ceil((t.num_alunos || 0) / 4), 0);
    totalProfGeral   += 1;
    const comp = calcularComplementar(projetos[s.gcId] || "", s, e.numSalas);
    if (typeof comp === "number") totalCompGeral += comp;
  }));

  function gerarPlanilha() {
    const headerCols = TURMA_LABELS.slice(0, maxTurmas).map(l =>
      `<th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:center;">${l}</th>`
    ).join("");

    let rows = "";
    filtrados.forEach(escola => {
      escola.series.forEach((s, si) => {
        const cols = TURMA_LABELS.slice(0, maxTurmas).map((_, i) => {
          const t = s.turmas[i];
          return `<td style="text-align:center;padding:5px 10px;border:1px solid #ddd;">${t ? t.num_alunos : ""}</td>`;
        }).join("");
        const tot  = s.turmas.reduce((a, t) => a + (t.num_alunos || 0), 0);
        const base = s.turmas.reduce((a, t) => a + Math.ceil((t.num_alunos || 0) / 4), 0);
        const proj = projetos[s.gcId] || "";
        const comp = calcularComplementar(proj, s, escola.numSalas);
        rows += `
          <tr style="background:${si % 2 === 0 ? "#fff" : "#f9f9f9"}">
            <td style="padding:5px 10px;border:1px solid #ddd;">${si === 0 ? escola.idioma : ""}</td>
            <td style="padding:5px 10px;border:1px solid #ddd;font-weight:${si === 0 ? "700" : "400"}">${si === 0 ? escola.nome : ""}</td>
            <td style="padding:5px 10px;border:1px solid #ddd;">${proj}</td>
            <td style="text-align:center;padding:5px 10px;border:1px solid #ddd;">${s.serie}</td>
            ${cols}
            <td style="text-align:center;font-weight:700;padding:5px 10px;border:1px solid #ddd;">${tot}</td>
            <td style="text-align:center;font-weight:800;padding:5px 10px;border:1px solid #ddd;background:#e8f5e9;">${base}</td>
            <td style="text-align:center;padding:5px 10px;border:1px solid #ddd;">1</td>
            <td style="text-align:center;font-weight:800;padding:5px 10px;border:1px solid #ddd;background:#fff3e0;">${comp}</td>
          </tr>`;
      });
    });

    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Inspiramaker — MakerLab Oficina</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
        .print-btn { background: #39DF18; border: none; padding: 8px 18px; font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 4px; margin-bottom: 14px; }
        h1 { font-size: 15px; margin-bottom: 3px; }
        p { font-size: 10px; color: #888; margin-bottom: 14px; }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        @media print { .print-btn { display: none; } }
      </style>
      </head><body>
      <button class="print-btn" onclick="window.print()">Imprimir / Salvar como PDF</button>
      <h1>Mundo Maker — Inspiramaker | MakerLab Oficina</h1>
      <p>Gerado em ${new Date().toLocaleDateString("pt-BR")} — 1 caixa a cada 4 alunos (arredondado para cima)</p>
      <table>
        <thead>
          <tr>
            <th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:left;">Idioma</th>
            <th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:left;">Escola/Turma</th>
            <th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:left;">Projeto</th>
            <th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:center;">Ano Escolar</th>
            ${headerCols}
            <th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:center;">Alunado Total</th>
            <th style="padding:6px 10px;background:#39DF18;color:#000;border:1px solid #333;text-align:center;font-style:italic;">Base</th>
            <th style="padding:6px 10px;background:#111;color:#fff;border:1px solid #333;text-align:center;">Professor</th>
            <th style="padding:6px 10px;background:#FFA300;color:#000;border:1px solid #333;text-align:center;font-style:italic;">Complementar</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#111;">
            <td colspan="4" style="padding:8px 10px;color:#fff;font-weight:700;border:1px solid #333;">TOTAL GERAL</td>
            ${TURMA_LABELS.slice(0, maxTurmas).map(() => `<td style="border:1px solid #333;"></td>`).join("")}
            <td style="padding:8px 10px;color:#fff;font-weight:800;text-align:center;border:1px solid #333;">${totalAlunosGeral}</td>
            <td style="padding:8px 10px;color:#39DF18;font-weight:800;text-align:center;border:1px solid #333;">${totalBaseGeral}</td>
            <td style="padding:8px 10px;color:#aaa;text-align:center;border:1px solid #333;">${totalProfGeral}</td>
            <td style="padding:8px 10px;color:#FFA300;font-weight:800;text-align:center;border:1px solid #333;">${totalCompGeral}</td>
          </tr>
        </tfoot>
      </table>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 20px", fontFamily: font }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: font, padding: 0, marginBottom: 8, display: "block" }}>
          Voltar ao Dashboard
        </button>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>Inspiramaker</div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>MakerLab Oficina — 1 caixa para cada grupo de 4 alunos (arredondado para cima)</div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 15 }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "#111", borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalBaseGeral.toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", marginTop: 4 }}>Caixas Inspiramaker</div>
            </div>
            <div style={{ background: "#FFA300", borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#000", lineHeight: 1 }}>{totalCompGeral.toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: "#333", textTransform: "uppercase", marginTop: 4 }}>Total Complementar</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#111", lineHeight: 1 }}>{totalAlunosGeral.toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4 }}>Total de Alunos</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#111", lineHeight: 1 }}>{filtrados.length}</div>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4 }}>Escolas MakerLab</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <div style={{ background: "#111", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 1.5 }}>Tabela de Producao</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar escola..."
                  style={{ padding: "7px 12px", borderRadius: 4, border: "none", fontSize: 13, fontFamily: font, width: 200 }} />
                <button onClick={gerarPlanilha}
                  style={{ background: "#39DF18", color: "#000", border: "none", borderRadius: 4, padding: "7px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer", whiteSpace: "nowrap" }}>
                  Gerar Planilha
                </button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" }}>Idioma</th>
                    <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" }}>Escola / Turma</th>
                    <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" }}>Projeto</th>
                    <th style={{ padding: "8px 14px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" }}>Ano Escolar</th>
                    {labels.map(l => (
                      <th key={l} style={{ padding: "8px 6px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", width: 44 }}>{l}</th>
                    ))}
                    <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" }}>Total</th>
                    <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#39DF18", textTransform: "uppercase", whiteSpace: "nowrap", fontStyle: "italic" }}>Base</th>
                    <th style={{ padding: "8px 14px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>Prof.</th>
                    <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#FFA300", textTransform: "uppercase", whiteSpace: "nowrap", fontStyle: "italic" }}>Compl.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr><td colSpan={5 + labels.length} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>Nenhuma escola MakerLab Oficina cadastrada.</td></tr>
                  ) : filtrados.map(escola =>
                    escola.series.map((s, si) => {
                      const tot    = s.turmas.reduce((a, t) => a + (t.num_alunos || 0), 0);
                      const base   = s.turmas.reduce((a, t) => a + Math.ceil((t.num_alunos || 0) / 4), 0);
                      const comp   = calcularComplementar(projetos[s.gcId] || "", s, escola.numSalas);
                      const primeiro = si === 0;
                      const ultimo   = si === escola.series.length - 1;
                      return (
                        <tr key={`${escola.id}-${s.serie}`} style={{ borderTop: primeiro ? "2px solid #ddd" : "1px solid #f0f0f0", background: si % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "8px 14px", color: "#555", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>{primeiro ? escola.idioma : ""}</td>
                          <td style={{ padding: "8px 14px", fontWeight: primeiro ? 700 : 400, color: "#111", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>{primeiro ? escola.nome : ""}</td>
                          <td style={{ padding: "4px 8px", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>
                            <input
                              value={projetos[s.gcId] || ""}
                              onChange={e => setProjetos(p => ({ ...p, [s.gcId]: e.target.value }))}
                              onBlur={e => salvarProjeto(s.gcId, e.target.value)}
                              placeholder="Digite o projeto..."
                              style={{ width: 140, padding: "5px 8px", border: "1.5px solid #ddd", borderRadius: 4, fontSize: 11, fontFamily: font, background: "#fff" }}
                            />
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", color: "#555", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>{s.serie}</td>
                          {labels.map((_, i) => {
                            const t = s.turmas[i];
                            return (
                              <td key={i} style={{ padding: "8px 4px", textAlign: "center", width: 44, color: t ? "#111" : "#ddd", fontWeight: t ? 600 : 400, borderBottom: ultimo ? "2px solid #ddd" : "none" }}>
                                {t ? t.num_alunos : "—"}
                              </td>
                            );
                          })}
                          <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, borderBottom: ultimo ? "2px solid #ddd" : "none" }}>{tot}</td>
                          <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 800, color: "#39DF18", fontSize: 14, background: "#f9fff5", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>{base}</td>
                          <td style={{ padding: "8px 14px", textAlign: "center", color: "#888", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>1</td>
                          <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 800, color: "#FFA300", fontSize: 14, background: "#fff8f0", borderBottom: ultimo ? "2px solid #ddd" : "none" }}>{comp}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filtrados.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#111" }}>
                      <td colSpan={4} style={{ padding: "10px 14px", fontWeight: 700, color: "#fff", fontSize: 12 }}>TOTAL GERAL</td>
                      {labels.map((_, i) => <td key={i} />)}
                      <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right", color: "#fff" }}>{totalAlunosGeral.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right", color: "#39DF18", fontSize: 16 }}>{totalBaseGeral.toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center", color: "#aaa" }}>{totalProfGeral}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 800, textAlign: "right", color: "#FFA300", fontSize: 16 }}>{totalCompGeral.toLocaleString("pt-BR")}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
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
                {CLUSTER_PT[clus]}
              </span>
              <span style={{ color: "#39DF18", fontWeight: 800, fontSize: 16 }}>
                {escola.total_alunos?.toLocaleString("pt-BR")} alunos
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer" }}>x</button>
        </div>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Dados da Escola</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", fontSize: 13 }}>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Responsavel</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.responsavel_escola || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Telefone</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.telefone || "—"}</div></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Endereco</div>
              <div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{enderecoLinhas.length > 0 ? enderecoLinhas.join(" · ") : (escola.endereco || "—")}</div>
            </div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Tipo de Frete</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.tipo_frete || "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Inicio das Aulas</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.data_inicio ? new Date(escola.data_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div></div>
            <div><div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Recebimento do Material</div><div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.data_recebimento ? new Date(escola.data_recebimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div></div>
            {escola.num_salas_maker != null && (
              <div>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Salas Maker</div>
                <div style={{ fontWeight: 600, color: "#222", marginTop: 2 }}>{escola.num_salas_maker}</div>
              </div>
            )}
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
            <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Responsavel pelo Preenchimento</div>
            <div style={{ fontWeight: 600, color: "#222", marginTop: 2, fontSize: 13 }}>{hist.responsavel_preenchimento}</div>
          </div>
        )}
        <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
            Series e Turmas ({escola.num_series} serie{escola.num_series !== 1 ? "s" : ""}, {escola.num_turmas} turma{escola.num_turmas !== 1 ? "s" : ""})
          </div>
          {!detalhes ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>Carregando...</div>
          ) : seriesComTurmas.length === 0 ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>Nenhuma serie cadastrada.</div>
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
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase" }}>Calendario Escolar Anexado</div>
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
              <span style={{ fontSize: 13, color: "#e53935", fontWeight: 600 }}>Confirmar exclusao?</span>
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
    const f = e.tipo_frete || "Nao informado";
    if (!porFrete[f]) porFrete[f] = { escolas: 0, alunos: 0 };
    porFrete[f].escolas++;
    porFrete[f].alunos += e.total_alunos || 0;
  });

  const porPrograma = {};
  escolas.forEach(e => {
    const p = e.programa || "Nao informado";
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
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 2 }}>alunos - {dados.escolas} escola{dados.escolas !== 1 ? "s" : ""}</div>
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
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", marginTop: 4 }}>alunos - {dados.escolas} escola{dados.escolas !== 1 ? "s" : ""}</div>
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
  const [logado, setLogado]             = useState(false);
  const [equipeLogada, setEquipeLogada] = useState(null);
  const [senha, setSenha]               = useState("");
  const [erroLogin, setErroLogin]       = useState("");
  const [manterLogado, setManterLogado] = useState(false);
  const [escolas, setEscolas]           = useState([]);
  const [todosEnvios, setTodosEnvios]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [busca, setBusca]               = useState("");
  const [ordenar, setOrdenar]           = useState("nome");
  const [escolaSelecionada, setEscolaSelecionada] = useState(null);
  const [view, setView]                 = useState("dashboard");
  const [cicloAtivo, setCicloAtivo]     = useState(null);
  const [ciclosHist, setCiclosHist]     = useState([]);
  const [modalCiclo, setModalCiclo]     = useState(false);

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
      const { data: todosCiclos } = await supabase
        .from("ciclos")
        .select("*")
        .order("data_inicio", { ascending: false });

      const ativo      = (todosCiclos || []).find(c => !c.data_encerramento);
      const encerrados = (todosCiclos || []).filter(c => !!c.data_encerramento);
      setCicloAtivo(ativo || null);
      setCiclosHist(encerrados);

      let schoolsQuery = supabase.from("schools").select("*").order("created_at", { ascending: false });
      if (ativo) {
        schoolsQuery = schoolsQuery.gte("created_at", ativo.data_inicio);
      }
      const { data: schools } = await schoolsQuery;

      const { data: history } = await supabase.from("alunado_history")
        .select("school_id, total_alunos, cluster, data_submissao")
        .order("data_submissao", { ascending: false });
      const { data: classes }       = await supabase.from("classes").select("school_id, num_alunos");
      const { data: grade_classes } = await supabase.from("grade_classes").select("id, school_id, serie");

      const nomesVistos = new Set();
      const schoolsUnico = [];
      (schools || []).forEach(escola => {
        const nomeNorm = (escola.nome || "").trim().toLowerCase();
        if (!nomesVistos.has(nomeNorm)) {
          nomesVistos.add(nomeNorm);
          const idsNome = (schools || []).filter(s => (s.nome || "").trim().toLowerCase() === nomeNorm).map(s => s.id);
          const histRecente = (history || []).find(h => idsNome.includes(h.school_id));
          const escolaRecente = histRecente ? (schools || []).find(s => s.id === histRecente.school_id) : escola;
          schoolsUnico.push(escolaRecente || escola);
        }
      });

      const mapEscola = (escola) => {
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
      };

      setEscolas(schoolsUnico.map(mapEscola));
      setTodosEnvios((schools || []).map(mapEscola));
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }

  async function encerrarCiclo(nomeCiclo) {
    if (!cicloAtivo) return;
    try {
      await supabase.from("ciclos").update({
        nome:              nomeCiclo,
        data_encerramento: new Date().toISOString(),
        total_alunos:      totalAlunos,
        total_escolas:     totalEscolas,
        snapshot:          escolas,
      }).eq("id", cicloAtivo.id);

      // Zera alunos de todas as turmas para o novo ciclo
      await supabase.from("classes").update({ num_alunos: 0 }).gte("num_alunos", 0);
      // Limpa histórico para zerar contadores do dashboard
      await supabase.from("alunado_history").delete().gte("total_alunos", 0);

      await supabase.from("ciclos").insert({
        nome:        "Novo Ciclo",
        data_inicio: new Date().toISOString(),
      });

      setModalCiclo(false);
      await carregarDados();
    } catch (err) {
      console.error("Erro ao encerrar ciclo:", err);
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

  const escolasFiltradas = todosEnvios
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

  const isAdmin = equipeLogada?.equipe === "Admin";

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
              {manterLogado && <span style={{ fontSize: 11, fontWeight: 900, color: "#000" }}>v</span>}
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
      <div style={{ background: "#39DF18", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LogoMM size={44} cor="#111" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#000", lineHeight: 1.1 }}>Mundo Maker</div>
            {cicloAtivo && (
              <div style={{ fontSize: 11, color: "#333" }}>
                Ciclo ativo: <strong>{cicloAtivo.nome}</strong> — desde {new Date(cicloAtivo.data_inicio).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setView(view === "historico" ? "dashboard" : "historico")}
            style={{ background: view === "historico" ? "#000" : "rgba(0,0,0,0.12)", color: "#000", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Historico de Ciclos {ciclosHist.length > 0 && `(${ciclosHist.length})`}
          </button>
          <button onClick={() => setView(view === "escolas" ? "dashboard" : "escolas")}
            style={{ background: view === "escolas" ? "#000" : "rgba(0,0,0,0.12)", color: "#000", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Escolas
          </button>
          {(isAdmin || equipeLogada?.equipe === "Producao") && (
            <button onClick={() => setView(view === "inspiramaker" ? "dashboard" : "inspiramaker")}
              style={{ background: view === "inspiramaker" ? "#000" : "rgba(0,0,0,0.12)", color: "#000", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Inspiramaker
            </button>
          )}
          <button onClick={() => setView(view === "projecao" ? "dashboard" : "projecao")}
            style={{ background: view === "projecao" ? "#000" : "rgba(0,0,0,0.12)", color: "#000", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
            Projecao de Material
          </button>
          {isAdmin && (
            <button onClick={() => setModalCiclo(true)}
              style={{ background: "#e53935", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Encerrar Ciclo
            </button>
          )}
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

      {view === "historico" && (
        <HistoricoCiclos ciclos={ciclosHist} onVoltar={() => setView("dashboard")} />
      )}

      {view === "escolas" && (
        <EscolasDashboard onVoltar={() => setView("dashboard")} />
      )}

      {view === "inspiramaker" && (
        <InspiramakerDashboard onVoltar={() => setView("dashboard")} />
      )}

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
                  {cicloAtivo && <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Ciclo: {cicloAtivo.nome}</div>}
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: "#111", lineHeight: 1 }}>{totalEscolas}</div>
                  <div style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Escolas Cadastradas</div>
                  {cicloAtivo && <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>Ciclo: {cicloAtivo.nome}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
                {porCluster.map(({ cluster, count, alunos }) => (
                  <div key={cluster} style={{ background: CLUSTER_INFO[cluster].bg, color: CLUSTER_INFO[cluster].text, borderRadius: 8, padding: "20px" }}>
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{CLUSTER_PT[cluster]}</span>
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 1.5 }}>Envio de Formularios</div>
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
                          {busca ? "Nenhuma escola encontrada." : "Nenhum formulario enviado neste ciclo."}
                        </td></tr>
                      ) : escolasFiltradas.map((escola, i) => (
                        <tr key={escola.id} style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#111" }}>{escola.nome}</td>
                          <td style={{ padding: "12px 16px", color: "#555", fontSize: 12 }}>{escola.programa || "—"}</td>
                          <td style={{ padding: "12px 16px", color: "#555", fontSize: 12 }}>{escola.idioma_material || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: CLUSTER_INFO[escola.cluster]?.bg || "#eee", color: CLUSTER_INFO[escola.cluster]?.text || "#000", padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                              {CLUSTER_PT[escola.cluster] || escola.cluster}
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
        isAdmin={isAdmin}
      />

      {modalCiclo && (
        <ModalEncerrarCiclo
          cicloAtivo={cicloAtivo}
          totalAlunos={totalAlunos}
          totalEscolas={totalEscolas}
          escolas={escolas}
          onConfirmar={encerrarCiclo}
          onClose={() => setModalCiclo(false)}
        />
      )}
    </div>
  );
}