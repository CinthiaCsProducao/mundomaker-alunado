/*
 * GERADO por scripts/exportar-aba.mjs do Gerador de Romaneio — NÃO EDITE.
 * Fonte: app/src/components/ManifestView.tsx
 * Mudança aqui some na próxima geração. Mude lá e gere de novo.
 */
import React, { useState } from 'react';
import { Manifest, Volume } from '../types';
import { Printer, ArrowLeft, Download, Loader2, FileSpreadsheet, Plus, X, Info, Edit2, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
// Só o logo continua vindo daqui. Os quatro ícones de embalagem passaram a sair
// de `ICONES_XLSX`, os mesmos arquivos que o .xlsx usa.
import { LOGO_SVG_RAW } from '../constants/assets';
import { ICONES_XLSX } from '../data/iconesXlsx';
import { jsPDF } from 'jspdf';
import { auditManifest, buildYearHeading, validateVolumeHeadings, sortYears, renumerarVolumes } from '../lib/packaging';

import { formatarRelacao, numeroDaLinha, nomeComSerieDeDestino, formatarQuantidade, anoDaLinhaCurto, categoriaDaCaixa } from '../lib/formatoRomaneio';
import { parseSchoolYear } from '../lib/schoolYears';
import { products as catalogoProdutos } from '../data/products';
import { limparNomeProjeto, nomeBaseProjeto } from '../lib/projectGroups';
import { BotaoTema } from './BotaoTema';

/**
 * Nomes de projeto do catálogo, sem a série na frente: "Enigma", não
 * "8° Ano - Enigma". É a lista que o campo de projeto oferece na edição.
 *
 * No catálogo o nome vem colado à série, e na edição isso obrigava a digitar
 * "8° Ano - Enigma" inteiro e sem errar o acento. Aqui você escolhe só o
 * projeto; a série continua vindo do volume e é recomposta no nome final, de
 * modo que o documento impresso não muda de formato.
 */
const PROJETOS_DO_CATALOGO = Array.from(
  new Set(catalogoProdutos.map(p => nomeBaseProjeto(limparNomeProjeto(p.name))))
).filter(Boolean).sort((a, b) => a.localeCompare(b));

/** Troca só o projeto, preservando a série que já está no nome. */
function trocarProjeto(nomeCompleto: string, novoProjeto: string): string {
  const atual = nomeBaseProjeto(limparNomeProjeto(nomeCompleto));
  const corte = nomeCompleto.lastIndexOf(atual);
  if (!atual || corte < 0) return novoProjeto;
  return nomeCompleto.slice(0, corte) + novoProjeto + nomeCompleto.slice(corte + atual.length);
}

interface ManifestViewProps {
  manifest: Manifest;
  onBack: () => void;
}

export function ManifestView({ manifest, onBack }: ManifestViewProps) {
  const [editableManifest, setEditableManifest] = useState<Manifest>(() => {
    const copy = JSON.parse(JSON.stringify(manifest));
    copy.volumes = copy.volumes.map((vol: any, vIdx: number) => ({
      ...vol,
      id: vol.id || `vol-${vIdx}-${Date.now()}`,
      items: vol.items.map((item: any, iIdx: number) => ({
        ...item,
        id: item.id || `item-${vIdx}-${iIdx}-${Date.now()}`
      }))
    }));
    return copy;
  });
  const [editMode, setEditMode] = useState(false);
  const [showAuditPanel, setShowAuditPanel] = useState(true);

  const currentAudit = React.useMemo(() => {
    return auditManifest(editableManifest);
  }, [editableManifest]);

  const recalculateSummary = (volumes: Volume[]) => {
    let totalVolumes = volumes.length;
    let totalWeight = 0;
    let coletivaVolumes = 0;
    let coletivaWeight = 0;
    let otherVolumes = 0;
    let otherWeight = 0;
    
    const types: Record<string, { count: number, weight: number }> = {};

    volumes.forEach(vol => {
      const volWeight = vol.items.reduce((sum, item) => sum + item.totalWeight, 0);
      totalWeight += volWeight;

      const vType = vol.type;
      if (!types[vType]) {
        types[vType] = { count: 0, weight: 0 };
      }
      types[vType].count += 1;
      types[vType].weight += volWeight;

      if (vType === 'Caixa Coletiva') {
        coletivaVolumes += 1;
        coletivaWeight += volWeight;
      } else {
        otherVolumes += 1;
        otherWeight += volWeight;
      }
    });

    return {
      totalVolumes,
      totalWeight,
      coletivaVolumes,
      coletivaWeight,
      otherVolumes,
      otherWeight,
      types
    };
  };

  const handleUpdateVolume = (volId: string, updates: Partial<Volume>) => {
    setEditableManifest(prev => {
      const newVolumes = prev.volumes.map(v => {
        if ((v as any).id === volId) {
          return { ...v, ...updates };
        }
        return v;
      });
      return {
        ...prev,
        volumes: newVolumes,
        summary: recalculateSummary(newVolumes)
      };
    });
  };

  /**
   * Renomeia a série em TODOS os volumes que hoje mostram o mesmo rótulo.
   *
   * Renomear volume a volume seria inviável: uma carga de 25 volumes com quatro
   * do 8º ano exigiria digitar "8th grade" quatro vezes, e bastaria errar uma
   * para o romaneio sair com duas faixas diferentes para a mesma série.
   */
  const renomearSerie = (rotuloAtual: string, novoRotulo: string) => {
    setEditableManifest(prev => ({
      ...prev,
      volumes: prev.volumes.map(v =>
        v.year === rotuloAtual ? { ...v, year: novoRotulo, yearManual: true } : v
      )
    }));
  };

  const handleAddNewVolume = () => {
    setEditableManifest(prev => {
      const newVol = {
        id: `vol-new-${Date.now()}-${Math.random()}`,
        volumeNumber: '', // `renumerarVolumes` escreve o número certo abaixo
        type: 'Caixa Coletiva',
        dimensions: '52 x 38 x 32 cm',
        year: '1º Ano',
        category: 'Aluno',
        totalWeight: 0.1,
        items: [
          {
            id: `item-new-${Date.now()}-${Math.random()}`,
            product: {
              id: `prod-new-${Date.now()}-${Math.random()}`,
              name: 'Novo Item',
              weight: 0.1,
              type: 'Base',
              boxNumber: 'B',
              packagingType: 'Inspiramaker 5cm',
              ratio: '1x 4 Alunos',
              year: '1º Ano'
            },
            quantity: 1,
            totalWeight: 0.1,
            destination: 'Aluno'
          }
        ]
      };

      // Renumerar SEMPRE que a lista muda de tamanho. A auditoria exige
      // 1/N…N/N na ordem; adicionar deixava um "6" cru sem /N e excluir abria
      // buraco (1/5, 2/5, 3/5, 5/5). Nos dois casos o romaneio se reprovava
      // sozinho, por defeito de numeração e não de carga.
      const newVolumes = renumerarVolumes([...prev.volumes, newVol as any]);
      return {
        ...prev,
        volumes: newVolumes,
        summary: recalculateSummary(newVolumes)
      };
    });
  };

  const handleDeleteVolume = (volId: string) => {
    setEditableManifest(prev => {
      const newVolumes = renumerarVolumes(prev.volumes.filter(v => (v as any).id !== volId));
      return {
        ...prev,
        volumes: newVolumes,
        summary: recalculateSummary(newVolumes)
      };
    });
  };

  const handleUpdateItem = (volId: string, itemId: string, updates: any) => {
    setEditableManifest(prev => {
      const newVolumes = prev.volumes.map(v => {
        if ((v as any).id === volId) {
          const newItems = v.items.map((item: any) => {
            if (item.id === itemId) {
              const updatedItem = { ...item, ...updates };
              if (updates.quantity !== undefined) {
                updatedItem.totalWeight = updates.quantity * item.product.weight;
              } else if (updates.product && updates.product.weight !== undefined) {
                updatedItem.totalWeight = item.quantity * updates.product.weight;
              } else if (updates.totalWeight !== undefined) {
                updatedItem.totalWeight = updates.totalWeight;
              }
              return updatedItem;
            }
            return item;
          });
          const totalWeight = newItems.reduce((sum, item) => sum + item.totalWeight, 0);
          return {
            ...v,
            items: newItems,
            totalWeight
          };
        }
        return v;
      });
      return {
        ...prev,
        volumes: newVolumes,
        summary: recalculateSummary(newVolumes)
      };
    });
  };

  const handleAddItemToVolume = (volId: string) => {
    setEditableManifest(prev => {
      const newVolumes = prev.volumes.map(v => {
        if ((v as any).id === volId) {
          const newItem = {
            id: `item-new-${Date.now()}-${Math.random()}`,
            product: {
              id: `prod-new-${Date.now()}-${Math.random()}`,
              name: 'Novo Item',
              weight: 0.1,
              type: 'Base' as const,
              boxNumber: 'B',
              packagingType: 'Inspiramaker 5cm' as const,
              ratio: '1x 4 Alunos',
              year: v.year || '1º Ano'
            },
            quantity: 1,
            totalWeight: 0.1,
            destination: 'Aluno' as const
          };
          const newItems = [...v.items, newItem];
          const totalWeight = newItems.reduce((sum, item) => sum + item.totalWeight, 0);
          return {
            ...v,
            items: newItems,
            totalWeight
          };
        }
        return v;
      });
      return {
        ...prev,
        volumes: newVolumes,
        summary: recalculateSummary(newVolumes)
      };
    });
  };

  const handleDeleteItem = (volId: string, itemId: string) => {
    setEditableManifest(prev => {
      const newVolumes = prev.volumes.map(v => {
        if ((v as any).id === volId) {
          const newItems = v.items.filter((item: any) => item.id !== itemId);
          const totalWeight = newItems.reduce((sum, item) => sum + item.totalWeight, 0);
          return {
            ...v,
            items: newItems,
            totalWeight
          };
        }
        return v;
      }).filter(v => v.items.length > 0);

      return {
        ...prev,
        volumes: newVolumes,
        summary: recalculateSummary(newVolumes)
      };
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const handlePrint = () => {
    if (currentAudit.status === 'REPROVADO') {
      alert(`GERAÇÃO BLOQUEADA PELA AUDITORIA LOGÍSTICA:\n\nO romaneio possui inconformidades logísticas e não pode ser impresso.\n\nErros:\n${currentAudit.errors.map(e => `• ${e}`).join('\n')}`);
      return;
    }
    const content = document.getElementById('printable-area');
    if (!content) return;

    // Open a new tab to bypass iframe sandbox restrictions
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert("O navegador bloqueou a abertura da aba de impressão. Por favor, permita os pop-ups ou use o botão 'Baixar PDF'.");
      return;
    }

    // Get all styles from the current document
    const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Romaneio - ${manifest.schoolName}</title>
          ${styles}
          <style>
            @page { 
              size: A4 ${orientation}; 
              margin: 10mm; 
            }
            @media print {
              body { 
                background: white !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                margin: 0; 
                padding: 0;
              }
              .print\\:hidden { display: none !important; }
              /* Hide browser headers and footers */
              header, footer { display: none !important; }
              #printable-area {
                width: 100% !important;
                min-height: auto !important;
                padding: 0 !important;
                box-shadow: none !important;
                margin: 0 !important;
              }
            }
            body { 
              font-family: sans-serif;
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <!--
            romaneio-tab: dentro de outro sistema o CSS do romaneio só vale
            debaixo dessa classe (ver scripts/exportar-aba.mjs). A janela de
            impressão não tem a aba em volta, então ela vem junto aqui. No app
            sozinho a classe não casa com nada e não muda coisa nenhuma.
          -->
          <div class="print-container romaneio-tab" data-tema="claro">
            ${content.outerHTML}
          </div>
          <script>
            // Wait for images and SVGs to be fully ready
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // Optional: close window after print
                // window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    if (currentAudit.errors.length > 0) {
      const proceed = confirm(`ATENÇÃO - AUDITORIA LOGÍSTICA:\n\nO romaneio possui os seguintes apontamentos:\n${currentAudit.errors.map(e => `• ${e}`).join('\n')}\n\nDeseja prosseguir com o download do PDF mesmo assim?`);
      if (!proceed) return;
    }
    const element = document.getElementById('printable-area');
    if (!element || isGenerating) return;
    
    setIsGenerating(true);
    try {
      validateVolumeHeadings(editableManifest);

      // Small delay to ensure rendering is stable
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { toJpeg } = await import('html-to-image');

      const imgData = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          transform: 'none',
          boxShadow: 'none',
        }
      });

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const rect = element.getBoundingClientRect();
      const canvasWidth = rect.width * 2;
      const canvasHeight = rect.height * 2;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

      // Find avoid zones based on data-pdf-block
      const avoidElements = Array.from(element.querySelectorAll('[data-pdf-block="true"]'));
      const avoidZones = avoidElements.map(el => {
        const bounds = el.getBoundingClientRect();
        let top = bounds.top;
        let bottom = bounds.bottom;

        // If this is a table header, extend the bottom to include the first volume row
        if (el.tagName.toLowerCase() === 'thead') {
          const nextRow = el.nextElementSibling;
          if (nextRow) {
            const nextBounds = nextRow.getBoundingClientRect();
            bottom = Math.max(bottom, nextBounds.bottom);
          }
        }

        // Convert screen pixels to PDF MM units scaled same as the image
        return {
          top: (top - rect.top) * 2 * (pdfWidth / canvasWidth),
          bottom: (bottom - rect.top) * 2 * (pdfWidth / canvasWidth)
        };
      });

      let yOffset = 0; // The Y position in the original image (in MM)
      let firstPage = true;

      while (yOffset < imgHeight) {
        if (!firstPage) pdf.addPage();
        firstPage = false;

        let sliceHeight = pdfHeight;
        let slicePoint = yOffset + sliceHeight;

        if (slicePoint < imgHeight) {
          // Find if we cut through an avoid zone
          for (const zone of avoidZones) {
             // If this zone is taller than the PDF page, we can't protect it
             if ((zone.bottom - zone.top) > pdfHeight) {
                 continue;
             }
             
             if (slicePoint > zone.top && slicePoint < zone.bottom) {
                 // The cut falls inside this block, so we MUST break BEFORE it
                 if (zone.top > yOffset) { 
                     sliceHeight = zone.top - yOffset;
                     slicePoint = zone.top;
                 }
                 break;
             }
          }
        }
        
        // Draw the full image shifted up by yOffset
        pdf.addImage(imgData, 'JPEG', 0, -yOffset, pdfWidth, imgHeight);

        // Blank out anything that goes past our precise slicePoint on this page
        if (sliceHeight < pdfHeight) {
           pdf.setFillColor(255, 255, 255);
           pdf.rect(0, sliceHeight, pdfWidth, pdfHeight - sliceHeight, 'F');
        }

        yOffset += sliceHeight;

        // If the remaining content is negligible (e.g. less than 5mm), don't create an almost blank page
        if (imgHeight - yOffset < 5) {
            break;
        }
      }

      pdf.save(`Romaneio_${editableManifest.schoolName}_${editableManifest.date}.pdf`.replace(/\s+/g, '_'));

    } catch (err) {
      console.error("PDF generation failed:", err);
      alert(`Erro ao gerar PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Group volumes by category and then by year
  const groupedVolumes = React.useMemo(() => {
    const categories: Record<string, Record<string, Volume[]>> = {
      'Aluno': {},
      'Professor': {}
    };

    /*
      Puro de propósito: agrupa sobre CÓPIAS e não escreve no estado.

      Antes havia um `vol.year = heading` aqui dentro — mutação do objeto de
      estado durante a memoização. Funcionava porque ninguém reparava, mas é o
      tipo de coisa que o React pode reexecutar, descartar ou reordenar, e o
      efeito colateral vaza para fora do render. Como quem lê a série é sempre
      este agrupamento (o documento em tela e o .xlsx passam pelos dois pelo
      mesmo caminho), a cópia com o rótulo certo basta.
    */
    editableManifest.volumes.forEach(vol => {
      // Respeita o rótulo escrito à mão. Sem isto, a série digitada na edição
      // ("8th grade") era desfeita no render seguinte.
      const heading = vol.yearManual && vol.year ? vol.year : buildYearHeading(vol);
      const cat = vol.category || 'Aluno';
      if (!categories[cat][heading]) {
        categories[cat][heading] = [];
      }
      categories[cat][heading].push(vol.year === heading ? vol : { ...vol, year: heading });
    });

    return categories;
  }, [editableManifest.volumes]);

  const sortYears = (a: string, b: string) => {
    if (a === b) return 0;
    
    const isMixed = (yearStr: string) => yearStr.includes(' e ') || yearStr.includes(',');
    
    const mixedA = isMixed(a);
    const mixedB = isMixed(b);
    
    const getSingleRank = (yearStr: string) => {
      const str = yearStr.toLowerCase().trim();
      if (str.includes('infantil') || str.includes('e.i') || str.includes('ei')) return 0;
      
      const match = str.match(/(\d+)/);
      const num = match ? parseInt(match[1]) : 0;
      
      if (str.includes('e.m') || str.includes('em') || str.includes('médio')) {
          return 100 + num;
      }
      if (str.includes('ano') || str.includes('série')) {
          return num;
      }
      return 50 + num; 
    };

    const getRank = (yearStr: string) => {
      const parts = yearStr.split(/\s+e\s+|,/);
      return Math.min(...parts.map(p => getSingleRank(p)));
    };
    
    const rankA = getRank(a);
    const rankB = getRank(b);
    
    if (rankA !== rankB) return rankA - rankB;
    
    // If they have the same rank (e.g. "1º Ano" and "1º Ano e 4º Ano"), 
    // the pure box comes before the mixed box.
    if (mixedA && !mixedB) return 1;
    if (!mixedA && mixedB) return -1;
    
    return a.localeCompare(b);
  };

  /*
    O ano vem da DATA DO ROMANEIO, não do relógio.

    Antes era `new Date().getFullYear()`: um romaneio datado de 15/01/2027
    reaberto em 2026 saía com "Linha 3/26" no código do produto e "15/01/2027"
    no cabeçalho — o mesmo documento com dois anos. Agora há uma fonte só, e o
    relógio só entra se a data estiver ilegível.
  */
  const currentYearStr = anoDaLinhaCurto();
  const getProductPrefix = (linhaStr?: string) => {
    const linhaNum = linhaStr ? linhaStr.replace(/\D/g, '') : '1';
    return `(L${linhaNum || '1'}.${currentYearStr})`;
  };
  const productPrefix = getProductPrefix(editableManifest.linha);

  /**
   * Baixa o .xlsx usando O MESMO exportador do CLI (`montarWorkbook`).
   *
   * Aqui viviam 556 linhas que montavam uma planilha PARALELA: colunas de A a K
   * sem respiro lateral, todas com 39–48 de largura, retrato sem ajuste à
   * página, células de dados sem alinhamento. O layout aprovado é o outro —
   * B a L, paisagem, ajustado à largura, centralizado, tudo ao centro — e o
   * mesmo romaneio saía diferente conforme quem exportasse.
   *
   * Nada de layout mora mais neste arquivo. Mexeu no Excel, mexeu em
   * `src/lib/exportXlsx.ts`, e os dois caminhos mudam juntos.
   */
  const handleDownloadExcel = async () => {
    if (currentAudit.errors.length > 0) {
      const proceed = confirm(`ATENÇÃO - AUDITORIA LOGÍSTICA:\n\nO romaneio possui os seguintes apontamentos:\n${currentAudit.errors.map(e => `• ${e}`).join('\n')}\n\nDeseja prosseguir com a exportação para Excel mesmo assim?`);
      if (!proceed) return;
    }
    try {
      const { montarWorkbook } = await import('../lib/exportXlsx');
      const workbook = await montarWorkbook(editableManifest);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Romaneio_${(editableManifest.schoolName || 'Escola').replace(/[^a-zA-Z0-9_\-]/g, '_')}_${(editableManifest.date || 'data').replace(/\//g, '-')}.xlsx`;

      try {
        const { saveAs } = await import('file-saver');
        saveAs(blob, fileName);
      } catch {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error(e);
      alert('Erro ao gerar Excel: ' + e.message);
    }
  };

  const handleDownloadCSV = () => {
    if (currentAudit.errors.length > 0) {
      const proceed = confirm(`ATENÇÃO - AUDITORIA LOGÍSTICA:\n\nO romaneio possui os seguintes apontamentos:\n${currentAudit.errors.map(e => `• ${e}`).join('\n')}\n\nDeseja prosseguir com a exportação para CSV mesmo assim?`);
      if (!proceed) return;
    }

    try {
      const dateStr = editableManifest.date || new Date().toLocaleDateString('pt-BR');
      const rows: string[][] = [
        ['Romaneio de Expedição', `Linha ${numeroDaLinha(editableManifest.linha)}/20${currentYearStr}`],
        ['Escola', displaySchoolName],
        ['Data', dateStr],
        [],
        ['Volume', 'Caixa', 'Dimensão (CxLxA) CM', 'Produto', 'Destino', 'Tipo', 'QNT', 'Peso Kg', 'Sequência', 'Relação', 'Check']
      ];

      editableManifest.volumes.forEach((vol) => {
        vol.items.forEach((item) => {
          rows.push([
            String(vol.volumeNumber),
            vol.type,
            vol.dimensions,
            item.productName,
            item.destination || 'Aluno',
            item.type,
            String(item.quantity),
            typeof item.weight === 'number' ? item.weight.toFixed(3).replace('.', ',') : String(item.weight),
            item.sequence || '1/1',
            item.relation || '1x Aluno',
            ''
          ]);
        });
      });

      const csvString = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanSchool = (editableManifest.schoolName || 'Escola').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const cleanDate = dateStr.replace(/\//g, '-');
      link.setAttribute('download', `Romaneio_${cleanSchool}_${cleanDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert('Erro ao gerar CSV: ' + e.message);
    }
  };

  let displaySchoolName = editableManifest.schoolName || '';
  const lowerName = (editableManifest.schoolName || '').toLowerCase();
  
  if (lowerName === 'brasilia' || lowerName === 'colégio brasilia') {
      displaySchoolName = 'Colégio Brasília';
  } else if (lowerName.includes('adventista caratinga')) {
    displaySchoolName = 'Adventista Caratinga';
  } else if (!lowerName.startsWith('colégio')) {
    displaySchoolName = `Colégio ${editableManifest.schoolName}`;
  }

  // Ensure "Brasília" has accent in string manipulation if somehow passed through manually
  displaySchoolName = displaySchoolName.replace(/ Brasilia/i, ' Brasília').replace(/^Brasilia/i, 'Brasília');

  return (
    <div className="max-w-5xl mx-auto min-h-[90vh] pb-12 print:p-0 print:m-0 print:pb-0 relative">
      {/* Non-printable controls */}
      {/*
        Barra de ações no tema Console, igual à tela de montagem. O `print:hidden`
        garante que ela não vai para o papel — e o documento abaixo continua
        branco, com a aparência de sempre.
      */}
      <div
        className="print:hidden sticky top-0 z-50 mb-8 flex flex-col gap-3 px-5 py-3"
        style={{ background: 'var(--color-c-void)', borderBottom: '1px solid var(--color-c-line)', fontFamily: 'var(--font-app)' }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
               <button
                 onClick={onBack}
                 className="flex items-center gap-2 shrink-0 px-2 py-1.5 text-sm font-semibold"
                 style={{ background: 'transparent', border: 'none', color: 'var(--color-c-dim)', cursor: 'pointer' }}
               >
                 <ArrowLeft className="w-4 h-4" />
                 Voltar ao pedido
               </button>

               <div className="hidden sm:block" style={{ width: 1, height: 22, background: 'var(--color-c-line-2)' }} />

               <BotaoTema />

               <div className="flex shrink-0" style={{ gap: 3 }}>
                 {(['portrait', 'landscape'] as const).map(o => (
                   <button
                     key={o}
                     onClick={() => setOrientation(o)}
                     className="px-3 text-xs font-bold"
                     style={{
                       height: 30, cursor: 'pointer',
                       fontFamily: 'var(--font-app-mono)', letterSpacing: '.04em',
                       background: orientation === o ? 'var(--color-c-on-soft)' : 'transparent',
                       border: `1px solid ${orientation === o ? 'var(--color-c-on-line)' : 'var(--color-c-line)'}`,
                       color: orientation === o ? 'var(--color-brand-green-deep)' : 'var(--color-c-faint)'
                     }}
                   >
                     {o === 'portrait' ? 'VERTICAL' : 'HORIZONTAL'}
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {editMode && (
                <button
                  onClick={handleAddNewVolume}
                  className="flex items-center gap-2 px-3 text-xs font-bold"
                  style={{ height: 32, background: 'transparent', border: '1px solid var(--color-prof-deep)', color: 'var(--color-prof)', cursor: 'pointer' }}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar volume
                </button>
              )}
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-2 px-3 text-xs font-bold"
                style={{
                  height: 32, cursor: 'pointer',
                  background: editMode ? 'var(--color-prof-fill)' : 'transparent',
                  border: `1px solid ${editMode ? 'var(--color-prof-fill)' : 'var(--color-c-line-2)'}`,
                  color: editMode ? 'var(--color-c-on-accent)' : 'var(--color-c-dim)'
                }}
              >
                <Edit2 className="w-4 h-4" />
                {editMode ? 'Concluir edição' : 'Editar romaneio'}
              </button>
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 px-3 text-xs font-bold"
                style={{ height: 32, background: 'var(--color-brand-green)', border: 'none', color: 'var(--color-c-on-accent)', cursor: 'pointer' }}
                title="Baixar em formato Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Baixar Excel
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-3 text-xs font-bold"
                style={{ height: 32, background: 'transparent', border: '1px solid var(--color-c-line-2)', color: 'var(--color-c-dim)', cursor: 'pointer' }}
                title="Baixar em formato CSV (.csv)"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ height: 32, background: 'transparent', border: '1px solid var(--color-c-line-2)', color: 'var(--color-c-dim)', cursor: 'pointer' }}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isGenerating ? 'Gerando...' : 'PDF'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 text-xs font-bold"
                style={{ height: 32, background: 'var(--color-c-raised)', border: '1px solid var(--color-c-line-2)', color: 'var(--color-c-text)', cursor: 'pointer' }}
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>

      {/* Lista de projetos usada pelos campos de edição. Não imprime. */}
      <datalist id="projetos-do-catalogo">
        {PROJETOS_DO_CATALOGO.map(n => <option key={n} value={n} />)}
      </datalist>

      {editMode && (
        <div className="print:hidden mx-4 md:mx-auto max-w-5xl mb-6 bg-gradient-to-r from-amber-50/85 to-orange-50/85 border border-amber-200/50 rounded-2xl p-4 flex gap-4 shadow-md backdrop-blur-md">
          <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-800 tracking-wider mb-0.5 uppercase">Modo Planilha Excel Ativo ✏️</h4>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Você pode alterar livremente os <strong>nomes de projetos, quantidades (QNT), pesos, tipos de caixa, sequências e relações</strong> clicando diretamente nas respectivas células abaixo. 
              Os pesos e totais serão recalculados na hora.
            </p>
            <div className="mt-2 text-[10px] font-bold text-amber-900 bg-amber-500/10 px-3 py-1 rounded-lg inline-block">
              💡 DICA: Clique no botão <span className="font-mono bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300 font-bold">➕ Item</span> à esquerda para adicionar novas linhas ao volume, ou no <span className="font-mono bg-rose-100 text-rose-800 px-1 py-0.2 rounded border border-rose-300 font-bold">✕</span> à direita para excluir linhas desnecessárias!
            </div>
          </div>
        </div>
      )}

      {/* AUDIT DASHBOARD PANEL */}
      <div className="print:hidden mx-4 md:mx-auto max-w-5xl mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${currentAudit.status === 'APROVADO' ? 'bg-emerald-50/80 border-b border-emerald-100' : 'bg-rose-50/80 border-b border-rose-100'}`}>
          <div className="flex items-center gap-3">
            {currentAudit.status === 'APROVADO' ? (
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 bg-rose-500 text-white rounded-xl shadow-sm shrink-0 animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-extrabold ${currentAudit.status === 'APROVADO' ? 'text-emerald-950' : 'text-rose-950'}`}>
                  AUDITORIA LOGÍSTICA AUTOMÁTICA
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${currentAudit.status === 'APROVADO' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                  {currentAudit.status === 'APROVADO' ? '✓ APROVADO' : '✕ REPROVADO'}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                {currentAudit.status === 'APROVADO' 
                  ? 'Validação concluída com sucesso: todos os volumes cumprem capacidade (≤36 pts / 12 un. 5cm / 6 un. 10cm), peso (≤18kg) e totais de projetos.'
                  : `${currentAudit.errors.length} inconformidade(s) detectada(s). A exportação para PDF/Excel e Impressão está bloqueada até a correção.`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuditPanel(!showAuditPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-all cursor-pointer shrink-0 self-start sm:self-center"
          >
            {showAuditPanel ? (
              <>
                <span>Ocultar Detalhes</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Ver Tabela de Auditoria</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {showAuditPanel && (
          <div className="p-5 space-y-6 bg-slate-50/40">
            {currentAudit.errors.length > 0 && (
              <div className="p-3.5 bg-rose-100/80 border border-rose-300 rounded-xl text-rose-900 text-xs font-medium space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-rose-950 uppercase tracking-wider text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Inconformidades que Bloqueiam a Geração:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 font-mono text-[11px]">
                  {currentAudit.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Table 1: Volume Audit */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>
                  1. Auditoria por Volume (Capacidade, Pontos e Pesos)
                </h4>
                <span className="text-[10px] font-bold text-slate-500">
                  Regra: Ocupação ≤ 36 pts | 10cm ≤ 6 | 5cm ≤ 12 | Peso ≤ 18,000 kg
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Volume</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5 text-center">10 cm</th>
                      <th className="p-2.5 text-center">5 cm</th>
                      <th className="p-2.5 text-center">Sacos</th>
                      <th className="p-2.5 text-center">Ocupação (pts)</th>
                      <th className="p-2.5 text-right">Peso Total</th>
                      <th className="p-2.5">Projetos Alocados</th>
                      <th className="p-2.5 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {currentAudit.volumeAudits.map((v, i) => (
                      <tr key={i} className={v.status === 'REPROVADO' ? 'bg-rose-50/70' : 'hover:bg-slate-50/80'}>
                        <td className="p-2.5 font-extrabold text-slate-900">{v.volumeNumber}</td>
                        <td className="p-2.5 text-slate-600">{v.type}</td>
                        <td className="p-2.5 text-center font-mono">{v.caixas10cm}</td>
                        <td className="p-2.5 text-center font-mono">{v.caixas5cm}</td>
                        <td className="p-2.5 text-center font-mono">{v.sacos}</td>
                        <td className={`p-2.5 text-center font-mono font-bold ${v.points > 30 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                          {v.points} / 30
                        </td>
                        <td className={`p-2.5 text-right font-mono font-bold ${v.weight > 18 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                          {v.weight.toFixed(3)} kg
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate" title={v.projects}>{v.projects}</td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${v.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Project Comparison Audit */}
            {currentAudit.projectAudits.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  2. Comparação por Projeto (Pedido Original vs. Expedido no Romaneio)
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Projeto</th>
                        <th className="p-2.5">Ano</th>
                        <th className="p-2.5 text-center bg-blue-50/60">Base Pedida</th>
                        <th className="p-2.5 text-center bg-blue-50/60">Base Expedida</th>
                        <th className="p-2.5 text-center bg-teal-50/60">Comp. Pedido</th>
                        <th className="p-2.5 text-center bg-teal-50/60">Comp. Expedido</th>
                        <th className="p-2.5 text-center bg-purple-50/60">Prof. Pedido</th>
                        <th className="p-2.5 text-center bg-purple-50/60">Prof. Expedido</th>
                        <th className="p-2.5 text-center">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {currentAudit.projectAudits.map((p, i) => (
                        <tr key={i} className={p.status === 'REPROVADO' ? 'bg-rose-50/70' : 'hover:bg-slate-50/80'}>
                          <td className="p-2.5 font-bold text-slate-900">{p.projectName}</td>
                          <td className="p-2.5 text-slate-600">{p.year}</td>
                          <td className="p-2.5 text-center font-mono">{p.baseRequested}</td>
                          <td className={`p-2.5 text-center font-mono font-bold ${p.baseRequested !== p.baseShipped ? 'text-rose-600' : 'text-emerald-700'}`}>{p.baseShipped}</td>
                          <td className="p-2.5 text-center font-mono">{p.compRequested}</td>
                          <td className={`p-2.5 text-center font-mono font-bold ${p.compRequested !== p.compShipped ? 'text-rose-600' : 'text-emerald-700'}`}>{p.compShipped}</td>
                          <td className="p-2.5 text-center font-mono">{p.profRequested}</td>
                          <td className={`p-2.5 text-center font-mono font-bold ${p.profRequested !== p.profShipped ? 'text-rose-600' : 'text-emerald-700'}`}>{p.profShipped}</td>
                          <td className="p-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${p.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Volume Optimization & Year Mixing Audit */}
            {currentAudit.optimizationMetrics && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    3. Auditoria de Otimização de Volumes e Mistura de Anos
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    Regra: Maximizar ocupação | Evitar misturas desnecessárias | Trava rígida de Ciclo Escolar (EF1 ≠ EF2 ≠ EM)
                  </span>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Total de Volumes</div>
                      <div className="text-sm font-black text-slate-900 mt-0.5">{currentAudit.optimizationMetrics.totalVolumes}</div>
                    </div>
                    <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-emerald-700">Caixas Puras (1 Ano)</div>
                      <div className="text-sm font-black text-emerald-900 mt-0.5">{currentAudit.optimizationMetrics.pureYearVolumesCount}</div>
                    </div>
                    <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-amber-700">Caixas Mistas (Anos Combinados)</div>
                      <div className="text-sm font-black text-amber-900 mt-0.5">{currentAudit.optimizationMetrics.mixedYearVolumesCount}</div>
                    </div>
                    <div className={`p-2.5 border rounded-lg ${currentAudit.optimizationMetrics.cycleViolationsCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-blue-50/60 border-blue-100 text-blue-900'}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Avaliação de Otimização</div>
                      <div className="text-xs font-black mt-0.5">{currentAudit.optimizationMetrics.optimizationScore}</div>
                    </div>
                  </div>

                  {currentAudit.optimizationMetrics.notes.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider">Notas da Otimização Logística:</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-700 text-[11px] font-medium">
                        {currentAudit.optimizationMetrics.notes.map((note, nIdx) => (
                          <li key={nIdx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Area */}
      <div id="printable-area" className={`${orientation === 'portrait' ? 'w-[210mm] min-h-[297mm]' : 'w-[297mm] min-h-[210mm]'} mx-auto bg-white p-10 print:p-0 text-black font-sans`}>
        
        {/* Modern Minimal Header -> Exact PDF Header */}
        <div data-pdf-block="true" className="mb-6 border-[2px] border-black">
          <div className="flex border-b-[2px] border-black min-h-[50px]">
             <div className="flex-1 flex items-center justify-center font-bold text-2xl md:text-3xl text-black py-2 px-4">
              {editMode ? (
                <div className="flex flex-col items-center gap-1 w-full max-w-md">
                  <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Identificação da Linha</span>
                  <input
                    type="text"
                    className="w-full text-center bg-amber-50 text-xl font-bold border border-amber-250 rounded py-0.5"
                    value={editableManifest.linha || ''}
                    placeholder="Linha 1/2026"
                    onChange={(e) => setEditableManifest(p => ({ ...p, linha: e.target.value }))}
                  />
                </div>
              ) : (
                /*
                  A palavra "Linha" é escrita AQUI, e só o número vem do campo.
                  O campo chega em dois formatos — o CLI manda "3", o app manda
                  "Linha 1" — e cada saída supunha um deles: o .xlsx escrevia
                  "Linha Linha 1" e a tela escrevia "1/2026" sem a palavra.
                */
                `Romaneio de Expedição - Linha ${numeroDaLinha(editableManifest.linha)}/20${currentYearStr}`
              )}
            </div>
            {/*
              Marca da remessa, AO LADO do logotipo e nunca por cima dele.
              Só aparece quando a carga sai em duas (linha 1: o professor viaja
              antes do aluno). O .xlsx tem a mesma marca, na mesma posição.
            */}
            {editableManifest.remessa && (
              <div className="w-28 shrink-0 flex justify-center items-center border-l-[2px] border-black px-1 bg-[#00FF00]">
                <span className="text-[11px] font-bold leading-tight text-center text-black uppercase">
                  {editableManifest.remessa === 'Professor' ? 'Material do Professor' : 'Material do Aluno'}
                </span>
              </div>
            )}
            <div className="w-32 shrink-0 flex justify-center items-center border-l-[2px] border-black pb-1">
              <div
                className="h-10 w-full"
                dangerouslySetInnerHTML={{ __html: LOGO_SVG_RAW }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-center text-[10px] sm:text-xs italic font-bold border-b-[2px] border-black py-1 relative text-black">
             <span>MundoMaker Educação LTDA</span>
             {editMode ? (
               <div className="absolute right-2 flex items-center gap-1">
                 <span className="text-[8px] text-amber-600 font-bold uppercase">Data</span>
                 <input
                   type="text"
                   className="text-right text-[10px] font-mono font-bold bg-amber-50 border border-amber-250 rounded px-1.5 py-0.5"
                   value={editableManifest.date}
                   onChange={(e) => setEditableManifest(p => ({ ...p, date: e.target.value }))}
                 />
               </div>
             ) : (
               <span className="absolute right-2 not-italic">{editableManifest.date}</span>
             )}
          </div>
          
          <div className="flex items-center justify-center py-3 text-xl md:text-2xl font-bold text-black min-h-[50px]">
            {editMode ? (
              <div className="flex flex-col items-center gap-1 w-full max-w-xl px-4">
                <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Nome do Colégio</span>
                <input
                  type="text"
                  className="w-full text-center bg-amber-50 text-lg font-black border border-amber-250 rounded py-1 px-3"
                  value={editableManifest.schoolName}
                  onChange={(e) => setEditableManifest(p => ({ ...p, schoolName: e.target.value }))}
                />
              </div>
            ) : (
              displaySchoolName
            )}
          </div>
        </div>

        {/* Resumo de Carga */}
        <div data-pdf-block="true" className="bg-[#00FF00] border-[2px] border-black text-center font-bold text-sm md:text-base py-0.5 mb-4 text-black">
            Resumo de Carga
        </div>

        {/* Summary Table block */}
        <div className="flex flex-col mb-6 font-bold text-xs md:text-sm text-black">
           <div className="flex mb-1">
             <div className="w-32">Qnt. Volume</div>
             <div>{editableManifest.summary.totalVolumes}</div>
           </div>
           <div className="flex mb-6">
             <div className="w-32">Peso (KG)</div>
             <div>{editableManifest.summary.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
           </div>
           
           <div className="text-[#00FF00] font-bold text-xs md:text-sm mb-4">
               Embalagens e Medidas C X L X A (CM)
           </div>

           {Object.entries(editableManifest.summary.types).map(([type, data]: [string, any]) => {
              let dimension = '52 x 38 x 32 cm';
              let printType = type;
              const lowerType = type.toLowerCase();
              if (lowerType.includes('coletiva')) { dimension = '52 x 38 x 32 cm'; printType = 'Coletiva'; }
              else if (lowerType.includes('tubo')) { dimension = '100 x 10 x 10 cm'; printType = 'Tubo'; }
              else if (lowerType.includes('espaguete') || lowerType.includes('embalagem')) { dimension = '145 x 53 x 80 cm'; printType = 'Embalagem Espaguete'; }
              else if (lowerType.includes('plástica') || lowerType.includes('plastica')) { dimension = '200 x 295 x 420 mm'; printType = 'Caixa plástica'; }

              return (
                 <div key={type} className="mb-4 text-xs md:text-sm font-bold text-black">
                    <div className="flex mb-1"><div className="w-24">Tipo:</div><div>{printType}</div></div>
                    <div className="flex mb-1"><div className="w-24">Unidade:</div><div>{data.count}</div></div>
                    <div className="flex"><div className="w-24">Tamanho:</div><div>{dimension}</div></div>
                 </div>
              );
           })}
        </div>

        {/* Gabarito block */}
        <div className="mb-8 font-bold text-xs md:text-sm text-black">
           <div className="text-[#00FF00] mb-4">
               Gabarito das caixas
           </div>
           <div className="flex items-start gap-x-12">
               {/*
                 Os quatro ícones do gabarito são AS MESMAS imagens do .xlsx
                 (`ICONES_XLSX`, de `assets/*.png`), e não os SVGs antigos: a
                 tela, a planilha, o PDF e a impressão mostram a mesma caixa.
                 Antes eram dois desenhos diferentes para a mesma embalagem.
               */}
               {editableManifest.summary.types['Caixa Coletiva'] && (
                   <div className="text-center font-bold text-xs">
                       <div className="mb-2">Coletiva</div>
                       <img
                         className="w-32 h-24 mx-auto object-contain"
                         src={`data:image/png;base64,${ICONES_XLSX['coletiva.png']}`}
                         alt="Caixa coletiva"
                       />
                   </div>
               )}
               {/*
                 As chaves do resumo são 'Caixa Tubo' e 'Embalagem Espaguete' —
                 buildManifestFromVolumes normaliza 'Tubo' para 'Caixa Tubo'.
                 Procurar por 'Tubo' e 'Embalagem' nunca casava, e por isso o
                 nome e a medida da embalagem apareciam mas a foto não.
               */}
               {(editableManifest.summary.types['Caixa Tubo'] || editableManifest.summary.types['Tubo']) && (
                   <div className="text-center font-bold text-xs">
                       <div className="mb-2">Tubo</div>
                       <img
                         className="w-14 h-32 mx-auto object-contain"
                         src={`data:image/png;base64,${ICONES_XLSX['tubo.png']}`}
                         alt="Caixa tubo"
                       />
                   </div>
               )}
               {(editableManifest.summary.types['Embalagem Espaguete'] || editableManifest.summary.types['Embalagem']) && (
                    <div className="text-center font-bold text-xs">
                        <div className="mb-2">Embalagem</div>
                        <img
                          className="w-24 h-28 mx-auto object-contain"
                          src={`data:image/png;base64,${ICONES_XLSX['espaguete.png']}`}
                          alt="Embalagem espaguete"
                        />
                    </div>
                )}
                {editableManifest.summary.types['Caixa Plástica'] && (
                   <div className="text-center font-bold text-xs">
                       <div className="mb-2">Caixa plástica</div>
                       <img
                         className="w-32 h-24 mx-auto object-contain"
                         src={`data:image/png;base64,${ICONES_XLSX['plastica.png']}`}
                         alt="Caixa plástica"
                       />
                   </div>
               )}
           </div>
        </div>

        {/* Relation Header */}
        <div data-pdf-block="true" className="bg-[#00FF00] border-[2px] border-black text-center font-bold text-lg md:text-xl py-1 mb-6 text-black">
          Relação de Projetos e quantidades
        </div>

        {/* Flat array of sections to map through to match the PDF */}
        {(() => {
          const sections = Object.keys(groupedVolumes['Aluno']).sort(sortYears).map(year => ({ title: `${year}`, items: groupedVolumes['Aluno'][year] }));
          const profItems = editableManifest.volumes
              .filter(v => v.category === 'Professor')
              .sort((a, b) => {
                  const rank = sortYears(a.year, b.year);
                  if (rank !== 0) return rank;
                  const typePriority = (type: string) => {
                      if (type === 'Embalagem') return 0;
                      if (type === 'Caixa Coletiva') return 1;
                      if (type === 'Caixa Plástica' || type === 'Plástica') return 2;
                      if (type === 'Tubo' || type === 'Caixa Tubo' || type === 'Espaguete') return 3;
                      return 4;
                  };
                  return typePriority(a.type) - typePriority(b.type);
              });
          if (profItems.length > 0) {
              sections.push({ title: 'Material do professor', items: profItems as any });
          }
          return sections;
        })().map((section, idx) => (
          <div key={idx} className="mb-6 text-black">
            <table className="w-full text-[10px] text-center border-collapse break-inside-avoid table-fixed border-[2px] border-black">
              <thead data-pdf-block="true">
                <tr>
                   <th colSpan={11} className="border-b border-black bg-white py-1 font-bold text-xl md:text-2xl">{section.title}</th>
                </tr>
                <tr className="font-bold border-y border-black bg-white select-none">
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-24' : 'w-12'}`}>Volume</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-24' : 'w-20'}`}>Caixa</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-32' : 'w-32'}`}>Dimensão (CxLxA) CM</th>
                  <th className="border-y border-black py-1 px-2 text-center w-auto">Produto</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-22' : 'w-16'}`}>Destino</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-22' : 'w-16'}`}>Tipo</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-16' : 'w-12'}`}>QNT</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-24' : 'w-16'}`}>Peso Kg</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-22' : 'w-16'}`}>Sequência</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-22' : 'w-16'}`}>Relação</th>
                  <th className={`border-y border-black py-1 px-1 transition-all ${editMode ? 'w-24' : 'w-12'}`}>Check</th>
                </tr>
              </thead>
              {section.items.map((vol: Volume, volIdx: number) => (
              <tbody data-pdf-block="true" key={`vol-${volIdx}`} className="break-inside-avoid">
                {vol.items.map((item, itemIdx) => {
                    let dimension = vol.dimensions || '52 x 38 x 32 cm';
                    let caixaName = vol.type;

                    const lowerVolType = (vol.type || '').toLowerCase();
                    if (lowerVolType.includes('coletiva')) { dimension = '52 x 38 x 32 cm'; caixaName = 'Coletiva'; }
                    else if (lowerVolType.includes('tubo')) { dimension = '100 x 10 x 10 cm'; caixaName = 'Tubo'; }
                    else if (lowerVolType.includes('espaguete') || lowerVolType.includes('embalagem')) { dimension = '145 x 53 x 80 cm'; caixaName = 'Embalagem Espaguete'; }
                    else if (lowerVolType.includes('plástica') || lowerVolType.includes('plastica')) {
                       dimension = '200 x 295 x 420 mm';
                       caixaName = 'Plástica';
                    }

                    // A regra da coluna RELAÇÃO mora em `formatoRomaneio.ts`, uma só,
                    // usada aqui e no .xlsx. Estava duplicada, e o papel dizia
                    // "1 x 5 Grupos" enquanto a planilha dizia "1x 20 Alunos".
                    const ehDoProfessor = item.destination === 'Professor'
                      || vol.category === 'Professor'
                      || (section.title || '').toLowerCase() === 'material do professor';
                    const relacaoText = formatarRelacao(
                      item.product.ratio, ehDoProfessor ? 'Professor' : 'Aluno'
                    );

                    // O prefixo de série é a série de DESTINO, não a do catálogo:
                    // Dinossauros indo para o 3º ano sai "3º Ano - Dinossauros".
                    let rotuloDestino: string | undefined;
                    try { rotuloDestino = item.targetYearKey ? parseSchoolYear(item.targetYearKey).label : undefined; }
                    catch { rotuloDestino = undefined; }

                    // Remove "(Material do Professor)", "- Complementar", and "(Pacote c/ x)" / "embalagem com x" from name
                    let displayName = nomeComSerieDeDestino(item.product.name, rotuloDestino)
                      .replace(/\(Material do Professor\)/gi, '')
                      .replace(/\s*-\s*Complementar$/i, '')
                      .replace(/\s*\(?(?:Pacote|Embalagem)\s*(?:c\/|com)?\s*\d+\)?$/gi, '')
                      .trim();
                    displayName = displayName.replace(/^(?:EI|E\.I\.|Ensino Infantil)\s*-\s*/i, 'Infantil - ');

                    return (
                      <tr key={`${vol.volumeNumber}-${itemIdx}`} className="font-semibold text-black border-y border-black">
                        {itemIdx === 0 ? (
                          <>
                            <td className="border-y border-black py-0.5 px-1 bg-white" rowSpan={vol.items.length}>
                              {editMode ? (
                                <div className="flex flex-col gap-1.5 items-center px-0.5 min-w-[70px]">
                                  <div className="flex flex-col items-center w-full">
                                    <span className="text-[8px] text-amber-600 font-bold uppercase select-none">Vol</span>
                                    <input
                                      type="text"
                                      className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-[11px] font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none"
                                      value={vol.volumeNumber}
                                      onChange={(e) => handleUpdateVolume((vol as any).id, { volumeNumber: e.target.value })}
                                    />
                                  </div>
                                  <div className="flex flex-col items-center w-full">
                                    <span className="text-[8px] text-amber-600 font-bold uppercase select-none">Série</span>
                                    <input
                                      type="text"
                                      className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-[10px] font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none"
                                      value={vol.year}
                                      placeholder="8th grade"
                                      title="Escreva como a escola chama a série. Vale para todos os volumes desta série."
                                      onChange={(e) => renomearSerie(vol.year, e.target.value)}
                                    />
                                  </div>
                                  <div className="flex flex-col items-center w-full">
                                    <span className="text-[8px] text-amber-600 font-bold uppercase select-none">Destino</span>
                                    <select
                                      className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-[9px] font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none px-0.5"
                                      value={vol.category || 'Aluno'}
                                      onChange={(e) => handleUpdateVolume((vol as any).id, { category: e.target.value as any })}
                                    >
                                      <option value="Aluno">Aluno</option>
                                      <option value="Professor">Prof</option>
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                String(vol.volumeNumber).split('/')[0]
                              )}
                            </td>
                            <td className="border-y border-black py-0.5 px-1 bg-white" rowSpan={vol.items.length}>
                              {editMode ? (
                                <select
                                  className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none px-1"
                                  value={vol.type}
                                  onChange={(e) => {
                                    const newType = e.target.value;
                                    let dims = vol.dimensions;
                                    if (newType === 'Caixa Coletiva') dims = '52 x 38 x 32 cm';
                                    else if (newType === 'Tubo') dims = '100 x 10 x 10 cm';
                                    else if (newType === 'Espaguete') dims = '145 x 53 x 80 cm';
                                    else if (newType === 'Embalagem') dims = '145 x 53 x 80 cm';
                                    else if (newType === 'Caixa Plástica') dims = '200 x 295 x 420 mm';
                                    handleUpdateVolume((vol as any).id, { type: newType, dimensions: dims });
                                  }}
                                >
                                  <option value="Caixa Coletiva">Coletiva</option>
                                  <option value="Tubo">Tubo</option>
                                  <option value="Espaguete">Tubo (Espaguete)</option>
                                  <option value="Embalagem">Embalagem</option>
                                  <option value="Caixa Plástica">Plástica</option>
                                </select>
                              ) : (
                                caixaName
                              )}
                            </td>
                            <td className="border-y border-black py-0.5 px-1 bg-white" rowSpan={vol.items.length}>
                              {editMode ? (
                                <input
                                  type="text"
                                  className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-[10px] font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none"
                                  value={vol.dimensions}
                                  onChange={(e) => handleUpdateVolume((vol as any).id, { dimensions: e.target.value })}
                                />
                              ) : (
                                dimension
                              )}
                            </td>
                          </>
                        ) : null}
                        <td className="border-y border-black py-0.5 px-2 text-center bg-white">
                          {editMode ? (
                            <div className="flex items-center gap-1 w-full px-1">
                              <span className="font-mono text-[9px] text-amber-600 shrink-0 select-none bg-amber-100 px-1 rounded">{productPrefix}</span>
                              <span className="font-mono text-[9px] text-slate-500 shrink-0 select-none">{vol.year} ·</span>
                              {/*
                                Campo com a lista do catálogo, como o da escola.
                                Mostra só o projeto ("Enigma"); a série fica ao lado,
                                vinda do volume. O nome gravado continua completo,
                                para o documento impresso não mudar de formato.
                              */}
                              <input
                                type="text"
                                list="projetos-do-catalogo"
                                placeholder="Escolha o projeto"
                                className="w-full text-left bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 px-1 outline-none font-sans"
                                value={nomeBaseProjeto(limparNomeProjeto(item.product.name))}
                                onChange={(e) => handleUpdateItem((vol as any).id, item.id, {
                                  product: { ...item.product, name: trocarProjeto(item.product.name, e.target.value) }
                                })}
                              />
                            </div>
                          ) : (
                            `${productPrefix} ${displayName}`
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <select
                              className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none px-1"
                              value={item.destination || 'Aluno'}
                              onChange={(e) => handleUpdateItem((vol as any).id, item.id, { destination: e.target.value as any })}
                            >
                              <option value="Aluno">Aluno</option>
                              <option value="Professor">Professor</option>
                            </select>
                          ) : (
                            item.destination === 'Professor' || vol.category === 'Professor' || (section.title || '').toLowerCase() === 'material do professor' ? 'Professor' : 'Aluno'
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <select
                              className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none px-1"
                              value={item.product.type}
                              onChange={(e) => handleUpdateItem((vol as any).id, item.id, { product: { ...item.product, type: e.target.value as any } })}
                            >
                              <option value="Base">Base</option>
                              <option value="Complementar">Complementar</option>
                            </select>
                          ) : (
                            categoriaDaCaixa(item.product)
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <input
                              type="number"
                              min="1"
                              className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none"
                              value={item.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value, 10) || 1;
                                handleUpdateItem((vol as any).id, item.id, { quantity: q });
                              }}
                            />
                          ) : (
                            (() => {
                              // A escrita da QNT mora em `formatoRomaneio.ts`, uma só:
                              // aqui dizia "pacote com" e a planilha "embalagem com",
                              // o mesmo item com dois nomes em dois papéis.
                              let bSize = item.bundleSize;
                              if (!bSize) {
                                const m = item.product.name.match(/\(?(?:Pacote|Embalagem)\s*(?:c\/|com)?\s*(\d+)\)?/i);
                                if (m) bSize = parseInt(m[1], 10);
                              }
                              return formatarQuantidade(item.quantity, bSize, item.product.packagingType);
                            })()
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <input
                              type="number"
                              step="0.001"
                              className="w-full text-right bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-mono font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none px-1"
                              value={item.totalWeight}
                              onChange={(e) => {
                                const w = parseFloat(e.target.value) || 0;
                                handleUpdateItem((vol as any).id, item.id, { totalWeight: w });
                              }}
                            />
                          ) : (
                            item.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <input
                              type="text"
                              className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none"
                              value={item.product.boxNumber}
                              onChange={(e) => handleUpdateItem((vol as any).id, item.id, { product: { ...item.product, boxNumber: e.target.value } })}
                            />
                          ) : (
                            item.product.boxNumber.startsWith('Embalagem') || item.product.boxNumber.startsWith('Caixa') ? item.product.boxNumber : `Caixa ${item.product.boxNumber}`
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <input
                              type="text"
                              className="w-full text-center bg-amber-50/50 hover:bg-amber-100/60 focus:bg-white text-xs font-bold border border-amber-200/40 focus:border-amber-500 rounded py-0.5 outline-none px-1"
                              value={item.product.ratio}
                              onChange={(e) => handleUpdateItem((vol as any).id, item.id, { product: { ...item.product, ratio: e.target.value } })}
                            />
                          ) : (
                            relacaoText
                          )}
                        </td>
                        <td className="border-y border-black py-0.5 px-1 bg-white">
                          {editMode ? (
                            <div className="flex flex-col gap-1 items-center justify-center py-0.5">
                               {itemIdx === 0 && (
                                 <div className="flex items-center gap-1">
                                   <button
                                     title="Adicionar item ao volume"
                                     onClick={() => handleAddItemToVolume((vol as any).id)}
                                     className="p-1 px-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded text-[9px] font-bold flex items-center gap-0.5 transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
                                   >
                                     <Plus className="w-3 h-3" />
                                     Item
                                   </button>
                                   <button
                                     title="Excluir volume inteiro"
                                     onClick={() => handleDeleteVolume((vol as any).id)}
                                     className="p-1 px-1.5 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded border border-red-200 hover:border-transparent text-[9px] font-bold flex items-center gap-0.5 transition-all shadow-sm cursor-pointer"
                                   >
                                     <X className="w-3 h-3" />
                                     Vol
                                   </button>
                                 </div>
                               )}
                               <button
                                 title="Remover linha"
                                 onClick={() => handleDeleteItem((vol as any).id, item.id)}
                                 className="p-1 text-[9px] font-bold bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white rounded border border-rose-200 hover:border-transparent transition-all shadow-sm flex items-center gap-0.5 cursor-pointer justify-center"
                               >
                                 <X className="w-3 h-3" />
                                 Linha
                               </button>
                            </div>
                          ) : (
                            null
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              ))}
            </table>
          </div>
        ))}

        {/* Signatures Section */}
        <div className="mt-4 px-2 font-medium text-sm space-y-4 text-black">
           <div data-pdf-block="true" className="space-y-2">
             <div className="font-bold text-[#00FF00] text-base">Conferente do Frete:</div>
             <div className="flex gap-2 items-end"><div>Nome:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>RG:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>Empresa:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>Cargo:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="text-center pt-6"><span className="border-t border-black px-12 pt-1 inline-block w-64 mx-auto font-bold text-sm">Assinatura</span></div>
           </div>
           
           <div data-pdf-block="true" className="space-y-2 pt-2">
             <div className="font-bold text-[#00FF00] text-base">Testemunha:</div>
             <div className="font-bold text-black text-sm">Conferente MundoMaker:</div>
             <div className="flex gap-2 items-end"><div>Nome:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>RG:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>Empresa:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="text-center pt-6"><span className="border-t border-black px-12 pt-1 inline-block w-64 mx-auto font-bold text-sm">Assinatura</span></div>
           </div>

           <div data-pdf-block="true" className="space-y-2 pt-2">
             <div className="font-bold text-[#00FF00] text-base">Conferente Escola:</div>
             <div className="flex gap-2 items-end"><div>Nome:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>RG:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>Empresa:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="flex gap-2 items-end"><div>Cargo:</div><div className="flex-1 border-b border-black shrink-0 relative top-1"></div></div>
             <div className="text-center pt-6"><span className="border-t border-black px-12 pt-1 inline-block w-64 mx-auto font-bold text-sm">Assinatura</span></div>
           </div>
        </div>

      </div>
    </div>
  );
}
