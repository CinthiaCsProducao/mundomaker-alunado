import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { mapTipo } from "./programaTipo";

const TURMAS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"];
const SERIES_OPCOES = [
  "Ed. Infantil","Infantil 5 anos",
  "1º ano EF","2º ano EF","3º ano EF","4º ano EF","5º ano EF",
  "6º ano EF","7º ano EF","8º ano EF","9º ano EF",
  "1º ano EM","2º ano EM","3º ano EM",
];

function calcularCluster(total) {
  if (total >= 500) return "Diamond";
  if (total >= 300) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
}

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function gerarPDFFormulario(dadosGerais, series, totalAlunos, responsavel, calendarioNome) {
  const fmtDate = (val) => val ? new Date(val + "T12:00:00").toLocaleDateString("pt-BR") : "—";
  const seriesHtml = series.map(s => {
    const totalSerie = s.turmas.reduce((a, t) => a + (parseInt(t.num_alunos) || 0), 0);
    return `
      <tr style="background:#f5f5f5;">
        <td colspan="3" style="padding:8px 14px;font-weight:700;font-size:12px;">${esc(s.serie)}${s.projeto ? ` — Projeto: ${esc(s.projeto)}` : ""} — ${totalSerie} alunos</td>
      </tr>
      ${s.turmas.map(t => `
        <tr>
          <td style="padding:7px 14px 7px 28px;">Turma ${esc(t.turma)}</td>
          <td style="padding:7px 14px;">${t.num_alunos || 0} alunos</td>
          <td style="padding:7px 14px;">${esc(t.professor_maker || "—")}</td>
        </tr>
      `).join("")}`;
  }).join("");
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Formulário de Alunado — ${esc(dadosGerais.nome)}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:24px;max-width:800px;margin:0 auto}.print-btn{background:#39DF18;border:none;padding:10px 22px;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;margin-bottom:20px}.header{background:#39DF18;padding:20px 24px;border-radius:4px;margin-bottom:20px}.header h1{font-size:18px;font-weight:800}.section{border:1px solid #ddd;border-radius:4px;overflow:hidden;margin-bottom:16px}.sec-title{background:#111;color:#fff;padding:9px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px}.sec-body{padding:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.f-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px}.f-val{font-weight:600;font-size:13px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:7px 14px;border:1px solid #e5e5e5;text-align:left}th{background:#f5f5f5;font-size:10px;font-weight:700;text-transform:uppercase}.total-box{margin-top:14px;background:#111;color:#39DF18;border-radius:4px;padding:14px 18px}.total-num{font-size:32px;font-weight:800;line-height:1}.total-label{font-size:10px;color:#aaa;text-transform:uppercase;margin-top:4px}@media print{.print-btn{display:none}body{padding:0}}</style>
    </head><body>
    <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    <div class="header"><h1>Mundo Maker — Formulário de Alunado</h1><p>Gerado em: ${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</p></div>
    <div class="section"><div class="sec-title">1. Dados da Escola</div><div class="sec-body"><div class="grid">
      <div><div class="f-label">Nome</div><div class="f-val">${esc(dadosGerais.nome)}</div></div>
      <div><div class="f-label">Responsável</div><div class="f-val">${esc(dadosGerais.responsavel||"—")}</div></div>
      <div><div class="f-label">Telefone</div><div class="f-val">${esc(dadosGerais.telefone||"—")}</div></div>
      <div><div class="f-label">Tipo de Frete</div><div class="f-val">${esc(dadosGerais.tipo_frete||"—")}</div></div>
      <div><div class="f-label">Início das Aulas</div><div class="f-val">${fmtDate(dadosGerais.data_inicio)}</div></div>
      <div><div class="f-label">Recebimento do Material</div><div class="f-val">${fmtDate(dadosGerais.data_recebimento)}</div></div>
    </div></div></div>
    <div class="section"><div class="sec-title">2. Programa e Idioma</div><div class="sec-body"><div class="grid">
      <div><div class="f-label">Programa</div><div class="f-val">${esc(dadosGerais.programa||"—")}</div></div>
      <div><div class="f-label">Idioma do Material</div><div class="f-val">${esc(dadosGerais.idioma_material||"—")}</div></div>
    </div></div></div>
    <div class="section"><div class="sec-title">3. Séries e Turmas</div><div class="sec-body">
      <table><thead><tr><th>Série / Turma</th><th>Alunos</th><th>Professor Maker</th></tr></thead><tbody>${seriesHtml}</tbody></table>
      <div class="total-box"><div class="total-num">${totalAlunos.toLocaleString("pt-BR")}</div><div class="total-label">Total de Alunos</div></div>
    </div></div>
    <div class="section"><div class="sec-title">4. Responsável pelo Preenchimento</div><div class="sec-body"><div class="f-label">Nome</div><div class="f-val" style="margin-top:4px;">${esc(responsavel||"—")}</div></div></div>
    ${calendarioNome?`<div class="section"><div class="sec-title">5. Calendário Escolar</div><div class="sec-body"><div class="f-label">Arquivo Anexado</div><div class="f-val" style="margin-top:4px;">${esc(calendarioNome)}</div></div></div>`:""}
    </body></html>`);
  win.document.close();
}

const font = "'Circular Std','Nunito','Helvetica Neue',Arial,sans-serif";
const S = {
  page:{ minHeight:"100vh", background:"#f5f5f5", fontFamily:font, paddingBottom:60 },
  header:{ background:"#39DF18", padding:"28px 40px", display:"flex", alignItems:"center", gap:16 },
  logoCircle:{ width:52, height:52, border:"3px dashed #000", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", flexShrink:0 },
  logoInner:{ width:30, height:30, border:"3px solid #000", borderRadius:"50%" },
  logoM:{ position:"absolute", top:-8, right:-4, width:16, height:16, background:"#000", borderRadius:"50%", color:"#39DF18", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" },
  logoText:{ lineHeight:1.1 },
  logoMundo:{ fontSize:22, fontWeight:800, color:"#000", display:"block", letterSpacing:"-0.5px" },
  logoMaker:{ fontSize:22, fontWeight:800, color:"#000", display:"block", letterSpacing:"-0.5px" },
  headerRight:{ marginLeft:"auto", textAlign:"right" },
  headerTitle:{ fontSize:13, fontWeight:700, color:"#000", textTransform:"uppercase", letterSpacing:1 },
  headerSub:{ fontSize:11, color:"#333", marginTop:2 },
  container:{ maxWidth:820, margin:"0 auto", padding:"0 20px" },
  sectionBlock:{ marginTop:32, background:"#fff", borderRadius:4, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  sectionHead:{ background:"#111", padding:"14px 24px", display:"flex", alignItems:"center", gap:10 },
  sectionNum:{ background:"#39DF18", color:"#000", width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 },
  sectionTitle:{ color:"#fff", fontWeight:700, fontSize:13, textTransform:"uppercase", letterSpacing:1.5 },
  sectionBody:{ padding:"24px" },
  grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 },
  grid3:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 },
  field:{ display:"flex", flexDirection:"column", gap:6 },
  label:{ fontSize:11, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:0.8 },
  input:{ padding:"11px 14px", border:"1.5px solid #ddd", borderRadius:4, fontSize:14, fontFamily:font, outline:"none", color:"#111", background:"#fff" },
  inputReadOnly:{ padding:"11px 14px", border:"1.5px solid #eee", borderRadius:4, fontSize:14, fontFamily:font, color:"#555", background:"#f9f9f9" },
  select:{ padding:"11px 14px", border:"1.5px solid #ddd", borderRadius:4, fontSize:14, fontFamily:font, background:"#fff", color:"#111" },
  btn:{ padding:"9px 16px", borderRadius:4, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:font, letterSpacing:0.5 },
  btnBlack:{ background:"#111", color:"#fff" },
  btnGreen:{ background:"#39DF18", color:"#000" },
  btnOutline:{ background:"#fff", color:"#111", border:"1.5px solid #ddd" },
  btnDanger:{ background:"#fff", color:"#cc0000", border:"1.5px solid #ffc0c0" },
  btnSubmit:{ width:"100%", padding:"18px", background:"#39DF18", color:"#000", border:"none", borderRadius:4, fontSize:15, fontWeight:800, fontFamily:font, cursor:"pointer", letterSpacing:1, textTransform:"uppercase", marginTop:32 },
  canvas:{ border:"1.5px solid #ddd", borderRadius:4, cursor:"crosshair", display:"block", width:"100%", background:"#fafafa" },
  error:{ background:"#fff0f0", border:"1.5px solid #FF3B41", color:"#cc0000", borderRadius:4, padding:"12px 16px", fontSize:13, fontWeight:600, marginBottom:16 },
  successPage:{ minHeight:"100vh", background:"#39DF18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font },
  successCard:{ background:"#fff", borderRadius:8, padding:"48px 56px", maxWidth:480, textAlign:"center", margin:20 },
  projetoTag:{ display:"inline-block", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:4, padding:"4px 10px", fontSize:11, color:"#0369a1", fontWeight:700 },
};

// ─── Header ──────────────────────────────────────────────────
function Header({ subTitle }) {
  return (
    <div style={S.header}>
      <div style={S.logoCircle}><div style={S.logoInner}/><div style={S.logoM}>m</div></div>
      <div style={S.logoText}><span style={S.logoMundo}>mundo</span><span style={S.logoMaker}>maker</span></div>
      <div style={S.headerRight}>
        <div style={S.headerTitle}>Sistema de Alunado</div>
        <div style={S.headerSub}>{subTitle || "coleta de dados escolares"}</div>
      </div>
    </div>
  );
}

// ─── Tela de autenticação CNPJ ───────────────────────────────
function TelaAuth({ escolaBase, envioNum, onVerificar }) {
  const [digits, setDigits] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);

  async function verificar() {
    if (digits.length !== 14 || busy) return;
    setBusy(true); setErro("");
    const msg = await onVerificar(digits);
    if (msg) setErro(msg);
    setBusy(false);
  }

  const envioLabel = envioNum === 1 ? "1º Envio" : envioNum === 2 ? "2º Envio" : "3º Envio";

  return (
    <div style={S.page}>
      <Header subTitle={`${envioLabel} — ${escolaBase?.nome || ""}`} />
      <div style={S.container}>
        <div style={{ maxWidth:400, margin:"60px auto 0", background:"#fff", borderRadius:8, boxShadow:"0 2px 12px rgba(0,0,0,0.1)", overflow:"hidden" }}>
          <div style={{ background:"#111", padding:"20px 28px" }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>Acesso ao Formulário</div>
            <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>{escolaBase?.nome}</div>
          </div>
          <div style={{ padding:"28px" }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:6, padding:"12px 16px", fontSize:12, color:"#0369a1" }}>
                <strong>{envioLabel}</strong> — {escolaBase?.idioma} — {mapTipo(escolaBase?.tipo)}
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Digite o CNPJ da escola (14 números)</label>
              <input
                style={{ ...S.input, fontSize:20, textAlign:"center", letterSpacing:2, fontWeight:800 }}
                maxLength={14} inputMode="numeric"
                value={digits}
                onChange={e => { setDigits(e.target.value.replace(/\D/g,"").slice(0,14)); setErro(""); }}
                onKeyDown={e => e.key === "Enter" && verificar()}
                placeholder="00000000000000"
                autoFocus
              />
            </div>
            {erro && <div style={{ ...S.error, marginTop:12 }}>⚠ {erro}</div>}
            <button onClick={verificar} disabled={digits.length !== 14 || busy}
              style={{ ...S.btnSubmit, marginTop:20, opacity: (digits.length !== 14 || busy) ? 0.5 : 1 }}>
              {busy ? "VERIFICANDO..." : "ACESSAR FORMULÁRIO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function AlunadoForm() {
  // URL params
  const params = new URLSearchParams(window.location.search);
  const escolaId = params.get("escola");
  const envioNum = parseInt(params.get("envio") || "1");
  const modoLink = !!escolaId;

  // Estado autenticação
  const [autenticado, setAutenticado] = useState(!modoLink);
  const [escolaBase, setEscolaBase] = useState(null);
  const [cnpjInformado, setCnpjInformado] = useState("");
  const [dadosServidor, setDadosServidor] = useState(null);
  const [consentimento, setConsentimento] = useState(false);
  const [carregandoEscola, setCarregandoEscola] = useState(modoLink);

  // Estado formulário
  const [dadosGerais, setDadosGerais] = useState({
    nome:"", cep:"", logradouro:"", numero:"", complemento:"", bairro:"", cidade:"", estado:"",
    telefone:"", responsavel:"", data_inicio:"", data_recebimento:"", tipo_frete:"CIF",
    programa:"", idioma_material:"Português", num_salas_maker:"",
  });
  const [series, setSeries] = useState([]);
  const [calendario, setCalendario] = useState(null);
  const [calendarioPreview, setCalendarioPreview] = useState(null);
  const [responsavel, setResponsavel] = useState("");
  const canvasRef = useRef(null);
  const [assinando, setAssinando] = useState(false);
  const [assinaturaFeita, setAssinaturaFeita] = useState(false);
  const lastPos = useRef({ x:0, y:0 });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [calendarioNome, setCalendarioNome] = useState(null);
  const [novaSerie, setNovaSerie] = useState("");

  const totalAlunos = series.reduce((acc, s) => acc + s.turmas.reduce((a, t) => a + (parseInt(t.num_alunos)||0), 0), 0);
  const cluster = calcularCluster(totalAlunos);

  // ── Carrega escola via link ─────────────────────────────────
  useEffect(() => {
    if (!escolaId) return;
    async function carregar() {
      setCarregandoEscola(true);
      const { data } = await supabase.rpc("get_escola_publica", { p_id: escolaId });
      if (data) setEscolaBase(data);
      setCarregandoEscola(false);
    }
    carregar();
  }, [escolaId]);

  // ── Preenche formulário após autenticação ──────────────────
  const preencherFormulario = useCallback(async () => {
    if (!escolaBase) return;
    const prog = mapTipo(escolaBase.tipo);
    setDadosGerais(prev => ({
      ...prev,
      nome: escolaBase.nome || "",
      idioma_material: escolaBase.idioma || "Português",
      programa: prog,
      logradouro: (escolaBase.logradouro || "").replace(/,\s*\d+.*$/, "").trim(),
      numero: escolaBase.numero || (escolaBase.logradouro ? (escolaBase.logradouro.match(/,\s*(\d+)/) || [])[1] || "" : ""),
      bairro: escolaBase.bairro || "",
      cidade: escolaBase.cidade || "",
      estado: escolaBase.uf || "",
      cep: escolaBase.cep || "",
      telefone: escolaBase.telefone || "",
    }));

    // Projetos e turmas já cadastradas (vindos do servidor após validar o CNPJ)
    const projetos = dadosServidor?.projetos || [];
    const gcMap = {};
    (dadosServidor?.turmas || []).forEach(t => {
      (gcMap[t.serie] = gcMap[t.serie] || []).push({
        turma: t.turma, num_alunos: t.num_alunos?.toString() || "", professor_maker: t.professor_maker || "",
      });
    });

    if (projetos.length > 0) {
      const novasSeries = projetos.map(p => {
        const proj = envioNum === 1 ? p.envio_1 : envioNum === 2 ? p.envio_2 : p.envio_3;
        const turmasExist = gcMap[p.serie];
        return {
          serie: p.serie,
          projeto: proj || "",
          turmas: turmasExist && turmasExist.length > 0
            ? turmasExist
            : [{ turma:"A", num_alunos:"", professor_maker:"" }],
        };
      }).filter(s => s.projeto || Object.keys(gcMap).length === 0 || gcMap[s.serie]);
      setSeries(novasSeries.length > 0 ? novasSeries : []);
    }
  }, [escolaBase, dadosServidor, envioNum]);

  useEffect(() => {
    if (autenticado && modoLink && escolaBase) {
      preencherFormulario();
    }
  }, [autenticado, modoLink, escolaBase, preencherFormulario]);

  // ── Séries e turmas ────────────────────────────────────────
  function adicionarSerie(serie) {
    if (series.find(s => s.serie === serie)) return;
    setSeries(p => [...p, { serie, projeto:"", turmas:[{ turma:"A", num_alunos:"", professor_maker:"" }] }]);
  }
  function removerSerie(idx) { setSeries(p => p.filter((_,i) => i !== idx)); }
  function adicionarTurma(si) {
    setSeries(p => { const u=[...p]; const prox=TURMAS[u[si].turmas.length]||"?"; u[si].turmas=[...u[si].turmas,{turma:prox,num_alunos:"",professor_maker:""}]; return u; });
  }
  function removerTurma(si,ti) {
    setSeries(p => { const u=[...p]; u[si].turmas=u[si].turmas.filter((_,i)=>i!==ti); return u; });
  }
  function atualizarTurma(si,ti,campo,valor) {
    setSeries(p => { const u=[...p]; u[si].turmas[ti]={...u[si].turmas[ti],[campo]:valor}; return u; });
  }

  function adicionarNovaSerieManual() {
    const s = novaSerie.trim();
    if (!s || series.find(x => x.serie === s)) return;
    setSeries(p => [...p, { serie:s, projeto:"", turmas:[{ turma:"A", num_alunos:"", professor_maker:"" }] }]);
    setNovaSerie("");
  }

  // ── Upload calendário ──────────────────────────────────────
  function handleCalendario(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 10*1024*1024) { setErro("Arquivo muito grande. Máximo 10MB."); return; }
    if (!["application/pdf","image/jpeg","image/png"].includes(file.type)) { setErro("Formato inválido."); return; }
    setCalendario(file); setCalendarioPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null); setErro("");
  }

  // ── Assinatura ─────────────────────────────────────────────
  function getPos(e,canvas) {
    const r=canvas.getBoundingClientRect();
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return {x:(cx-r.left)*(canvas.width/r.width),y:(cy-r.top)*(canvas.height/r.height)};
  }
  function iniciarDesenho(e) { e.preventDefault(); setAssinando(true); lastPos.current=getPos(e,canvasRef.current); }
  function desenhar(e) {
    e.preventDefault(); if(!assinando) return;
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    const pos=getPos(e,canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y);
    ctx.lineTo(pos.x,pos.y); ctx.strokeStyle="#111"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.stroke();
    lastPos.current=pos; setAssinaturaFeita(true);
  }
  function pararDesenho() { setAssinando(false); }
  function limparAssinatura() { const c=canvasRef.current; c.getContext("2d").clearRect(0,0,c.width,c.height); setAssinaturaFeita(false); }

  // ── Validação ──────────────────────────────────────────────
  function validar() {
    if (!dadosGerais.nome.trim()) return "Nome da escola é obrigatório.";
    if (!dadosGerais.responsavel.trim()) return "Responsável da escola é obrigatório.";
    if (!dadosGerais.programa) return "Selecione o programa da escola.";
    if (series.length === 0) return "Adicione pelo menos uma série.";
    for (const s of series) {
      if (s.turmas.length === 0) return `A série '${s.serie}' precisa de ao menos uma turma.`;
      for (const t of s.turmas) {
        if (t.num_alunos === "") return `Preencha os alunos da turma ${t.turma} (${s.serie}).`;
      }
    }
    if (!responsavel.trim()) return "Informe o responsável pelo preenchimento.";
    if (!assinaturaFeita) return "A assinatura digital é obrigatória.";
    if (!consentimento) return "Confirme a ciência do Aviso de Privacidade.";
    return null;
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault(); setErro("");
    const err = validar(); if (err) { setErro(err); return; }
    setLoading(true);
    try {
      let calPath=null, calNome=null;
      if (calendario) {
        const ext = calendario.type==="application/pdf" ? "pdf" : calendario.type==="image/png" ? "png" : "jpg";
        calPath = `${crypto.randomUUID()}.${ext}`;
        const { error: e4 } = await supabase.storage.from("calendars").upload(calPath, calendario, { upsert: false, contentType: calendario.type });
        if (e4) throw e4;
        calNome = calendario.name;
      }

      const canvas=canvasRef.current;
      const sigBlob=await new Promise(res => canvas.toBlob(res,"image/png"));
      const sigPath = `${crypto.randomUUID()}.png`;
      const { error: e5 } = await supabase.storage.from("signatures").upload(sigPath, sigBlob, { upsert: false, contentType: "image/png" });
      if (e5) throw e5;

      const { data: res, error: e6 } = await supabase.rpc("enviar_alunado", {
        p_id: escolaId, p_cnpj: cnpjInformado,
        p_dados: { dadosGerais, series, responsavel, consentimento: true,
          assinatura_path: sigPath, calendario_path: calPath, calendario_nome: calNome },
      });
      if (e6) throw e6;
      if (!res?.ok) {
        const m = { bloqueado:"Muitas tentativas. Aguarde alguns minutos.", incorreto:"CNPJ não confere.", sem_consentimento:"É necessário confirmar a ciência do aviso de privacidade." };
        throw new Error(m[res?.motivo] || "Não foi possível enviar (" + (res?.motivo || "erro") + ").");
      }

      setCalendarioNome(calNome);
      setSucesso(true);
    } catch(err) {
      console.error(err); setErro("Erro ao enviar: " + (err.message || "tente novamente."));
    } finally { setLoading(false); }
  }

  // ── Carregando escola ──────────────────────────────────────
  if (modoLink && carregandoEscola) {
    return (
      <div style={S.page}>
        <Header />
        <div style={{ textAlign:"center", padding:80, color:"#aaa", fontFamily:font }}>Carregando dados da escola...</div>
      </div>
    );
  }

  // ── Tela autenticação ──────────────────────────────────────
  if (!modoLink) {
    return (
      <div style={S.page}>
        <Header />
        <div style={{ maxWidth:480, margin:"60px auto", background:"#fff", borderRadius:8, padding:32, textAlign:"center", fontSize:14, color:"#444" }}>
          Para preencher o formulário, use o link exclusivo enviado pela Mundo Maker para a sua escola.
        </div>
      </div>
    );
  }
  if (!escolaBase) {
    return (
      <div style={S.page}>
        <Header />
        <div style={{ maxWidth:480, margin:"60px auto", background:"#fff", borderRadius:8, padding:32, textAlign:"center", fontSize:14, color:"#444" }}>
          Link inválido ou escola não encontrada. Solicite um novo link à Mundo Maker.
        </div>
      </div>
    );
  }
  if (!autenticado) {
    return <TelaAuth escolaBase={escolaBase} envioNum={envioNum} onVerificar={async (cnpj) => {
      const { data, error } = await supabase.rpc("get_escola_form", { p_id: escolaId, p_cnpj: cnpj });
      if (error) return "Erro ao verificar. Tente novamente.";
      if (!data?.ok) return data?.motivo === "bloqueado" ? "Muitas tentativas incorretas. Aguarde 15 minutos." : "CNPJ não confere.";
      setCnpjInformado(cnpj); setDadosServidor(data); setEscolaBase(data.escola); setAutenticado(true);
      return null;
    }} />;
  }

  // ── Sucesso ────────────────────────────────────────────────
  if (sucesso) return (
    <div style={S.successPage}>
      <div style={S.successCard}>
        <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
        <div style={{ fontSize:28, fontWeight:800, color:"#111", marginBottom:8 }}>dados enviados!</div>
        <div style={{ fontSize:14, color:"#555", marginBottom:28 }}>{dadosGerais.nome} — dados enviados com sucesso!</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <button style={{ ...S.btn, background:"#39DF18", color:"#111", padding:"12px 24px", fontSize:13, fontWeight:700, border:"none", borderRadius:6, cursor:"pointer" }}
            onClick={() => gerarPDFFormulario(dadosGerais, series, totalAlunos, responsavel, calendarioNome)}>
            ⬇ Baixar Comprovante em PDF
          </button>
          <button style={{ ...S.btn, ...S.btnBlack, padding:"12px 24px", fontSize:13 }} onClick={() => window.location.reload()}>NOVO FORMULÁRIO</button>
        </div>
      </div>
    </div>
  );

  // ── Formulário ─────────────────────────────────────────────
  const envioLabel = modoLink ? (envioNum===1?"1º Envio":envioNum===2?"2º Envio":"3º Envio") : null;

  return (
    <div style={S.page}>
      <Header subTitle={modoLink ? `${envioLabel} — ${dadosGerais.nome||""}` : "coleta de dados escolares"} />
      <div style={S.container}>
        <form onSubmit={handleSubmit}>
          {erro && <div style={{ ...S.error, marginTop:24 }}>⚠ {erro}</div>}

          {/* SEÇÃO 1: Dados Gerais */}
          <div style={S.sectionBlock}>
            <div style={S.sectionHead}><div style={S.sectionNum}>1</div><div style={S.sectionTitle}>Dados Gerais da Escola</div></div>
            <div style={S.sectionBody}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={S.field}>
                  <label style={S.label}>Nome da Escola *</label>
                  {modoLink
                    ? <div style={S.inputReadOnly}>{dadosGerais.nome}</div>
                    : <input style={S.input} value={dadosGerais.nome} onChange={e => setDadosGerais({...dadosGerais,nome:e.target.value})} placeholder="Ex: Colégio São Paulo"/>}
                </div>
                <div style={S.grid2}>
                  <div style={S.field}><label style={S.label}>CEP</label>
                    <input style={S.input} value={dadosGerais.cep} onChange={e => setDadosGerais({...dadosGerais,cep:e.target.value})} placeholder="00000-000"/></div>
                  <div style={S.field}><label style={S.label}>Logradouro</label>
                    <input style={modoLink&&dadosGerais.logradouro?S.inputReadOnly:S.input} value={dadosGerais.logradouro} onChange={e => setDadosGerais({...dadosGerais,logradouro:e.target.value})} placeholder="Rua / Av."/></div>
                </div>
                <div style={S.grid3}>
                  <div style={S.field}><label style={S.label}>Número</label><input style={S.input} value={dadosGerais.numero} onChange={e => setDadosGerais({...dadosGerais,numero:e.target.value})} placeholder="123"/></div>
                  <div style={S.field}><label style={S.label}>Complemento</label><input style={S.input} value={dadosGerais.complemento} onChange={e => setDadosGerais({...dadosGerais,complemento:e.target.value})} placeholder="Bloco (opcional)"/></div>
                  <div style={S.field}><label style={S.label}>Bairro</label><input style={modoLink&&dadosGerais.bairro?S.inputReadOnly:S.input} value={dadosGerais.bairro} onChange={e => setDadosGerais({...dadosGerais,bairro:e.target.value})} placeholder="Centro"/></div>
                </div>
                <div style={S.grid2}>
                  <div style={S.field}><label style={S.label}>Cidade</label>
                    <input style={modoLink&&dadosGerais.cidade?S.inputReadOnly:S.input} value={dadosGerais.cidade} onChange={e => setDadosGerais({...dadosGerais,cidade:e.target.value})} placeholder="São Paulo"/></div>
                  <div style={S.field}><label style={S.label}>Estado</label>
                    {modoLink && dadosGerais.estado
                      ? <div style={S.inputReadOnly}>{dadosGerais.estado}</div>
                      : <select style={S.select} value={dadosGerais.estado} onChange={e => setDadosGerais({...dadosGerais,estado:e.target.value})}>
                          <option value="">Selecione...</option>
                          {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf=><option key={uf} value={uf}>{uf}</option>)}
                        </select>}
                  </div>
                </div>
                <div style={S.grid2}>
                  <div style={S.field}><label style={S.label}>Telefone</label>
                    <input style={modoLink&&dadosGerais.telefone?S.inputReadOnly:S.input} value={dadosGerais.telefone} onChange={e => setDadosGerais({...dadosGerais,telefone:e.target.value})} placeholder="(00) 00000-0000"/></div>
                  <div style={S.field}><label style={S.label}>Responsável pelo Recebimento *</label>
                    <input style={S.input} value={dadosGerais.responsavel} onChange={e => setDadosGerais({...dadosGerais,responsavel:e.target.value})} placeholder="Nome do responsável"/></div>
                </div>
                <div style={S.grid3}>
                  <div style={S.field}><label style={S.label}>Data de Início das Aulas</label>
                    <input style={S.input} type="date" value={dadosGerais.data_inicio} onChange={e => setDadosGerais({...dadosGerais,data_inicio:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>Data Desejada para Receber</label>
                    <input style={S.input} type="date" value={dadosGerais.data_recebimento} onChange={e => setDadosGerais({...dadosGerais,data_recebimento:e.target.value})}/></div>
                  <div style={S.field}><label style={S.label}>Tipo de Frete</label>
                    <select style={S.select} value={dadosGerais.tipo_frete} onChange={e => setDadosGerais({...dadosGerais,tipo_frete:e.target.value})}>
                      <option value="CIF">CIF — entrega MundoMaker</option>
                      <option value="FOB">FOB — escola retira</option>
                    </select></div>
                </div>
                <div style={{ maxWidth:240 }}>
                  <div style={S.field}><label style={S.label}>Quantas salas maker a escola possui?</label>
                    <input style={S.input} type="number" min="0" value={dadosGerais.num_salas_maker} onChange={e => setDadosGerais({...dadosGerais,num_salas_maker:e.target.value})} placeholder="0"/></div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Programa e Idioma */}
          <div style={S.sectionBlock}>
            <div style={S.sectionHead}><div style={S.sectionNum}>2</div><div style={S.sectionTitle}>Programa e Idioma do Material</div></div>
            <div style={S.sectionBody}>
              <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                <div style={S.field}>
                  <label style={S.label}>Programa *</label>
                  {modoLink && dadosGerais.programa
                    ? <div style={{ ...S.inputReadOnly, fontWeight:700 }}>{dadosGerais.programa}</div>
                    : <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:4 }}>
                        {["MakerLab Class","MakerLab Oficina","MakerLab Oficina Inventores do Futuro","Inventores do Futuro"].map(p => (
                          <button key={p} type="button"
                            style={{ ...S.btn, ...(dadosGerais.programa===p?S.btnGreen:S.btnOutline), fontSize:13, padding:"10px 20px" }}
                            onClick={() => setDadosGerais({...dadosGerais,programa:p})}>
                            {dadosGerais.programa===p?"✓ ":""}{p}
                          </button>
                        ))}
                      </div>}
                </div>
                <div style={S.field}>
                  <label style={S.label}>Idioma do Material *</label>
                  {modoLink && dadosGerais.idioma_material
                    ? <div style={{ ...S.inputReadOnly, fontWeight:700 }}>{dadosGerais.idioma_material}</div>
                    : <div style={{ display:"flex", gap:10, marginTop:4 }}>
                        {["Português","Inglês"].map(idioma => (
                          <button key={idioma} type="button"
                            style={{ ...S.btn, ...(dadosGerais.idioma_material===idioma?S.btnGreen:S.btnOutline), fontSize:13, padding:"10px 20px" }}
                            onClick={() => setDadosGerais({...dadosGerais,idioma_material:idioma})}>
                            {dadosGerais.idioma_material===idioma?"✓ ":""}{idioma}
                          </button>
                        ))}
                      </div>}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Séries e Turmas */}
          <div style={S.sectionBlock}>
            <div style={S.sectionHead}><div style={S.sectionNum}>3</div><div style={S.sectionTitle}>Séries e Turmas</div></div>
            <div style={S.sectionBody}>

              {/* Seletor de séries (modo livre) */}
              {!modoLink && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ ...S.label, marginBottom:10, display:"block" }}>Selecione as séries:</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {SERIES_OPCOES.map(s => {
                      const ativo = series.find(x => x.serie === s);
                      return (
                        <button key={s} type="button"
                          style={{ ...S.btn, ...(ativo?S.btnGreen:S.btnOutline), fontSize:12 }}
                          onClick={() => ativo ? removerSerie(series.findIndex(x=>x.serie===s)) : adicionarSerie(s)}>
                          {ativo?"✓ ":""}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lista de séries */}
              {series.map((s, si) => (
                <div key={si} style={{ border:"1.5px solid #eee", borderRadius:6, marginBottom:16, overflow:"hidden" }}>
                  <div style={{ background:"#f5f5f5", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#111" }}>{s.serie}</span>
                      {s.projeto && <span style={S.projetoTag}>📦 {s.projeto}</span>}
                    </div>
                    <button type="button" onClick={() => removerSerie(si)} style={{ ...S.btn, ...S.btnDanger, fontSize:11, padding:"4px 10px" }}>Remover</button>
                  </div>
                  <div style={{ padding:"16px" }}>
                    {s.turmas.map((t, ti) => (
                      <div key={ti} style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr auto", gap:10, marginBottom:10, alignItems:"end" }}>
                        <div style={S.field}>
                          <label style={S.label}>Turma</label>
                          <input style={{ ...S.input, textAlign:"center" }} value={t.turma} onChange={e => atualizarTurma(si,ti,"turma",e.target.value)} placeholder="A"/>
                        </div>
                        <div style={S.field}>
                          <label style={S.label}>Nº de Alunos *</label>
                          <input style={{ ...S.input, fontWeight:700 }} type="number" min="0" value={t.num_alunos} onChange={e => atualizarTurma(si,ti,"num_alunos",e.target.value)} placeholder="0"/>
                        </div>
                        <div style={S.field}>
                          <label style={S.label}>Professor Maker</label>
                          <input style={S.input} value={t.professor_maker} onChange={e => atualizarTurma(si,ti,"professor_maker",e.target.value)} placeholder="Nome"/>
                        </div>
                        <button type="button" onClick={() => removerTurma(si,ti)} style={{ ...S.btn, ...S.btnDanger, fontSize:18, padding:"6px 10px", marginBottom:0, lineHeight:1 }}>×</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => adicionarTurma(si)} style={{ ...S.btn, ...S.btnOutline, fontSize:12, marginTop:4 }}>+ Turma</button>
                  </div>
                </div>
              ))}

              {/* Adicionar série extra (modo link) ou livre */}
              <div style={{ marginTop:8 }}>
                <div style={{ ...S.label, marginBottom:8, display:"block" }}>
                  {modoLink ? "Adicionar série não listada:" : "Ou adicione manualmente:"}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <input style={{ ...S.input, flex:1 }} value={novaSerie} onChange={e => setNovaSerie(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && (e.preventDefault(), adicionarNovaSerieManual())}
                    placeholder="Ex: 2º ano EF"/>
                  <button type="button" onClick={adicionarNovaSerieManual} style={{ ...S.btn, ...S.btnBlack, padding:"11px 20px" }}>Adicionar</button>
                </div>
              </div>

              {/* Total */}
              {totalAlunos > 0 && (
                <div style={{ marginTop:24, background:"#111", borderRadius:6, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div><div style={{ fontSize:36, fontWeight:800, color:"#39DF18", lineHeight:1 }}>{totalAlunos.toLocaleString("pt-BR")}</div><div style={{ fontSize:11, color:"#aaa", textTransform:"uppercase", marginTop:4 }}>Total de Alunos</div></div>
                  <div style={{ background:"#222", borderRadius:6, padding:"8px 16px", fontSize:13, fontWeight:700, color:"#fff" }}>{cluster}</div>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 4: Calendário */}
          <div style={S.sectionBlock}>
            <div style={S.sectionHead}><div style={S.sectionNum}>4</div><div style={S.sectionTitle}>Calendário Escolar</div></div>
            <div style={S.sectionBody}>
              <div style={{ fontSize:12, color:"#888", marginBottom:12 }}>Opcional — envie o calendário letivo da escola (PDF, JPG ou PNG, máx. 10MB).</div>
              <label style={{ ...S.btn, ...S.btnOutline, display:"inline-block", cursor:"pointer" }}>
                📎 Selecionar Arquivo
                <input type="file" accept=".pdf,image/*" style={{ display:"none" }} onChange={handleCalendario}/>
              </label>
              {calendario && <div style={{ marginTop:10, fontSize:12, color:"#555" }}>✓ {calendario.name}</div>}
              {calendarioPreview && <img src={calendarioPreview} alt="preview" style={{ marginTop:10, maxWidth:"100%", maxHeight:200, borderRadius:4 }}/>}
            </div>
          </div>

          {/* SEÇÃO 5: Responsável e Assinatura */}
          <div style={S.sectionBlock}>
            <div style={S.sectionHead}><div style={S.sectionNum}>5</div><div style={S.sectionTitle}>Responsável pelo Preenchimento</div></div>
            <div style={S.sectionBody}>
              <div style={S.field}>
                <label style={S.label}>Nome completo *</label>
                <input style={S.input} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Seu nome"/>
              </div>
              <div style={{ marginTop:20 }}>
                <div style={{ ...S.label, marginBottom:8, display:"block" }}>Assinatura Digital *</div>
                <canvas ref={canvasRef} width={600} height={160} style={S.canvas}
                  onMouseDown={iniciarDesenho} onMouseMove={desenhar} onMouseUp={pararDesenho} onMouseLeave={pararDesenho}
                  onTouchStart={iniciarDesenho} onTouchMove={desenhar} onTouchEnd={pararDesenho}/>
                <div style={{ marginTop:8, display:"flex", gap:8 }}>
                  <button type="button" onClick={limparAssinatura} style={{ ...S.btn, ...S.btnOutline, fontSize:12 }}>Limpar</button>
                  {assinaturaFeita && <span style={{ fontSize:12, color:"#39DF18", fontWeight:700, alignSelf:"center" }}>✓ Assinatura registrada</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background:"#fff", border:"1.5px solid #e0e0e0", borderRadius:6, padding:"16px 20px", marginBottom:16, fontSize:13, color:"#333" }}>
            <label style={{ display:"flex", gap:10, alignItems:"flex-start", cursor:"pointer" }}>
              <input type="checkbox" checked={consentimento} onChange={e => setConsentimento(e.target.checked)} style={{ marginTop:3 }}/>
              <span>Li e estou ciente do <a href="/privacidade" target="_blank" rel="noreferrer" style={{ color:"#148A00", fontWeight:700 }}>Aviso de Privacidade</a>. Declaro que os dados informados são da escola e que não estou enviando dados pessoais de alunos além do número de turmas e alunos. *</span>
            </label>
          </div>

          <button type="submit" style={{ ...S.btnSubmit, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "ENVIANDO..." : "ENVIAR FORMULÁRIO"}
          </button>
        </form>
      </div>
    </div>
  );
}
