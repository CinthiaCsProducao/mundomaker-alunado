import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// Aceita um caminho salvo ("arquivo.png") ou uma URL pública antiga
// (".../storage/v1/object/public/<bucket>/<caminho>") e devolve um link temporário assinado.
export function caminhoDoArquivo(bucket, valor) {
  if (!valor) return null;
  const marca = `/${bucket}/`;
  if (/^https?:\/\//i.test(valor)) {
    const i = valor.indexOf(marca);
    if (i === -1) return null;
    return decodeURIComponent(valor.slice(i + marca.length).split("?")[0]);
  }
  return valor;
}

export async function urlAssinada(bucket, valor, segundos = 600) {
  const caminho = caminhoDoArquivo(bucket, valor);
  if (!caminho) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, segundos);
  if (error) return null;
  return data.signedUrl;
}

// Abre o arquivo em nova aba usando link temporário
export async function abrirArquivo(bucket, valor) {
  const win = window.open("", "_blank");
  const url = await urlAssinada(bucket, valor);
  if (!url) { if (win) win.close(); alert("Não foi possível abrir o arquivo (sem permissão ou arquivo inexistente)."); return; }
  if (win) win.location.href = url; else window.open(url, "_blank");
}

// Registro de auditoria (LGPD art. 37). Nunca quebra a tela se falhar.
export async function auditar(acao, entidade, entidadeId, detalhes) {
  try {
    const { data } = await supabase.auth.getSession();
    const email = data?.session?.user?.email;
    if (!email) return;
    await supabase.from("auditoria").insert([{
      usuario_email: email, acao, entidade: entidade || null,
      entidade_id: entidadeId != null ? String(entidadeId) : null, detalhes: detalhes || null,
    }]);
  } catch (e) { /* ignora */ }
}

// Troca as URLs de mídia/documentos dos posts do histórico por links temporários (bucket privado)
export function useAssinados(posts, bucket = "historico-escola") {
  const [saida, setSaida] = useState(posts);
  const chave = JSON.stringify(posts);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const lista = JSON.parse(chave);
      const ass = async (arr) => Promise.all((arr || []).map(async x => ({ ...x, url: (await urlAssinada(bucket, x.url, 3600)) || x.url })));
      const novo = await Promise.all(lista.map(async p => ({ ...p, midia: await ass(p.midia), documentos: await ass(p.documentos) })));
      if (vivo) setSaida(novo);
    })();
    return () => { vivo = false; };
  }, [chave, bucket]);
  return saida;
}

// Mostra só os 2 últimos dígitos do CPF (minimização de dados — LGPD art. 6º, III)
export function mascararCPF(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  if (!d) return "";
  return "***.***.***-" + d.slice(-2);
}
