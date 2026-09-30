// v2.1 - aba reunioes
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const font = "'Figtree','Circular Std','Segoe UI',system-ui,sans-serif";
const fontB = "'Barlow','DIN Round Pro','Segoe UI',system-ui,sans-serif";

const VERDE = "#39DF18";
const PRETO = "#231F20";
const CLUSTERS = [
  ["Diamante", "#00C7F4"],
  ["Ouro", "#FFD902"],
  ["Prata", "#C7C8CA"],
  ["Bronze", "#D9822B"],
];
const CLUSTER_COLOR = Object.fromEntries(CLUSTERS);
const STATUS_OPTS = ["Ativo", "Inativo"];
const TIPO_OPTS = ["MakerLab", "MakerLab Class", "MakerLab Oficina", "TechLab"];
const IDIOMA_OPTS = ["Português", "Inglês"];
const PERIOD_OPTS = ["Semanal", "Quinzenal", "Mensal"];
const SERIES_KEYS = ["ei","s1","s2","s3","s4","s5","s6","s7","s8","s9","em1","em2","em3"];
const SERIES_LABEL = { ei:"Ed. Infantil",s1:"1º ano",s2:"2º ano",s3:"3º ano",s4:"4º ano",s5:"5º ano",s6:"6º ano",s7:"7º ano",s8:"8º ano",s9:"9º ano",em1:"1º EM",em2:"2º EM",em3:"3º EM" };

