// Aviso de Privacidade (LGPD / ECA Digital). Preencha os campos marcados em CONFIG e revise com o jurídico.
const CONFIG = {
  controlador: "Mundo Maker [RAZÃO SOCIAL]",
  cnpj: "[CNPJ]",
  endereco: "[ENDEREÇO]",
  encarregado: "[NOME DO ENCARREGADO/DPO]",
  emailPrivacidade: "[EMAIL-DE-PRIVACIDADE@mundomaker.cc]",
  versao: "2026-10",
};

const font = "'Figtree','Segoe UI',system-ui,sans-serif";
const h2 = { fontSize: 18, fontWeight: 800, margin: "28px 0 8px" };
const p = { fontSize: 14, lineHeight: 1.65, color: "#333", margin: "6px 0" };

export default function Privacidade() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: font }}>
      <div style={{ background: "#39DF18", padding: "22px 32px", fontSize: 20, fontWeight: 800 }}>Mundo Maker — Aviso de Privacidade</div>
      <div style={{ maxWidth: 820, margin: "0 auto", background: "#fff", padding: "28px 36px", marginTop: 24, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: "#888" }}>Versão {CONFIG.versao}</div>

        <h2 style={h2}>1. Quem somos</h2>
        <p style={p}>{CONFIG.controlador}, CNPJ {CONFIG.cnpj}, {CONFIG.endereco}, é a controladora dos dados tratados neste sistema.</p>

        <h2 style={h2}>2. Que dados tratamos e para quê</h2>
        <p style={p}><b>Escolas parceiras:</b> dados institucionais (nome, CNPJ, endereço, telefone), nome e assinatura do responsável pelo preenchimento do formulário, quantidade de alunos por série e turma, e calendário letivo enviado. Finalidade: execução do contrato e planejamento de material e logística.</p>
        <p style={p}><b>Alunos e responsáveis dos cursos TechLab e Curso Maker:</b> nome, data de nascimento, escola, nome, CPF, telefone, e-mail e endereço do responsável, plano, pagamentos e frequência. Finalidade: matrícula, cobrança, controle de presença e comunicação com a família.</p>
        <p style={p}><b>Equipe:</b> nome, e-mail, permissões e registros de acesso. Finalidade: controle de acesso e segurança.</p>

        <h2 style={h2}>3. Crianças e adolescentes</h2>
        <p style={p}>Dados de crianças e adolescentes são tratados somente no seu melhor interesse (LGPD, art. 14, e Lei 15.211/2025 — ECA Digital), com o consentimento específico de ao menos um dos pais ou responsável legal quando essa for a base legal aplicável, e apenas pela equipe autorizada. Não usamos esses dados para publicidade, perfilamento comportamental ou venda a terceiros. Este sistema é de uso interno da equipe: crianças não têm conta nem acesso.</p>

        <h2 style={h2}>4. Base legal</h2>
        <p style={p}>Execução de contrato e procedimentos preliminares (art. 7º, V), cumprimento de obrigação legal (art. 7º, II), legítimo interesse para segurança e prevenção a fraudes (art. 7º, IX) e consentimento do responsável legal quando exigido (arts. 7º, I e 14, §1º).</p>

        <h2 style={h2}>5. Com quem compartilhamos</h2>
        <p style={p}>Somente com operadores que hospedam e operam o sistema (infraestrutura em nuvem, banco de dados, envio de e-mails), sob contrato e com medidas de segurança. Não vendemos dados pessoais. Podem ocorrer transferências internacionais por conta da localização dos servidores desses operadores, com as salvaguardas previstas no art. 33 da LGPD.</p>

        <h2 style={h2}>6. Segurança</h2>
        <p style={p}>Acesso restrito por login individual e permissões por função, arquivos em armazenamento privado com links temporários, registro de acessos sensíveis (visualização de CPF, exportações e exclusões), encerramento automático da sessão por inatividade e limite de tentativas no formulário público.</p>

        <h2 style={h2}>7. Por quanto tempo guardamos</h2>
        <p style={p}>Pelo tempo necessário à finalidade e a obrigações legais e contratuais (fiscais e de cobrança). Terminado o prazo, os dados são eliminados ou anonimizados.</p>

        <h2 style={h2}>8. Seus direitos</h2>
        <p style={p}>Você pode pedir confirmação do tratamento, acesso, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento (LGPD, art. 18). Pais e responsáveis exercem esses direitos em nome da criança ou adolescente.</p>

        <h2 style={h2}>9. Contato do Encarregado (DPO)</h2>
        <p style={p}>{CONFIG.encarregado} — {CONFIG.emailPrivacidade}. Também é possível reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
      </div>
    </div>
  );
}
