import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const font  = "'Circular Std','Nunito','Helvetica Neue',Arial,sans-serif";
const VERDE = "#39DF18";
const PRETO = "#231F20";

const PERMISSOES_LABELS = [
  { key: "historico",    label: "Histórico de Ciclos" },
  { key: "escolas",      label: "Escolas" },
  { key: "inspiramaker", label: "Inspiramaker" },
  { key: "projecao",     label: "Projeção de Material" },
  { key: "baseEscolas",  label: "Base de Escolas" },
  { key: "admin",        label: "Admin (gerenciar usuários + encerrar ciclo)" },
];

async function hashSenha(senha) {
  const enc  = new TextEncoder();
  const buf  = await crypto.subtle.digest("SHA-256", enc.encode(senha));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

const PERM_VAZIO = { historico:false, escolas:false, inspiramaker:false, projecao:false, baseEscolas:false, admin:false, popsAreas:[] };

// Áreas dos POPs. Valor "*" = todas. Usuário antigo (sem o campo) = todas.
const AREAS_POPS = ["CS", "Pedagógico", "Financeiro", "Produção", "Diretoria", "Comercial", "Núcleo Técnico"];

function ModalUsuario({ usuario, onSave, onClose }) {
  const isNovo = !usuario.id;
  const [form, setForm] = useState({
    email:     usuario.email     || "",
    nome:      usuario.nome      || "",
    senha:     "",
    permissoes: usuario.permissoes || { ...PERM_VAZIO },
    ativo:     usuario.ativo !== undefined ? usuario.ativo : true,
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]        = useState("");

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setPerm(k, v) { setForm(f => ({ ...f, permissoes: { ...f.permissoes, [k]: v } })); }

  const popsAreas = form.permissoes.popsAreas === undefined ? ["*"] : form.permissoes.popsAreas;
  function togglePopsArea(area) {
    if (area === "*") {
      setPerm("popsAreas", popsAreas.includes("*") ? [] : ["*"]);
      return;
    }
    const base = popsAreas.filter(a => a !== "*");
    setPerm("popsAreas", base.includes(area) ? base.filter(a => a !== area) : [...base, area]);
  }

  async function salvar() {
    setErro("");
    if (!form.email.trim()) { setErro("E-mail obrigatório."); return; }
    if (!form.nome.trim())  { setErro("Nome obrigatório.");  return; }
    if (isNovo && !form.senha.trim()) { setErro("Senha obrigatória para novo usuário."); return; }
    setSalvando(true);
    try {
      const payload = {
        email:      form.email.trim().toLowerCase(),
        nome:       form.nome.trim(),
        permissoes: form.permissoes,
        ativo:      form.ativo,
      };
      if (form.senha.trim()) payload.senha = await hashSenha(form.senha.trim());

      if (isNovo) {
        const { error } = await supabase.from("usuarios").insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("usuarios").update(payload).eq("id", usuario.id);
        if (error) throw error;
      }
      onSave();
    } catch (e) {
      setErro(e.message || "Erro ao salvar.");
    }
    setSalvando(false);
  }

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:10,width:"100%",maxWidth:480,padding:28,boxShadow:"0 8px 32px rgba(0,0,0,.2)",maxHeight:"92vh",overflowY:"auto" }}>
        <h3 style={{ fontFamily:font,fontWeight:800,fontSize:18,margin:"0 0 20px" }}>
          {isNovo ? "Novo Usuário" : "Editar Usuário"}
        </h3>
        {erro && <div style={{ background:"#fff0f0",border:"1.5px solid #FF3B41",color:"#cc0000",borderRadius:4,padding:"9px 12px",fontSize:13,marginBottom:14 }}>{erro}</div>}

        {[
          { label:"Nome",  key:"nome",  type:"text" },
          { label:"E-mail",key:"email", type:"email" },
          { label: isNovo ? "Senha" : "Nova senha (deixe em branco para manter)", key:"senha", type:"password" },
        ].map(f=>(
          <div key={f.key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:.8,display:"block",marginBottom:5 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e=>set(f.key,e.target.value)}
              style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #ddd",borderRadius:4,fontSize:14,fontFamily:font,boxSizing:"border-box" }}/>
          </div>
        ))}

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:.8,display:"block",marginBottom:8 }}>Permissões</label>
          {PERMISSOES_LABELS.map(p=>(
            <div key={p.key} onClick={()=>setPerm(p.key,!form.permissoes[p.key])}
              style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:8 }}>
              <div style={{ width:18,height:18,border:`2px solid ${form.permissoes[p.key]?VERDE:"#ccc"}`,borderRadius:3,background:form.permissoes[p.key]?VERDE:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {form.permissoes[p.key] && <span style={{ fontSize:11,fontWeight:900,color:PRETO }}>✓</span>}
              </div>
              <span style={{ fontSize:14,fontFamily:font,color:"#222" }}>{p.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:.8,display:"block",marginBottom:8 }}>POPs que pode acessar</label>
          {[{ key:"*", label:"Todas as áreas" }, ...AREAS_POPS.map(a => ({ key:a, label:a }))].map(p => {
            const marcado = popsAreas.includes("*") || popsAreas.includes(p.key);
            const bloqueado = p.key !== "*" && popsAreas.includes("*");
            return (
              <div key={p.key} onClick={()=>togglePopsArea(p.key)}
                style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:8,opacity: bloqueado ? .55 : 1 }}>
                <div style={{ width:18,height:18,border:`2px solid ${marcado?VERDE:"#ccc"}`,borderRadius:3,background:marcado?VERDE:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {marcado && <span style={{ fontSize:11,fontWeight:900,color:PRETO }}>✓</span>}
                </div>
                <span style={{ fontSize:14,fontFamily:font,color:"#222",fontWeight: p.key === "*" ? 700 : 400 }}>{p.label}</span>
              </div>
            );
          })}
          <div style={{ fontSize:11,color:"#888",marginTop:4 }}>Administradores sempre veem todas as áreas.</div>
        </div>

        <div onClick={()=>set("ativo",!form.ativo)}
          style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:20 }}>
          <div style={{ width:18,height:18,border:`2px solid ${form.ativo?VERDE:"#ccc"}`,borderRadius:3,background:form.ativo?VERDE:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            {form.ativo && <span style={{ fontSize:11,fontWeight:900,color:PRETO }}>✓</span>}
          </div>
          <span style={{ fontSize:14,fontFamily:font,color:"#222" }}>Usuário ativo</span>
        </div>

        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 20px",border:"1.5px solid #ddd",borderRadius:4,background:"#fff",fontSize:14,fontFamily:font,cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            style={{ padding:"9px 20px",border:"none",borderRadius:4,background:VERDE,color:PRETO,fontSize:14,fontWeight:800,fontFamily:font,cursor:"pointer" }}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GerenciarUsuarios({ onVoltar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [modal, setModal]      = useState(null); // null | { ...usuario }

  async function carregar() {
    setLoading(true);
    const { data } = await supabase.from("usuarios").select("id,email,nome,permissoes,ativo,criado_em").order("nome");
    setUsuarios(data||[]);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function toggleAtivo(u) {
    await supabase.from("usuarios").update({ ativo: !u.ativo }).eq("id", u.id);
    carregar();
  }

  const btnStyle = (active) => ({
    padding:"6px 14px",border:"none",borderRadius:4,
    background: active ? "#D81E27" : VERDE,
    color: active ? "#fff" : PRETO,
    fontSize:12,fontWeight:800,fontFamily:font,cursor:"pointer",
  });

  return (
    <div style={{ maxWidth:900,margin:"0 auto",padding:"32px 20px" }}>
      <button onClick={onVoltar} style={{ background:"none",border:"none",color:"#666",fontSize:13,cursor:"pointer",fontFamily:font,padding:0,marginBottom:16 }}>
        ← Voltar ao Dashboard
      </button>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h1 style={{ fontFamily:font,fontWeight:800,fontSize:26,margin:0 }}>Gerenciar Usuários</h1>
        <button onClick={()=>setModal({ permissoes:{ ...PERM_VAZIO }, ativo:true })}
          style={{ padding:"9px 20px",border:"none",borderRadius:4,background:VERDE,color:PRETO,fontSize:13,fontWeight:800,fontFamily:font,cursor:"pointer" }}>
          + Novo Usuário
        </button>
      </div>

      {loading ? (
        <div style={{ color:"#aaa" }}>Carregando...</div>
      ) : (
        <div style={{ background:"#fff",borderRadius:8,boxShadow:"0 2px 8px rgba(0,0,0,.08)",overflow:"hidden" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:14,fontFamily:font }}>
            <thead>
              <tr style={{ background:"#F1F2F2" }}>
                {["Nome","E-mail","Permissões","Status","Ações"].map(h=>(
                  <th key={h} style={{ padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:"#6D6E71" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u=>(
                <tr key={u.id} style={{ borderTop:"1px solid #F1F2F2" }}>
                  <td style={{ padding:"12px 16px",fontWeight:700 }}>{u.nome}</td>
                  <td style={{ padding:"12px 16px",color:"#555" }}>{u.email}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                      {PERMISSOES_LABELS.filter(p=>u.permissoes?.[p.key]).map(p=>(
                        <span key={p.key} style={{ background:"#F1F2F2",borderRadius:3,padding:"2px 7px",fontSize:11,fontWeight:700,color:"#444" }}>{p.label}</span>
                      ))}
                      {!PERMISSOES_LABELS.some(p=>u.permissoes?.[p.key]) && <span style={{ color:"#aaa",fontSize:12 }}>Nenhuma</span>}
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:u.ativo?"#d1fae5":"#fee2e2",color:u.ativo?"#065f46":"#991b1b" }}>
                      {u.ativo?"Ativo":"Inativo"}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>setModal(u)} style={{ ...btnStyle(false),background:"#F1F2F2",color:PRETO }}>Editar</button>
                      <button onClick={()=>toggleAtivo(u)} style={{ ...btnStyle(u.ativo) }}>
                        {u.ativo?"Desativar":"Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalUsuario
          usuario={modal}
          onSave={() => { setModal(null); carregar(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
