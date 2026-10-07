import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const BUCKET = "pops";
const font = "'Archivo', 'Segoe UI', sans-serif";
const AREAS = ["CS", "Pedagógico", "Financeiro", "Produção", "Diretoria", "Comercial", "Núcleo Técnico"];
const TIPOS_OK = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_MB = 20;

function extensaoDe(arquivo) {
  const porMime = TIPOS_OK[arquivo.type];
  if (porMime) return porMime;
  const ext = (arquivo.name.split(".").pop() || "").toLowerCase();
  return ["pdf", "doc", "docx"].includes(ext) ? ext : null;
}

function urlPublica(path) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function baixar(path, nomeArquivo) {
  const res = await fetch(urlPublica(path));
  if (!res.ok) throw new Error("Arquivo não encontrado");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function tamanhoLegivel(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PopsDocumentos({ onVoltar, isAdmin, usuario, email, permissoesIniciais }) {
  const [permissoes, setPermissoes] = useState(permissoesIniciais || {});
  const [permPronta, setPermPronta] = useState(!!isAdmin);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("Todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [visualizando, setVisualizando] = useState(null);

  // formulário de envio
  const [titulo, setTitulo] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const inputArquivo = useRef(null);

  // Busca as permissões atuais do usuário no banco (assim uma mudança feita
  // pelo admin vale sem precisar sair e entrar de novo).
  useEffect(() => {
    if (isAdmin || !email) { setPermPronta(true); return; }
    supabase.from("usuarios").select("permissoes").eq("email", email).single()
      .then(({ data }) => {
        if (data && data.permissoes) setPermissoes(data.permissoes);
        setPermPronta(true);
      });
  }, [isAdmin, email]);

  // Áreas que este usuário pode ver. Admin = todas. Campo ausente (usuário
  // antigo) ou "*" = todas.
  const areasLiberadas = useMemo(() => {
    if (isAdmin) return AREAS;
    const p = permissoes.popsAreas;
    if (p === undefined || (Array.isArray(p) && p.includes("*"))) return AREAS;
    return AREAS.filter(a => Array.isArray(p) && p.includes(a));
  }, [isAdmin, permissoes]);

  async function carregar() {
    if (!permPronta) return;
    setCarregando(true);
    setErro("");
    let q = supabase.from("pops_documentos").select("*").order("criado_em", { ascending: false });
    if (areasLiberadas.length < AREAS.length) q = q.in("area", areasLiberadas.length ? areasLiberadas : ["__nenhuma__"]);
    const { data, error } = await q;
    if (error) setErro("Erro ao carregar os POPs: " + error.message);
    setLista(data || []);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [permPronta, areasLiberadas]); // eslint-disable-line

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter(p => {
      if (areaFiltro !== "Todas" && p.area !== areaFiltro) return false;
      if (!q) return true;
      return (p.titulo || "").toLowerCase().includes(q) ||
        (p.descricao || "").toLowerCase().includes(q) ||
        (p.nome_arquivo || "").toLowerCase().includes(q);
    });
  }, [lista, busca, areaFiltro]);

  const contagemPorArea = useMemo(() => {
    const c = {};
    lista.forEach(p => { c[p.area] = (c[p.area] || 0) + 1; });
    return c;
  }, [lista]);

  function abrirModal() {
    setTitulo(""); setArea(areasLiberadas[0] || AREAS[0]); setDescricao(""); setArquivo(null); setErroEnvio("");
    setModalAberto(true);
  }

  function escolherArquivo(e) {
    const f = e.target.files && e.target.files[0];
    setErroEnvio("");
    if (!f) { setArquivo(null); return; }
    if (!extensaoDe(f)) {
      setErroEnvio("Formato não aceito. Envie um arquivo PDF ou Word (.doc, .docx).");
      setArquivo(null);
      if (inputArquivo.current) inputArquivo.current.value = "";
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErroEnvio(`Arquivo muito grande. O limite é ${MAX_MB} MB.`);
      setArquivo(null);
      if (inputArquivo.current) inputArquivo.current.value = "";
      return;
    }
    setArquivo(f);
    if (!titulo.trim()) setTitulo(f.name.replace(/\.[^.]+$/, ""));
  }

  async function enviar() {
    setErroEnvio("");
    if (!arquivo) { setErroEnvio("Selecione um arquivo PDF ou Word."); return; }
    if (!titulo.trim()) { setErroEnvio("Informe o título do POP."); return; }
    if (!areasLiberadas.includes(area)) { setErroEnvio("Você não tem permissão para anexar POPs nessa área."); return; }
    const ext = extensaoDe(arquivo);
    if (!ext) { setErroEnvio("Formato não aceito."); return; }

    setEnviando(true);
    const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}_${nomeSeguro}`;
    const up = await supabase.storage.from(BUCKET).upload(path, arquivo, {
      contentType: arquivo.type || undefined,
    });
    if (up.error) {
      setErroEnvio("Falha ao enviar o arquivo: " + up.error.message);
      setEnviando(false);
      return;
    }
    const { error } = await supabase.from("pops_documentos").insert({
      titulo:       titulo.trim(),
      area,
      descricao:    descricao.trim() || null,
      nome_arquivo: arquivo.name,
      arquivo_path: path,
      extensao:     ext,
      tamanho:      arquivo.size,
      enviado_por:  usuario || null,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      setErroEnvio("Falha ao registrar o POP: " + error.message);
      setEnviando(false);
      return;
    }
    setEnviando(false);
    setModalAberto(false);
    carregar();
  }

  async function handleBaixar(p) {
    try { await baixar(p.arquivo_path, p.nome_arquivo); }
    catch (e) { alert("Erro ao baixar: " + e.message); }
  }

  async function handleExcluir(p) {
    if (!window.confirm(`Excluir o POP "${p.titulo}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.storage.from(BUCKET).remove([p.arquivo_path]);
    await supabase.from("pops_documentos").delete().eq("id", p.id);
    carregar();
  }

  const btn = { border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: font, cursor: "pointer" };
  const campo = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 6, fontSize: 13, fontFamily: font, boxSizing: "border-box" };
  const rotulo = { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", fontFamily: font }}>
      <button onClick={onVoltar}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#555", fontFamily: font, marginBottom: 12 }}>
        ← Voltar ao Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>POPs</h2>
        {areasLiberadas.length > 0 && (
          <button onClick={abrirModal} style={{ ...btn, background: "#39DF18", color: "#000", padding: "10px 18px", fontSize: 13 }}>
            + Anexar POP
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 18 }}>
        Procedimentos Operacionais Padrão de cada área. Envie arquivos em PDF ou Word.
      </div>

      {permPronta && areasLiberadas.length === 0 && (
        <div style={{ background: "#fff8e1", border: "1.5px solid #FFD902", color: "#7a6000", padding: 14, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          Você ainda não tem acesso aos POPs de nenhuma área. Peça a um administrador para liberar a sua área.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(areasLiberadas.length > 1 ? ["Todas", ...areasLiberadas] : areasLiberadas).map(a => (
          <button key={a} onClick={() => setAreaFiltro(a)}
            style={{
              ...btn, padding: "7px 14px",
              background: areaFiltro === a ? "#111" : "#fff",
              color: areaFiltro === a ? "#fff" : "#333",
              boxShadow: "0 1px 3px rgba(0,0,0,.1)",
            }}>
            {a}{a !== "Todas" && contagemPorArea[a] ? ` (${contagemPorArea[a]})` : a === "Todas" && lista.length ? ` (${lista.length})` : ""}
          </button>
        ))}
      </div>

      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por título, descrição ou nome do arquivo..."
        style={{ ...campo, maxWidth: 420, marginBottom: 16, background: "#fff" }}
      />

      {erro && <div style={{ background: "#ffebee", color: "#c62828", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{erro}</div>}

      {carregando ? (
        <div style={{ textAlign: "center", padding: 48, color: "#666" }}>Carregando...</div>
      ) : filtrada.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#888", background: "#fff", borderRadius: 8 }}>
          {lista.length === 0 ? "Nenhum POP anexado ainda. Clique em \"Anexar POP\" para enviar o primeiro." : "Nenhum POP encontrado para esse filtro."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtrada.map(p => (
            <div key={p.id} style={{ background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,.07)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <span style={{ background: "#39DF18", color: "#000", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 50, textTransform: "uppercase" }}>{p.area}</span>
                <span style={{ background: p.extensao === "pdf" ? "#ffebee" : "#e3f2fd", color: p.extensao === "pdf" ? "#c62828" : "#1565c0", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{p.extensao}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{p.titulo}</div>
              {p.descricao && <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>{p.descricao}</div>}
              <div style={{ fontSize: 11, color: "#999" }}>
                {p.nome_arquivo} · {tamanhoLegivel(p.tamanho)}<br />
                {p.enviado_por ? `Enviado por ${p.enviado_por} · ` : ""}{p.criado_em ? new Date(p.criado_em).toLocaleDateString("pt-BR") : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                {p.extensao === "pdf" && (
                  <button onClick={() => setVisualizando(p)} style={{ ...btn, background: "#111", color: "#fff" }}>👁 Visualizar</button>
                )}
                <button onClick={() => handleBaixar(p)} style={{ ...btn, background: "#e3f2fd", color: "#1565c0" }}>↓ Baixar</button>
                {isAdmin && (
                  <button onClick={() => handleExcluir(p)} style={{ ...btn, background: "#eee", color: "#555" }}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget && !enviando) setModalAberto(false); }}>
          <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,.3)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Anexar POP</div>

            <label style={rotulo}>Arquivo (PDF ou Word, até {MAX_MB} MB)</label>
            <input ref={inputArquivo} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={escolherArquivo} style={{ ...campo, marginBottom: 14 }} />

            <label style={rotulo}>Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: POP de envio de materiais" style={{ ...campo, marginBottom: 14 }} />

            <label style={rotulo}>Área</label>
            <select value={area} onChange={e => setArea(e.target.value)} style={{ ...campo, marginBottom: 14, background: "#fff" }}>
              {areasLiberadas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <label style={rotulo}>Descrição (opcional)</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Para que serve este procedimento?" style={{ ...campo, marginBottom: 14, resize: "vertical" }} />

            {erroEnvio && <div style={{ background: "#ffebee", color: "#c62828", padding: 10, borderRadius: 6, marginBottom: 14, fontSize: 12 }}>{erroEnvio}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalAberto(false)} disabled={enviando} style={{ ...btn, flex: 1, background: "#f0f0f0", color: "#333", padding: 12 }}>Cancelar</button>
              <button onClick={enviar} disabled={enviando} style={{ ...btn, flex: 2, background: enviando ? "#ccc" : "#39DF18", color: "#000", padding: 12, fontSize: 13 }}>
                {enviando ? "Enviando..." : "Enviar POP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {visualizando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", flexDirection: "column", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", color: "#fff", padding: "10px 16px", borderRadius: "8px 8px 0 0" }}>
            <strong style={{ fontSize: 14 }}>{visualizando.area} · {visualizando.titulo}</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleBaixar(visualizando)} style={{ ...btn, background: "#39DF18", color: "#000" }}>↓ Baixar</button>
              <button onClick={() => setVisualizando(null)} style={{ ...btn, background: "#fff", color: "#111" }}>✕ Fechar</button>
            </div>
          </div>
          <iframe title="POP" src={urlPublica(visualizando.arquivo_path)}
            style={{ flex: 1, width: "100%", border: "none", background: "#fff", borderRadius: "0 0 8px 8px" }} />
        </div>
      )}
    </div>
  );
}
