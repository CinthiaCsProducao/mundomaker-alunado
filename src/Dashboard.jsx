busca, setBusca]               = useState("");
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