function gerarId(nome) {
  return nome.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function pendencias(s) {
  const items = [];
  const divs = (s.divergencias||[]).filter(d=>!d.conferido);
  if (divs.length) items.push(`${divs.length} divergência(s) não conferida(s)`);
  const tot = SERIES_KEYS.filter(k=>!["em1","em2","em3"].includes(k)).reduce((a,k)=>a+(Number(s.series?.[k])||0),0);
  if (s.totalInformado && tot !== Number(s.totalInformado)) items.push(`Total de alunos (${tot}) ≠ totalInformado (${s.totalInformado})`);
  if (s.status==="Ativo" && s.validade && new Date(s.validade)<new Date()) items.push("Contrato vencido");
  if (s.status==="Ativo" && !s.cluster) items.push("Sem cluster");
  return items;
}

// ── Modal genérico ──────────────────────────────────────────────
function Modal({ title, fields, values, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const f = {};
    fields.forEach(({ key, type, defaultValue }) => {
      f[key] = values?.[key] ?? defaultValue ?? (type==="checkbox" ? false : "");
    });
    return f;
  });

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(35,31,32,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999 }}>
      <div style={{ background:"#fff",borderRadius:8,width:"min(640px,94vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",borderTop:`6px solid ${VERDE}` }}>
        <div style={{ padding:"20px 22px 8px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontSize:22,fontWeight:800,fontFamily:font,textTransform:"lowercase" }}>{title}</div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#888" }}>×</button>
        </div>
        <div style={{ padding:"8px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,overflowY:"auto",maxHeight:"60vh" }}>
          {fields.map(({ key, label, type="text", options, full }) => (
            <label key={key} style={{ display:"flex",flexDirection:"column",gap:4,fontSize:11,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase",color:"#6D6E71", ...(full ? {gridColumn:"1/-1"} : {}) }}>
              {label}
              {type==="select" ? (
                <select value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})}
                  style={{ border:"2px solid #DCDDDE",borderRadius:6,padding:"8px 10px",fontSize:14,fontFamily:fontB,textTransform:"none",letterSpacing:0 }}>
                  <option value="">—</option>
                  {options.map(o=><option key={o}>{o}</option>)}
                </select>
              ) : type==="textarea" ? (
                <textarea value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})}
                  style={{ border:"2px solid #DCDDDE",borderRadius:6,padding:"8px 10px",fontSize:14,fontFamily:fontB,minHeight:80,resize:"vertical",textTransform:"none",letterSpacing:0 }}/>
              ) : type==="checkbox" ? (
                <input type="checkbox" checked={!!form[key]} onChange={e=>setForm({...form,[key]:e.target.checked})}
                  style={{ width:18,height:18,accentColor:VERDE,marginTop:4 }}/>
              ) : (
                <input type={type} value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})}
                  style={{ border:"2px solid #DCDDDE",borderRadius:6,padding:"8px 10px",fontSize:14,fontFamily:fontB,textTransform:"none",letterSpacing:0 }}/>
              )}
            </label>
          ))}
        </div>
        <div style={{ padding:"14px 22px 20px",display:"flex",gap:8,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 18px",border:"2px solid #DCDDDE",borderRadius:6,fontSize:14,fontFamily:font,cursor:"pointer",background:"#fff",fontWeight:700 }}>Cancelar</button>
          <button onClick={()=>onSave(form)} style={{ padding:"10px 20px",background:VERDE,border:"none",borderRadius:6,fontSize:14,fontWeight:800,fontFamily:font,cursor:"pointer" }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm ──────────────────────────────────────────────────────
function Confirm({ msg, onConfirm, onClose, okLabel="Remover" }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(35,31,32,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#fff",borderRadius:8,width:"min(400px,90vw)",padding:28,borderTop:`6px solid #D81E27` }}>
        <div style={{ fontSize:16,fontFamily:fontB,marginBottom:20 }}>{msg}</div>
        <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 16px",border:"2px solid #DCDDDE",borderRadius:6,fontSize:14,fontFamily:font,cursor:"pointer",background:"#fff",fontWeight:700 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding:"9px 16px",background:"#D81E27",border:"none",borderRadius:6,fontSize:14,fontWeight:800,fontFamily:font,cursor:"pointer",color:"#fff" }}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Seção de lista (Contatos, Formação, Observações) ─────────────
function ListSection({ title, items=[], fields, onAdd, onEdit, onRemove, canWrite }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
        <h3 style={{ fontSize:20,fontWeight:800,fontFamily:font,textTransform:"lowercase",margin:0 }}>{title}</h3>
        {canWrite && <button onClick={onAdd} style={{ background:VERDE,border:"none",borderRadius:6,padding:"6px 14px",fontSize:13,fontWeight:800,fontFamily:font,cursor:"pointer" }}>+ Adicionar</button>}
      </div>
      {items.length===0 ? (
        <div style={{ color:"#6D6E71",fontStyle:"italic",fontSize:14 }}>Nenhum registro.</div>
      ) : (
        <div style={{ overflowX:"auto",border:"1px solid #DCDDDE",borderRadius:6 }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
            <thead>
              <tr style={{ background:"#F1F2F2" }}>
                {fields.map(f=><th key={f.key} style={{ padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase",color:"#6D6E71",whiteSpace:"nowrap" }}>{f.label}</th>)}
                {canWrite && <th style={{ width:80 }}></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={i} style={{ borderTop:"1px solid #DCDDDE" }}>
                  {fields.map(f=>(
                    <td key={f.key} style={{ padding:"8px 12px",verticalAlign:"top" }}>
                      {f.type==="checkbox" ? (item[f.key]?"✓":"—") : (item[f.key]||"—")}
                    </td>
                  ))}
                  {canWrite && (
                    <td style={{ padding:"4px 8px",textAlign:"right",whiteSpace:"nowrap" }}>
                      <button onClick={()=>onEdit(i)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:font,color:"#6D6E71",padding:"4px 6px",borderRadius:4 }}>✏️</button>
                      <button onClick={()=>onRemove(i)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:font,color:"#D81E27",padding:"4px 6px",borderRadius:4 }}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Campo de display ─────────────────────────────────────────────
function Field({ label, value }) {
  return (
    <div style={{ minWidth:0 }}>
      <dt style={{ fontSize:11,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase",color:"#6D6E71" }}>{label}</dt>
      <dd style={{ margin:"3px 0 0",fontWeight:600,overflowWrap:"anywhere",fontFamily:fontB,...(!value ? {color:"#6D6E71",fontWeight:400,fontStyle:"italic"} : {}) }}>{value||"—"}</dd>
    </div>
  );
}

// ── Alunado tab (dados ao vivo) ───────────────────────────────────
function serieParaChave(serie) {
  const s = (serie||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
  if (/infant|^ei$|ed.*infant|^g\d/.test(s)) return "ei";
  if (/^1[º°o]?\s*(ano|serie)|^primeiro/.test(s)) return "s1";
  if (/^2[º°o]?\s*(ano|serie)|^segundo/.test(s)) return "s2";
  if (/^3[º°o]?\s*(ano|serie)|^terceiro/.test(s)) return "s3";
  if (/^4[º°o]?\s*(ano|serie)|^quarto/.test(s)) return "s4";
  if (/^5[º°o]?\s*(ano|serie)|^quinto/.test(s)) return "s5";
  if (/^6[º°o]?\s*(ano|serie)|^sexto/.test(s)) return "s6";
  if (/^7[º°o]?\s*(ano|serie)|^setimo/.test(s)) return "s7";
  if (/^8[º°o]?\s*(ano|serie)|^oitavo/.test(s)) return "s8";
  if (/^9[º°o]?\s*(ano|serie)|^nono/.test(s)) return "s9";
  if (/^1[º°o]?\s*(em|serie.*med|medio)/.test(s)) return "em1";
  if (/^2[º°o]?\s*(em|serie.*med|medio)/.test(s)) return "em2";
  if (/^3[º°o]?\s*(em|serie.*med|medio)/.test(s)) return "em3";
  return null;
}

function AlunadoTab({ escola, supabaseClient, onEditContrato, onEditMatriz }) {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!escola) return;
    setLoading(true);
    (async () => {
      // 1. Busca schools vinculadas
      const { data: schools } = await supabaseClient
        .from("schools").select("id").eq("escola_base_id", escola.id);
      const ids = (schools||[]).map(s=>s.id);
      if (!ids.length) { setLiveData({}); setLoading(false); return; }

      // 2. grade_classes + classes
      const [{ data: gcs }, { data: cls }] = await Promise.all([
        supabaseClient.from("grade_classes").select("id, serie").in("school_id", ids),
        supabaseClient.from("classes").select("grade_class_id, num_alunos").in("school_id", ids),
      ]);

      // 3. Agrupa num_alunos por grade_class_id
      const alunosPorGC = {};
      (cls||[]).forEach(c => { alunosPorGC[c.grade_class_id] = (alunosPorGC[c.grade_class_id]||0) + (c.num_alunos||0); });

      // 4. Soma por chave de série
      const porChave = {};
      (gcs||[]).forEach(gc => {
        const chave = serieParaChave(gc.serie);
        if (chave) porChave[chave] = (porChave[chave]||0) + (alunosPorGC[gc.id]||0);
      });
      setLiveData(porChave);
      setLoading(false);
    })();
  }, [escola, supabaseClient]);

  const series = liveData || {};
  const matriz = escola.seriesMatriz || {};
  const total = SERIES_KEYS.filter(k=>!["em1","em2","em3"].includes(k)).reduce((a,k)=>a+(series[k]||0),0);
  const totalComEM = SERIES_KEYS.reduce((a,k)=>a+(series[k]||0),0);
  const diff = totalComEM - (Number(escola.contratoAlunado)||0);
  const seriesComDados = SERIES_KEYS.filter(k=>(series[k]||0)>0||(matriz[k]!=null&&matriz[k]!==""));

  if (loading) return <div style={{ color:"#aaa",padding:20 }}>Carregando...</div>;

  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20 }}>
        {[
          {label:"EI ao 9º", value:total},
          {label:"Com Ensino Médio", value:totalComEM},
          {label:"Contrato", value:escola.contratoAlunado||"—"},
          {label:"Diferença", value:diff>0?"+"+diff:diff, destaque:diff!==0},
        ].map(st=>(
          <div key={st.label} style={{ background:"#F1F2F2",borderRadius:6,padding:"14px 16px" }}>
            <b style={{ fontSize:26,fontWeight:800,fontFamily:font,display:"block",color:st.destaque?"#D81E27":"#231F20" }}>{st.value}</b>
            <span style={{ fontSize:13,color:"#6D6E71",fontFamily:fontB }}>{st.label}</span>
          </div>
        ))}
      </div>
      {seriesComDados.length === 0 && !loading && (
        <div style={{ color:"#aaa",fontSize:13,marginBottom:12 }}>Nenhuma turma cadastrada vinculada a esta escola.</div>
      )}
      {seriesComDados.length > 0 && (
        <div style={{ overflowX:"auto",border:"1px solid #DCDDDE",borderRadius:6,marginBottom:12 }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14 }}>
            <thead>
              <tr style={{ background:"#F1F2F2" }}>
                {["Série","Alunos","Matriz"].map(h=>(
                  <th key={h} style={{ padding:"8px 12px",textAlign:h==="Série"?"left":"right",fontSize:11,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase",color:"#6D6E71" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seriesComDados.map(k=>(
                <tr key={k} style={{ borderTop:"1px solid #DCDDDE" }}>
                  <td style={{ padding:"8px 12px",fontWeight:600 }}>{SERIES_LABEL[k]}</td>
                  <td style={{ padding:"8px 12px",textAlign:"right",fontVariantNumeric:"tabular-nums" }}>{series[k]||"—"}</td>
                  <td style={{ padding:"8px 12px",textAlign:"right",color:"#6D6E71",fontVariantNumeric:"tabular-nums" }}>{matriz[k]??""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap" }}>
        <button onClick={onEditMatriz} style={{ background:"none",border:"2px solid #DCDDDE",borderRadius:6,padding:"6px 14px",fontSize:13,fontWeight:700,fontFamily:font,cursor:"pointer" }}>
          Editar Matriz
        </button>
        <button onClick={onEditContrato} style={{ background:"none",border:"2px solid #DCDDDE",borderRadius:6,padding:"6px 14px",fontSize:13,fontWeight:700,fontFamily:font,cursor:"pointer" }}>
          Editar Contrato
        </button>
      </div>
    </div>
  );
}

// ── Projetos / Links tab ─────────────────────────────────────────
function ProjetosTab({ escola, supabaseClient }) {
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoProj, setNovoProj] = useState({ serie:"",intro:"",envio_1:"",envio_2:"",envio_3:"" });
  const [salvando, setSalvando] = useState(false);
  const BASE_URL = window.location.origin;

  useEffect(() => {
    if (!escola) return;
    setLoading(true);
    supabaseClient.from("projetos_escola").select("*").eq("escola_id", escola.id).order("serie")
      .then(({ data }) => { setProjetos(data||[]); setLoading(false); });
  }, [escola, supabaseClient]);

  async function salvarProjeto(proj) {
    setSalvando(true);
    if (proj.id) {
      await supabaseClient.from("projetos_escola").update({ intro:proj.intro||null,envio_1:proj.envio_1||null,envio_2:proj.envio_2||null,envio_3:proj.envio_3||null }).eq("id", proj.id);
    } else {
      const { data } = await supabaseClient.from("projetos_escola").insert([{ escola_id:escola.id, serie:proj.serie, intro:proj.intro||null, envio_1:proj.envio_1||null, envio_2:proj.envio_2||null, envio_3:proj.envio_3||null }]).select().single();
      if (data) setProjetos(p=>[...p,data]);
    }
    setSalvando(false);
  }

  async function adicionarSerie() {
    if (!novoProj.serie.trim()) return;
    await salvarProjeto(novoProj);
    const { data } = await supabaseClient.from("projetos_escola").select("*").eq("escola_id", escola.id).order("serie");
    setProjetos(data||[]);
    setNovoProj({ serie:"",intro:"",envio_1:"",envio_2:"",envio_3:"" });
  }

  async function removerSerie(id) {
    await supabaseClient.from("projetos_escola").delete().eq("id", id);
    setProjetos(p=>p.filter(x=>x.id!==id));
  }

  function copiarLink(envio) {
    navigator.clipboard.writeText(`${BASE_URL}/formulario?escola=${escola.id}&envio=${envio}`);
  }

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
        {[1,2,3].map(n=>(
          <button key={n} onClick={()=>copiarLink(n)}
            style={{ background:VERDE,color:PRETO,border:"none",borderRadius:6,padding:"8px 16px",fontSize:13,fontWeight:800,fontFamily:font,cursor:"pointer" }}>
            📋 Copiar Link {n}º Envio
          </button>
        ))}
      </div>
      {loading ? <div style={{ color:"#aaa" }}>Carregando...</div> : (
        <div style={{ overflowX:"auto",border:"1px solid #DCDDDE",borderRadius:6,marginBottom:20 }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
            <thead>
              <tr style={{ background:"#F1F2F2" }}>
                {["Série","Introdutório","1º Envio","2º Envio","3º Envio",""].map((h,i)=>(
                  <th key={i} style={{ padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase",color:"#6D6E71" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projetos.map((p,i)=>(
                <ProjRow key={p.id||i} proj={p} onSave={salvarProjeto} onRemove={()=>removerSerie(p.id)} salvando={salvando}/>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ background:"#F1F2F2",borderRadius:6,padding:16 }}>
        <div style={{ fontSize:11,fontWeight:700,fontFamily:font,textTransform:"uppercase",color:"#6D6E71",marginBottom:10 }}>Adicionar Série</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr auto",gap:8 }}>
          {["Série","Introdutório","1º Envio","2º Envio","3º Envio"].map((ph,i)=>{
            const keys=["serie","intro","envio_1","envio_2","envio_3"];
            return (
              <input key={i} value={novoProj[keys[i]]} onChange={e=>setNovoProj({...novoProj,[keys[i]]:e.target.value})}
                placeholder={ph} style={{ padding:"8px 10px",border:"1.5px solid #DCDDDE",borderRadius:4,fontSize:12,fontFamily:fontB }}/>
            );
          })}
          <button onClick={adicionarSerie} disabled={!novoProj.serie.trim()}
            style={{ background:VERDE,color:PRETO,border:"none",borderRadius:4,padding:"8px 14px",fontSize:12,fontWeight:800,fontFamily:font,cursor:"pointer",whiteSpace:"nowrap" }}>
            + Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjRow({ proj, onSave, onRemove, salvando }) {
  const [vals, setVals] = useState({ intro:proj.intro||"",envio_1:proj.envio_1||"",envio_2:proj.envio_2||"",envio_3:proj.envio_3||"" });
  const [editando, setEditando] = useState(false);
  const [saved, setSaved] = useState(false);

  async function salvar() {
    await onSave({...proj,...vals});
    setEditando(false); setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  }

  const inpStyle = { padding:"4px 6px",border:"1px solid #DCDDDE",borderRadius:4,fontSize:12,fontFamily:fontB,width:"100%" };

  return (
    <tr style={{ borderTop:"1px solid #DCDDDE" }}>
      <td style={{ padding:"8px 12px",fontWeight:700 }}>{proj.serie}</td>
      {["intro","envio_1","envio_2","envio_3"].map(k=>(
        <td key={k} style={{ padding:"6px 12px" }}>
          {editando
            ? <input value={vals[k]} onChange={e=>setVals({...vals,[k]:e.target.value})} style={inpStyle}/>
            : <span style={{ color:vals[k]?"#231F20":"#aaa",fontStyle:vals[k]?"normal":"italic" }}>{vals[k]||"—"}</span>
          }
        </td>
      ))}
      <td style={{ padding:"6px 8px",textAlign:"right",whiteSpace:"nowrap" }}>
        {editando ? (
          <>
            <button onClick={salvar} disabled={salvando} style={{ background:VERDE,border:"none",borderRadius:4,padding:"4px 10px",fontSize:11,fontWeight:800,fontFamily:font,cursor:"pointer",marginRight:4 }}>
              {saved?"✓":"Salvar"}
            </button>
            <button onClick={()=>setEditando(false)} style={{ background:"none",border:"1px solid #ddd",borderRadius:4,padding:"4px 8px",fontSize:11,cursor:"pointer" }}>✕</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEditando(true)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#6D6E71",padding:"4px 6px" }}>✏️</button>
            <button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#D81E27",padding:"4px 6px" }}>✕</button>
          </>
        )}
      </td>
    </tr>
  );
}

// ── Pendências Tab ────────────────────────────────────────────────
function PendenciasTab({ escola, onSave, autor }) {
  const alertas  = pendencias(escola);           // auto-geradas pelo sistema
  const manuais  = escola.pendencias_manuais || [];
  const abertas  = manuais.filter(p => !p.concluida);
  const concluidas = manuais.filter(p => p.concluida);
  const divs     = escola.divergencias || [];

  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo]     = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo]       = useState("");
  const [salvando, setSalvando] = useState(false);

  const VERDE_L = "#39DF18";
  const PRETO_L = "#231F20";

  function fmtData(str) {
    if (!str) return "";
    try { return new Date(str + "T12:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }); }
    catch { return str; }
  }

  function isVencida(prazo) {
    if (!prazo) return false;
    return new Date(prazo + "T23:59:59") < new Date();
  }

  async function adicionar() {
    if (!titulo.trim()) return;
    setSalvando(true);
    const nova = {
      id:         Date.now().toString(),
      titulo:     titulo.trim(),
      descricao:  descricao.trim(),
      prazo:      prazo || null,
      criado_em:  new Date().toISOString(),
      autor:      autor || "—",
      concluida:  false,
      concluida_em:  null,
      concluida_por: null,
    };
    await onSave(escola.id, { pendencias_manuais: [...manuais, nova] });
    setTitulo(""); setDescricao(""); setPrazo(""); setShowForm(false);
    setSalvando(false);
  }

  async function concluir(id) {
    const updated = manuais.map(p =>
      p.id === id ? { ...p, concluida: true, concluida_em: new Date().toISOString(), concluida_por: autor } : p
    );
    await onSave(escola.id, { pendencias_manuais: updated });
  }

  async function reabrir(id) {
    const updated = manuais.map(p =>
      p.id === id ? { ...p, concluida: false, concluida_em: null, concluida_por: null } : p
    );
    await onSave(escola.id, { pendencias_manuais: updated });
  }

  async function remover(id) {
    await onSave(escola.id, { pendencias_manuais: manuais.filter(p => p.id !== id) });
  }

  const inpStyle = { width:"100%", border:"1.5px solid #DCDDDE", borderRadius:6, padding:"9px 12px", fontSize:13, fontFamily:fontB, boxSizing:"border-box" };

  return (
    <div>
      {/* Alertas do sistema */}
      {alertas.length === 0 && abertas.length === 0 ? (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, padding:16, color:"#148A00", fontWeight:700, marginBottom:20 }}>
          ✓ Nenhuma pendência em aberto
        </div>
      ) : alertas.length > 0 ? (
        <div style={{ marginBottom:20 }}>
          {alertas.map((p, i) => (
            <div key={i} style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6, padding:"10px 14px", color:"#D81E27", fontWeight:600, marginBottom:8 }}>
              ⚠ {p}
            </div>
          ))}
        </div>
      ) : null}

      {/* Botão nova pendência */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <h3 style={{ fontSize:16, fontWeight:800, fontFamily:font, textTransform:"lowercase", margin:0 }}>
          pendências manuais {abertas.length > 0 && <span style={{ background:"#D81E27", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:12, marginLeft:6 }}>{abertas.length}</span>}
        </h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ background:VERDE_L, color:PRETO_L, border:"none", borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:800, fontFamily:font, cursor:"pointer" }}>
            + Nova Pendência
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{ background:"#fff", borderRadius:8, border:"1.5px solid #DCDDDE", padding:18, marginBottom:18 }}>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, fontFamily:font, textTransform:"uppercase", letterSpacing:".05em", color:"#6D6E71", display:"block", marginBottom:5 }}>Título *</label>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ex: Contrato não assinado" style={inpStyle} />
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, fontFamily:font, textTransform:"uppercase", letterSpacing:".05em", color:"#6D6E71", display:"block", marginBottom:5 }}>Descrição</label>
            <textarea value={descricao} onChange={e=>setDescricao(e.target.value)} rows={3} placeholder="Detalhes da pendência..." style={{ ...inpStyle, resize:"vertical" }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, fontFamily:font, textTransform:"uppercase", letterSpacing:".05em", color:"#6D6E71", display:"block", marginBottom:5 }}>Prazo (opcional)</label>
            <input type="date" value={prazo} onChange={e=>setPrazo(e.target.value)} style={{ ...inpStyle, width:"auto" }} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={() => { setShowForm(false); setTitulo(""); setDescricao(""); setPrazo(""); }}
              style={{ background:"none", border:"1.5px solid #DCDDDE", borderRadius:6, padding:"7px 14px", fontSize:12, fontWeight:700, fontFamily:font, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={adicionar} disabled={salvando || !titulo.trim()}
              style={{ background:VERDE_L, color:PRETO_L, border:"none", borderRadius:6, padding:"7px 18px", fontSize:12, fontWeight:800, fontFamily:font, cursor:"pointer", opacity:!titulo.trim()?0.5:1 }}>
              {salvando ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {/* Abertas */}
      {abertas.length === 0 && !showForm && (
        <div style={{ color:"#aaa", fontSize:13, fontFamily:font, padding:"8px 0 20px" }}>Nenhuma pendência manual em aberto.</div>
      )}
      {abertas.map(p => (
        <div key={p.id} style={{ background:"#fff", borderRadius:8, border:`1.5px solid ${isVencida(p.prazo)?"#fecaca":"#DCDDDE"}`, marginBottom:10, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:isVencida(p.prazo)?"#D81E27":"#FFA300", flexShrink:0, marginTop:5 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, fontFamily:font, color:PRETO_L }}>{p.titulo}</div>
              {p.descricao && <div style={{ fontSize:13, fontFamily:fontB, color:"#444", marginTop:4, whiteSpace:"pre-wrap" }}>{p.descricao}</div>}
              <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, color:"#888", fontFamily:font }}>Criado por <strong>{p.autor}</strong> em {fmtData(p.criado_em?.slice(0,10))}</span>
                {p.prazo && (
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:font, color:isVencida(p.prazo)?"#D81E27":"#888" }}>
                    {isVencida(p.prazo) ? "⚠ Vencido em " : "Prazo: "}{fmtData(p.prazo)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button onClick={() => concluir(p.id)}
                style={{ background:VERDE_L, color:PRETO_L, border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:800, fontFamily:font, cursor:"pointer" }}>
                ✓ Concluir
              </button>
              <button onClick={() => remover(p.id)}
                style={{ background:"none", border:"1px solid #fecaca", color:"#D81E27", borderRadius:6, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Histórico (concluídas) */}
      {concluidas.length > 0 && (
        <div style={{ marginTop:28 }}>
          <h3 style={{ fontSize:15, fontWeight:800, fontFamily:font, textTransform:"lowercase", margin:"0 0 12px", color:"#888" }}>
            histórico de concluídas ({concluidas.length})
          </h3>
          {[...concluidas].reverse().map(p => (
            <div key={p.id} style={{ background:"#f9f9f9", borderRadius:8, border:"1px solid #e8e8e8", marginBottom:8, padding:"10px 16px", display:"flex", gap:12, alignItems:"flex-start", opacity:0.8 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:VERDE_L, flexShrink:0, marginTop:5 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, fontFamily:font, color:"#555", textDecoration:"line-through" }}>{p.titulo}</div>
                {p.descricao && <div style={{ fontSize:12, fontFamily:fontB, color:"#888", marginTop:2 }}>{p.descricao}</div>}
                <div style={{ fontSize:11, color:"#aaa", fontFamily:font, marginTop:4 }}>
                  Concluída por <strong style={{ color:"#666" }}>{p.concluida_por}</strong> em {fmtData(p.concluida_em?.slice(0,10))}
                </div>
              </div>
              <button onClick={() => reabrir(p.id)} title="Reabrir pendência"
                style={{ background:"none", border:"1px solid #DCDDDE", borderRadius:6, padding:"4px 10px", fontSize:11, color:"#888", cursor:"pointer", flexShrink:0 }}>
                Reabrir
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Divergências do sistema */}
      {divs.length > 0 && (
        <div style={{ marginTop:28 }}>
          <h3 style={{ fontSize:15, fontWeight:800, fontFamily:font, textTransform:"lowercase", margin:"0 0 12px" }}>divergências detectadas</h3>
          <div style={{ overflowX:"auto", border:"1px solid #DCDDDE", borderRadius:6 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F1F2F2" }}>
                  {["Campo","Cadastro","Matriz","Órbita","Conferido"].map(h=>(
                    <th key={h} style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, fontFamily:font, letterSpacing:".05em", textTransform:"uppercase", color:"#6D6E71" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {divs.map((d, i) => (
                  <tr key={i} style={{ borderTop:"1px solid #DCDDDE" }}>
                    <td style={{ padding:"7px 12px", fontWeight:600 }}>{d.campo}</td>
                    <td style={{ padding:"7px 12px" }}>{d.cadastro||"—"}</td>
                    <td style={{ padding:"7px 12px" }}>{d.matriz||"—"}</td>
                    <td style={{ padding:"7px 12px" }}>{d.orbita||"—"}</td>
                    <td style={{ padding:"7px 12px" }}>
                      <input type="checkbox" checked={!!d.conferido} onChange={async e => {
                        const newDivs = [...divs];
                        newDivs[i] = { ...d, conferido: e.target.checked };
                        await onSave(escola.id, { divergencias: newDivs });
                      }} style={{ accentColor:VERDE_L }} />
                    </td>
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

// ── Histórico Tab ─────────────────────────────────────────────────
async function baixarArquivo(url, nome) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = nome || "arquivo";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

function HistoricoTab({ escola, supabaseClient, autor, onSave }) {
  const [texto, setTexto]       = useState("");
  const [midias, setMidias]     = useState([]); // [{file, preview, tipo}]
  const [docs, setDocs]         = useState([]); // [{file}]
  const [salvando, setSalvando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandImg, setExpandImg] = useState(null); // { url, nome }
  const midiaRef = useRef();
  const docRef   = useRef();

  const posts = [...(escola.observacoes || [])].sort((a, b) => {
    const da = a.criado_em || a.data || "";
    const db = b.criado_em || b.data || "";
    return db.localeCompare(da);
  });

  function addMidia(e) {
    Array.from(e.target.files).forEach(file => {
      const tipo    = file.type.startsWith("video") ? "video" : "image";
      const preview = URL.createObjectURL(file);
      setMidias(m => [...m, { file, preview, tipo }]);
    });
    e.target.value = "";
  }

  function addDocs(e) {
    setDocs(d => [...d, ...Array.from(e.target.files).map(f => ({ file: f }))]);
    e.target.value = "";
  }

  async function uploadFile(file, pasta) {
    const ext  = file.name.split(".").pop().toLowerCase();
    const path = `${escola.id}/${pasta}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseClient.storage.from("historico-escola").upload(path, file);
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseClient.storage.from("historico-escola").getPublicUrl(path);
    return publicUrl;
  }

  async function publicar() {
    if (!texto.trim() && midias.length === 0 && docs.length === 0) return;
    setSalvando(true);
    try {
      const midiaUp = [];
      for (const m of midias) {
        const url = await uploadFile(m.file, "midia");
        midiaUp.push({ nome: m.file.name, url, tipo: m.tipo });
      }
      const docsUp = [];
      for (const d of docs) {
        const url = await uploadFile(d.file, "docs");
        docsUp.push({ nome: d.file.name, url, tipo: d.file.name.split(".").pop().toLowerCase() });
      }
      const post = {
        id:         Date.now().toString(),
        data:       new Date().toISOString().slice(0, 10),
        criado_em:  new Date().toISOString(),
        autor:      autor || "—",
        texto:      texto.trim(),
        midia:      midiaUp,
        documentos: docsUp,
      };
      await onSave(escola.id, { observacoes: [...(escola.observacoes || []), post] });
      setTexto(""); setMidias([]); setDocs([]); setShowForm(false);
    } catch (err) {
      alert("Erro ao publicar: " + (err.message || "Tente novamente."));
    }
    setSalvando(false);
  }

  function iconeDoc(tipo) {
    if (tipo === "pdf") return "📄";
    if (["doc","docx"].includes(tipo)) return "📝";
    if (["xls","xlsx"].includes(tipo)) return "📊";
    return "📎";
  }

  function fmtData(str) {
    if (!str) return "";
    try {
      return new Date(str).toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
    } catch { return str; }
  }

  const VERDE_LOCAL = "#39DF18";
  const PRETO_LOCAL = "#231F20";

  return (
    <div>
      {/* Botão abrir formulário */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ background: VERDE_LOCAL, color: PRETO_LOCAL, border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 800, fontFamily: font, cursor: "pointer", marginBottom: 20 }}>
          + Nova Publicação
        </button>
      )}

      {/* Formulário nova publicação */}
      {showForm && (
        <div style={{ background: "#fff", borderRadius: 10, border: "1.5px solid #DCDDDE", padding: 20, marginBottom: 20 }}>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Escreva o relato, observação ou atualização..."
            rows={4}
            style={{ width: "100%", border: "1.5px solid #DCDDDE", borderRadius: 6, padding: "10px 12px", fontSize: 14, fontFamily: fontB, resize: "vertical", boxSizing: "border-box" }}
          />

          {/* Preview mídias */}
          {midias.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
              {midias.map((m, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {m.tipo === "image"
                    ? <img src={m.preview} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }} />
                    : <video src={m.preview} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6 }} />
                  }
                  <button onClick={() => setMidias(mm => mm.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, right: -6, background: "#D81E27", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", lineHeight: "18px", textAlign: "center", padding: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preview docs */}
          {docs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
              {docs.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F1F2F2", borderRadius: 4, padding: "5px 10px", fontSize: 12, fontFamily: font }}>
                  <span>{iconeDoc(d.file.name.split(".").pop().toLowerCase())}</span>
                  <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file.name}</span>
                  <button onClick={() => setDocs(dd => dd.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#D81E27", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Inputs ocultos */}
          <input ref={midiaRef} type="file" accept="image/*,video/*" multiple onChange={addMidia} style={{ display: "none" }} />
          <input ref={docRef}   type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple onChange={addDocs} style={{ display: "none" }} />

          {/* Ações */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => midiaRef.current.click()}
              style={{ background: "#F1F2F2", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              📷 Foto / Vídeo
            </button>
            <button onClick={() => docRef.current.click()}
              style={{ background: "#F1F2F2", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              📎 Documento
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setShowForm(false); setTexto(""); setMidias([]); setDocs([]); }}
              style={{ background: "none", border: "1.5px solid #DCDDDE", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={publicar} disabled={salvando || (!texto.trim() && midias.length === 0 && docs.length === 0)}
              style={{ background: VERDE_LOCAL, color: PRETO_LOCAL, border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 800, fontFamily: font, cursor: "pointer", opacity: (!texto.trim() && midias.length === 0 && docs.length === 0) ? 0.5 : 1 }}>
              {salvando ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de posts */}
      {posts.length === 0 && !showForm && (
        <div style={{ color: "#aaa", fontSize: 14, fontFamily: font, padding: "20px 0" }}>Nenhum registro no histórico ainda.</div>
      )}
      {posts.map((post, i) => (
        <div key={post.id || i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #DCDDDE", marginBottom: 14, overflow: "hidden" }}>
          {/* Header do post */}
          <div style={{ padding: "14px 16px 8px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: VERDE_LOCAL, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, fontFamily: font, color: PRETO_LOCAL, flexShrink: 0 }}>
              {(post.autor || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, fontFamily: font }}>{post.autor || "—"}</div>
              <div style={{ fontSize: 11, color: "#888", fontFamily: font }}>{fmtData(post.criado_em || post.data)}</div>
            </div>
          </div>

          {/* Texto */}
          {post.texto && (
            <div style={{ padding: "4px 16px 12px", fontSize: 14, fontFamily: fontB, color: PRETO_LOCAL, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
              {post.texto}
            </div>
          )}

          {/* Galeria de mídias */}
          {(post.midia || []).length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: post.midia.length === 1 ? "1fr" : post.midia.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr",
              gap: 2,
            }}>
              {post.midia.map((m, j) => (
                m.tipo === "video"
                  ? (
                    <div key={j} style={{ position: "relative" }}>
                      <video src={m.url} controls style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
                      <button onClick={() => baixarArquivo(m.url, m.nome)}
                        title="Baixar vídeo"
                        style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: font, padding: "5px 10px", cursor: "pointer" }}>
                        ↓ Baixar
                      </button>
                    </div>
                  ) : (
                    <div key={j} style={{ position: "relative", overflow: "hidden" }}>
                      <img src={m.url} alt={m.nome} onClick={() => setExpandImg({ url: m.url, nome: m.nome })}
                        style={{ width: "100%", height: post.midia.length === 1 ? 340 : 190, objectFit: "cover", cursor: "zoom-in", display: "block" }} />
                      <button onClick={e => { e.stopPropagation(); baixarArquivo(m.url, m.nome); }}
                        title="Baixar imagem"
                        style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.6)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: font, padding: "5px 10px", cursor: "pointer" }}>
                        ↓ Baixar
                      </button>
                    </div>
                  )
              ))}
            </div>
          )}

          {/* Documentos */}
          {(post.documentos || []).length > 0 && (
            <div style={{ padding: "12px 16px", borderTop: (post.midia || []).length > 0 ? "1px solid #F1F2F2" : "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: font, textTransform: "uppercase", letterSpacing: ".05em", color: "#888", marginBottom: 8 }}>Documentos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {post.documentos.map((d, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 1, background: "#F1F2F2", borderRadius: 6, border: "1px solid #DCDDDE", overflow: "hidden" }}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", fontSize: 12, fontFamily: font, color: PRETO_LOCAL, textDecoration: "none", fontWeight: 600 }}>
                      <span style={{ fontSize: 16 }}>{iconeDoc(d.tipo)}</span>
                      <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.nome}</span>
                      <span style={{ fontSize: 11, color: "#888" }}>↗ abrir</span>
                    </a>
                    <button onClick={() => baixarArquivo(d.url, d.nome)}
                      title="Baixar documento"
                      style={{ background: PRETO_LOCAL, border: "none", color: VERDE_LOCAL, fontSize: 11, fontWeight: 800, fontFamily: font, padding: "8px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
                      ↓ Baixar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Lightbox */}
      {expandImg && (
        <div onClick={() => setExpandImg(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <img src={expandImg.url} alt="" style={{ maxWidth: "95vw", maxHeight: "82vh", objectFit: "contain", borderRadius: 8 }} />
          <div style={{ position: "fixed", top: 16, right: 20, display: "flex", gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); baixarArquivo(expandImg.url, expandImg.nome); }}
              style={{ background: VERDE_LOCAL, border: "none", borderRadius: 6, color: PRETO_LOCAL, fontSize: 12, fontWeight: 800, fontFamily: font, padding: "8px 16px", cursor: "pointer" }}>
              ↓ Baixar
            </button>
            <button onClick={() => setExpandImg(null)}
              style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: "36px", textAlign: "center" }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rubricas Tab ──────────────────────────────────────────────────
function RubricasTab({ escola, supabaseClient, autor, onSave }) {
  const [texto, setTexto]           = useState("");
  const [dataObs, setDataObs]       = useState(new Date().toISOString().slice(0, 10));
  const [acompanhou, setAcompanhou] = useState("");
  const [midias, setMidias]         = useState([]);
  const [docs, setDocs]             = useState([]);
  const [salvando, setSalvando]     = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [expandImg, setExpandImg]   = useState(null);
  const midiaRef = useRef();
  const docRef   = useRef();

  const posts = [...(escola.rubricas || [])].sort((a, b) => {
    const da = a.criado_em || a.dataObs || "";
    const db = b.criado_em || b.dataObs || "";
    return db.localeCompare(da);
  });

  function addMidia(e) {
    Array.from(e.target.files).forEach(file => {
      const tipo    = file.type.startsWith("video") ? "video" : "image";
      const preview = URL.createObjectURL(file);
      setMidias(m => [...m, { file, preview, tipo }]);
    });
    e.target.value = "";
  }

  function addDocs(e) {
    setDocs(d => [...d, ...Array.from(e.target.files).map(f => ({ file: f }))]);
    e.target.value = "";
  }

  async function uploadFile(file, pasta) {
    const ext  = file.name.split(".").pop().toLowerCase();
    const path = `${escola.id}/rubricas/${pasta}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseClient.storage.from("historico-escola").upload(path, file);
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabaseClient.storage.from("historico-escola").getPublicUrl(path);
    return publicUrl;
  }

  async function publicar() {
    if (!texto.trim() && midias.length === 0 && docs.length === 0) return;
    setSalvando(true);
    try {
      const midiaUp = [];
      for (const m of midias) {
        const url = await uploadFile(m.file, "midia");
        midiaUp.push({ nome: m.file.name, url, tipo: m.tipo });
      }
      const docsUp = [];
      for (const d of docs) {
        const url = await uploadFile(d.file, "docs");
        docsUp.push({ nome: d.file.name, url, tipo: d.file.name.split(".").pop().toLowerCase() });
      }
      const post = {
        id:          Date.now().toString(),
        criado_em:   new Date().toISOString(),
        autor:       autor || "—",
        dataObs:     dataObs,
        acompanhou:  acompanhou.trim() || autor || "—",
        texto:       texto.trim(),
        midia:       midiaUp,
        documentos:  docsUp,
      };
      await onSave(escola.id, { rubricas: [...(escola.rubricas || []), post] });
      setTexto(""); setMidias([]); setDocs([]);
      setDataObs(new Date().toISOString().slice(0, 10));
      setAcompanhou(""); setShowForm(false);
    } catch (err) {
      alert("Erro ao publicar: " + (err.message || "Tente novamente."));
    }
    setSalvando(false);
  }

  function iconeDoc(tipo) {
    if (tipo === "pdf") return "📄";
    if (["doc","docx"].includes(tipo)) return "📝";
    if (["xls","xlsx"].includes(tipo)) return "📊";
    return "📎";
  }

  function fmtData(str) {
    if (!str) return "";
    try { return new Date(str + "T12:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" }); }
    catch { return str; }
  }

  const VERDE_L = "#39DF18";
  const PRETO_L = "#231F20";

  const inpStyle = { width:"100%", border:"1.5px solid #DCDDDE", borderRadius:6, padding:"9px 12px", fontSize:13, fontFamily:fontB, boxSizing:"border-box" };

  return (
    <div>
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ background:VERDE_L, color:PRETO_L, border:"none", borderRadius:6, padding:"10px 20px", fontSize:13, fontWeight:800, fontFamily:font, cursor:"pointer", marginBottom:20 }}>
          + Nova Observação de Aula
        </button>
      )}

      {showForm && (
        <div style={{ background:"#fff", borderRadius:10, border:"1.5px solid #DCDDDE", padding:20, marginBottom:20 }}>
          {/* Campos específicos */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, fontFamily:font, textTransform:"uppercase", letterSpacing:".05em", color:"#6D6E71", display:"block", marginBottom:5 }}>
                Data da Observação de Aula
              </label>
              <input type="date" value={dataObs} onChange={e=>setDataObs(e.target.value)} style={inpStyle} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, fontFamily:font, textTransform:"uppercase", letterSpacing:".05em", color:"#6D6E71", display:"block", marginBottom:5 }}>
                Nome de quem acompanhou
              </label>
              <input type="text" value={acompanhou} onChange={e=>setAcompanhou(e.target.value)}
                placeholder={autor || "Nome do acompanhante..."}
                style={inpStyle} />
            </div>
          </div>

          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Descreva as observações, rubricas avaliadas, pontos de atenção..."
            rows={5}
            style={{ ...inpStyle, resize:"vertical", display:"block" }}
          />

          {midias.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, margin:"12px 0" }}>
              {midias.map((m, i) => (
                <div key={i} style={{ position:"relative" }}>
                  {m.tipo === "image"
                    ? <img src={m.preview} alt="" style={{ width:80, height:80, objectFit:"cover", borderRadius:6 }} />
                    : <video src={m.preview} style={{ width:120, height:80, objectFit:"cover", borderRadius:6 }} />
                  }
                  <button onClick={() => setMidias(mm => mm.filter((_,j)=>j!==i))}
                    style={{ position:"absolute", top:-6, right:-6, background:"#D81E27", color:"#fff", border:"none", borderRadius:"50%", width:18, height:18, fontSize:10, cursor:"pointer", lineHeight:"18px", textAlign:"center", padding:0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {docs.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, margin:"8px 0" }}>
              {docs.map((d, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, background:"#F1F2F2", borderRadius:4, padding:"5px 10px", fontSize:12, fontFamily:font }}>
                  <span>{iconeDoc(d.file.name.split(".").pop().toLowerCase())}</span>
                  <span style={{ maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.file.name}</span>
                  <button onClick={() => setDocs(dd => dd.filter((_,j)=>j!==i))}
                    style={{ background:"none", border:"none", color:"#D81E27", cursor:"pointer", padding:0, fontSize:14, lineHeight:1 }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <input ref={midiaRef} type="file" accept="image/*,video/*" multiple onChange={addMidia} style={{ display:"none" }} />
          <input ref={docRef}   type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple onChange={addDocs} style={{ display:"none" }} />

          <div style={{ display:"flex", gap:8, marginTop:14, alignItems:"center", flexWrap:"wrap" }}>
            <button onClick={() => midiaRef.current.click()}
              style={{ background:"#F1F2F2", border:"none", borderRadius:6, padding:"8px 14px", fontSize:12, fontWeight:700, fontFamily:font, cursor:"pointer" }}>
              📷 Foto / Vídeo
            </button>
            <button onClick={() => docRef.current.click()}
              style={{ background:"#F1F2F2", border:"none", borderRadius:6, padding:"8px 14px", fontSize:12, fontWeight:700, fontFamily:font, cursor:"pointer" }}>
              📎 Documento
            </button>
            <div style={{ flex:1 }} />
            <button onClick={() => { setShowForm(false); setTexto(""); setMidias([]); setDocs([]); setAcompanhou(""); setDataObs(new Date().toISOString().slice(0,10)); }}
              style={{ background:"none", border:"1.5px solid #DCDDDE", borderRadius:6, padding:"8px 14px", fontSize:12, fontWeight:700, fontFamily:font, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={publicar} disabled={salvando || (!texto.trim() && midias.length===0 && docs.length===0)}
              style={{ background:VERDE_L, color:PRETO_L, border:"none", borderRadius:6, padding:"8px 20px", fontSize:12, fontWeight:800, fontFamily:font, cursor:"pointer", opacity:(!texto.trim() && midias.length===0 && docs.length===0)?0.5:1 }}>
              {salvando ? "Publicando..." : "Salvar Observação"}
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 && !showForm && (
        <div style={{ color:"#aaa", fontSize:14, fontFamily:font, padding:"20px 0" }}>Nenhuma observação de aula registrada ainda.</div>
      )}

      {posts.map((post, i) => (
        <div key={post.id || i} style={{ background:"#fff", borderRadius:10, border:"1px solid #DCDDDE", marginBottom:14, overflow:"hidden" }}>
          {/* Header */}
          <div style={{ padding:"14px 16px 10px", display:"flex", gap:10, alignItems:"flex-start", borderBottom:"1px solid #F1F2F2" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#6D6E71", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, fontFamily:font, color:"#fff", flexShrink:0 }}>
              {(post.acompanhou || post.autor || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:13, fontFamily:font }}>{post.acompanhou || post.autor || "—"}</div>
              <div style={{ fontSize:11, color:"#888", fontFamily:font, marginTop:2 }}>Registrado por {post.autor}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, fontWeight:700, fontFamily:font, color:"#555", textTransform:"uppercase", letterSpacing:".04em" }}>Observação de aula</div>
              <div style={{ fontSize:13, fontWeight:800, fontFamily:font, color:PRETO_L, marginTop:2 }}>{fmtData(post.dataObs)}</div>
            </div>
          </div>

          {post.texto && (
            <div style={{ padding:"12px 16px", fontSize:14, fontFamily:fontB, color:PRETO_L, whiteSpace:"pre-wrap", lineHeight:1.55 }}>
              {post.texto}
            </div>
          )}

          {(post.midia || []).length > 0 && (
            <div style={{
              display:"grid",
              gridTemplateColumns: post.midia.length===1 ? "1fr" : post.midia.length===2 ? "1fr 1fr" : "1fr 1fr 1fr",
              gap:2,
            }}>
              {post.midia.map((m, j) => (
                m.tipo === "video"
                  ? (
                    <div key={j} style={{ position:"relative" }}>
                      <video src={m.url} controls style={{ width:"100%", maxHeight:320, objectFit:"cover", display:"block" }} />
                      <button onClick={() => baixarArquivo(m.url, m.nome)}
                        title="Baixar vídeo"
                        style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,.6)", border:"none", borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, fontFamily:font, padding:"5px 10px", cursor:"pointer" }}>
                        ↓ Baixar
                      </button>
                    </div>
                  ) : (
                    <div key={j} style={{ position:"relative", overflow:"hidden" }}>
                      <img src={m.url} alt={m.nome} onClick={() => setExpandImg({ url: m.url, nome: m.nome })}
                        style={{ width:"100%", height:post.midia.length===1?340:190, objectFit:"cover", cursor:"zoom-in", display:"block" }} />
                      <button onClick={e => { e.stopPropagation(); baixarArquivo(m.url, m.nome); }}
                        title="Baixar imagem"
                        style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,.6)", border:"none", borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, fontFamily:font, padding:"5px 10px", cursor:"pointer" }}>
                        ↓ Baixar
                      </button>
                    </div>
                  )
              ))}
            </div>
          )}

          {(post.documentos || []).length > 0 && (
            <div style={{ padding:"12px 16px", borderTop:(post.midia||[]).length>0?"1px solid #F1F2F2":"none" }}>
              <div style={{ fontSize:10, fontWeight:700, fontFamily:font, textTransform:"uppercase", letterSpacing:".05em", color:"#888", marginBottom:8 }}>Documentos</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {post.documentos.map((d, j) => (
                  <div key={j} style={{ display:"flex", alignItems:"center", gap:1, background:"#F1F2F2", borderRadius:6, border:"1px solid #DCDDDE", overflow:"hidden" }}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", fontSize:12, fontFamily:font, color:PRETO_L, textDecoration:"none", fontWeight:600 }}>
                      <span style={{ fontSize:16 }}>{iconeDoc(d.tipo)}</span>
                      <span style={{ maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.nome}</span>
                      <span style={{ fontSize:11, color:"#888" }}>↗ abrir</span>
                    </a>
                    <button onClick={() => baixarArquivo(d.url, d.nome)}
                      title="Baixar documento"
                      style={{ background:PRETO_L, border:"none", color:VERDE_L, fontSize:11, fontWeight:800, fontFamily:font, padding:"8px 10px", cursor:"pointer", whiteSpace:"nowrap" }}>
                      ↓ Baixar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {expandImg && (
        <div onClick={() => setExpandImg(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.92)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <img src={expandImg.url} alt="" style={{ maxWidth:"95vw", maxHeight:"82vh", objectFit:"contain", borderRadius:8 }} />
          <div style={{ position:"fixed", top:16, right:20, display:"flex", gap:8 }}>
            <button onClick={e => { e.stopPropagation(); baixarArquivo(expandImg.url, expandImg.nome); }}
              style={{ background:VERDE_L, border:"none", borderRadius:6, color:PRETO_L, fontSize:12, fontWeight:800, fontFamily:font, padding:"8px 16px", cursor:"pointer" }}>
              ↓ Baixar
            </button>
            <button onClick={() => setExpandImg(null)}
              style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:36, height:36, color:"#fff", fontSize:18, cursor:"pointer", lineHeight:"36px", textAlign:"center" }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba Reuniões ─────────────────────────────────────────────────
function ReuniaoTab({ escola, autor, onSave }) {
  const AREAS = ["CS","Pedagógico","Financeiro","Produção","Diretoria","Comercial","Núcleo Técnico"];

  const [showForm, setShowForm]     = useState(false);
  const [salvando, setSalvando]     = useState(false);
  const [concluindo, setConcluindo] = useState(null); // id da reunião sendo concluída
  const [relatoFinal, setRelatoFinal] = useState("");
  const [form, setForm] = useState({
    data_agendada: "", tipo: "Presencial", areas: [], envolvidos: "", notas: ""
  });

  const reunioes = [...(escola.reunioes || [])].sort(
    (a, b) => new Date(b.data_agendada) - new Date(a.data_agendada)
  );
  const agendadas = reunioes.filter(r => r.status === "Agendada");
  const passadas  = reunioes.filter(r => r.status !== "Agendada");

  function toggleArea(area) {
    setForm(f => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter(a => a !== area) : [...f.areas, area]
    }));
  }

  async function salvarReuniao() {
    if (!form.data_agendada || !form.envolvidos.trim()) return;
    setSalvando(true);
    const nova = {
      id: crypto.randomUUID(),
      data_agendada: form.data_agendada,
      tipo: form.tipo,
      areas: form.areas,
      envolvidos: form.envolvidos.trim(),
      notas: form.notas.trim(),
      status: "Agendada",
      relato: "",
      criado_em: new Date().toISOString(),
      criado_por: autor,
    };
    await onSave(escola.id, { reunioes: [...(escola.reunioes || []), nova] });
    setForm({ data_agendada: "", tipo: "Presencial", areas: [], envolvidos: "", notas: "" });
    setShowForm(false);
    setSalvando(false);
  }

  async function concluirReuniao(id, status) {
    const atualizadas = (escola.reunioes || []).map(r =>
      r.id === id
        ? { ...r, status, relato: relatoFinal.trim(), concluida_em: new Date().toISOString(), concluida_por: autor }
        : r
    );
    await onSave(escola.id, { reunioes: atualizadas });
    setConcluindo(null);
    setRelatoFinal("");
  }

  const inpStyle = { width:"100%", border:"1.5px solid #DCDDDE", borderRadius:6, padding:"9px 12px", fontSize:13, fontFamily:fontB, boxSizing:"border-box" };
  const btnBase  = { border:"none", borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:700, fontFamily:fontB, cursor:"pointer" };

  function CardReuniao({ r }) {
    const dt = r.data_agendada ? new Date(r.data_agendada).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }) : "—";
    const statusColor = r.status === "Agendada" ? "#f59e0b" : r.status === "Realizada" ? "#22c55e" : "#ef4444";
    const statusLabel = r.status === "Agendada" ? "🟡 Agendada" : r.status === "Realizada" ? "✅ Realizada" : "❌ Não aconteceu";

    return (
      <div style={{ border:"1.5px solid #e5e7eb", borderRadius:8, padding:16, marginBottom:12, background:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:15, fontWeight:800, color:"#111" }}>{dt}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:999,
                background: r.tipo === "Presencial" ? "#dcfce7" : "#dbeafe",
                color: r.tipo === "Presencial" ? "#166534" : "#1d4ed8" }}>
                {r.tipo === "Presencial" ? "🏢 Presencial" : "💻 Online"}
              </span>
              <span style={{ fontSize:11, fontWeight:700, color: statusColor }}>{statusLabel}</span>
            </div>
            {r.areas && r.areas.length > 0 && (
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                {r.areas.map(a => (
                  <span key={a} style={{ fontSize:11, background:"#f3f4f6", borderRadius:4, padding:"2px 8px", color:"#555" }}>{a}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize:13, color:"#444", marginTop:6 }}>
              <strong>Envolvidos:</strong> {r.envolvidos}
            </div>
            {r.notas && r.status === "Agendada" && (
              <div style={{ fontSize:12, color:"#666", marginTop:4 }}>
                <strong>Notas:</strong> {r.notas}
              </div>
            )}
            {r.relato && (
              <div style={{ fontSize:12, color:"#444", marginTop:6, background:"#f9fafb", borderRadius:6, padding:"8px 12px" }}>
                <strong>Resumo:</strong> {r.relato}
              </div>
            )}
            {r.concluida_em && (
              <div style={{ fontSize:11, color:"#888", marginTop:4 }}>
                Concluída por <strong>{r.concluida_por}</strong> em {new Date(r.concluida_em).toLocaleDateString("pt-BR")}
              </div>
            )}
            <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
              Criada por {r.criado_por} em {r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : "—"}
            </div>
          </div>
          {r.status === "Agendada" && (
            <button onClick={() => { setConcluindo(r.id); setRelatoFinal(""); }}
              style={{ ...btnBase, background:"#111", color:"#fff", whiteSpace:"nowrap" }}>
              ✓ Concluir
            </button>
          )}
        </div>

        {/* Painel de conclusão */}
        {concluindo === r.id && (
          <div style={{ marginTop:14, background:"#f9fafb", borderRadius:8, padding:14, border:"1.5px solid #e5e7eb" }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10, color:"#333" }}>Como foi a reunião?</div>
            <textarea
              value={relatoFinal} onChange={e => setRelatoFinal(e.target.value)}
              placeholder="Resumo do que foi tratado (opcional)..."
              rows={3}
              style={{ ...inpStyle, resize:"vertical", marginBottom:10 }}
            />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => concluirReuniao(r.id, "Realizada")}
                style={{ ...btnBase, background:"#22c55e", color:"#fff" }}>
                ✅ Reunião realizada
              </button>
              <button onClick={() => concluirReuniao(r.id, "Não aconteceu")}
                style={{ ...btnBase, background:"#ef4444", color:"#fff" }}>
                ❌ Não aconteceu (no-show)
              </button>
              <button onClick={() => setConcluindo(null)}
                style={{ ...btnBase, background:"#e5e7eb", color:"#555" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily:fontB }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#111" }}>Reuniões</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ ...btnBase, background: showForm ? "#e5e7eb" : VERDE, color: showForm ? "#555" : "#000" }}>
          {showForm ? "✕ Cancelar" : "+ Nova Reunião"}
        </button>
      </div>

      {/* Formulário nova reunião */}
      {showForm && (
        <div style={{ background:"#f9fafb", border:"1.5px solid #e5e7eb", borderRadius:8, padding:18, marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, color:"#333" }}>Nova Reunião</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>DATA E HORA *</label>
              <input type="datetime-local" value={form.data_agendada}
                onChange={e => setForm(f => ({ ...f, data_agendada: e.target.value }))}
                style={inpStyle} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>MODALIDADE</label>
              <div style={{ display:"flex", gap:8 }}>
                {["Presencial","Online"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    style={{ ...btnBase, flex:1,
                      background: form.tipo === t ? (t === "Presencial" ? "#dcfce7" : "#dbeafe") : "#e5e7eb",
                      color: form.tipo === t ? (t === "Presencial" ? "#166534" : "#1d4ed8") : "#555",
                      border: form.tipo === t ? `2px solid ${t === "Presencial" ? "#22c55e" : "#3b82f6"}` : "2px solid transparent" }}>
                    {t === "Presencial" ? "🏢 Presencial" : "💻 Online"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#555", display:"block", marginBottom:6 }}>ÁREA(S) DA EMPRESA</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {AREAS.map(a => (
                <button key={a} onClick={() => toggleArea(a)}
                  style={{ ...btnBase, padding:"5px 12px", fontSize:11,
                    background: form.areas.includes(a) ? VERDE : "#e5e7eb",
                    color: form.areas.includes(a) ? "#000" : "#555" }}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>ENVOLVIDOS *</label>
            <input type="text" value={form.envolvidos}
              onChange={e => setForm(f => ({ ...f, envolvidos: e.target.value }))}
              placeholder="Ex: João (Comercial), Maria (Pedagógico)"
              style={inpStyle} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#555", display:"block", marginBottom:4 }}>NOTAS PRÉ-REUNIÃO</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Pauta, objetivos ou informações importantes..." rows={3}
              style={{ ...inpStyle, resize:"vertical" }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={salvarReuniao} disabled={salvando || !form.data_agendada || !form.envolvidos.trim()}
              style={{ ...btnBase, background: VERDE, color:"#000", opacity: (salvando || !form.data_agendada || !form.envolvidos.trim()) ? 0.5 : 1 }}>
              {salvando ? "Salvando..." : "💾 Salvar Reunião"}
            </button>
          </div>
        </div>
      )}

      {/* Lista agendadas */}
      {agendadas.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
            Próximas ({agendadas.length})
          </div>
          {agendadas.map(r => <CardReuniao key={r.id} r={r} />)}
        </div>
      )}

      {/* Lista passadas */}
      {passadas.length > 0 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>
            Histórico ({passadas.length})
          </div>
          {passadas.map(r => <CardReuniao key={r.id} r={r} />)}
        </div>
      )}

      {reunioes.length === 0 && !showForm && (
        <div style={{ textAlign:"center", color:"#aaa", padding:"40px 0", fontSize:13 }}>
          Nenhuma reunião cadastrada ainda.
        </div>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────
export default function BaseEscolas({ onVoltar, equipeLogada }) {
  const [escolas, setEscolas]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");
  const [fStatus, setFStatus]     = useState("");
  const [fTipo, setFTipo]         = useState("");
  const [fCluster, setFCluster]   = useState("");
  const [sel, setSel]             = useState(null);
  const [tab, setTab]             = useState("cad");
  const [modal, setModal]         = useState(null); // { title, fields, values, section }
  const [confirm, setConfirm]     = useState(null);
  const [, setSalvando]   = useState(false);
  const [novaModal, setNovaModal] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("base_escolas").select("id, data").order("id");
    setEscolas((data||[]).map(r=>({ id:r.id, ...(r.data||{}) })));
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function save(id, patch) {
    const escola = escolas.find(e=>e.id===id);
    if (!escola) return;
    const newData = { ...escola, ...patch, atualizadoEm: new Date().toISOString() };
    await supabase.from("base_escolas").upsert([{ id, data: newData }]);
    setEscolas(prev => prev.map(e => e.id===id ? newData : e));
    if (sel?.id===id) setSel(newData);
  }

  async function excluir(escola) {
    await supabase.from("projetos_escola").delete().eq("escola_id", escola.id);
    await supabase.from("base_escolas").delete().eq("id", escola.id);
    setEscolas(prev=>prev.filter(e=>e.id!==escola.id));
    if (sel?.id===escola.id) setSel(null);
    setConfirm(null);
  }

  async function criarEscola(form) {
    const id = gerarId(form.nome);
    const data = { ...form, id, status:"Ativo", series:{}, atualizadoEm:new Date().toISOString() };
    await supabase.from("base_escolas").insert([{ id, data }]);
    setEscolas(prev=>[...prev,{id,...data}].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")));
    setNovaModal(false);
    setSel({id,...data});
    setTab("cad");
  }

  const filtradas = escolas.filter(e => {
    if (fCluster && e.cluster!==fCluster) return false;
    if (fStatus && e.status!==fStatus) return false;
    if (fTipo && e.tipo!==fTipo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (e.nome||"").toLowerCase().includes(q)||(e.cidade||"").toLowerCase().includes(q)||(e.cnpj||"").includes(q)||(e.email||"").toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));

  const ativas = escolas.filter(e=>e.status==="Ativo");
  const maxCount = Math.max(1,...CLUSTERS.map(([c])=>ativas.filter(e=>e.cluster===c).length));

  // CAD sections config
  const CAD_SECTIONS = [
    { key:"id_escola", label:"Identificação", fields:[
      {key:"nome",label:"Nome",full:true},{key:"status",label:"Status",type:"select",options:STATUS_OPTS},
      {key:"tipo",label:"Tipo",type:"select",options:TIPO_OPTS},{key:"cluster",label:"Cluster",type:"select",options:CLUSTERS.map(([c])=>c)},
      {key:"inep",label:"INEP"},{key:"idioma",label:"Idioma",type:"select",options:IDIOMA_OPTS},
    ]},
    { key:"programa", label:"Programa", fields:[
      {key:"conteudo",label:"Conteúdo",full:true},{key:"periodicidade",label:"Periodicidade",type:"select",options:PERIOD_OPTS},
      {key:"particularidade",label:"Particularidade",type:"textarea",full:true},
    ]},
    { key:"contrato", label:"Contrato", fields:[
      {key:"validade",label:"Validade",type:"date"},{key:"contratoAlunado",label:"Contrato (alunos)",type:"number"},
      {key:"totalInformado",label:"Total Informado",type:"number"},
    ]},
    { key:"legal", label:"Dados Legais", fields:[
      {key:"cnpj",label:"CNPJ"},{key:"razao",label:"Razão Social",full:true},{key:"respLegal",label:"Resp. Legal",full:true},
    ]},
    { key:"endereco", label:"Endereço", fields:[
      {key:"logradouro",label:"Logradouro",full:true},{key:"bairro",label:"Bairro"},{key:"cidade",label:"Cidade"},
      {key:"uf",label:"UF"},{key:"cep",label:"CEP"},
    ]},
    { key:"contato", label:"Contato", fields:[
      {key:"telefone",label:"Telefone"},{key:"celular",label:"Celular"},
      {key:"email",label:"E-mail",full:true},{key:"respPedagogico",label:"Resp. Pedagógico",full:true},
    ]},
  ];

  const LIST_CONFIGS = {
    contatos: {
      label:"Contatos",
      fields:[{key:"nome",label:"Nome"},{key:"cargo",label:"Cargo"},{key:"email",label:"E-mail"},{key:"telefone",label:"Telefone"},{key:"turma",label:"Turma"},{key:"fonte",label:"Fonte"}],
    },
    formacao: {
      label:"Formação",
      fields:[{key:"ciclo",label:"Ciclo"},{key:"docente",label:"Docente"},{key:"cargo",label:"Cargo"},{key:"data",label:"Data",type:"date"}],
    },
    observacoes: {
      label:"Histórico",
      fields:[{key:"data",label:"Data",type:"date"},{key:"texto",label:"Texto",type:"textarea",full:true}],
    },
  };

  const TABS = [
    {id:"cad",label:"Cadastro"},
    {id:"alu",label:"Alunado"},
    {id:"cont",label:"Contatos"},
    {id:"form",label:"Formação"},
    {id:"obs",label:"Histórico"},
    {id:"pend",label:"Pendências"},
    {id:"proj",label:"Projetos / Links"},
    {id:"rubrica",label:"Acompanhamento / Rubricas"},
    {id:"reunioes",label:"Reuniões"},
  ];

  function renderCadastro(s) {
    return (
      <div>
        {CAD_SECTIONS.map(sec=>(
          <div key={sec.key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <h3 style={{ fontSize:18,fontWeight:800,fontFamily:font,textTransform:"lowercase",margin:0 }}>{sec.label}</h3>
              <button onClick={()=>setModal({ title:sec.label, fields:sec.fields, values:s, section:sec.key })}
                style={{ background:"none",border:"2px solid #DCDDDE",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:700,fontFamily:font,cursor:"pointer" }}>
                Editar
              </button>
            </div>
            <dl style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"12px 24px",margin:0 }}>
              {sec.fields.map(f=>(
                <Field key={f.key} label={f.label} value={
                  f.type==="select" ? s[f.key] :
                  f.type==="checkbox" ? (s[f.key]?"Sim":"Não") :
                  s[f.key]
                }/>
              ))}
            </dl>
          </div>
        ))}
      </div>
    );
  }

  function renderListTab(key, s) {
    const cfg = LIST_CONFIGS[key];
    const items = s[key]||[];
    return (
      <ListSection
        title={cfg.label}
        items={items}
        fields={cfg.fields}
        canWrite={true}
        onAdd={()=>setModal({title:`Adicionar ${cfg.label.slice(0,-1)}`,fields:cfg.fields,values:{},section:key,listAdd:true})}
        onEdit={i=>setModal({title:`Editar`,fields:cfg.fields,values:items[i],section:key,listEdit:i})}
        onRemove={i=>setConfirm({msg:`Remover este item?`,onConfirm:async()=>{
          const newItems=[...items]; newItems.splice(i,1);
          await save(s.id,{[key]:newItems});
          setConfirm(null);
        }})}
      />
    );
  }

  async function handleModalSave(form) {
    if (!modal || !sel) return;
    const { section, listAdd, listEdit } = modal;
    setSalvando(true);
    if (listAdd) {
      const arr=[...(sel[section]||[]),form];
      await save(sel.id,{[section]:arr});
    } else if (listEdit!=null) {
      const arr=[...(sel[section]||[])];
      arr[listEdit]=form;
      await save(sel.id,{[section]:arr});
    } else if (section==="series" || section==="seriesMatriz") {
      const cleaned={};
      Object.entries(form).forEach(([k,v])=>{ if(v!=="") cleaned[k]=Number(v)||0; });
      await save(sel.id,{[section]:cleaned});
    } else {
      await save(sel.id,form);
    }
    setSalvando(false);
    setModal(null);
  }

  const pends = sel ? pendencias(sel) : [];

  return (
    <div style={{ minHeight:"100vh",background:"#F1F2F2",fontFamily:fontB }}>
      {/* Topo */}
      <div style={{ background:PRETO,padding:"0 clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"flex-end",gap:28,flexWrap:"wrap",paddingTop:20 }}>
          <div style={{ paddingBottom:20 }}>
            <button onClick={onVoltar} style={{ background:"none",border:"none",color:"#aaa",fontSize:12,cursor:"pointer",fontFamily:font,padding:0,marginBottom:6,display:"block" }}>← Voltar ao Dashboard</button>
            <h1 style={{ fontSize:30,fontWeight:800,fontFamily:font,color:"#fff",margin:0,lineHeight:1 }}>
              base de escolas
              <span style={{ display:"block",width:44,height:4,background:VERDE,borderRadius:2,margin:"10px 0 6px" }}/>
            </h1>
            <small style={{ fontSize:12,fontWeight:700,fontFamily:font,letterSpacing:".06em",textTransform:"uppercase",color:"#C7C8CA" }}>{escolas.length} escolas · {ativas.length} ativas</small>
          </div>
          {/* Cluster bars */}
          <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"flex-end",paddingBottom:0 }}>
            {CLUSTERS.map(([c,cor])=>{
              const count=ativas.filter(e=>e.cluster===c).length;
              const h=28+Math.round(count/maxCount*46);
              return (
                <button key={c} onClick={()=>setFCluster(fCluster===c?"":c)}
                  style={{ background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:0 }}>
                  <span style={{ fontSize:11,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase",color:fCluster===c?VERDE:"#C7C8CA" }}>{c}</span>
                  <div style={{ width:62,height:h,background:cor,borderRadius:"4px 4px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:6,fontSize:18,fontWeight:800,fontFamily:font,color:PRETO,boxShadow:fCluster===c?`0 0 0 3px ${VERDE}`:"none",transition:"transform .15s" }}>
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
      <div style={{ maxWidth:1400,margin:"0 auto",padding:"16px clamp(16px,4vw,40px)",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
        <div style={{ flex:"1 1 260px",display:"flex",alignItems:"center",gap:10,background:"#fff",border:"2px solid #DCDDDE",borderRadius:6,padding:"6px 12px" }}>
          <span style={{ color:"#6D6E71" }}>🔍</span>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar escola, cidade, e-mail..."
            style={{ border:0,background:"transparent",outline:0,width:"100%",padding:"4px 0",fontFamily:fontB,fontSize:14 }}/>
        </div>
        {[
          {label:"Status",val:fStatus,set:setFStatus,opts:STATUS_OPTS},
          {label:"Tipo",val:fTipo,set:setFTipo,opts:TIPO_OPTS},
        ].map(({label,val,set,opts})=>(
          <select key={label} value={val} onChange={e=>set(e.target.value)}
            style={{ background:"#fff",border:"2px solid #DCDDDE",borderRadius:6,padding:"9px 10px",fontFamily:fontB,fontSize:14,cursor:"pointer" }}>
            <option value="">{label}</option>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        ))}
        <button onClick={()=>setNovaModal(true)}
          style={{ background:VERDE,color:PRETO,border:"none",borderRadius:6,padding:"10px 16px",fontSize:14,fontWeight:800,fontFamily:font,cursor:"pointer" }}>
          + Nova Escola
        </button>
      </div>

      {/* Layout principal */}
      <div style={{ maxWidth:1400,margin:"0 auto",padding:"0 clamp(16px,4vw,40px) 40px",display:"grid",gridTemplateColumns:sel?"minmax(300px,380px) 1fr":"1fr",gap:20,alignItems:"start" }}>
        {/* Lista */}
        <div style={{ background:"#fff",borderRadius:6,overflow:"hidden",position:"sticky",top:0 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"2px dashed #DCDDDE",color:"#6D6E71",fontSize:12,fontWeight:700,fontFamily:font,letterSpacing:".05em",textTransform:"uppercase" }}>
            <span>{filtradas.length} escolas</span>
          </div>
          <div style={{ maxHeight:"calc(100vh - 260px)",overflowY:"auto" }}>
            {loading ? (
              <div style={{ padding:24,textAlign:"center",color:"#aaa" }}>Carregando...</div>
            ) : filtradas.map(e=>{
              const p=pendencias(e);
              return (
                <div key={e.id} style={{ display:"grid",gridTemplateColumns:"14px 1fr auto",gap:12,alignItems:"center",padding:"12px 16px",borderBottom:"1px solid #DCDDDE",cursor:"pointer",background:sel?.id===e.id?"#F1F2F2":"transparent",boxShadow:sel?.id===e.id?"inset 5px 0 0 "+VERDE:"none" }}
                  onClick={()=>{ setSel(e); setTab("cad"); }}>
                  <span style={{ width:14,height:14,borderRadius:"50%",background:CLUSTER_COLOR[e.cluster]||"#DCDDDE",display:"block",flexShrink:0 }}/>
                  <span>
                    <b style={{ display:"block",fontSize:14,fontWeight:700,fontFamily:font }}>{e.nome}</b>
                    <small style={{ color:"#6D6E71",fontSize:12 }}>{[e.tipo,e.cidade&&e.uf?`${e.cidade}/${e.uf}`:e.cidade||e.uf,e.status].filter(Boolean).join(", ")}</small>
                  </span>
                  <span style={{ fontSize:11,fontWeight:700,fontFamily:font,padding:"3px 9px",borderRadius:999,background:p.length?"rgba(216,30,39,.12)":"rgba(57,223,24,.18)",color:p.length?"#D81E27":"#148A00",whiteSpace:"nowrap" }}>
                    {p.length?p.length+" pend.":"ok"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalhe */}
        {sel && (
          <div style={{ background:"#fff",borderRadius:6,overflow:"hidden" }}>
            {/* Cabeçalho escola */}
            <div style={{ padding:"22px 26px 0",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap" }}>
              <div style={{ width:64,height:64,borderRadius:"50%",background:CLUSTER_COLOR[sel.cluster]||"#DCDDDE",display:"grid",placeItems:"center",padding:6,fontSize:10,fontWeight:800,fontFamily:font,textTransform:"lowercase",color:PRETO,textAlign:"center",lineHeight:1,transform:"rotate(-8deg)",flexShrink:0 }}>
                {sel.cluster||"—"}
              </div>
              <div style={{ flex:1 }}>
                <h2 style={{ fontSize:28,fontWeight:800,fontFamily:font,margin:0 }}>{sel.nome}</h2>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:8 }}>
                  {[
                    {label:sel.status||"—",on:sel.status==="Ativo",off:sel.status==="Inativo"},
                    {label:sel.tipo},
                    {label:sel.idioma},
                    {label:sel.cidade&&sel.uf?`${sel.cidade}/${sel.uf}`:sel.cidade||sel.uf},
                  ].filter(c=>c.label).map((c,i)=>(
                    <span key={i} style={{ fontSize:11,fontWeight:700,fontFamily:font,letterSpacing:".04em",textTransform:"uppercase",padding:"4px 10px",borderRadius:4,background:c.on?"#39DF18":c.off?"rgba(216,30,39,.14)":"#F1F2F2",color:c.on?PRETO:c.off?"#D81E27":"#6D6E71" }}>{c.label}</span>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <button onClick={()=>setConfirm({msg:`Excluir "${sel.nome}"? Esta ação não pode ser desfeita.`,onConfirm:()=>excluir(sel)})}
                  style={{ background:"transparent",color:"#D81E27",border:"2px solid #D81E27",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:700,fontFamily:font,cursor:"pointer" }}>
                  Excluir
                </button>
                <button onClick={()=>setSel(null)} style={{ background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#6D6E71" }}>×</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex",gap:2,padding:"16px 26px 0",borderBottom:"2px dashed #DCDDDE",overflowX:"auto" }}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{ border:0,background:"transparent",cursor:"pointer",padding:"10px 14px",fontSize:14,fontWeight:700,fontFamily:font,color:tab===t.id?PRETO:"#6D6E71",whiteSpace:"nowrap",marginBottom:-2,borderBottom:`4px solid ${tab===t.id?VERDE:"transparent"}` }}>
                  {t.label}
                  {t.id==="pend"&&pends.length>0&&<span style={{ fontSize:11,background:"#F1F2F2",borderRadius:999,padding:"1px 7px",marginLeft:5 }}>{pends.length}</span>}
                </button>
              ))}
            </div>

            {/* Conteúdo da tab */}
            <div style={{ padding:"22px 26px 30px" }}>
              {tab==="cad" && renderCadastro(sel)}
              {tab==="alu" && <AlunadoTab
                escola={sel}
                supabaseClient={supabase}
                onEditMatriz={()=>{
                  const fields=SERIES_KEYS.map(k=>({key:k,label:SERIES_LABEL[k],type:"number"}));
                  setModal({title:"Matriz por série",fields,values:sel.seriesMatriz||{},section:"seriesMatriz"});
                }}
                onEditContrato={()=>{
                  setModal({title:"Contrato",fields:[{key:"contratoAlunado",label:"Contrato (alunos)",type:"number"},{key:"validade",label:"Validade",type:"date"}],values:{contratoAlunado:sel.contratoAlunado||"",validade:sel.validade||""},section:"contrato"});
                }}
              />}
              {tab==="cont" && renderListTab("contatos",sel)}
              {tab==="form" && renderListTab("formacao",sel)}
              {tab==="obs" && <HistoricoTab escola={sel} supabaseClient={supabase} autor={equipeLogada?.equipe || "—"} onSave={save} />}
              {tab==="pend" && <PendenciasTab escola={sel} onSave={save} autor={equipeLogada?.equipe || "—"} />}
              {tab==="proj" && <ProjetosTab escola={sel} supabaseClient={supabase}/>}
              {tab==="rubrica" && <RubricasTab escola={sel} supabaseClient={supabase} autor={equipeLogada?.equipe || "—"} onSave={save} />}
              {tab==="reunioes" && <ReuniaoTab escola={sel} autor={equipeLogada?.equipe || "—"} onSave={save} />}
            </div>
          </div>
        )}
      </div>

      {/* Modal edição */}
      {modal && (
        <Modal title={modal.title} fields={modal.fields} values={modal.values}
          onSave={handleModalSave} onClose={()=>setModal(null)}/>
      )}

      {/* Modal nova escola */}
      {novaModal && (
        <Modal title="Nova Escola"
          fields={[
            {key:"nome",label:"Nome *",full:true},{key:"cnpj",label:"CNPJ"},
            {key:"status",label:"Status",type:"select",options:STATUS_OPTS,defaultValue:"Ativo"},
            {key:"tipo",label:"Tipo",type:"select",options:TIPO_OPTS},{key:"cluster",label:"Cluster",type:"select",options:CLUSTERS.map(([c])=>c)},
            {key:"idioma",label:"Idioma",type:"select",options:IDIOMA_OPTS,defaultValue:"Português"},
            {key:"cidade",label:"Cidade"},{key:"uf",label:"UF"},
          ]}
          values={{}}
          onSave={criarEscola}
          onClose={()=>setNovaModal(false)}/>
      )}

      {/* Confirm */}
      {confirm && (
        <Confirm msg={confirm.msg} onConfirm={confirm.onConfirm} onClose={()=>setConfirm(null)}/>
      )}
    </div>
  );
}
