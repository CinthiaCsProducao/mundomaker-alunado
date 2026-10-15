import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import SinoNotificacoes from "./Notificacoes";

const font  = "'Figtree','Circular Std','Segoe UI',system-ui,sans-serif";
const fontB = "'Barlow','DIN Round Pro','Segoe UI',system-ui,sans-serif";
const VERDE = "#39DF18";
const PRETO = "#231F20";
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DIAS = ["SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const NOME_DIA_JS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const PLANOS = ["SEMESTRAL", "ANUAL", "MENSAL"];
const TIPOS = ["NOVO", "RENOVAÇÃO"];
const STATUS_ALUNO = ["Ativo", "Cancelado"];

const moeda = (v) => (v === null || v === undefined || v === "") ? "—"
  : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numOuNull = (v) => { if (v === "" || v === null || v === undefined) return null; const n = Number(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
const ordenaNome = (a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" });
const normHor = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
const cap = (s) => s ? s.charAt(0) + s.slice(1).toLowerCase() : "";
const rotuloTurma = (tu) => `${tu.nome || "Turma"} (${cap(tu.dia)}${tu.horario ? " " + tu.horario : ""})`;
const idxDia = (d) => { const i = DIAS.indexOf(d); return i < 0 ? 99 : i; };
const isoHoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const diaDaData = (iso) => NOME_DIA_JS[new Date(iso + "T12:00:00").getDay()];
const somaDias = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

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

// ── Modal: pagamentos mês a mês ─────────────────────────────────
function ModalPagamentos({ aluno, registros, onClose, onMudou }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [salvando, setSalvando] = useState(null);
  const anoAtual = new Date().getFullYear();
  const statusDe = (mes) => (registros.find(x => x.ano === ano && x.mes === mes) || {}).status || "";

  async function definir(mes, novo) {
    setSalvando(mes);
    let erro = null;
    if (!novo) {
      ({ error: erro } = await supabase.from("cm_pagamentos").delete().eq("aluno_id", aluno.id).eq("ano", ano).eq("mes", mes));
    } else {
      ({ error: erro } = await supabase.from("cm_pagamentos").upsert(
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
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font }}>{aluno.nome}</div>
            <div style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>
              Pagamentos{aluno.plano ? ` · ${cap(aluno.plano)}` : ""}{aluno.forma_pagamento ? ` · ${aluno.forma_pagamento}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#6D6E71" }}>×</button>
        </div>
        <div style={{ margin: "16px 0 10px", display: "flex", alignItems: "center", gap: 10 }}>
          <select value={ano} onChange={e => setAno(+e.target.value)} style={{ ...inp, width: "auto", fontWeight: 800 }}>
            {[anoAtual - 1, anoAtual, anoAtual + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>Marque cada mês como pago ou inadimplente.</span>
        </div>
        <div style={{ border: "1px solid #DCDDDE", borderRadius: 6 }}>
          {MESES.map((nome, i) => {
            const mes = i + 1; const s = statusDe(mes);
            return (
              <div key={nome} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderTop: i ? "1px solid #EEE" : "none",
                background: s === "Inadimplente" ? "rgba(216,30,39,.07)" : "transparent", opacity: salvando === mes ? .6 : 1 }}>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, fontFamily: fontB }}>{nome}</div>
                <button onClick={() => definir(mes, s === "Pago" ? "" : "Pago")} style={btn(s === "Pago", "#148A00", "rgba(57,223,24,.2)")}>Pago</button>
                <button onClick={() => definir(mes, s === "Inadimplente" ? "" : "Inadimplente")} style={btn(s === "Inadimplente", "#D81E27", "rgba(216,30,39,.12)")}>Inadimplente</button>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "#6D6E71", fontFamily: fontB, marginTop: 8 }}>Clique de novo no botão marcado para limpar.</div>
        <div style={{ textAlign: "right", marginTop: 14 }}><button onClick={onClose} style={btnPrim}>Fechar</button></div>
      </div>
    </div>
  );
}

// ── Modal: cadastro do aluno ────────────────────────────────────
function ModalAluno({ aluno, turmas, onSave, onClose }) {
  const [f, setF] = useState({
    nome: "", tipo: "RENOVAÇÃO", matricula: "", nascimento: "", escola_estuda: "", responsavel: "", cpf: "", telefone: "", email: "",
    plano: "SEMESTRAL", endereco: "", dia: "", horario: "", valor: "", faltando: "", forma_pagamento: "", status_pgto: "", contrato: "",
    conta_azul: "", observacoes: "", status: "Ativo", ...Object.fromEntries(Object.entries(aluno).map(([k, v]) => [k, v ?? ""])),
  });
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const turmaSel = turmas.find(tu => tu.id === f.turma_id) || null;
  const turmasOrd = [...turmas].sort((x, y) => idxDia(x.dia) - idxDia(y.dia) || (x.horario || "").localeCompare(y.horario || "", "pt-BR", { numeric: true }) || (x.nome || "").localeCompare(y.nome || "", "pt-BR"));
  const campo = (k, label, extra = {}) => (
    <label style={{ ...lbl, gridColumn: extra.full ? "1 / -1" : undefined }}>{label}
      {extra.options ? (
        <select value={f[k]} onChange={e => set(k, e.target.value)} style={inp}>
          {extra.vazio && <option value="">—</option>}
          {extra.options.map(o => <option key={o} value={o}>{k === "dia" ? cap(o) : o}</option>)}
        </select>
      ) : extra.area ? (
        <textarea value={f[k]} onChange={e => set(k, e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} />
      ) : (
        <input value={f[k]} onChange={e => set(k, e.target.value)} style={inp} list={extra.list} />
      )}
    </label>
  );

  async function salvar() {
    if (!f.nome.trim()) { alert("Informe o nome do aluno."); return; }
    setSalvando(true);
    await onSave({
      nome: f.nome.trim(), tipo: f.tipo || null, matricula: f.matricula || null, nascimento: f.nascimento || null,
      escola_estuda: f.escola_estuda || null, responsavel: f.responsavel || null, cpf: f.cpf || null, telefone: f.telefone || null,
      email: f.email || null, plano: f.plano || null, endereco: f.endereco || null, turma_id: f.turma_id || null,
      valor: numOuNull(f.valor), faltando: numOuNull(f.faltando), forma_pagamento: f.forma_pagamento || null, status_pgto: f.status_pgto || null,
      contrato: f.contrato || null, conta_azul: f.conta_azul || null, observacoes: f.observacoes || null, status: f.status || "Ativo",
    });
    setSalvando(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font, marginBottom: 14 }}>{aluno.id ? "Editar aluno" : "Novo aluno"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {campo("nome", "Nome do maker", { full: true })}
          {campo("tipo", "Tipo", { options: TIPOS })}
          {campo("status", "Situação", { options: STATUS_ALUNO })}
          {campo("matricula", "Matrícula (mês)")}
          {campo("nascimento", "Data de nascimento")}
          {campo("escola_estuda", "Escola em que estuda")}
          {campo("responsavel", "Responsável")}
          {campo("cpf", "CPF do responsável")}
          {campo("telefone", "Telefone")}
          {campo("email", "E-mail", { full: true })}
          {campo("endereco", "Endereço", { full: true })}
          {campo("plano", "Plano", { options: PLANOS, vazio: true })}
          {campo("forma_pagamento", "Forma de pagamento")}
          <label style={{ ...lbl, gridColumn: "1 / -1" }}>Turma
            <select value={f.turma_id || ""} onChange={e => set("turma_id", e.target.value)} style={inp}>
              <option value="">— sem turma —</option>
              {turmasOrd.map(tu => <option key={tu.id} value={tu.id}>{rotuloTurma(tu)}{tu.professor_nome ? ` · Prof. ${tu.professor_nome}` : ""}</option>)}
            </select>
            <span style={{ fontSize: 11, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#6D6E71" }}>
              {turmaSel ? `Professor: ${turmaSel.professor_nome || "não definido"}.` : "Sem turma, o aluno não aparece na lista de chamada."} Crie e edite turmas na aba Turmas e professores.
            </span>
          </label>
          {campo("valor", "Valor (R$)")}
          {campo("faltando", "Faltando pagar (R$)")}
          {campo("status_pgto", "Status do pagamento")}
          {campo("contrato", "Contrato")}
          {campo("conta_azul", "Conta Azul")}
          {campo("observacoes", "Observações", { full: true, area: true })}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrim, opacity: salvando ? .6 : 1 }}>{salvando ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Aba: Alunos ─────────────────────────────────────────────────
function AbaAlunos({ alunos, turmas, pagamentos, recarregar, podeExcluir }) {
  const [filtro, setFiltro] = useState("Ativo");
  const [diaSel, setDiaSel] = useState("");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [modalPgto, setModalPgto] = useState(null);

  const profDe = useCallback((a) => turmas.find(x => x.id === a.turma_id)?.professor_nome || "", [turmas]);
  const inadDe = (a) => (pagamentos[a.id] || []).filter(r => r.status === "Inadimplente").sort((x, y) => x.ano - y.ano || x.mes - y.mes);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos
      .filter(a => filtro === "Todos" || a.status === filtro)
      .filter(a => !diaSel || a.dia === diaSel)
      .filter(a => !q || [a.nome, a.responsavel, a.email, a.telefone, a.escola_estuda].some(v => (v || "").toLowerCase().includes(q)))
      .sort(ordenaNome);
  }, [alunos, filtro, diaSel, busca]);

  const tot = useMemo(() => {
    const at = alunos.filter(a => a.status === "Ativo");
    return {
      ativos: at.length,
      novos: at.filter(a => a.tipo === "NOVO").length,
      renov: at.filter(a => a.tipo === "RENOVAÇÃO").length,
      receber: at.reduce((s, a) => s + (Number(a.faltando) || 0), 0),
      inad: at.filter(a => (pagamentos[a.id] || []).some(r => r.status === "Inadimplente")).length,
    };
  }, [alunos, pagamentos]);

  async function salvar(dados) {
    let erro;
    if (modal?.id) ({ error: erro } = await supabase.from("cm_alunos").update(dados).eq("id", modal.id));
    else ({ error: erro } = await supabase.from("cm_alunos").insert(dados));
    if (erro) { alert("Erro ao salvar: " + erro.message); return; }
    setModal(null);
    recarregar();
  }
  async function remover(a) {
    if (!window.confirm(`Remover "${a.nome}"? Isso apaga também a chamada e os pagamentos dele. Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("cm_alunos").delete().eq("id", a.id);
    if (error) { alert("Erro ao remover: " + error.message); return; }
    recarregar();
  }
  function exportar() {
    const linhas = [["Aluno","Tipo","Matrícula","Nascimento","Escola","Responsável","CPF","Telefone","E-mail","Plano","Turma","Dia","Horário","Professor","Valor","Faltando","Forma de pagamento","Status pgto","Contrato","Conta Azul","Situação","Observações"]];
    lista.forEach(a => linhas.push([a.nome,a.tipo,a.matricula,a.nascimento,a.escola_estuda,a.responsavel,a.cpf,a.telefone,a.email,a.plano,a.turma_nome,a.dia,a.horario,profDe(a),a.valor,a.faltando,a.forma_pagamento,a.status_pgto,a.contrato,a.conta_azul,a.status,a.observacoes]));
    baixarCSV("CursoMaker_alunos.csv", linhas);
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
        {card(tot.ativos, "Alunos ativos", VERDE)}
        {card(tot.novos, "Novos", "#148A00")}
        {card(tot.renov, "Renovações", "#0B6BCB")}
        {card(moeda(tot.receber), "A receber", "#FFA300")}
        {card(tot.inad, "Inadimplentes", "#D81E27")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {["Ativo", "Cancelado", "Todos"].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ ...btnSec, padding: "6px 12px", background: filtro === s ? PRETO : "#fff", color: filtro === s ? "#fff" : PRETO, borderColor: filtro === s ? PRETO : "#DCDDDE" }}>
            {s === "Ativo" ? "Ativos" : s === "Cancelado" ? "Cancelados" : "Todos"}
          </button>
        ))}
        <select value={diaSel} onChange={e => setDiaSel(e.target.value)} style={{ ...inp, width: "auto", fontWeight: 700 }}>
          <option value="">Todos os dias</option>
          {DIAS.map(d => <option key={d} value={d}>{cap(d)}</option>)}
        </select>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno, responsável, escola..." style={{ ...inp, maxWidth: 280 }} />
        <button onClick={exportar} style={{ ...btnSec, marginLeft: "auto" }}>↓ CSV</button>
        <button onClick={() => setModal({})} style={btnPrim}>+ Adicionar aluno</button>
      </div>

      {lista.length === 0 ? (
        <div style={{ color: "#6D6E71", fontStyle: "italic", fontSize: 14, padding: "12px 0" }}>Nenhum aluno encontrado.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #DCDDDE", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontB }}>
            <thead>
              <tr>{["Aluno", "Responsável", "Telefone", "Escola", "Plano", "Turma", "Professor", "Valor", "Faltando", "Pgto", "Tipo", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {lista.map(a => { const inad = inadDe(a); return (
                <tr key={a.id} style={{ borderTop: "1px solid #DCDDDE", opacity: a.status === "Cancelado" ? .6 : 1, background: inad.length ? "rgba(216,30,39,.08)" : "transparent" }}>
                  <td style={{ ...td, fontWeight: 700 }}>
                    <button onClick={() => setModalPgto(a)} title="Controlar pagamentos"
                      style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 700, cursor: "pointer", textAlign: "left", textDecoration: "underline dotted", color: inad.length ? "#D81E27" : "inherit" }}>
                      {a.nome}
                    </button>
                    {inad.length > 0 && <div style={{ fontSize: 11, color: "#D81E27", fontWeight: 800 }}>Inadimplente: {inad.map(r => `${MES_ABREV[r.mes - 1]}/${String(r.ano).slice(2)}`).join(", ")}</div>}
                    {a.status === "Cancelado" && <div style={{ fontSize: 11, color: "#D81E27", fontWeight: 600 }}>Cancelado</div>}
                    {a.observacoes && <div style={{ fontSize: 11, color: "#6D6E71", fontWeight: 400 }}>{a.observacoes}</div>}
                  </td>
                  <td style={td}>{a.responsavel || "—"}{a.email && <div style={{ fontSize: 11, color: "#6D6E71", wordBreak: "break-all" }}>{a.email}</div>}</td>
                  <td style={td}>{a.telefone || "—"}</td>
                  <td style={td}>{a.escola_estuda || "—"}</td>
                  <td style={td}>{a.plano ? cap(a.plano) : "—"}</td>
                  <td style={td}>{a.turma_nome ? <b>{a.turma_nome}</b> : "—"}{a.dia && <div style={{ fontSize: 11, color: "#6D6E71" }}>{cap(a.dia)}{a.horario ? " · " + a.horario : ""}</div>}</td>
                  <td style={td}>{profDe(a) || "—"}</td>
                  <td style={td}>{moeda(a.valor)}</td>
                  <td style={td}>{moeda(a.faltando)}</td>
                  <td style={td}>{a.status_pgto || "—"}</td>
                  <td style={td}>{a.tipo ? cap(a.tipo) : "—"}</td>
                  <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                    <button onClick={() => setModal(a)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✏️</button>
                    {podeExcluir && <button onClick={() => remover(a)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#D81E27", fontWeight: 700 }}>✕</button>}
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      )}
      {modal && <ModalAluno aluno={modal} turmas={turmas} onSave={salvar} onClose={() => setModal(null)} />}
      {modalPgto && <ModalPagamentos aluno={modalPgto} registros={pagamentos[modalPgto.id] || []} onClose={() => setModalPgto(null)} onMudou={recarregar} />}
    </div>
  );
}

// ── Aba: Lista de chamada por dia e professor ───────────────────
const CICLO = { "": "P", P: "F", F: "J", J: "" };
const COR = { P: { bg: "rgba(57,223,24,.25)", c: "#148A00" }, F: { bg: "rgba(216,30,39,.15)", c: "#D81E27" }, J: { bg: "rgba(255,163,0,.25)", c: "#B45309" } };

function AbaChamada({ alunos, turmas, modoProfessor }) {
  const [data, setData] = useState(isoHoje());
  const [profSel, setProfSel] = useState("");
  const [rows, setRows] = useState([]);       // todas as presenças dos alunos (para frequência)
  const [carregando, setCarregando] = useState(true);

  const ativos = useMemo(() => alunos.filter(a => a.status === "Ativo"), [alunos]);
  const idsKey = ativos.map(a => a.id).join(",");

  const carregar = useCallback(async () => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (!ids.length) { setRows([]); setCarregando(false); return; }
    setCarregando(true);
    const { data: d } = await supabase.from("cm_chamada").select("*").in("aluno_id", ids);
    setRows(d || []);
    setCarregando(false);
  }, [idsKey]);
  useEffect(() => { carregar(); }, [carregar]);

  const diaNome = diaDaData(data);
  const professores = useMemo(() => [...new Set(turmas.map(t => t.professor_nome).filter(Boolean))].sort(), [turmas]);

  const grupos = useMemo(() => {
    const doDia = ativos.filter(a => a.dia === diaNome && a.turma_id);
    const mapa = new Map();
    doDia.forEach(a => { if (!mapa.has(a.turma_id)) mapa.set(a.turma_id, []); mapa.get(a.turma_id).push(a); });
    return [...mapa.entries()]
      .map(([id, lista]) => { const tu = turmas.find(x => x.id === id) || {}; return { id, nome: tu.nome || "Turma", horario: tu.horario || "", lista: lista.sort(ordenaNome), prof: tu.professor_nome || "" }; })
      .filter(g => !profSel || (profSel === "__sem__" ? !g.prof : g.prof === profSel))
      .sort((x, y) => x.horario.localeCompare(y.horario, "pt-BR", { numeric: true }) || x.nome.localeCompare(y.nome, "pt-BR"));
  }, [ativos, diaNome, profSel, turmas]);

  const regDoDia = (alunoId) => rows.find(r => r.aluno_id === alunoId && r.data === data) || null;
  const freq = (alunoId) => {
    const v = rows.filter(r => r.aluno_id === alunoId).map(r => r.status).filter(s => s === "P" || s === "F");
    return v.length ? Math.round(v.filter(s => s === "P").length / v.length * 100) : null;
  };

  async function gravar(alunoId, patch) {
    const atual = regDoDia(alunoId) || {};
    const novo = { aluno_id: alunoId, data, status: atual.status || null, obs: atual.obs || null, ...patch };
    setRows(rs => [...rs.filter(r => !(r.aluno_id === alunoId && r.data === data)), { ...atual, ...novo }]);
    const { error } = await supabase.from("cm_chamada").upsert(novo, { onConflict: "aluno_id,data" });
    if (error) { alert("Erro ao salvar a chamada: " + error.message); carregar(); }
  }
  const marcar = (alunoId) => gravar(alunoId, { status: CICLO[(regDoDia(alunoId) || {}).status || ""] || null });

  function exportar() {
    const linhas = [["Data", "Dia", "Turma", "Horário", "Professor", "Aluno", "Presença", "Observações"]];
    grupos.forEach(g => g.lista.forEach(a => { const r = regDoDia(a.id) || {}; linhas.push([data, cap(diaNome), g.nome, g.horario, g.prof, a.nome, r.status, r.obs]); }));
    baixarCSV(`Chamada_CursoMaker_${data}.csv`, linhas);
  }

  const th = { padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71", background: "#F1F2F2", whiteSpace: "nowrap" };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setData(somaDias(data, -1))} style={btnSec}>◀</button>
        <input type="date" value={data} onChange={e => e.target.value && setData(e.target.value)} style={{ ...inp, width: "auto", fontWeight: 800 }} />
        <button onClick={() => setData(somaDias(data, 1))} style={btnSec}>▶</button>
        <button onClick={() => setData(isoHoje())} style={btnSec}>Hoje</button>
        <b style={{ fontFamily: font, fontSize: 15 }}>{cap(diaNome)}</b>
        {!modoProfessor && (
          <select value={profSel} onChange={e => setProfSel(e.target.value)} style={{ ...inp, width: "auto", fontWeight: 700 }}>
            <option value="">Todos os professores</option>
            {professores.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="__sem__">Sem professor</option>
          </select>
        )}
        <div style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>
          Toque para alternar: <b style={{ color: COR.P.c }}>P</b> presente · <b style={{ color: COR.F.c }}>F</b> falta · <b style={{ color: COR.J.c }}>J</b> justificada
        </div>
        <button onClick={exportar} style={{ ...btnSec, marginLeft: "auto" }}>↓ CSV</button>
      </div>

      {carregando ? (
        <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>Carregando...</div>
      ) : grupos.length === 0 ? (
        <div style={{ color: "#6D6E71", fontStyle: "italic", fontSize: 14 }}>Nenhuma turma neste dia{profSel ? " para esse professor" : ""}.</div>
      ) : grupos.map(g => (
        <div key={g.id} style={{ border: "1px solid #DCDDDE", borderRadius: 6, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ background: PRETO, color: "#fff", padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "baseline" }}>
            <b style={{ fontFamily: font, fontSize: 15 }}>{g.nome}</b>
            <span style={{ fontSize: 12, color: "#C7C8CA" }}>{g.horario || "horário a definir"}</span>
            <span style={{ fontSize: 12, color: "#C7C8CA" }}>{g.prof ? `Prof. ${g.prof}` : "Sem professor"}</span>
            <span style={{ fontSize: 12, color: VERDE, marginLeft: "auto" }}>{g.lista.length} aluno{g.lista.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: fontB }}>
              <thead><tr>
                <th style={{ ...th, textAlign: "left" }}>Aluno</th>
                <th style={th}>Presença</th>
                <th style={th}>Freq.</th>
                <th style={{ ...th, textAlign: "left" }}>Observações</th>
              </tr></thead>
              <tbody>
                {g.lista.map(a => {
                  const r = regDoDia(a.id) || {}; const v = r.status || ""; const f = freq(a.id);
                  return (
                    <tr key={a.id} style={{ borderTop: "1px solid #DCDDDE" }}>
                      <td style={{ padding: "6px 10px", fontSize: 13, fontWeight: 700 }}>{a.nome}</td>
                      <td style={{ padding: 4, textAlign: "center" }}>
                        <button onClick={() => marcar(a.id)}
                          style={{ width: 56, height: 34, border: "2px solid #DCDDDE", borderRadius: 6, cursor: "pointer", fontWeight: 800, fontFamily: font, fontSize: 14,
                            background: v ? COR[v].bg : "#fff", color: v ? COR[v].c : "#bbb" }}>{v || "—"}</button>
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>{f === null ? "—" : `${f}%`}</td>
                      <td style={{ padding: 4, minWidth: 160 }}>
                        <input defaultValue={r.obs || ""} key={`${a.id}-${data}-${r.id || "n"}`}
                          onBlur={e => { if ((e.target.value || "") !== (r.obs || "")) gravar(a.id, { obs: e.target.value || null }); }}
                          placeholder="Observação..." style={{ ...inp, padding: "6px 8px", fontSize: 13 }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Aba: Turmas e professores ───────────────────────────────────
async function hashSenha(senha) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(senha));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function ModalTurma({ turma, professores, onSave, onClose }) {
  const [f, setF] = useState({ nome: turma.nome || "", dia: turma.dia || "", horario: turma.horario || "", professor_email: (turma.professor_email || "").toLowerCase() });
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  async function salvar() {
    if (!f.nome.trim()) { alert("Dê um nome para a turma."); return; }
    if (!f.dia) { alert("Escolha o dia da semana."); return; }
    const p = professores.find(x => x.email.toLowerCase() === f.professor_email);
    setSalvando(true);
    await onSave({
      nome: f.nome.trim(), dia: f.dia, horario: normHor(f.horario),
      professor_email: f.professor_email || null,
      professor_nome: f.professor_email ? (p ? p.nome : turma.professor_nome || null) : null,
    });
    setSalvando(false);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 460, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font, marginBottom: 14 }}>{turma.id ? "Editar turma" : "Nova turma"}</div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={lbl}>Nome da turma<input value={f.nome} onChange={e => set("nome", e.target.value)} style={inp} placeholder="Ex.: Quinta tarde A" autoFocus /></label>
          <label style={lbl}>Dia da semana
            <select value={f.dia} onChange={e => set("dia", e.target.value)} style={inp}>
              <option value="">—</option>
              {DIAS.map(d => <option key={d} value={d}>{cap(d)}</option>)}
            </select>
          </label>
          <label style={lbl}>Horário<input value={f.horario} onChange={e => set("horario", e.target.value)} style={inp} placeholder="Ex.: 16h20 às 18h" /></label>
          <label style={lbl}>Professor
            <select value={f.professor_email} onChange={e => set("professor_email", e.target.value)} style={inp}>
              <option value="">— sem professor —</option>
              {professores.map(pr => <option key={pr.email} value={pr.email.toLowerCase()}>{pr.nome}</option>)}
              {f.professor_email && !professores.some(pr => pr.email.toLowerCase() === f.professor_email) && <option value={f.professor_email}>{turma.professor_nome || f.professor_email}</option>}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrim, opacity: salvando ? .6 : 1 }}>{salvando ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// Cadastra um professor: cria o usuário (só com a permissão de professor) e envia o e-mail para ele criar a senha
function ModalProfessor({ onFeito, onClose }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    const em = email.trim().toLowerCase();
    if (!nome.trim() || !em) { alert("Preencha o nome e o e-mail."); return; }
    setSalvando(true);
    const rnd = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("usuarios").insert([{
      email: em, nome: nome.trim(), ativo: true, senha: await hashSenha(rnd),
      permissoes: { historico: false, escolas: false, inspiramaker: false, projecao: false, baseEscolas: false, familias: false, cursoMaker: false, cmProfessor: true, admin: false, popsAreas: [], chamadaEscolas: [] },
    }]);
    if (error) {
      setSalvando(false);
      alert(/duplicate|unique|23505/i.test(error.message + (error.code || ""))
        ? "Esse e-mail já está cadastrado em Usuários. Abra o usuário lá e marque a permissão \"Curso Maker: professor\"."
        : "Erro ao cadastrar: " + error.message);
      return;
    }
    const { error: errEmail } = await supabase.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/dashboard" } });
    setSalvando(false);
    alert(errEmail
      ? `Professor cadastrado, mas o e-mail não foi enviado (${errEmail.message}). Use "Enviar acesso" em Usuários.`
      : `Professor cadastrado! Enviamos para ${em} um e-mail com o link para criar a senha.`);
    onFeito();
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: "100%", maxWidth: 440, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font, marginBottom: 6 }}>Cadastrar professor</div>
        <div style={{ fontSize: 12, color: "#6D6E71", marginBottom: 14, fontFamily: fontB }}>Ele recebe um e-mail para criar a senha e, ao entrar, vê só a chamada das turmas dele.</div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={lbl}>Nome<input value={nome} onChange={e => setNome(e.target.value)} style={inp} autoFocus /></label>
          <label style={lbl}>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} /></label>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrim, opacity: salvando ? .6 : 1 }}>{salvando ? "Cadastrando..." : "Cadastrar e enviar e-mail"}</button>
        </div>
      </div>
    </div>
  );
}

function AbaTurmas({ alunos, turmas, professores, recarregar, ehAdmin }) {
  const [modal, setModal] = useState(null);
  const [modalProf, setModalProf] = useState(false);

  const lista = useMemo(() => [...turmas].sort((x, y) => idxDia(x.dia) - idxDia(y.dia) || (x.horario || "").localeCompare(y.horario || "", "pt-BR", { numeric: true }) || (x.nome || "").localeCompare(y.nome || "", "pt-BR")), [turmas]);
  const qtd = (tu) => alunos.filter(a => a.status === "Ativo" && a.turma_id === tu.id).length;

  async function salvar(dados) {
    const { error } = modal?.id
      ? await supabase.from("cm_turmas").update(dados).eq("id", modal.id)
      : await supabase.from("cm_turmas").insert(dados);
    if (error) { alert("Erro ao salvar a turma: " + error.message); return; }
    setModal(null);
    recarregar();
  }
  async function trocarProfessor(tu, email) {
    const p = professores.find(x => x.email.toLowerCase() === email);
    const { error } = await supabase.from("cm_turmas").update({ professor_email: email || null, professor_nome: email ? (p ? p.nome : tu.professor_nome) : null }).eq("id", tu.id);
    if (error) { alert("Erro ao salvar: " + error.message); return; }
    recarregar();
  }
  async function excluir(tu) {
    const n = alunos.filter(a => a.turma_id === tu.id).length;
    if (!window.confirm(`Excluir a turma "${tu.nome}"?${n ? `\n\n${n} aluno(s) ficarão sem turma (não saem do cadastro).` : ""}`)) return;
    const { error } = await supabase.from("cm_turmas").delete().eq("id", tu.id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    recarregar();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <button onClick={() => setModal({})} style={btnPrim}>+ Nova turma</button>
        {ehAdmin && <button onClick={() => setModalProf(true)} style={btnSec}>+ Cadastrar professor</button>}
        <span style={{ fontSize: 12, color: "#6D6E71", fontFamily: fontB }}>{lista.length} turma{lista.length !== 1 ? "s" : ""} · {professores.length} professor{professores.length !== 1 ? "es" : ""}</span>
      </div>
      {professores.length === 0 && (
        <div style={{ background: "#FFF8E1", border: "1px solid #FFE082", color: "#8a6d00", borderRadius: 6, padding: 12, fontSize: 13, marginBottom: 14 }}>
          Nenhum professor cadastrado ainda.{ehAdmin ? " Clique em + Cadastrar professor." : " Peça a um administrador para cadastrar."}
        </div>
      )}
      <div style={{ border: "1px solid #DCDDDE", borderRadius: 6, overflow: "hidden" }}>
        {lista.length === 0 && <div style={{ padding: 16, color: "#6D6E71", fontStyle: "italic" }}>Nenhuma turma ainda. Clique em + Nova turma.</div>}
        {lista.map((tu, i) => (
          <div key={tu.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "10px 14px", borderTop: i ? "1px solid #EEE" : "none" }}>
            <div style={{ flex: "1 1 220px", minWidth: 200 }}>
              <b style={{ fontFamily: font, fontSize: 14 }}>{tu.nome}</b>
              <div style={{ fontSize: 12, color: "#444" }}>{cap(tu.dia)}{tu.horario ? ` · ${tu.horario}` : " · horário a definir"}</div>
              <div style={{ fontSize: 11, color: "#6D6E71" }}>{qtd(tu)} aluno{qtd(tu) !== 1 ? "s" : ""} ativo{qtd(tu) !== 1 ? "s" : ""}</div>
            </div>
            <select value={(tu.professor_email || "").toLowerCase()} onChange={e => trocarProfessor(tu, e.target.value)} style={{ ...inp, width: "auto", minWidth: 220 }}>
              <option value="">— sem professor —</option>
              {professores.map(pr => <option key={pr.email} value={pr.email.toLowerCase()}>{pr.nome}</option>)}
              {tu.professor_email && !professores.some(pr => pr.email.toLowerCase() === tu.professor_email.toLowerCase()) && <option value={tu.professor_email.toLowerCase()}>{tu.professor_nome || tu.professor_email}</option>}
            </select>
            <button onClick={() => setModal(tu)} style={btnSec}>✏️ Editar</button>
            <button onClick={() => excluir(tu)} style={{ ...btnSec, color: "#D81E27", borderColor: "#D81E27" }}>Excluir</button>
          </div>
        ))}
      </div>
      {modal && <ModalTurma turma={modal} professores={professores} onSave={salvar} onClose={() => setModal(null)} />}
      {modalProf && <ModalProfessor onFeito={() => { setModalProf(false); recarregar(); }} onClose={() => setModalProf(false)} />}
    </div>
  );
}

// ── Aba: Aniversários (lê a data de nascimento do cadastro) ─────
// Aceita "dd/mm/aaaa", "dd/mm/aa", "dd/mm" e "aaaa-mm-dd"
function lerNascimento(txt) {
  const s = String(txt || "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let dia, mes, ano;
  if (m) { ano = +m[1]; mes = +m[2]; dia = +m[3]; }
  else {
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
    if (!m) return null;
    dia = +m[1]; mes = +m[2]; ano = m[3] && m[3].length === 4 ? +m[3] : null;
  }
  if (!(dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12)) return null;
  const anoAtual = new Date().getFullYear();
  if (ano !== null && (ano < 1990 || ano > anoAtual)) ano = null;
  return { dia, mes: mes - 1, ano };
}

function AbaAniversarios({ alunos, turmas }) {
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const [mes, setMes] = useState(mesAtual);
  const [incluirCancelados, setIncluirCancelados] = useState(false);

  const base = alunos.filter(a => incluirCancelados || a.status === "Ativo");
  const comData = base.map(a => ({ a, v: lerNascimento(a.nascimento) })).filter(x => x.v);
  const semData = base.length - comData.length;
  const doMes = comData.filter(x => x.v.mes === mes).sort((x, y) => x.v.dia - y.v.dia || ordenaNome(x.a, y.a));
  const hoje = doMes.filter(x => mes === mesAtual && x.v.dia === agora.getDate()).length;
  const proximos7 = doMes.filter(x => mes === mesAtual && x.v.dia > agora.getDate() && x.v.dia <= agora.getDate() + 7).length;
  const profDe = (a) => turmas.find(tu => tu.id === a.turma_id)?.professor_nome || "";
  const idadeQueFaz = (v) => v.ano ? agora.getFullYear() - v.ano : null;

  function exportar() {
    const linhas = [["Dia", "Aluno", "Idade que faz", "Responsável", "Telefone", "Dia do curso", "Horário", "Professor"]];
    doMes.forEach(({ a, v }) => linhas.push([`${String(v.dia).padStart(2, "0")}/${String(v.mes + 1).padStart(2, "0")}`, a.nome, idadeQueFaz(v) ?? "", a.responsavel, a.telefone, a.dia ? cap(a.dia) : "", a.horario, profDe(a)]));
    baixarCSV(`Aniversariantes_CursoMaker_${MESES[mes]}.csv`, linhas);
  }

  const card = (valor, rotulo, cor) => (
    <div style={{ background: "#F1F2F2", borderRadius: 6, padding: "14px 18px", borderTop: `4px solid ${cor}` }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: font, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: ".05em", textTransform: "uppercase", color: "#6D6E71", marginTop: 4 }}>{rotulo}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: font }}>Aniversariantes de</h2>
        <select value={mes} onChange={e => setMes(+e.target.value)} style={{ ...inp, width: "auto", fontSize: 16, fontWeight: 800 }}>
          {MESES.map((m, i) => <option key={m} value={i}>{m}{i === mesAtual ? " (mês atual)" : ""}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: fontB, cursor: "pointer" }}>
          <input type="checkbox" checked={incluirCancelados} onChange={e => setIncluirCancelados(e.target.checked)} />
          Incluir alunos cancelados
        </label>
        <button onClick={exportar} disabled={!doMes.length} style={{ ...btnPrim, marginLeft: "auto", opacity: doMes.length ? 1 : .5, cursor: doMes.length ? "pointer" : "not-allowed" }}>↓ Exportar CSV</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 }}>
        {card(doMes.length, `Aniversariantes em ${MESES[mes]}`, PRETO)}
        {mes === mesAtual && card(hoje, "Aniversariam hoje", VERDE)}
        {mes === mesAtual && card(proximos7, "Nos próximos 7 dias", "#FFD902")}
        {card(semData, "Alunos sem data de nascimento", "#DCDDDE")}
      </div>

      {doMes.length === 0 ? (
        <div style={{ background: "#F1F2F2", borderRadius: 6, padding: 36, textAlign: "center", color: "#888", fontFamily: fontB }}>Nenhum aluno faz aniversário em {MESES[mes]}.</div>
      ) : (
        <div style={{ border: "1px solid #DCDDDE", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ background: PRETO, color: "#fff", padding: "10px 18px", fontFamily: font, fontWeight: 800, fontSize: 13, letterSpacing: ".05em", textTransform: "uppercase" }}>{MESES[mes]}</div>
          {doMes.map(({ a, v }) => {
            const ehHoje = mes === mesAtual && v.dia === agora.getDate();
            const idade = idadeQueFaz(v);
            return (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 14, alignItems: "center", padding: "12px 18px", borderTop: "1px solid #DCDDDE", background: ehHoje ? "rgba(57,223,24,.1)" : "transparent" }}>
                <b style={{ fontFamily: font, fontSize: 18 }}>{String(v.dia).padStart(2, "0")}</b>
                <span>
                  <b style={{ display: "block", fontSize: 14, fontFamily: font }}>{a.nome}{idade ? ` · faz ${idade} anos` : ""}</b>
                  <small style={{ color: "#6D6E71", fontSize: 12 }}>
                    {[a.responsavel && `Resp.: ${a.responsavel}`, a.telefone, a.dia && `${cap(a.dia)}${a.horario ? " " + a.horario : ""}`, profDe(a) && `Prof. ${profDe(a)}`].filter(Boolean).join(" · ") || "—"}
                  </small>
                </span>
                {ehHoje && <span style={{ fontSize: 11, fontWeight: 800, fontFamily: font, padding: "3px 10px", borderRadius: 999, background: "rgba(57,223,24,.25)", color: "#148A00" }}>HOJE 🎂</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────
// modoProfessor: só a lista de chamada das turmas do professor (sem dados pessoais nem financeiros)
export default function CursoMaker({ onVoltar, modoProfessor = false, onSair, nomeUsuario = "", podeExcluir = false }) {
  const ehAdmin = podeExcluir;
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [pagamentos, setPagamentos] = useState({});
  const [professores, setProfessores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState(modoProfessor ? "chamada" : "alunos");

  const carregar = useCallback(async () => {
    setErro("");
    if (modoProfessor) {
      const [t, a] = await Promise.all([supabase.rpc("cm_prof_turmas"), supabase.rpc("cm_prof_alunos")]);
      if (t.error || a.error) setErro("Erro ao carregar: " + (t.error?.message || a.error?.message));
      const tu = t.data || [];
      setTurmas(tu);
      setAlunos((a.data || []).map(x => { const te = tu.find(y => y.id === x.turma_id); return { ...x, status: "Ativo", dia: te?.dia || null, horario: te?.horario || null, turma_nome: te?.nome || null }; }));
      setCarregando(false);
      return;
    }
    const [a, t, p, pr] = await Promise.all([
      supabase.from("cm_alunos").select("*"),
      supabase.from("cm_turmas").select("*"),
      supabase.from("cm_pagamentos").select("*"),
      supabase.rpc("cm_listar_professores"),
    ]);
    if (a.error || t.error || p.error) setErro("Erro ao carregar: " + (a.error?.message || t.error?.message || p.error?.message));
    const m = {};
    (p.data || []).forEach(r => { (m[r.aluno_id] = m[r.aluno_id] || []).push(r); });
    const tur = t.data || [];
    // dia, horário e nome vêm da turma do aluno
    setAlunos((a.data || []).map(x => { const te = tur.find(y => y.id === x.turma_id); return { ...x, dia: te?.dia || null, horario: te?.horario || null, turma_nome: te?.nome || null }; }));
    setTurmas(tur);
    setPagamentos(m);
    setProfessores(pr.data || []);
    setCarregando(false);
  }, [modoProfessor]);
  useEffect(() => { carregar(); }, [carregar]);

  const totalAtivos = alunos.filter(a => a.status === "Ativo").length;
  const abas = [["alunos", "Alunos"], ["chamada", "Lista de chamada"], ["turmas", "Turmas e professores"], ["aniversarios", "Aniversários"]];

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
            {modoProfessor ? "chamada · curso maker" : "curso maker"}
            <span style={{ display: "block", width: 44, height: 4, background: VERDE, borderRadius: 2, margin: "10px 0 6px" }} />
          </h1>
          <small style={{ fontSize: 12, fontWeight: 700, fontFamily: font, letterSpacing: ".06em", textTransform: "uppercase", color: "#C7C8CA" }}>
            {modoProfessor ? `${turmas.length} turma${turmas.length !== 1 ? "s" : ""}` : `${totalAtivos} alunos ativos`}
          </small>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px clamp(16px,4vw,40px) 40px" }}>
        {erro && <div style={{ background: "#ffebee", color: "#c62828", padding: 12, borderRadius: 6, fontSize: 13, marginBottom: 14 }}>{erro}</div>}
        <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden" }}>
          {!modoProfessor && (
            <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", borderBottom: "2px dashed #DCDDDE", overflowX: "auto" }}>
              {abas.map(([id, nome]) => (
                <button key={id} onClick={() => setAba(id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 15, fontWeight: 700, fontFamily: font, whiteSpace: "nowrap",
                    color: aba === id ? PRETO : "#6D6E71", borderBottom: aba === id ? `4px solid ${VERDE}` : "4px solid transparent" }}>{nome}</button>
              ))}
            </div>
          )}
          <div style={{ padding: 24 }}>
            {carregando ? <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>Carregando...</div> : (
              <>
                {aba === "alunos" && !modoProfessor && <AbaAlunos alunos={alunos} turmas={turmas} pagamentos={pagamentos} recarregar={carregar} podeExcluir={podeExcluir} />}
                {aba === "chamada" && <AbaChamada alunos={alunos} turmas={turmas} modoProfessor={modoProfessor} />}
                {aba === "aniversarios" && !modoProfessor && <AbaAniversarios alunos={alunos} turmas={turmas} />}
                {aba === "turmas" && !modoProfessor && <AbaTurmas alunos={alunos} turmas={turmas} professores={professores} recarregar={carregar} ehAdmin={ehAdmin} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
