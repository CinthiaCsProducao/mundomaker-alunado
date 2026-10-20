import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

const font  = "'Figtree','Circular Std','Segoe UI',system-ui,sans-serif";
const fontB = "'Barlow','DIN Round Pro','Segoe UI',system-ui,sans-serif";
const VERDE = "#39DF18";
const AMBAR = "#FFA300";
const PROGRAMAS = ["MakerLab Oficina"];

// Agosto a novembro: período de conferir o que vale para o ano seguinte
export function emPeriodoDeVerificacao(data = new Date()) {
  const m = data.getMonth() + 1;
  return m >= 8 && m <= 11;
}

// Mapeamentos do próximo ano ainda não conferidos neste ano
export function pendentesDeVerificacao(lista, data = new Date()) {
  if (!emPeriodoDeVerificacao(data)) return [];
  const ano = data.getFullYear();
  return (lista || []).filter(m => m.ano_vigencia === ano + 1 && m.verificado_ano !== ano);
}

export async function buscarMapeamentos() {
  const { data, error } = await supabase.from("mapeamentos").select("*").order("ano_vigencia", { ascending: false }).order("criado_em", { ascending: false });
  return error ? [] : (data || []);
}

// Faixa da tela inicial (só aparece de agosto a novembro, com pendência)
export function FaixaMapeamentos({ onAbrir }) {
  const [pend, setPend] = useState([]);
  useEffect(() => {
    if (!emPeriodoDeVerificacao()) return;
    buscarMapeamentos().then(l => setPend(pendentesDeVerificacao(l)));
  }, []);
  if (pend.length === 0) return null;
  return (
    <div style={{ background: "#FFF4DC", border: `1.5px solid ${AMBAR}`, borderRadius: 8, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontFamily: font }}>
      <div style={{ fontSize: 14, color: "#111" }}>
        <b>{pend.length} mapeamento{pend.length > 1 ? "s" : ""} para verificar</b> antes de {new Date().getFullYear() + 1}:{" "}
        <span style={{ color: "#555" }}>{pend.slice(0, 2).map(p => p.titulo).join(" · ")}{pend.length > 2 ? " …" : ""}</span>
      </div>
      <button onClick={onAbrir} style={{ background: "#111", color: VERDE, border: "none", borderRadius: 4, padding: "8px 16px", fontSize: 13, fontWeight: 800, fontFamily: font, cursor: "pointer" }}>Abrir Mapeamentos</button>
    </div>
  );
}

const fmtQuando = (iso) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

