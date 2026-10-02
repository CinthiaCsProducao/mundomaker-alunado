/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: src/types.ts
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
export type SchoolYearKey = 
  | "EI" 
  | "EF:1" | "EF:2" | "EF:3" | "EF:4" | "EF:5" | "EF:6" | "EF:7" | "EF:8" | "EF:9" 
  | "EM:1" | "EM:2" | "EM:3";

export type SchoolStage = "EI" | "EF" | "EM";

export interface SchoolYear {
  stage: SchoolStage;
  grade: number | null;
  key: string;      // "EI", "EF:1".."EF:9", "EM:1".."EM:3"
  label: string;    // "Educação Infantil", "1º Ano".."9º Ano", "1º Ensino Médio".."3º Ensino Médio"
  sortRank: number; // EI: 0, EF: 101..109, EM: 201..203
  cycle: "EI" | "FI" | "FII" | "EM"; // "EI" (EI), "FI" (EF1-5), "FII" (EF6-9), "EM" (EM1-3)
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  catalogYearKey: string;
  targetYearKey: string;
  baseQuantity: number;
  complementQuantity: number;
  teacherQuantity: number;
}

export interface PhysicalItem {
  id: string;
  assignmentId: string;
  projectId: string;
  catalogYearKey: string;
  targetYearKey: string;
  destination: "Aluno" | "Professor";
  type: "Base" | "Complementar";
  sequence: string;
  packagingType: string;
  unitWeightKg: number;
  relation?: string;
  product: Product;
  bundleSize?: number;
  /** Rótulo da variante ("com furo" / "sem furo"), quando o produto tem. */
  variante?: string;
}

export type ExternalPackageType =
  | "COLLECTIVE"
  | "TUBE"
  | "SPAGHETTI"
  | "PLASTIC_BOX";

export const EXTERNAL_PACKAGES: Record<ExternalPackageType, {
  label: string;
  dimensions: string;
  countFilter: string;
}> = {
  COLLECTIVE: {
    label: "Caixa Coletiva",
    dimensions: "52 x 38 x 32 cm",
    countFilter: "Coletiva"
  },
  TUBE: {
    label: "Caixa Tubo",
    dimensions: "100 x 10 x 10 cm",
    countFilter: "Tubo"
  },
  SPAGHETTI: {
    label: "Embalagem Espaguete",
    dimensions: "145 x 53 x 80 cm",
    countFilter: "Espaguete"
  },
  PLASTIC_BOX: {
    label: "Caixa Plástica",
    dimensions: "200 x 295 x 420 mm",
    countFilter: "Caixa Plástica"
  }
};

export type PackagingType = 
  | 'Inspiramaker 10cm' 
  | 'Inspiramaker 5cm' 
  | 'Espaguete' 
  | 'Caixa Tubo' 
  | 'Caixa Plástica'
  | 'Saco';

export type ProductType = 'Base' | 'Complementar';

export interface Product {
  id: string;
  name: string;
  weight: number;
  type: ProductType;
  boxNumber: string;
  packagingType: PackagingType;
  ratio: string;
  year: string;
  professorOnly?: boolean;
  /**
   * O projeto é um INTRODUTÓRIO.
   *
   * Vira a categoria da caixa no romaneio — a coluna Tipo diz "Introdutório" em
   * vez de "Base", e a palavra sai do nome do produto. Nenhum introdutório tem
   * complementar, então nada se perde ao substituir.
   *
   * É campo de catálogo, e não detecção pelo nome, porque só os três nomes em
   * PORTUGUÊS trazem "Introdutório": os gêmeos Hot Glue, Electric Circuit e Our
   * first Atelier não. Pelo nome, o mesmo projeto sairia com categorias
   * diferentes nas duas línguas.
   */
  introdutorio?: boolean;
  /**
   * Quando a caixa vai em VARIANTES diferentes, cada uma com o seu peso.
   *
   * Hoje só o espaguete do Nossa Água / Sustainable me: cada base leva **um com
   * furo e um sem furo**, 0,220 kg e 0,288 kg. Era um produto só de 0,254 kg
   * repetido duas vezes — a média dos dois, então o peso da carga sempre esteve
   * certo (0,508 kg por base), mas o romaneio não dizia o que ia dentro e quem
   * monta não tinha como separar.
   *
   * As unidades continuam num saco só, que é 1 volume; o que muda é que o
   * volume passa a mostrar uma LINHA por variante, com a sua quantidade e o seu
   * peso. Quem tem `variantes` não usa `UNIDADES_ESPAGUETE_POR_KIT`: a
   * repetição por base é o número de variantes.
   */
  variantes?: Array<{ rotulo: string; peso: number }>;
  /**
   * Quantas BASES cabem numa caixa física. Ausente = 1 base, 1 caixa.
   *
   * O Cola quente e o Circuito Elétrico (e os gêmeos Hot Glue e Electric
   * Circuit) levam 5 kits na mesma caixa de 5 cm. Sem isto, 91 bases viravam 91
   * caixas: 8 volumes onde bastam 2.
   *
   * `weight` continua sendo o peso de UMA base — a caixa cheia pesa
   * `basesPorCaixa × weight`. Assim o peso total da carga não muda, só a
   * contagem de volumes.
   *
   * A sobra tem regra própria, confirmada pela casa: sobrando 1, ela entra numa
   * caixa que fica com 6; sobrando 2 ou mais, abre caixa nova com o que sobrou.
   * Ver `caixasDoKit` em `packaging.ts`.
   */
  basesPorCaixa?: number;
  /**
   * Idioma do projeto. Decide como a SÉRIE aparece no documento: um projeto em
   * inglês sai como "8th - Game Designers", um em português como
   * "8º Ano - Enigma" — na mesma carga, porque a escola pode ser bilíngue.
   *
   * É dado de catálogo, conferido nome a nome. A detecção automática pelo nome
   * errava demais ("Cozinha Maker" caía como inglês por causa do "Maker").
   */
  idioma?: 'pt' | 'en';
  /**
   * Programa a que o projeto pertence, quando não é a linha regular —
   * "Maker Lab Class", por exemplo. Aparece ao lado do nome na tela de
   * montagem; não muda empacotamento nenhum.
   */
  programa?: string;
  /**
   * A embalagem deste produto AINDA NÃO FOI CONFIRMADA pela expedição.
   *
   * `packagingType` é obrigatório e decide capacidade, então o cadastro leva um
   * palpite conservador (10 cm, que ocupa 2 unidades). Sem esta marca o palpite
   * viraria fato silencioso: o romaneio fecharia volumes com uma medida que
   * ninguém conferiu, e é exatamente o erro que o CLAUDE.md chama de fallback
   * silencioso. Com ela, a auditoria avisa e a tela mostra a etiqueta.
   *
   * Apagar a marca é o último passo depois de confirmar a embalagem de verdade.
   */
  embalagemAConfirmar?: boolean;
  /**
   * O PESO ainda não foi informado e o cadastro leva um valor simbólico. Mesma
   * lógica da marca acima: um palpite calado faria a cotação de frete sair com
   * peso errado sem ninguém ver.
   * A auditoria avisa e a tela mostra `PESO A CONFIRMAR`.
   */
  pesoAConfirmar?: boolean;
}

