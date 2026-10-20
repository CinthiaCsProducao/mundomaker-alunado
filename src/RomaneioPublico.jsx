import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

const font = "'Figtree','Segoe UI',system-ui,sans-serif";

// Página aberta pelo QR code da etiqueta: abre direto o PDF do romaneio publicado
export default function RomaneioPublico() {
  const { token } = useParams();
  const [estado, setEstado] = useState("carregando");   // carregando | erro
  const [dados, setDados] = useState(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase.rpc("romaneio_publico", { p_token: token });
      if (!vivo) return;
      if (!data || !data.pdf_path) { setEstado("erro"); return; }
      setDados(data);
      const { data: s, error } = await supabase.storage.from("romaneios").createSignedUrl(data.pdf_path, 3600);
      if (!vivo) return;
      if (error || !s?.signedUrl) { setEstado("erro"); return; }
      setUrl(s.signedUrl);
      window.location.replace(s.signedUrl);
    })();
    return () => { vivo = false; };
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "32px 36px", maxWidth: 420, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,.1)" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Mundo Maker — Romaneio</div>
        {estado === "erro" ? (
          <div style={{ fontSize: 14, color: "#555" }}>Este romaneio não está disponível. Confirme o QR code com a Mundo Maker.</div>
        ) : (
          <>
            {dados && <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>{dados.escola}{dados.remessa ? ` · ${dados.remessa}` : ""}</div>}
            <div style={{ fontSize: 14, color: "#888" }}>Abrindo o documento...</div>
            {url && <a href={url} style={{ display: "inline-block", marginTop: 16, background: "#39DF18", color: "#000", padding: "10px 20px", borderRadius: 4, fontWeight: 800, textDecoration: "none" }}>Abrir PDF</a>}
          </>
        )}
      </div>
    </div>
  );
}
