import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import SinoNotificacoes from "./Notificacoes";

const font  = "'Figtree','Circular Std','Segoe UI',system-ui,sans-serif";
const fontB = "'Barlow','DIN Round Pro','Segoe UI',system-ui,sans-serif";
const VERDE = "#39DF18";
const PRETO = "#231F20";
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const PLANOS = ["Mensal", "Semestral", "Anual"];
const STATUS_PGTO = ["Pago", "Em aberto"];
const TIPOS = ["NOVO", "RENOVAÇÃO"];
const STATUS_ALUNO = ["Ativo", "Desistiu"];

// Campos de "Informações" da escola (ficam em familias_escolas.dados)
const CAMPOS_INFO = [
  { key: "responsavel",        label: "Responsável na escola" },
  { key: "email_contato",      label: "E-mail de contato" },
  { key: "telefone",           label: "Telefone" },
  { key: "cidade",             label: "Cidade" },
  { key: "duracao",            label: "Duração da aula" },
  { key: "quem_matricula",     label: "Quem faz a matrícula" },
  { key: "inicio_cobranca",    label: "Início da cobrança" },
  { key: "quem_envia_contatos",label: "Quem envia os contatos" },
  { key: "pagamento",          label: "Pagamento (controle)" },
  { key: "comunicacao",        label: "Comunicação com as famílias" },
  { key: "idioma",             label: "Idioma" },
  { key: "idioma_pais",        label: "Idioma com os pais" },
  { key: "contrato",           label: "Contrato" },
  { key: "repasse",            label: "Repasse" },
  { key: "descontos",          label: "Descontos", full: true },
  { key: "mediadores",         label: "Mediadores", full: true },
];

const moeda = (v) => (v === null || v === undefined || v === "") ? "—"
  : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numOuNull = (v) => { if (v === "" || v === null || v === undefined) return null; const n = Number(String(v).replace(",", ".")); return isNaN(n) ? null : n; };
const ordenaNome = (a, b) => (a.aluno || "").localeCompare(b.aluno || "", "pt-BR", { sensitivity: "base" });

