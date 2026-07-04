import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const SERIES = [
  "Infantil 5 anos",
  "1º ano EF", "2º ano EF", "3º ano EF", "4º ano EF", "5º ano EF",
  "6º ano EF", "7º ano EF", "8º ano EF", "9º ano EF",
  "1º ano EM", "2º ano EM", "3º ano EM",
];

const TURMAS = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"];

function calcularCluster(total) {
  if (total >= 500) return "Diamond";
  if (total >= 300) return "Gold";
  if (total >= 100) return "Silver";
  return "Bronze";
}

const CLUSTER = {
  Diamond: { bg: "#00C7F4", text: "#000", emoji: "💎" },
  Gold:    { bg: "#FFD902", text: "#000", emoji: "🥇" },
  Silver:  { bg: "#e5e5e5", text: "#111", emoji: "🥈" },
  Bronze:  { bg: "#FFA300", text: "#000", emoji: "🥉" },
};

const font = "'Circular Std', 'Nunito', 'Helvetica Neue', Arial, sans-serif";

const S = {
  page: { minHeight: "100vh", background: "#f5f5f5", fontFamily: font, paddingBottom: 60 },
  header: { background: "#39DF18", padding: "28px 40px", display: "flex", alignItems: "center", gap: 16 },
  logoCircle: { width: 52, height: 52, border: "3px dashed #000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 },
  logoInner: { width: 30, height: 30, border: "3px solid #000", borderRadius: "50%" },
  logoM: { position: "absolute", top: -8, right: -4, width: 16, height: 16, background: "#000", borderRadius: "50%", color: "#39DF18", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { lineHeight: 1.1 },
  logoMundo: { fontSize: 22, fontWeight: 800, color: "#000", display: "block", letterSpacing: "-0.5px" },
  logoMaker: { fontSize: 22, fontWeight: 800, color: "#000", display: "block", letterSpacing: "-0.5px" },
  headerRight: { marginLeft: "auto", textAlign: "right" },
  headerTitle: { fontSize: 13, fontWeight: 700, color: "#000", textTransform: "uppercase", letterSpacing: 1 },
  headerSub: { fontSize: 11, color: "#333", marginTop: 2 },
  container: { maxWidth: 820, margin: "0 auto", padding: "0 20px" },
  sectionBlock: { marginTop: 32, background: "#fff", borderRadius: 4, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  sectionHead: { background: "#111", padding: "14px 24px", display: "flex", alignItems: "center", gap: 10 },
  sectionNum: { background: "#39DF18", color: "#000", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 },
  sectionTitle: { color: "#fff", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5 },
  sectionBody: { padding: "24px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 4, fontSize: 14, fontFamily: font, outline: "none", color: "#111", background: "#fff", transition: "border-color 0.15s" },
  select: { padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 4, fontSize: 14, fontFamily: font, background: "#fff", color: "#111" },
  btn: { padding: "9px 16px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: font, letterSpacing: 0.5, transition: "all 0.15s" },
  btnBlack: { background: "#111", color: "#fff" },
  btnGreen: { background: "#39DF18", color: "#000" },
  btnOutline: { background: "#fff", color: "#111", border: "1.5px solid #ddd" },
  btnDanger: { background: "#fff", color: "#cc0000", border: "1.5px solid #ffc0c0" },
  btnSubmit: { width: "100%", padding: "18px", background: "#39DF18", color: "#000", border: "none", borderRadius: 4, fontSize: 15, fontWeight: 800, fontFamily: font, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", marginTop: 32 },
  uploadArea: { border: "2px dashed #ccc", borderRadius: 4, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#fafafa" },
  canvas: { border: "1.5px solid #ddd", borderRadius: 4, cursor: "crosshair", display: "block", width: "100%", background: "#fafafa" },
  error: { background: "#fff0f0", border: "1.5px solid #FF3B41", color: "#cc0000", borderRadius: 4, padding: "12px 16px", fontSize: 13, fontWeight: 600, marginBottom: 16 },
  successPage: { minHeight: "100vh", background: "#39DF18", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font },
  successCard: { background: "#fff", borderRadius: 8, padding: "48px 56px", maxWidth: 480, textAlign: "center", margin: 20 },
};

export default function AlunadoForm() {
  const [dadosGerais, setDadosGerais] = useState({
    nome: "", endereco: "", telefone: "",
    responsavel: "", data_inicio: "", data_recebimento: "", tipo_frete: "CIF",
  });
  const [series, setSeries] = useState([]);
  const [calendario, setCalendario] = useState(null);
  const [calendarioPreview, setCalendarioPreview] = useState(null);
  const [responsavel, setResponsavel] = useState("");
  const canvasRef = useRef(null);
  const [assinando, setAssinando] = useState(false);
  const [assinaturaFeita, setAssinaturaFeita] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const totalAlunos = series.reduce(
    (acc, s) => acc + s.turmas.reduce((a, t) => a + (parseInt(t.num_alunos) || 0), 0), 0
  );
  const cluster = calcularCluster(totalAlunos);

  function adicionarSerie(serie) {
    if (series.find(s => s.serie === serie)) return;
    setSeries(p => [...p, { serie, turmas: [{ turma: "A", num_alunos: "", professor_maker: "" }] }]);
  }
  function removerSerie(idx) { setSeries(p => p.filter((_, i) => i !== idx)); }
  function adicionarTurma(si) {
    setSeries(p => {
      const u = [...p];
      const prox = TURMAS[u[si].turmas.length] || "?";
      u[si].turmas = [...u[si].turmas, { turma: prox, num_alunos: "", professor_maker: "" }];
      return u;
    });
  }
  function removerTurma(si, ti) {
    setSeries(p => { const u=[...p]; u[si].turmas=u[si].turmas.filter((_,i)=>i!==ti); return u; });
  }
  function atualizarTurma(si, ti, campo, valor) {
    setSeries(p => { const u=[...p]; u[si].turmas[ti]={...u[si].turmas[ti],[campo]:valor}; return u; });
  }

  function handleCalendario(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10*1024*1024) { setErro("Arquivo muito grande. Máximo 10MB."); return; }
    if (!["application/pdf","image/jpeg","image/png"].includes(file.type)) {
      setErro("Formato inválido. Use PDF, JPG ou PNG."); return;
    }
    setCalendario(file);
    setCalendarioPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setErro("");
  }

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx-r.left)*(canvas.width/r.width), y: (cy-r.top)*(canvas.height/r.height) };
  }
  function iniciarDesenho(e) { e.preventDefault(); setAssinando(true); lastPos.current=getPos(e,canvasRef.current); }
  function desenhar(e) {
    e.preventDefault(); if(!assinando) return;
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    const pos=getPos(e,canvas);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y);
    ctx.lineTo(pos.x,pos.y); ctx.strokeStyle="#111"; ctx.lineWidth=2.5;
    ctx.lineCap="round"; ctx.stroke(); lastPos.current=pos; setAssinaturaFeita(true);
  }
  function pararDesenho() { setAssinando(false); }
  function limparAssinatura() {
    const c=canvasRef.current; c.getContext("2d").clearRect(0,0,c.width,c.height); setAssinaturaFeita(false);
  }

  function validar() {
    if (!dadosGerais.nome.trim()) return "Nome da escola é obrigatório.";
    if (!dadosGerais.responsavel.trim()) return "Responsável da escola é obrigatório.";
    if (series.length === 0) return "Adicione pelo menos uma série.";
    for (const s of series) {
      if (s.turmas.length === 0) return `A série '${s.serie}' precisa de ao menos uma turma.`;
      for (const t of s.turmas) {
        if (t.num_alunos === "") return `Preencha os alunos da turma ${t.turma} (${s.serie}).`;
      }
    }
    if (!responsavel.trim()) return "Informe o responsável pelo preenchimento.";
    if (!assinaturaFeita) return "A assinatura digital é obrigatória.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErro("");
    const err = validar(); if (err) { setErro(err); return; }
    setLoading(true);
    try {
      const { data: escola, error: e1 } = await supabase.from("schools")
        .insert([{ nome:dadosGerais.nome, endereco:dadosGerais.endereco, telefone:dadosGerais.telefone,
          responsavel_escola:dadosGerais.responsavel, data_inicio:dadosGerais.data_inicio||null,
          data_recebimento:dadosGerais.data_recebimento||null, tipo_frete:dadosGerais.tipo_frete }])
        .select().single();
      if (e1) throw e1;
      const sid = escola.id;

      for (let i=0; i<series.length; i++) {
        const s = series[i];
        const { data: gc, error: e2 } = await supabase.from("grade_classes")
          .insert([{ school_id:sid, serie:s.serie, ordem:i }]).select().single();
        if (e2) throw e2;
        for (const t of s.turmas) {
          const { error: e3 } = await supabase.from("classes").insert([{
            grade_class_id:gc.id, school_id:sid, turma:t.turma,
            num_alunos:parseInt(t.num_alunos)||0, professor_maker:t.professor_maker||null }]);
          if (e3) throw e3;
        }
      }

      let calUrlPublic = null;
      let calNome = null;
      if (calendario) {
        const ext = calendario.name.split(".").pop();
        const nomeCal = `${sid}_calendario.${ext}`;
        const { error: e4 } = await supabase.storage.from("calendars").upload(nomeCal, calendario);
        if (e4) throw e4;
        const { data: calUrl } = supabase.storage.from("calendars").getPublicUrl(nomeCal);
        calUrlPublic = calUrl.publicUrl;
        calNome = calendario.name;
      }

      const canvas = canvasRef.current;
      const sigBlob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const nomeSig = `${sid}_assinatura.png`;
      const { error: e5 } = await supabase.storage.from("signatures").upload(nomeSig, sigBlob);
      if (e5) throw e5;
      const { data: sigUrl } = supabase.storage.from("signatures").getPublicUrl(nomeSig);

      const { error: e6 } = await supabase.from("alunado_history").insert([{
        school_id:sid, total_alunos:totalAlunos, cluster, responsavel_preenchimento:responsavel,
        assinatura_url:sigUrl.publicUrl, calendario_url:calUrlPublic,
        calendario_nome:calNome, dados_snapshot:{dadosGerais,series,totalAlunos,cluster} }]);
      if (e6) throw e6;

      setSucesso(true);
    } catch (err) {
      console.error(err); setErro("Erro ao enviar: " + (err.message || JSON.stringify(err)));
    } finally { setLoading(false); }
  }

  if (sucesso) return (
    <div style={S.successPage}>
      <div style={S.successCard}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#111", marginBottom: 8 }}>dados enviados!</div>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 28 }}>
          {dadosGerais.nome} — dados enviados com sucesso!
        </div>
        <button style={{ ...S.btn, ...S.btnBlack, padding: "12px 24px", fontSize: 13 }}
          onClick={() => window.location.reload()}>NOVO FORMULÁRIO</button>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logoCircle}>
          <div style={S.logoInner} />
          <div style={S.logoM}>m</div>
        </div>
        <div style={S.logoText}>
          <span style={S.logoMundo}>mundo</span>
          <span style={S.logoMaker}>maker</span>
        </div>
        <div style={S.headerRight}>
          <div style={S.headerTitle}>Sistema de Alunado</div>
          <div style={S.headerSub}>coleta de dados escolares</div>
        </div>
      </div>

      <div style={S.container}>
        <form onSubmit={handleSubmit}>
          {erro && <div style={{ ...S.error, marginTop: 24 }}>⚠ {erro}</div>}

          <div style={S.sectionBlock}>
            <div style={S.sectionHead}>
              <div style={S.sectionNum}>1</div>
              <div style={S.sectionTitle}>Dados Gerais da Escola</div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={S.field}>
                  <label style={S.label}>Nome da Escola *</label>
                  <input style={S.input} value={dadosGerais.nome}
                    onChange={e => setDadosGerais({...dadosGerais, nome:e.target.value})}
                    placeholder="Ex: Colégio São Paulo" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Endereço</label>
                  <input style={S.input} value={dadosGerais.endereco}
                    onChange={e => setDadosGerais({...dadosGerais, endereco:e.target.value})}
                    placeholder="Rua, número, bairro, cidade" />
                </div>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <label style={S.label}>Telefone</label>
                    <input style={S.input} value={dadosGerais.telefone}
                      onChange={e => setDadosGerais({...dadosGerais, telefone:e.target.value})}
                      placeholder="(00) 00000-0000" />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Responsável pelo Recebimento do Material *</label>
                    <input style={S.input} value={dadosGerais.responsavel}
                      onChange={e => setDadosGerais({...dadosGerais, responsavel:e.target.value})}
                      placeholder="Nome do responsável" />
                  </div>
                </div>
                <div style={S.grid3}>
                  <div style={S.field}>
                    <label style={S.label}>Data de Início das Aulas</label>
                    <input style={S.input} type="date" value={dadosGerais.data_inicio}
                      onChange={e => setDadosGerais({...dadosGerais, data_inicio:e.target.value})} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Data Desejada para Receber o Material</label>
                    <input style={S.input} type="date" value={dadosGerais.data_recebimento}
                      onChange={e => setDadosGerais({...dadosGerais, data_recebimento:e.target.value})} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Tipo de Frete</label>
                    <select style={S.select} value={dadosGerais.tipo_frete}
                      onChange={e => setDadosGerais({...dadosGerais, tipo_frete:e.target.value})}>
                      <option value="CIF">CIF — entrega MundoMaker</option>
                      <option value="FOB">FOB — escola retira</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={S.sectionBlock}>
            <div style={S.sectionHead}>
              <div style={S.sectionNum}>2</div>
              <div style={S.sectionTitle}>Séries e Turmas</div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ ...S.label, marginBottom: 10, display: "block" }}>Selecione as séries da escola:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SERIES.map(s => {
                    const ativo = series.find(x => x.serie === s);
                    return (
                      <button key={s} type="button"
                        style={{ ...S.btn, ...(ativo ? S.btnGreen : S.btnOutline), fontSize: 12 }}
                        onClick={() => ativo ? removerSerie(series.findIndex(x=>x.serie===s)) : adicionarSerie(s)}>
                        {ativo ? "✓ " : ""}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {series.map((s, si) => (
                <div key={s.serie} style={{ border: "1.5px solid #e5e5e5", borderRadius: 4, marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ background: "#f5f5f5", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #e5e5e5" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{s.serie}</span>
                    <button type="button" style={{ ...S.btn, ...S.btnDanger, padding: "5px 12px", fontSize: 11 }}
                      onClick={() => removerSerie(si)}>remover série</button>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                      {["TURMA","Nº ALUNOS","PROFESSOR MAKER",""].map((h,i) => (
                        <span key={i} style={{ ...S.label, fontSize: 10 }}>{h}</span>
                      ))}
                    </div>
                    {s.turmas.map((t, ti) => (
                      <div key={ti} style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <div style={{ background: "#39DF18", color: "#000", borderRadius: 4, padding: "9px 0", textAlign: "center", fontWeight: 800, fontSize: 13 }}>{t.turma}</div>
                        <input style={S.input} type="number" min={0} value={t.num_alunos}
                          onChange={e => atualizarTurma(si,ti,"num_alunos",e.target.value)} placeholder="0" />
                        <input style={S.input} value={t.professor_maker}
                          onChange={e => atualizarTurma(si,ti,"professor_maker",e.target.value)} placeholder="Nome do professor" />
                        {ti > 0
                          ? <button type="button" style={{ ...S.btn, ...S.btnDanger, padding: "9px 10px" }}
                              onClick={() => removerTurma(si,ti)}>✕</button>
                          : <div />
                        }
                      </div>
                    ))}
                    {s.turmas.length < 16 && (
                      <button type="button" style={{ ...S.btn, ...S.btnOutline, fontSize: 12, marginTop: 4 }}
                        onClick={() => adicionarTurma(si)}>
                        + Turma {TURMAS[s.turmas.length] || ""}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {series.length > 0 && (
                <div style={{ background: "#111", borderRadius: 4, padding: "20px 24px", marginTop: 8 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#39DF18", lineHeight: 1 }}>{totalAlunos}</div>
                  <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>total de alunos</div>
                </div>
              )}
            </div>
          </div>

          <div style={S.sectionBlock}>
            <div style={S.sectionHead}>
              <div style={S.sectionNum}>3</div>
              <div style={S.sectionTitle}>Calendário Escolar <span style={{fontWeight:400, fontSize:11, opacity:0.6}}>(opcional)</span></div>
            </div>
            <div style={S.sectionBody}>
              <div style={S.uploadArea} onClick={() => document.getElementById("cal-input").click()}>
                <input id="cal-input" type="file" accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }} onChange={handleCalendario} />
                {calendario ? (
                  <>
                    {calendarioPreview && <img src={calendarioPreview} alt="preview" style={{ maxHeight: 100, borderRadius: 4, marginBottom: 10 }} />}
                    <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>✓ {calendario.name}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{(calendario.size/1024).toFixed(1)} KB — clique para trocar</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>Clique para anexar o calendário</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>PDF, JPG ou PNG — máx. 10MB</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={S.sectionBlock}>
            <div style={S.sectionHead}>
              <div style={S.sectionNum}>4</div>
              <div style={S.sectionTitle}>Responsável pelo Preenchimento</div>
            </div>
            <div style={S.sectionBody}>
              <div style={S.field}>
                <label style={S.label}>Nome completo *</label>
                <input style={S.input} value={responsavel}
                  onChange={e => setResponsavel(e.target.value)}
                  placeholder="Quem está preenchendo este formulário?" />
              </div>
            </div>
          </div>

          <div style={S.sectionBlock}>
            <div style={S.sectionHead}>
              <div style={S.sectionNum}>5</div>
              <div style={S.sectionTitle}>Assinatura Digital</div>
            </div>
            <div style={S.sectionBody}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Assine abaixo com o mouse ou dedo (touch):</div>
              <canvas ref={canvasRef} width={760} height={160} style={S.canvas}
                onMouseDown={iniciarDesenho} onMouseMove={desenhar}
                onMouseUp={pararDesenho} onMouseLeave={pararDesenho}
                onTouchStart={iniciarDesenho} onTouchMove={desenhar} onTouchEnd={pararDesenho}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <button type="button" style={{ ...S.btn, ...S.btnDanger }} onClick={limparAssinatura}>Limpar</button>
                {assinaturaFeita && <span style={{ fontSize: 12, fontWeight: 700, color: "#1a7a05" }}>✓ Assinatura capturada</span>}
              </div>
            </div>
          </div>

          <button type="submit" style={S.btnSubmit} disabled={loading}>
            {loading ? "ENVIANDO..." : "ENVIAR FORMULÁRIO"}
          </button>
        </form>
      </div>
    </div>
  );
}