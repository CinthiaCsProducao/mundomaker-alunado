# Gerador de Romaneio — aba para outro projeto React

Esta pasta é **gerada** pelo `scripts/exportar-aba.mjs` do projeto Gerador de Romaneio.
**Não edite nada aqui dentro.** A próxima geração apaga a mudança, e pior: enquanto ela não
vem, este sistema empacota diferente do Gerador sem nenhum erro aparecer. Toda correção
(peso de catálogo, embalagem, regra de volume) é feita **lá**, e esta pasta é gerada de novo
e copiada por cima desta.

`_gerado.json` traz a data da geração e o MD5 de cada arquivo. Para saber se a cópia daqui
está em dia, compare a data com a da última geração lá.

## Como usar

1. Copie a pasta inteira para dentro do `src/` do projeto, por exemplo `src/romaneio-tab/`.
2. Some ao `package.json` as bibliotecas de `dependencias.json` e rode `npm install`.
3. O código é **TypeScript**. Se o projeto CRA ainda é só JavaScript, instale
   `typescript @types/react @types/react-dom` e crie um `tsconfig.json`. O CRA passa a
   aceitar `.tsx` ao lado dos `.js`, e os arquivos de JavaScript que já existem não mudam.
4. Renderize onde quiser:

```jsx
import RomaneioTab from './romaneio-tab';

// dentro da aba do dashboard
<RomaneioTab altura="calc(100vh - 64px)" />
```

`altura` é a altura útil da aba. O app foi feito para ocupar a tela inteira e rola por
dentro. Passe a altura do espaço que sobra embaixo do cabeçalho do dashboard. Sem `altura`,
ele usa `100vh`.

O CSS é importado pelo próprio `RomaneioTab`, então não precisa importar nada à parte. A
fonte (Archivo e IBM Plex Mono) vem do Google Fonts, por `@import` no começo do CSS.

## O que NÃO vaza para o sistema de fora

- **CSS**: todas as regras valem só debaixo de `.romaneio-tab`. O reset de estilos do
  Tailwind, que normalmente vale para a página inteira, também fica preso à aba.
- **Tema claro/escuro**: gravado na caixa da aba (`data-tema`), não na página.
- **Nada de roteamento**, nada em `window` além do que cada botão faz quando clicado
  (abrir a janela de impressão, baixar arquivo).

Duas coisas guardadas no `localStorage` do navegador, com prefixo próprio:
`romaneio:tema` e `romaneio:escolas` (a lista de escolas digitadas, para sugerir).

## Como os componentes se conectam

```
RomaneioTab            caixa da aba: CSS restrito, tema, altura
└─ App                 estado da tela: montando o pedido OU vendo o romaneio
   ├─ OrderInput       monta o pedido: escola, linha, projetos por série e quantidades
   │                   (base, complementar, professor). Ao gerar, chama
   │                   onGenerate(itens, escola, linha).
   └─ ManifestView     o romaneio pronto: documento, edição de volumes, auditoria,
                       e os botões Excel, PDF, CSV e imprimir.
```

**Fluxo de dados**

1. `OrderInput` lê o **catálogo** (`data/products.ts`) e devolve uma lista de `OrderItem`.
2. `App.handleGenerate` chama o **motor** `generateManifest()` (`lib/packaging.ts`), que
   empacota em volumes e audita.
3. Se a linha sai em duas remessas (hoje só a **linha 1**, ver `saiEmDuasRemessas()`), o
   `App` divide com `dividirPorDestino()` e mostra duas abas: **Professor** primeiro,
   depois **Aluno**, cada uma numerada a partir de 1.
4. `ManifestView` mostra e permite editar. Toda edição é **reauditada**
   (`auditManifest()`). A garantia é que dá para editar o romaneio, mas não dá para ele
   ficar diferente do pedido sem a auditoria apontar.

## Mapa dos arquivos

| Arquivo | O que é |
|---|---|
| `RomaneioTab.tsx`, `index.ts` | Entrada da aba. |
| `App.tsx` | Alterna entre montar o pedido e ver o romaneio; divide a linha 1. |
| `components/OrderInput.tsx` | Tela de montagem do pedido. |
| `components/ManifestView.tsx` | Documento do romaneio e exportadores (Excel, PDF, CSV, impressão). |
| `components/BotaoTema.tsx` | Botão sol/lua. |
| `data/products.ts` | **Catálogo**: peso, embalagem, caixas e nomes de todos os projetos das linhas 1, 2 e 3. É a única fonte de verdade. |
| `data/iconesXlsx.ts` | Imagens embutidas no `.xlsx` (logotipo e gabarito das caixas). |
| `constants/assets.ts` | Logotipo e desenhos das caixas em SVG, para a tela. |
| `lib/packaging.ts` | **Motor**: empacotamento, numeração e auditoria. Não conhece tela. |
| `lib/formatoRomaneio.ts` | Como o romaneio escreve: nome com série, relação, quantidade, ano da linha. |
| `lib/schoolYears.ts` | Normalização e ordem das séries. |
| `lib/exportXlsx.ts` | Layout do `.xlsx` (ExcelJS). |
| `lib/projectGroups.ts` | Agrupa o catálogo para a lista de projetos da tela. |
| `lib/tema.ts` | Tema claro/escuro. |
| `types.ts` | Tipos: `Product`, `OrderItem`, `Manifest`, `Volume`. |
| `romaneio-tab.css` | Estilos já compilados (Tailwind v4) e restritos à aba. **Não precisa de Tailwind** no projeto. |
| `dependencias.json` | Bibliotecas a instalar. |

## Bibliotecas

| Biblioteca | Para quê |
|---|---|
| `exceljs` | Gera o `.xlsx` do romaneio, com bordas, mesclas e imagens. |
| `jspdf` + `html-to-image` | **PDF**: a área do documento vira imagem e entra no PDF. |
| `file-saver` | Baixa o arquivo gerado. |
| `date-fns` | Data de emissão. |
| `lucide-react` | Ícones. |

O CSV é montado pelo próprio código, sem biblioteca. A lista em `dependencias.json` é
tirada dos imports dos arquivos desta pasta na hora da geração, então ela não fica velha.

`react` e `react-dom` 18 ou 19. O app é desenvolvido em 19 e não usa nada que só exista
no 19.

## Pontos de atenção

- **Impressão** abre uma janela nova e copia para ela os `<style>` e `<link>` da página. Se
  o dashboard carrega CSS próprio pesado, ele vai junto, mas fica inerte: a janela só
  mostra o romaneio.
- O **PDF sai rasterizado** (imagem da área do documento). Funciona; em romaneio grande o
  arquivo pesa mais.
- O webpack 5 do CRA não traz módulos do Node. O código da aba não importa nenhum, e o
  gerador recusa gerar a pasta se algum aparecer.