const inp = { width: "100%", padding: "9px 12px", border: "1px solid #DCDDDE", borderRadius: 4, fontSize: 14, fontFamily: fontB, boxSizing: "border-box" };
const lbl = { display: "block", fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71" };

function Modal({ item, onSave, onClose }) {
  const [f, setF] = useState({ titulo: "", descricao: "", programa: PROGRAMAS[0], ano_vigencia: new Date().getFullYear() + 1, ...item });
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    if (!f.titulo.trim()) { alert("Dê um título ao mapeamento."); return; }
    const ano = parseInt(f.ano_vigencia, 10);
    if (!(ano >= 2000 && ano <= 2100)) { alert("Informe o ano de vigência (ex.: 2028)."); return; }
    if (!f.programa.trim()) { alert("Informe o programa."); return; }
    setSalvando(true);
    await onSave({ titulo: f.titulo.trim(), descricao: f.descricao.trim() || null, programa: f.programa.trim(), ano_vigencia: ano });
    setSalvando(false);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font, marginBottom: 14 }}>{item.id ? "Editar mapeamento" : "Novo mapeamento"}</div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={lbl}>Título<input value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} style={inp} placeholder="Ex.: Ordem de envio do Infantil" /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
            <label style={lbl}>Programa<input value={f.programa} onChange={e => setF({ ...f, programa: e.target.value })} style={inp} list="mapeamentos-programas" /></label>
            <label style={lbl}>Vale a partir de<input type="number" value={f.ano_vigencia} onChange={e => setF({ ...f, ano_vigencia: e.target.value })} style={inp} /></label>
          </div>
          <datalist id="mapeamentos-programas">{PROGRAMAS.map(p => <option key={p} value={p} />)}</datalist>
          <label style={lbl}>Descrição<textarea value={f.descricao || ""} onChange={e => setF({ ...f, descricao: e.target.value })} rows={7} style={{ ...inp, resize: "vertical" }} placeholder="O que muda, a ordem, quem pediu..." /></label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ background: "#fff", border: "1px solid #DCDDDE", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ background: VERDE, border: "none", borderRadius: 4, padding: "9px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: salvando ? .6 : 1 }}>{salvando ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Mapeamentos({ onVoltar }) {
  const [lista, setLista] = useState(null);
  const [modal, setModal] = useState(null);
  const [programa, setPrograma] = useState("");
  const [historico, setHistorico] = useState({});   // mapeamento_id -> [{acao, usuario_nome, criado_em}]
  const [abertos, setAbertos] = useState({});
  const anoAtual = new Date().getFullYear();

  const carregar = useCallback(async () => {
    setLista(await buscarMapeamentos());
    const { data } = await supabase.from("mapeamentos_historico").select("*").order("criado_em", { ascending: false });
    const por = {};
    (data || []).forEach(h => { (por[h.mapeamento_id] = por[h.mapeamento_id] || []).push(h); });
    setHistorico(por);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function salvar(dados) {
    const { data: s } = await supabase.auth.getSession();
    const agora = new Date().toISOString();
    const { error } = modal.id
      ? await supabase.from("mapeamentos").update({ ...dados, atualizado_em: agora }).eq("id", modal.id)
      : await supabase.from("mapeamentos").insert([{ ...dados, criado_por: s?.session?.user?.email || null }]);
    if (error) { alert("Erro ao salvar: " + error.message); return; }
    setModal(null); carregar();
  }
  async function marcar(m, verificado) {
    const { data: sess } = await supabase.auth.getSession();
    const email = sess?.session?.user?.email;
    if (!email) { alert("Sessão expirada. Entre novamente."); return; }
    const { data: u } = await supabase.from("usuarios").select("nome").eq("email", email.toLowerCase()).maybeSingle();
    const nome = u?.nome || email;
    const agora = new Date().toISOString();
    const { error } = await supabase.from("mapeamentos").update(verificado
      ? { verificado_ano: anoAtual, verificado_por: nome, verificado_em: agora, atualizado_em: agora }
      : { verificado_ano: null, verificado_por: null, verificado_em: null, atualizado_em: agora }).eq("id", m.id);
    if (error) { alert("Erro: " + error.message); return; }
    await supabase.from("mapeamentos_historico").insert([{ mapeamento_id: m.id, acao: verificado ? "verificado" : "reaberto", usuario_email: email, usuario_nome: nome }]);
    carregar();
  }
  async function excluir(m) {
    if (!window.confirm(`Excluir "${m.titulo}"?`)) return;
    await supabase.from("mapeamentos").delete().eq("id", m.id);
    carregar();
  }

  const programas = Array.from(new Set((lista || []).map(m => m.programa)));
  const visiveis = (lista || []).filter(m => !programa || m.programa === programa);
  const pendentes = pendentesDeVerificacao(lista);
  const anos = Array.from(new Set(visiveis.map(m => m.ano_vigencia))).sort((a, b) => b - a);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px", fontFamily: font }}>
      <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8 }}>Voltar ao Dashboard</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>Mapeamentos</div>
        <div style={{ display: "flex", gap: 8 }}>
          {programas.length > 1 && (
            <select value={programa} onChange={e => setPrograma(e.target.value)} style={{ ...inp, width: "auto" }}>
              <option value="">Todos os programas</option>
              {programas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <button onClick={() => setModal({})} style={{ background: VERDE, border: "none", borderRadius: 4, padding: "9px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>+ Novo mapeamento</button>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 18 }}>Mudanças planejadas para os próximos anos. De agosto a novembro, o sistema avisa o que vale para o ano seguinte e ainda não foi verificado.</div>

      {pendentes.length > 0 && (
        <div style={{ background: "#FFF4DC", border: `1.5px solid ${AMBAR}`, borderRadius: 8, padding: "12px 16px", marginBottom: 18, fontSize: 14 }}>
          <b>{pendentes.length} para verificar antes de {anoAtual + 1}.</b> Confira cada um e clique em "Marcar como verificado".
        </div>
      )}

      {!lista ? <div style={{ color: "#aaa", padding: 30, textAlign: "center" }}>Carregando...</div>
        : visiveis.length === 0 ? <div style={{ color: "#aaa", padding: 30, textAlign: "center" }}>Nenhum mapeamento ainda.</div>
        : anos.map(ano => (
          <div key={ano} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
              {ano >= anoAtual ? `Vale a partir de ${ano}` : `Vigente desde ${ano}`}
            </div>
            {visiveis.filter(m => m.ano_vigencia === ano).map(m => {
              const precisa = ano === anoAtual + 1 && m.verificado_ano !== anoAtual;
              return (
                <div key={m.id} style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,.08)", padding: "16px 20px", marginBottom: 10, borderLeft: `4px solid ${precisa && emPeriodoDeVerificacao() ? AMBAR : VERDE}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{m.titulo}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {m.programa}
                      </div>
                      {m.verificado_em && (
                        <div style={{ fontSize: 12, color: "#148A00", fontWeight: 700, marginTop: 4 }}>
                          ✓ Verificado por {m.verificado_por || "—"} em {fmtQuando(m.verificado_em)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                      {m.verificado_ano === anoAtual
                        ? <button onClick={() => marcar(m, false)} style={btnSec}>Reabrir</button>
                        : <button onClick={() => marcar(m, true)} style={{ ...btnSec, background: VERDE, border: "none", fontWeight: 800 }}>Marcar como verificado</button>}
                      <button onClick={() => setModal(m)} style={btnSec}>Editar</button>
                      <button onClick={() => excluir(m)} style={{ ...btnSec, color: "#D81E27", borderColor: "#D81E27" }}>Excluir</button>
                    </div>
                  </div>
                  {(historico[m.id] || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => setAbertos(a => ({ ...a, [m.id]: !a[m.id] }))}
                        style={{ background: "none", border: "none", color: "#666", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: font }}>
                        {abertos[m.id] ? "▾" : "▸"} Histórico de verificações ({historico[m.id].length})
                      </button>
                      {abertos[m.id] && historico[m.id].map(h => (
                        <div key={h.id} style={{ fontSize: 12, color: "#555", fontFamily: fontB, marginTop: 4 }}>
                          {h.acao === "verificado" ? "✓ Verificado" : "↺ Reaberto"} por {h.usuario_nome || h.usuario_email} em {fmtQuando(h.criado_em)}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.descricao && <div style={{ fontSize: 14, color: "#333", marginTop: 10, whiteSpace: "pre-wrap", fontFamily: fontB, lineHeight: 1.5 }}>{m.descricao}</div>}
                </div>
              );
            })}
          </div>
        ))}

      {modal && <Modal item={modal} onSave={salvar} onClose={() => setModal(null)} />}
    </div>
  );
}

const btnSec = { background: "#fff", border: "1px solid #DCDDDE", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" };
