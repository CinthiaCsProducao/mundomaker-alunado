// Converte o "Tipo" cadastrado na Base de Escolas no nome do programa usado em formulários, Escolas e Inspiramaker
export function mapTipo(tipo) {
  if (!tipo) return "";
  const t = tipo.toLowerCase();
  if (t.includes("inventores") && t.includes("oficina")) return "MakerLab Oficina Inventores do Futuro";
  if (t.includes("inventores")) return "Inventores do Futuro";
  if (t.includes("oficina")) return "MakerLab Oficina";
  if (t.includes("class")) return "MakerLab Class";
  if (t.includes("techlab")) return "Inventores do Futuro";
  if (t.includes("makerlab")) return "MakerLab Class";
  return tipo;
}