function baixarCSV(nome, linhas) {
  const csv = "﻿" + linhas.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const inp = { border: "2px solid #DCDDDE", borderRadius: 6, padding: "8px 10px", fontSize: 14, fontFamily: fontB, width: "100%", boxSizing: "border-box" };
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71" };
const btnPrim = { background: VERDE, color: PRETO, border: "none", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 800, fontFamily: font, cursor: "pointer" };
const btnSec  = { background: "#fff", color: PRETO, border: "2px solid #DCDDDE", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 700, fontFamily: font, cursor: "pointer" };

const MES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
// Aluno com pagamento mensal: plano "Mensal" ou observação "Plano mensal"
const ehMensal = (a) => a.plano === "Mensal" || /plano mensal/i.test(a.observacoes || "");
// Forma de pagamento do aluno: "mensal" | "semestral" | "anual" | null
// (mensal usa os meses 1 a 12; semestral usa mes 1 = 1º semestre e mes 7 = 2º semestre; anual usa mes 1)
const tipoPgto = (a) => ehMensal(a) ? "mensal" : a.plano === "Semestral" ? "semestral" : a.plano === "Anual" ? "anual" : null;
const mesValido = (tipo, mes) => tipo === "mensal" ? true : tipo === "semestral" ? (mes === 1 || mes === 7) : tipo === "anual" ? mes === 1 : false;
const rotuloPeriodo = (tipo, r) => {
  const aa = String(r.ano).slice(2);
  if (tipo === "semestral") return `${r.mes === 7 ? "2º" : "1º"} sem/${aa}`;
  if (tipo === "anual") return `Anual/${aa}`;
  return `${MES_ABREV[r.mes - 1]}/${aa}`;
};

// ── Modal: controle das mensalidades do aluno ───────────────────
function ModalMensalidades({ aluno, tipo, registros, onClose, onMudou }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [salvando, setSalvando] = useState(null);
  const anoAtual = new Date().getFullYear();

  // Linhas exibidas conforme a forma de pagamento
  const periodos = tipo === "semestral"
    ? [{ label: "1º semestre (jan a jun)", mes: 1 }, { label: "2º semestre (jul a dez)", mes: 7 }]
    : tipo === "anual"
      ? [{ label: `Ano ${ano} (pagamento anual)`, mes: 1 }]
      : MESES.map((nome, i) => ({ label: nome, mes: i + 1 }));
  const statusDe = (mes) => (registros.find(x => x.ano === ano && x.mes === mes) || {}).status || "";

  async function definir(mes, novo) {
    setSalvando(mes);
    let erro = null;
    if (!novo) {
      ({ error: erro } = await supabase.from("familias_mensalidades").delete().eq("aluno_id", aluno.id).eq("ano", ano).eq("mes", mes));
    } else {
      ({ error: erro } = await supabase.from("familias_mensalidades").upsert(
        { aluno_id: aluno.id, ano, mes, status: novo, atualizado_em: new Date().toISOString() },
        { onConflict: "aluno_id,ano,mes" }));
    }
    setSalvando(null);
    if (erro) alert("Erro ao salvar: " + erro.message);
    onMudou();
  }

  const btn = (ativo, cor, bg) => ({ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: font, cursor: "pointer",
    border: `2px solid ${ativo ? cor : "#DCDDDE"}`, background: ativo ? bg : "#fff", color: ativo ? cor : "#6D6E71" });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font }}>{aluno.aluno}</div>
            <div style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>
              {tipo === "mensal" ? "Mensalidades" : tipo === "semestral" ? "Pagamento semestral" : "Pagamento anual"}
              {aluno.mensalidade ? ` · ${moeda(aluno.mensalidade)}${tipo === "mensal" ? " por mês" : ""}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6D6E71" }}>×</button>
        </div>

        <div style={{ margin: "16px 0 10px", display: "flex", alignItems: "center", gap: 10 }}>
          <select value={ano} onChange={e => setAno(+e.target.value)} style={{ ...inp, width: "auto", fontWeight: 800 }}>
            {[anoAtual - 1, anoAtual, anoAtual + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>Marque como pago ou inadimplente.</span>
        </div>

        <div style={{ border: "1px solid #DCDDDE", borderRadius: 6 }}>
          {periodos.map((pe, i) => {
            const s = statusDe(pe.mes);
            return (
              <div key={pe.mes} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderTop: i ? "1px solid #EEE" : "none",
                background: s === "Inadimplente" ? "rgba(216,30,39,.07)" : "transparent", opacity: salvando === pe.mes ? .6 : 1 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, fontFamily: fontB }}>{pe.label}</div>
                <button onClick={() => definir(pe.mes, s === "Pago" ? "" : "Pago")} style={btn(s === "Pago", "#148A00", "rgba(57,223,24,.2)")}>Pago</button>
                <button onClick={() => definir(pe.mes, s === "Inadimplente" ? "" : "Inadimplente")} style={btn(s === "Inadimplente", "#D81E27", "rgba(216,30,39,.12)")}>Inadimplente</button>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#6D6E71", fontFamily: fontB, marginTop: 8 }}>Clique de novo no botão marcado para limpar.</div>
        <div style={{ textAlign: "right", marginTop: 14 }}>
          <button onClick={onClose} style={btnPrim}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de aluno ──────────────────────────────────────────────
function ModalAluno({ aluno, onSave, onClose }) {
  const [f, setF] = useState({
    aluno: "", nascimento: "", responsavel: "", telefone: "", email: "", turma: "", plano: "", mensalidade: "", desconto: "",
    valor_pago: "", em_aberto: "", status_pgto: "", tipo: "", observacoes: "", previsao_2s: "", status: "Ativo", motivo_desistencia: "",
    ...Object.fromEntries(Object.entries(aluno || {}).map(([k, v]) => [k, v ?? ""])),
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const campo = (k, label, props = {}) => (
    <label style={{ ...lbl, ...(props.full ? { gridColumn: "1/-1" } : {}) }}>{label}
      {props.options ? (
        <select value={f[k]} onChange={e => set(k, e.target.value)} style={inp}>
          <option value="">—</option>{props.options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : props.area ? (
        <textarea value={f[k]} onChange={e => set(k, e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
      ) : (
        <input type={props.num ? "number" : "text"} step={props.num ? "0.01" : undefined} value={f[k]} onChange={e => set(k, e.target.value)} style={inp} />
      )}
    </label>
  );
  function salvar() {
    if (!String(f.aluno).trim()) { alert("Informe o nome do aluno."); return; }
    onSave({
      aluno: String(f.aluno).trim(), nascimento: f.nascimento || null,
      responsavel: f.responsavel || null, telefone: f.telefone || null, email: f.email || null, turma: f.turma || null,
      plano: f.plano || null, mensalidade: numOuNull(f.mensalidade), desconto: numOuNull(f.desconto),
      valor_pago: numOuNull(f.valor_pago), em_aberto: numOuNull(f.em_aberto),
      status_pgto: f.status_pgto || null, tipo: f.tipo || null, observacoes: f.observacoes || null,
      previsao_2s: f.previsao_2s || null, status: f.status || "Ativo",
      motivo_desistencia: f.status === "Desistiu" ? (f.motivo_desistencia || null) : null,
    });
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(35,31,32,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 8 }}>
      <div style={{ background: "#fff", borderRadius: 8, width: "min(760px,96vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", borderTop: `6px solid ${VERDE}` }}>
        <div style={{ padding: "18px 22px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font, textTransform: "lowercase" }}>{aluno?.id ? "editar aluno" : "adicionar aluno"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <div style={{ padding: "8px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, overflowY: "auto" }}>
          {campo("aluno", "Aluno", { full: true })}
          {campo("nascimento", "Data de nascimento (dd/mm/aaaa)")}
          {campo("responsavel", "Responsável")}
          {campo("telefone", "Telefone")}
          {campo("email", "E-mail", { full: true })}
          {campo("turma", "Turma / dia e horário")}
          {campo("tipo", "Tipo", { options: TIPOS })}
          {campo("plano", "Plano de pagamento", { options: PLANOS })}
          {campo("status_pgto", "Status do pagamento", { options: STATUS_PGTO })}
          {campo("mensalidade", "Valor da mensalidade", { num: true })}
          {campo("desconto", "Desconto", { num: true })}
          {campo("valor_pago", "Valor pago", { num: true })}
          {campo("em_aberto", "Em aberto", { num: true })}
          {campo("previsao_2s", "Previsão 2º semestre")}
          {campo("status", "Situação do aluno", { options: STATUS_ALUNO })}
          {f.status === "Desistiu" && campo("motivo_desistencia", "Motivo da desistência", { full: true, area: true })}
          {campo("observacoes", "Observações", { full: true, area: true })}
        </div>
        <div style={{ padding: "14px 22px 18px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={salvar} style={btnPrim}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Aba: Alunos / Famílias ──────────────────────────────────────
function AbaAlunos({ escola, alunos, recarregar }) {
  const [filtro, setFiltro] = useState("Ativo");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [mens, setMens] = useState({});            // aluno_id -> linhas de familias_mensalidades
  const [modalMens, setModalMens] = useState(null);

  const carregarMens = useCallback(async () => {
    const ids = alunos.map(a => a.id);
    if (!ids.length) { setMens({}); return; }
    const { data } = await supabase.from("familias_mensalidades").select("*").in("aluno_id", ids);
    const m = {};
    (data || []).forEach(r => { (m[r.aluno_id] = m[r.aluno_id] || []).push(r); });
    setMens(m);
  }, [alunos]);
  useEffect(() => { carregarMens(); }, [carregarMens]);

  const inadDe = (a) => (mens[a.id] || []).filter(r => r.status === "Inadimplente" && mesValido(tipoPgto(a), r.mes)).sort((x, y) => x.ano - y.ano || x.mes - y.mes);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos
      .filter(a => filtro === "Todos" || a.status === filtro)
      .filter(a => !q || [a.aluno, a.responsavel, a.email, a.telefone, a.turma].some(v => (v || "").toLowerCase().includes(q)))
      .sort(ordenaNome);
  }, [alunos, filtro, busca]);

  const totais = useMemo(() => {
    const at = alunos.filter(a => a.status === "Ativo");
    return {
      ativos: at.length,
      pagos: at.filter(a => a.status_pgto === "Pago").length,
      abertos: at.filter(a => a.status_pgto !== "Pago").length,
      emAberto: at.reduce((s, a) => s + (Number(a.em_aberto) || 0), 0),
      desistiu: alunos.filter(a => a.status === "Desistiu").length,
      inadimplentes: at.filter(a => (mens[a.id] || []).some(r => r.status === "Inadimplente" && mesValido(tipoPgto(a), r.mes))).length,
    };
  }, [alunos, mens]);

  async function salvar(dados) {
    if (modal?.id) await supabase.from("familias_alunos").update(dados).eq("id", modal.id);
    else await supabase.from("familias_alunos").insert({ ...dados, escola_id: escola.id });
    setModal(null);
    recarregar();
  }
  async function remover(a) {
    if (!window.confirm(`Remover "${a.aluno}"? Isso apaga também a chamada dele. Esta ação não pode ser desfeita.`)) return;
    await supabase.from("familias_alunos").delete().eq("id", a.id);
    recarregar();
  }
  function exportar() {
    const linhas = [["Aluno","Responsável","Telefone","E-mail","Turma","Plano","Mensalidade","Desconto","Valor pago","Em aberto","Status pgto","Tipo","Situação","Motivo desistência","Observações"]];
    lista.forEach(a => linhas.push([a.aluno,a.responsavel,a.telefone,a.email,a.turma,a.plano,a.mensalidade,a.desconto,a.valor_pago,a.em_aberto,a.status_pgto,a.tipo,a.status,a.motivo_desistencia,a.observacoes]));
    baixarCSV(`Familias_${escola.nome.replace(/[^\w]+/g, "_")}.csv`, linhas);
  }

  const card = (v, r, c) => (
    <div style={{ background: "#F1F2F2", borderRadius: 6, padding: "10px 14px", borderTop: `3px solid ${c}`, minWidth: 110 }}>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: font }}>{v}</div>
      <div style={{ fontSize: 10, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71" }}>{r}</div>
    </div>
  );
  const th = { padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71", whiteSpace: "nowrap", background: "#F1F2F2" };
  const td = { padding: "8px 10px", verticalAlign: "top", fontSize: 13 };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {card(totais.ativos, "Alunos ativos", VERDE)}
        {card(totais.pagos, "Pagos", "#148A00")}
        {card(totais.abertos, "Em aberto", "#FFA300")}
        {card(moeda(totais.emAberto), "A receber", "#D81E27")}
        {card(totais.inadimplentes, "Inadimplentes", "#D81E27")}
        {card(totais.desistiu, "Desistências", "#DCDDDE")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {["Ativo", "Desistiu", "Todos"].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ ...btnSec, padding: "6px 12px", background: filtro === s ? PRETO : "#fff", color: filtro === s ? "#fff" : PRETO, borderColor: filtro === s ? PRETO : "#DCDDDE" }}>
            {s === "Ativo" ? "Ativos" : s === "Desistiu" ? "Desistentes" : "Todos"}
          </button>
        ))}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno, responsável, e-mail..." style={{ ...inp, maxWidth: 300 }} />
        <button onClick={exportar} style={{ ...btnSec, marginLeft: "auto" }}>↓ CSV</button>
        <button onClick={() => setModal({})} style={btnPrim}>+ Adicionar aluno</button>
      </div>

      {lista.length === 0 ? (
        <div style={{ color: "#6D6E71", fontStyle: "italic", fontSize: 14, padding: "12px 0" }}>Nenhum aluno encontrado.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #DCDDDE", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontB }}>
            <thead>
              <tr>
                {["Aluno", "Responsável", "Telefone", "E-mail", "Turma", "Plano", "Mensalidade", "Pago", "Em aberto", "Status", "Tipo", ""].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map(a => { const inad = inadDe(a); return (
                <tr key={a.id} style={{ borderTop: "1px solid #DCDDDE", opacity: a.status === "Desistiu" ? .65 : 1, background: inad.length ? "rgba(216,30,39,.08)" : "transparent" }}>
                  <td style={{ ...td, fontWeight: 700 }}>
                    {tipoPgto(a) ? (
                      <button onClick={() => setModalMens(a)} title="Controlar pagamentos"
                        style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, cursor: "pointer", textAlign: "left", textDecoration: "underline dotted", color: inad.length ? "#D81E27" : "inherit" }}>
                        {a.aluno}
                      </button>
                    ) : a.aluno}
                    {inad.length > 0 && <div style={{ fontSize: 11, color: "#D81E27", fontWeight: 800 }}>Inadimplente: {inad.map(r => rotuloPeriodo(tipoPgto(a), r)).join(", ")}</div>}
                    {a.status === "Desistiu" && <div style={{ fontSize: 11, color: "#D81E27", fontWeight: 600 }}>Desistiu{a.motivo_desistencia ? ` · ${a.motivo_desistencia}` : ""}</div>}
                    {a.observacoes && <div style={{ fontSize: 11, color: "#6D6E71", fontWeight: 400 }}>{a.observacoes}</div>}
                  </td>
                  <td style={td}>{a.responsavel || "—"}</td>
                  <td style={td}>{a.telefone || "—"}</td>
                  <td style={{ ...td, wordBreak: "break-all" }}>{a.email || "—"}</td>
                  <td style={td}>{a.turma || "—"}</td>
                  <td style={td}>{a.plano || "—"}</td>
                  <td style={td}>{moeda(a.mensalidade)}</td>
                  <td style={td}>{moeda(a.valor_pago)}</td>
                  <td style={td}>{moeda(a.em_aberto)}</td>
                  <td style={td}>
                    {a.status_pgto ? (
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 9px", borderRadius: 999, background: a.status_pgto === "Pago" ? "rgba(57,223,24,.18)" : "rgba(255,163,0,.2)", color: a.status_pgto === "Pago" ? "#148A00" : "#B45309", whiteSpace: "nowrap" }}>{a.status_pgto}</span>
                    ) : "—"}
                  </td>
                  <td style={td}>{a.tipo || "—"}</td>
                  <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                    <button onClick={() => setModal(a)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✏️</button>
                    <button onClick={() => remover(a)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#D81E27", fontWeight: 700 }}>✕</button>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      )}
      {modalMens && <ModalMensalidades aluno={modalMens} tipo={tipoPgto(modalMens)} registros={mens[modalMens.id] || []} onClose={() => setModalMens(null)} onMudou={carregarMens} />}
      {modal && <ModalAluno aluno={modal} onSave={salvar} onClose={() => setModal(null)} />}
    </div>
  );
}

// ── Aba: Lista de chamada ───────────────────────────────────────
const CICLO = { "": "P", P: "F", F: "J", J: "" };
const COR = { P: { bg: "rgba(57,223,24,.25)", c: "#148A00" }, F: { bg: "rgba(216,30,39,.15)", c: "#D81E27" }, J: { bg: "rgba(255,163,0,.25)", c: "#B45309" } };

function AbaChamada({ escola, alunos }) {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth());
  const [registros, setRegistros] = useState({});   // aluno_id -> linha
  const [carregando, setCarregando] = useState(true);
  const [turmaSel, setTurmaSel] = useState("");   // "" = todas as turmas

  const ativos = useMemo(() => alunos.filter(a => a.status === "Ativo").sort(ordenaNome), [alunos]);
  const turmas = useMemo(() => [...new Set(ativos.map(a => (a.turma || "").trim()).filter(Boolean))].sort((x, y) => x.localeCompare(y, "pt-BR")), [ativos]);
  const temSemTurma = useMemo(() => ativos.some(a => !(a.turma || "").trim()), [ativos]);
  // Se a turma escolhida não existe nesta escola (ex.: troca de escola), volta para "todas"
  useEffect(() => {
    if (turmaSel && turmaSel !== "__sem__" && !turmas.includes(turmaSel)) setTurmaSel("");
  }, [turmas, turmaSel]);
  const visiveis = useMemo(() => {
    if (!turmaSel) return ativos;
    if (turmaSel === "__sem__") return ativos.filter(a => !(a.turma || "").trim());
    return ativos.filter(a => (a.turma || "").trim() === turmaSel);
  }, [ativos, turmaSel]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const ids = ativos.map(a => a.id);
    if (!ids.length) { setRegistros({}); setCarregando(false); return; }
    const { data } = await supabase.from("familias_chamada").select("*").eq("ano", ano).eq("mes", mes + 1).in("aluno_id", ids);
    const m = {};
    (data || []).forEach(r => { m[r.aluno_id] = r; });
    setRegistros(m);
    setCarregando(false);
  }, [ativos, ano, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  async function gravar(alunoId, patch) {
    const atual = registros[alunoId] || {};
    const novo = { aluno_id: alunoId, ano, mes: mes + 1, s1: atual.s1 || null, s2: atual.s2 || null, s3: atual.s3 || null, s4: atual.s4 || null, s5: atual.s5 || null, obs: atual.obs || null, ...patch };
    setRegistros(r => ({ ...r, [alunoId]: { ...(r[alunoId] || {}), ...novo } }));
    const { error } = await supabase.from("familias_chamada").upsert(novo, { onConflict: "aluno_id,ano,mes" });
    if (error) { alert("Erro ao salvar a chamada: " + error.message); carregar(); }
  }
  const marcar = (alunoId, s) => gravar(alunoId, { [s]: CICLO[(registros[alunoId] || {})[s] || ""] || null });

  function freq(r) {
    if (!r) return null;
    const v = ["s1", "s2", "s3", "s4", "s5"].map(s => r[s]).filter(Boolean);
    const aulas = v.filter(x => x === "P" || x === "F").length;
    return aulas ? Math.round(v.filter(x => x === "P").length / aulas * 100) : null;
  }

  function exportar() {
    const linhas = [["Aluno", "Responsável", "Turma", "1ª sem", "2ª sem", "3ª sem", "4ª sem", "5ª sem", "Frequência %", "Observações"]];
    visiveis.forEach(a => { const r = registros[a.id] || {}; const f = freq(r); linhas.push([a.aluno, a.responsavel, a.turma, r.s1, r.s2, r.s3, r.s4, r.s5, f === null ? "" : f, r.obs]); });
    baixarCSV(`Chamada_${escola.nome.replace(/[^\w]+/g, "_")}_${MESES[mes]}_${ano}.csv`, linhas);
  }

  const th = { padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71", background: "#F1F2F2", whiteSpace: "nowrap" };
  const anos = [agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select value={mes} onChange={e => setMes(+e.target.value)} style={{ ...inp, width: "auto", fontWeight: 800 }}>
          {MESES.map((m, i) => <option key={m} value={i}>{m}{i === agora.getMonth() && ano === agora.getFullYear() ? " (mês atual)" : ""}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(+e.target.value)} style={{ ...inp, width: "auto", fontWeight: 800 }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)} style={{ ...inp, width: "auto", fontWeight: 800 }}>
          <option value="">Todas as turmas ({ativos.length})</option>
          {turmas.map(tn => <option key={tn} value={tn}>{tn} ({ativos.filter(a => (a.turma || "").trim() === tn).length})</option>)}
          {temSemTurma && <option value="__sem__">Sem turma</option>}
        </select>
        <div style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>
          Toque na semana para alternar: <b style={{ color: COR.P.c }}>P</b> presente · <b style={{ color: COR.F.c }}>F</b> falta · <b style={{ color: COR.J.c }}>J</b> justificada
        </div>
        <button onClick={exportar} style={{ ...btnSec, marginLeft: "auto" }}>↓ CSV</button>
      </div>

      {carregando ? (
        <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>Carregando...</div>
      ) : ativos.length === 0 ? (
        <div style={{ color: "#6D6E71", fontStyle: "italic", fontSize: 14 }}>Nenhum aluno ativo nesta escola.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #DCDDDE", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontB }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Aluno</th>
                {[1, 2, 3, 4, 5].map(n => <th key={n} style={th}>{n}ª semana</th>)}
                <th style={th}>Freq.</th>
                <th style={{ ...th, textAlign: "left" }}>Observações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(a => {
                const r = registros[a.id] || {};
                const f = freq(r);
                return (
                  <tr key={a.id} style={{ borderTop: "1px solid #DCDDDE" }}>
                    <td style={{ padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>
                      {a.aluno}
                      {a.turma && <div style={{ fontSize: 11, color: "#6D6E71", fontWeight: 400 }}>{a.turma}</div>}
                    </td>
                    {["s1", "s2", "s3", "s4", "s5"].map(s => {
                      const v = r[s] || "";
                      return (
                        <td key={s} style={{ padding: 4, textAlign: "center" }}>
                          <button onClick={() => marcar(a.id, s)}
                            style={{ width: 44, height: 34, border: "2px solid #DCDDDE", borderRadius: 6, cursor: "pointer", fontWeight: 800, fontFamily: font, fontSize: 14,
                              background: v ? COR[v].bg : "#fff", color: v ? COR[v].c : "#bbb" }}>
                            {v || "—"}
                          </button>
                        </td>
                      );
                    })}
                    <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>{f === null ? "—" : `${f}%`}</td>
                    <td style={{ padding: 4, minWidth: 160 }}>
                      <input defaultValue={r.obs || ""} key={`${a.id}-${ano}-${mes}-${r.id || "n"}`}
                        onBlur={e => { if ((e.target.value || "") !== (r.obs || "")) gravar(a.id, { obs: e.target.value || null }); }}
                        placeholder="Observação..." style={{ ...inp, padding: "6px 8px", fontSize: 13 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Aba: Informações da escola ──────────────────────────────────
function AbaInfo({ escola, recarregarEscolas }) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState(escola.dados || {});
  useEffect(() => { setF(escola.dados || {}); setEditando(false); }, [escola]);

  async function salvar() {
    const limpo = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined));
    await supabase.from("familias_escolas").update({ dados: limpo }).eq("id", escola.id);
    setEditando(false);
    recarregarEscolas();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        {editando ? (
          <>
            <button onClick={() => { setF(escola.dados || {}); setEditando(false); }} style={btnSec}>Cancelar</button>
            <button onClick={salvar} style={btnPrim}>Salvar</button>
          </>
        ) : <button onClick={() => setEditando(true)} style={btnSec}>✏️ Editar informações</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {CAMPOS_INFO.map(c => (
          <label key={c.key} style={{ ...lbl, ...(c.full ? { gridColumn: "1/-1" } : {}) }}>{c.label}
            {editando ? (
              <textarea value={f[c.key] || ""} onChange={e => setF({ ...f, [c.key]: e.target.value })} rows={c.full ? 2 : 1} style={{ ...inp, resize: "vertical" }} />
            ) : (
              <span style={{ fontSize: 14, fontFamily: fontB, textTransform: "none", letterSpacing: 0, fontWeight: 400, color: PRETO, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {(escola.dados || {})[c.key] || "—"}
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Tela principal ──────────────────────────────────────────────
// modoProfessor: mostra só as escolas liberadas e só a lista de chamada (sem dados financeiros nem contatos)
export default function Familias({ onVoltar, modoProfessor = false, onSair, nomeUsuario = "", podeExcluir = false }) {
  const [escolas, setEscolas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [selId, setSelId] = useState(null);
  const [aba, setAba] = useState("alunos");
  const [busca, setBusca] = useState("");
  const [novaEscola, setNovaEscola] = useState(null);   // null = fechado; string = nome sendo digitado
  const [salvandoEscola, setSalvandoEscola] = useState(false);

  async function criarEscola() {
    const nome = (novaEscola || "").trim();
    if (!nome) return;
    if (escolas.some(e => e.nome.trim().toLowerCase() === nome.toLowerCase())) { alert("Já existe uma escola com esse nome."); return; }
    const base = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "escola";
    const usados = new Set(escolas.map(e => e.id));
    let id = base, n = 2;
    while (usados.has(id)) id = `${base}-${n++}`;
    setSalvandoEscola(true);
    const { error } = await supabase.from("familias_escolas").insert({ id, nome, dados: {} });
    setSalvandoEscola(false);
    if (error) { alert("Erro ao criar a escola: " + error.message); return; }
    setNovaEscola(null);
    await carregar();
    setSelId(id); setAba("alunos");
  }

  async function excluirEscola(e) {
    const qtd = alunos.filter(a => a.escola_id === e.id).length;
    const digitado = window.prompt(
      `Excluir a escola "${e.nome}"?\n\nIsso apaga também ${qtd} aluno(s), as chamadas e as mensalidades dela. Não dá para desfazer.\n\nPara confirmar, digite o nome da escola:`);
    if (digitado === null) return;
    if (digitado.trim().toLowerCase() !== e.nome.trim().toLowerCase()) { alert("O nome não confere. Nada foi excluído."); return; }
    const { error } = await supabase.from("familias_escolas").delete().eq("id", e.id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    setSelId(null);
    carregar();
  }

  const carregar = useCallback(async () => {
    setErro("");
    const [e, a] = modoProfessor
      ? await Promise.all([supabase.rpc("prof_escolas"), supabase.rpc("prof_alunos")])
      : await Promise.all([
          supabase.from("familias_escolas").select("*").order("nome"),
          supabase.from("familias_alunos").select("*"),
        ]);
    if (e.error || a.error) setErro("Erro ao carregar: " + (e.error?.message || a.error?.message));
    setEscolas(e.data || []);
    setAlunos((a.data || []).map(x => modoProfessor ? { ...x, status: "Ativo" } : x));
    setCarregando(false);
  }, [modoProfessor]);
  useEffect(() => { carregar(); }, [carregar]);
  // Professor com uma única escola: já abre direto nela
  useEffect(() => {
    if (modoProfessor && escolas.length === 1 && !selId) setSelId(escolas[0].id);
  }, [modoProfessor, escolas, selId]);

  const sel = escolas.find(e => e.id === selId) || null;
  const alunosDaEscola = useMemo(() => alunos.filter(a => a.escola_id === selId), [alunos, selId]);

  const resumo = (id) => {
    const l = alunos.filter(a => a.escola_id === id && a.status === "Ativo");
    return { ativos: l.length, abertos: l.filter(a => a.status_pgto !== "Pago").length };
  };
  const filtradas = escolas.filter(e => !busca || e.nome.toLowerCase().includes(busca.toLowerCase()));
  const totalAtivos = alunos.filter(a => a.status === "Ativo").length;

  const abas = [["alunos", "Famílias"], ["chamada", "Lista de chamada"], ["info", "Informações"]];
  const abaAtiva = modoProfessor ? "chamada" : aba;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F2F2", fontFamily: fontB }}>
      <div style={{ background: PRETO, padding: "0 clamp(16px,4vw,40px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", paddingTop: 20, paddingBottom: 20 }}>
          {modoProfessor ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#C7C8CA", fontFamily: font }}>{nomeUsuario}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SinoNotificacoes tema="escuro" />
                <button onClick={onSair} style={{ background: VERDE, color: PRETO, border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 800, fontFamily: font, cursor: "pointer" }}>SAIR</button>
              </div>
            </div>
          ) : (
            <button onClick={onVoltar} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", fontFamily: font, padding: 0, marginBottom: 6, display: "block" }}>← Voltar ao Dashboard</button>
          )}
          <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: font, color: "#fff", margin: 0, lineHeight: 1 }}>
            {modoProfessor ? "lista de chamada" : "techlab"}
            <span style={{ display: "block", width: 44, height: 4, background: VERDE, borderRadius: 2, margin: "10px 0 6px" }} />
          </h1>
          <small style={{ fontSize: 12, fontWeight: 700, fontFamily: font, letterSpacing: ".06em", textTransform: "uppercase", color: "#C7C8CA" }}>
            {escolas.length} escolas{modoProfessor ? "" : ` · ${totalAtivos} alunos ativos`}
          </small>
        </div>
      </div>

      {erro && <div style={{ maxWidth: 1400, margin: "16px auto 0", padding: "0 clamp(16px,4vw,40px)" }}><div style={{ background: "#ffebee", color: "#c62828", padding: 12, borderRadius: 6, fontSize: 13 }}>{erro}</div></div>}

      <div className={"be-layout" + (sel ? " tem-sel" : "")}
        style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,4vw,40px) 40px", display: "grid", gridTemplateColumns: sel ? "minmax(260px,340px) 1fr" : "1fr", gap: 20, alignItems: "start" }}>
        <div className="be-lista" style={{ background: "#fff", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "2px dashed #DCDDDE" }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar escola..." style={inp} />
            {!modoProfessor && <button onClick={() => setNovaEscola("")} style={{ ...btnPrim, width: "100%", marginTop: 8 }}>+ Nova escola</button>}
          </div>
          {carregando ? <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>Carregando...</div>
            : filtradas.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#aaa", fontSize: 13 }}>{modoProfessor ? "Nenhuma escola liberada para você. Fale com a coordenação." : "Nenhuma escola. Rode o SQL de criação e de importação no Supabase."}</div>
            : filtradas.map(e => {
              const r = resumo(e.id);
              return (
                <div key={e.id} onClick={() => { setSelId(e.id); setAba(modoProfessor ? "chamada" : "alunos"); }}
                  style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #DCDDDE", cursor: "pointer",
                    background: selId === e.id ? "#F1F2F2" : "transparent", boxShadow: selId === e.id ? "inset 5px 0 0 " + VERDE : "none" }}>
                  <span>
                    <b style={{ display: "block", fontSize: 14, fontFamily: font }}>{e.nome}</b>
                    <small style={{ color: "#6D6E71", fontSize: 12 }}>{r.ativos} aluno{r.ativos !== 1 ? "s" : ""} ativo{r.ativos !== 1 ? "s" : ""}</small>
                  </span>
                  {modoProfessor ? null : r.abertos > 0
                    ? <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 9px", borderRadius: 999, background: "rgba(255,163,0,.2)", color: "#B45309", whiteSpace: "nowrap" }}>{r.abertos} em aberto</span>
                    : <span style={{ fontSize: 11, fontWeight: 700, fontFamily: font, padding: "3px 9px", borderRadius: 999, background: "rgba(57,223,24,.18)", color: "#148A00" }}>ok</span>}
                </div>
              );
            })}
        </div>

        {sel && (
          <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: font, margin: 0 }}>{sel.nome}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {podeExcluir && !modoProfessor && (
                  <button onClick={() => excluirEscola(sel)} style={{ background: "none", border: "2px solid #D81E27", color: "#D81E27", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, fontFamily: font, cursor: "pointer" }}>Excluir escola</button>
                )}
                <button onClick={() => setSelId(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#888" }}>×</button>
              </div>
            </div>
            <div style={{ display: modoProfessor ? "none" : "flex", gap: 4, padding: "12px 24px 0", borderBottom: "2px dashed #DCDDDE", overflowX: "auto" }}>
              {abas.map(([id, nome]) => (
                <button key={id} onClick={() => setAba(id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 15, fontWeight: 700, fontFamily: font, whiteSpace: "nowrap",
                    color: aba === id ? PRETO : "#6D6E71", borderBottom: aba === id ? `4px solid ${VERDE}` : "4px solid transparent" }}>
                  {nome}
                </button>
              ))}
            </div>
            <div style={{ padding: 24 }}>
              {abaAtiva === "alunos" && <AbaAlunos escola={sel} alunos={alunosDaEscola} recarregar={carregar} />}
              {abaAtiva === "chamada" && <AbaChamada escola={sel} alunos={alunosDaEscola} />}
              {abaAtiva === "info" && <AbaInfo escola={sel} recarregarEscolas={carregar} />}
            </div>
          </div>
        )}
      </div>

      {novaEscola !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setNovaEscola(null)}>
          <form onSubmit={e => { e.preventDefault(); criarEscola(); }} onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 420, padding: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font, marginBottom: 14 }}>Nova escola</div>
            <label style={lbl}>Nome da escola
              <input autoFocus value={novaEscola} onChange={e => setNovaEscola(e.target.value)} style={inp} placeholder="Ex.: Escola Exemplo" />
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" onClick={() => setNovaEscola(null)} style={btnSec}>Cancelar</button>
              <button type="submit" disabled={salvandoEscola || !novaEscola.trim()} style={{ ...btnPrim, opacity: salvandoEscola || !novaEscola.trim() ? .5 : 1 }}>{salvandoEscola ? "Criando..." : "Criar escola"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