export interface OrderItem {
  product: Product;
  quantity: number; // Number of boxes/units ordered
  destination?: 'Aluno' | 'Professor';
  assignmentId?: string;
  catalogYearKey?: string;
  targetYearKey?: string;
}

export interface PackedItem {
  id?: string;
  product: Product;
  quantity: number; // How many of this product are in this specific volume
  totalWeight: number;
  destination?: 'Aluno' | 'Professor';
  assignmentId?: string;
  catalogYearKey?: string;
  targetYearKey?: string;
  bundleSize?: number;
  /** Rótulo da variante — faz parte da identidade da LINHA no romaneio. */
  variante?: string;
}

export interface Volume {
  id?: string;
  volumeNumber: number | string;
  type: string;
  dimensions: string;
  items: PackedItem[];
  totalWeight: number;
  year: string;
  category: 'Aluno' | 'Professor';
  targetYearKeys?: string[];
  /**
   * Marca o volume em que o professor viaja junto com o aluno por decisão do
   * motor (uma caixa de cada, mesma série) ou por exceção pedida no pedido.
   * A auditoria usa isto para rebaixar o teste 7 de erro para aviso — sem a
   * marca, ela reprovaria o arranjo que o próprio motor escolheu.
   */
  professorJunto?: boolean;
  /**
   * O rótulo da série foi escrito à mão na edição do romaneio.
   *
   * Sem esta marca, `buildYearHeading` recalcula o rótulo a partir do catálogo
   * a cada render e devolve sempre o nome em português — quem digitava
   * "8th grade" numa escola bilíngue via o texto voltar para "8º Ano" sozinho.
   */
  yearManual?: boolean;
}

export interface Manifest {
  schoolName: string;
  date: string;
  linha?: string;
  /**
   * Qual REMESSA este documento representa, quando a carga sai em duas.
   *
   * Na linha 1 o material do professor viaja antes do material do aluno, em
   * envios separados — logo, dois romaneios, duas cotações de frete, duas
   * numerações de volume. Ausente = carga inteira num documento só, que é o
   * caso das linhas 2 e 3.
   */
  remessa?: 'Aluno' | 'Professor';
  volumes: Volume[];
  summary: {
    totalVolumes: number;
    totalWeight: number;
    coletivaVolumes: number;
    coletivaWeight: number;
    otherVolumes: number;
    otherWeight: number;
    types: Record<string, { count: number, weight: number }>;
  };
  originalAssignments?: ProjectAssignment[];
  expectedPhysicalItems?: PhysicalItem[];
  audit?: {
    status: 'APROVADO' | 'REPROVADO';
    volumeAudits: Array<{
      volumeNumber: string;
      type: string;
      caixas10cm: number;
      caixas5cm: number;
      sacos: number;
      points: number;
      weight: number;
      projects: string;
      status: 'APROVADO' | 'REPROVADO';
      reasons: string[];
    }>;
    projectAudits: Array<{
      projectName: string;
      year: string;
      baseRequested: number;
      baseShipped: number;
      compRequested: number;
      compShipped: number;
      profRequested: number;
      profShipped: number;
      status: 'APROVADO' | 'REPROVADO';
      reasons: string[];
    }>;
    errors: string[];
    warnings: string[];
    optimizationMetrics?: {
      totalVolumes: number;
      pureYearVolumesCount: number;
      mixedYearVolumesCount: number;
      subutilizedVolumesCount: number;
      cycleViolationsCount: number;
      optimizationScore: string;
      notes: string[];
    };
  };
}
