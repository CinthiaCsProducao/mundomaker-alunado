import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { buscarMapeamentos, pendentesDeVerificacao } from "./Mapeamentos";

const font  = "'Figtree','Circular Std','Segoe UI',system-ui,sans-serif";
const fontB = "'Barlow','DIN Round Pro','Segoe UI',system-ui,sans-serif";
const VERDE = "#39DF18";
const PRETO = "#231F20";

const fmtQuando = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Sino de notificações: faltas de alunos e aniversariantes do mês.
// tema: "claro" (cabeçalho verde) | "escuro" (cabeçalho preto)
export default function SinoNotificacoes({ tema = "claro", onAbrirMapeamentos }) {
  const [email, setEmail] = useState("");
  const [itens, setItens] = useState([]);
  const [lidas, setLidas] = useState(new Set());
  const [aberto, setAberto] = useState(false);
  const [mapPend, setMapPend] = useState([]);
  const comMapeamentos = !!onAbrirMapeamentos;

  const carregar = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const em = s?.session?.user?.email;
    if (!em) return;
    setEmail(em.toLowerCase());
    const [n, l] = await Promise.all([
      supabase.from("notificacoes").select("*").order("criado_em", { ascending: false }).limit(60),
      supabase.from("notificacoes_lidas").select("notificacao_id"),
    ]);
    setItens(n.data || []);
    if (comMapeamentos) setMapPend(pendentesDeVerificacao(await buscarMapeamentos()));
    setLidas(new Set((l.data || []).map(x => x.notificacao_id)));
  }, [comMapeamentos]);

  useEffect(() => {
    let ativo = true;
    let diaGerado = "";
    const hoje = () => new Date().toLocaleDateString("sv-SE");   // aaaa-mm-dd
    async function gerarECarregar() {
      // Gera (se ainda não existir) o aviso de aniversariantes de hoje e depois carrega os avisos
      if (diaGerado !== hoje()) { diaGerado = hoje(); await supabase.rpc("gerar_notificacoes_aniversario"); }
      if (ativo) carregar();
    }
    gerarECarregar();
    const t = setInterval(gerarECarregar, 60000);   // também vale se o sistema ficar aberto na virada do dia
    return () => { ativo = false; clearInterval(t); };
  }, [carregar]);

  // Avisos de mapeamento (ago–nov): não ficam gravados; somem quando verificados na aba
  const virtuais = mapPend.map(m => ({
    id: `map-${m.id}`, virtual: true, tipo: "mapeamento", criado_em: new Date().toISOString(),
    titulo: "Verificar mapeamento", mensagem: `${m.titulo} (${m.programa}, vale a partir de ${m.ano_vigencia}). Abra Mapeamentos e confira.`,
  }));
  const todos = [...virtuais, ...itens];
  const naoLidas = [...virtuais, ...itens.filter(i => !lidas.has(i.id))];

  async function marcar(ids) {
    if (!ids.length || !email) return;
    setLidas(prev => new Set([...prev, ...ids]));
    await supabase.from("notificacoes_lidas").upsert(ids.map(id => ({ notificacao_id: id, email })), { onConflict: "notificacao_id,email" });
  }

  if (!email) return null;

  const claro = tema === "claro";
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => { setAberto(a => !a); if (!aberto) carregar(); }} title="Notificações"
        style={{ position: "relative", background: claro ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.14)", color: claro ? "#000" : "#fff", border: "none", borderRadius: 4, padding: "8px 12px", fontSize: 15, cursor: "pointer", lineHeight: 1 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {naoLidas.length > 0 && (
          <span style={{ position: "absolute", top: -6, right: -6, background: "#D81E27", color: "#fff", borderRadius: 999, minWidth: 18, height: 18, padding: "0 5px", fontSize: 11, fontWeight: 800, fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {naoLidas.length > 99 ? "99+" : naoLidas.length}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 901, background: "#fff", color: "#111", borderRadius: 8, boxShadow: "0 8px 28px rgba(0,0,0,.25)", width: "min(360px, 92vw)", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #DCDDDE", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <b style={{ fontFamily: font, fontSize: 14 }}>Notificações</b>
              {naoLidas.length > 0 && (
                <button onClick={() => marcar(naoLidas.filter(i => !i.virtual).map(i => i.id))} style={{ background: "none", border: "none", color: "#148A00", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" }}>Marcar todas como lidas</button>
              )}
            </div>
            <div style={{ overflowY: "auto" }}>
              {todos.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 13, fontFamily: fontB }}>Nenhuma notificação.</div>}
              {todos.map(i => {
                const lida = !i.virtual && lidas.has(i.id);
                const cor = i.tipo === "mapeamento" ? "#FFA300" : i.tipo === "falta" ? "#D81E27" : i.tipo === "formulario" ? "#0B6BCB" : VERDE;
                return (
                  <div key={i.id} onClick={() => { if (i.virtual) { setAberto(false); if (onAbrirMapeamentos) onAbrirMapeamentos(); } else if (!lida) marcar([i.id]); }}
                    style={{ display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid #F1F2F2", background: lida ? "#fff" : "rgba(57,223,24,.08)", cursor: lida ? "default" : "pointer" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: lida ? "#DCDDDE" : cor, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: font, fontSize: 13, fontWeight: lida ? 600 : 800, color: PRETO }}>{i.titulo}</div>
                      <div style={{ fontFamily: fontB, fontSize: 12, color: "#555", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflowY: "auto" }}>{i.mensagem}</div>
                      <div style={{ fontFamily: fontB, fontSize: 11, color: "#999", marginTop: 2 }}>{fmtQuando(i.criado_em)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
