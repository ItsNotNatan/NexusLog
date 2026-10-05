import React, { useState } from 'react';
import { FileText } from 'lucide-react';

// Importações do pdfmake
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

try {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} catch (e) {
  console.error("Erro ao carregar fontes do PDF:", e);
}

export default function BotaoGerarPDF({ linha, nomeFilial, showAlert, showLoading, closeAlert }) {
  const [gerando, setGerando] = useState(false);

  if (!linha) return null;

  // Função auxiliar para datas simples
  const formatarDataSimples = (data) => {
    if (!data) return '';
    if (data.includes('/')) return data;
    try {
      return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch {
      return data;
    }
  };

  const handleGerarPdf = async (e) => {
    e.stopPropagation(); 
    setGerando(true);
    
    if (showLoading) {
      showLoading("Gerando Documento...", "A compilar os dados para o PDF. Por favor, aguarde a abertura do separador.");
    }

    try {
      const isReintegracao = linha.tipo === 'Reintegracao' || linha.tipo === 'Reintegração';
      const isCancelamento = linha.tipo === 'Cancelado';

      // Título Principal
      let tituloPrincipal = 'BOLETIM DE SAÍDA - COMUNICAÇÃO INTERNA: SAÍDA DE MATERIAIS DA COMAU';
      if (isReintegracao) tituloPrincipal = 'BOLETIM DE ENTRADA - COMUNICAÇÃO INTERNA: REINTEGRAÇÃO DE MATERIAIS';
      if (isCancelamento) tituloPrincipal = 'BOLETIM DE CANCELAMENTO - COMUNICAÇÃO INTERNA: ESTORNO DE SOLICITAÇÃO';

      // Tratamento de datas (Data de entrega removida)
      const dataSolicitacao = linha.dataSolicitacao || '';

      // Tratamento do Destino (se falhar, usa a observação)
      const destinoMaterial = linha.destino || linha.deParaDestino || linha.observacoes || 'N/A';

      // Tratamento do PL/BS (remover prefixo se existir)
      const bsNumero = linha.pl ? linha.pl.replace(/PL #|BS/g, '').trim() : '';

      // ==========================================
      // DEFINIÇÃO DAS COLUNAS DA TABELA DE ITENS
      // ==========================================
      const colWidths = [
        '3%',  // ITEM
        '10%', // DESENHO
        '15%', // PART NUMBER
        '5%',  // QTD
        '5%',  // UNID
        '15%', // DESCRIÇÃO
        '10%', // FORNECEDOR
        '7%',  // ALOCAÇÃO
        '8%',  // NF ENTRADA
        '7%',  // VALOR UNIT
        '15%'  // WBS
      ];
      
      const headerRow = [
        { text: 'ITEM', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'DESENHO', bold: true, fontSize: 6, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'PART NUMBER', bold: true, fontSize: 6, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'QTD', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'UNID', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'DESCRIÇÃO', bold: true, fontSize: 6, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'FORNECEDOR', bold: true, fontSize: 6, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'ALOCAÇÃO', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'NF ENTRADA', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'VLOR UNIT', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'WBS', bold: true, fontSize: 6, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] }
      ];

      let bodyRows = [headerRow];
      
      if (linha.itens && linha.itens.length > 0) {
        linha.itens.forEach((it, index) => {
          bodyRows.push([
            { text: (index + 1).toString(), fontSize: 6, alignment: 'center', margin: [0, 4] },
            { text: it.desenho_sap_manual || '-', fontSize: 6, margin: [0, 4] },
            { text: it.part_number_manual || '-', fontSize: 6, bold: true, margin: [0, 4] },
            { text: it.quantidade_solicitada || '-', fontSize: 6, alignment: 'center', margin: [0, 4] },
            { text: it.unidade_medida_manual || 'Un', fontSize: 6, alignment: 'center', margin: [0, 4] },
            { text: it.descricao_manual || '-', fontSize: 6, margin: [0, 4] },
            { text: it.fornecedor || '-', fontSize: 6, margin: [0, 4] },
            { text: it.alocacao || '-', fontSize: 6, alignment: 'center', margin: [0, 4] },
            { text: it.nf_entrada || linha.nfCrossdocking || '-', fontSize: 6, alignment: 'center', margin: [0, 4] },
            { text: it.valor_unitario_manual ? `R$ ${Number(it.valor_unitario_manual).toFixed(2)}` : '-', fontSize: 6, alignment: 'center', margin: [0, 4] },
            { text: it.wbs_element || '-', fontSize: 6, alignment: 'center', margin: [0, 4] }
          ]);
        });
      }

      // ✨ PREENCHER LINHAS VAZIAS PARA GARANTIR 20 LINHAS NO TOTAL
      const minRows = 20;
      for (let i = bodyRows.length; i <= minRows; i++) {
        bodyRows.push([
          { text: '', fontSize: 6, margin: [0, 4] }, { text: '', fontSize: 6 }, { text: '', fontSize: 6 },
          { text: '', fontSize: 6 }, { text: '', fontSize: 6 }, { text: '', fontSize: 6 },
          { text: '', fontSize: 6 }, { text: '', fontSize: 6 }, { text: '', fontSize: 6 },
          { text: '', fontSize: 6 }, { text: '', fontSize: 6 }
        ]);
      }

      // ==========================================
      // DEFINIÇÃO GERAL DO PDF
      // ==========================================
      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [20, 15, 20, 15], // Margens de topo e fundo mais pequenas
        content: [
          // CABEÇALHO COM TÍTULO (Linha única)
          {
            table: {
              widths: ['100%'],
              body: [
                [
                  { text: tituloPrincipal, alignment: 'center', bold: true, fontSize: 11, fillColor: '#e2e8f0', margin: [0, 4] }
                ]
              ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 5] // Reduzimos o espaço abaixo do título
          },

          // ÁREA DE INFORMAÇÕES SUPERIORES (3 COLUNAS)
          {
            columns: [
              // Coluna Esquerda: Bloco Cinza (Aprovação, Origem, Destino, etc)
              {
                width: '45%',
                table: {
                  widths: ['35%', '65%'],
                  body: [
                    [
                      { text: 'Formulário\nPASTA DRIVE', fontSize: 7, bold: true, color: '#1d4ed8', alignment: 'center', margin: [0, 2], border: [true, true, true, false] },
                      { 
                        stack: [
                          { text: 'APROVAÇÃO:', fontSize: 6, bold: true, margin: [0, 0, 0, 1] },
                          { text: 'GESTÃO DA SEGURANÇA E PATRIMONIO/LOGÍSTICA E PROJETOS', fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        fillColor: '#f1f5f9', border: [true, true, true, false], margin: [2, 2] 
                      }
                    ],
                    [
                      { 
                        stack: [
                          { text: 'ORIGEM MATERIAL:', fontSize: 6, bold: true, margin: [0, 0, 0, 1] },
                          { text: nomeFilial || 'N/A', fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 2], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        stack: [
                          { text: 'DESTINO MATERIAL:', fontSize: 6, bold: true, margin: [0, 0, 0, 1] },
                          { text: destinoMaterial, fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 2], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        stack: [
                          { text: 'PROJETO TAREFA WBS:', fontSize: 6, bold: true, margin: [0, 0, 0, 1] },
                          { text: linha.wbs || 'N/A', fontSize: 6, bold: true }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 2], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        stack: [
                          { text: 'NOME DA WBS:', fontSize: 6, bold: true, margin: [0, 0, 0, 1] },
                          { text: ' ', fontSize: 6 }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 2], border: [true, false, true, true] 
                      },
                      {}
                    ]
                  ]
                }
              },
              
              // Coluna Centro: Ícone PDF
              {
                width: '10%',
                stack: [
                  { text: 'PDF', alignment: 'center', bold: true, fontSize: 20, color: '#dc2626', margin: [0, 20, 0, 0] }
                ]
              },

              // Coluna Direita: Bloco de Datas e Números
              {
                width: '45%',
                table: {
                  widths: ['50%', '50%'],
                  body: [
                    [
                      { text: 'NÚMERO DO BS (SEQUENCIAL):', fontSize: 7, bold: true, alignment: 'right', margin: [0, 2, 4, 0], border: [false, false, false, false] },
                      { 
                        stack: [
                          { text: '-= BS =-', alignment: 'center', fontSize: 7, bold: true, margin: [0, 1, 0, 1] },
                          { text: bsNumero, alignment: 'center', fontSize: 16, bold: true, fillColor: '#86efac', margin: [0, 2] }
                        ],
                        border: [true, true, true, true]
                      }
                    ],
                    [
                      { text: 'NÚMERO FORMULÁRIO:\nP&S/CROSS DOCKING/LOGISTICA', fontSize: 6, bold: true, alignment: 'right', margin: [0, 2, 4, 0], border: [false, false, false, false] },
                      { text: `PS: ${linha.ps || linha.id}`, alignment: 'center', fontSize: 9, bold: true, fillColor: '#a5f3fc', margin: [0, 2], border: [true, true, true, true] }
                    ],
                    // ✨ DATA DE ENTREGA REMOVIDA DAQUI
                    [
                      { text: 'DATA DO SOLICITAÇÃO FORMULÁRIO:', fontSize: 6, bold: true, alignment: 'right', margin: [0, 2, 4, 0], border: [false, false, false, false] },
                      { text: dataSolicitacao, alignment: 'center', fontSize: 7, margin: [0, 2], border: [true, true, true, true] }
                    ]
                  ]
                },
                layout: 'noBorders' 
              }
            ],
            columnGap: 10,
            margin: [0, 0, 0, 5] // Reduzimos o espaço abaixo do bloco de info
          },

          // ÁREA DE ASSINATURAS E APROVAÇÕES
          {
            table: {
              widths: ['33.3%', '33.3%', '33.4%'],
              body: [
                [
                  { text: 'Aprovação / Recebimento', colSpan: 3, fontSize: 7, bold: true, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 1] },
                  {}, {}
                ],
                [
                  {
                    stack: [
                      { text: 'Solicitado por:', fontSize: 6, bold: true },
                      { text: linha.solicitante || 'N/A', fontSize: 7, bold: true, alignment: 'center', fillColor: '#fef08a', margin: [10, 2, 10, 2] },
                      { text: '________________________________', alignment: 'center', fontSize: 6, margin: [0, 10, 0, 0] },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 6 },
                      { text: 'Matrícula:', fontSize: 6, margin: [0, 2, 0, 0] }
                    ],
                    margin: [2, 2, 2, 2]
                  },
                  {
                    stack: [
                      { text: 'Separado e Double Check por:', fontSize: 6, bold: true },
                      { text: ' ', fontSize: 7, margin: [0, 2, 0, 2] }, 
                      { text: '________________________________', alignment: 'center', fontSize: 6, margin: [0, 10, 0, 0] },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 6 },
                      { text: 'Matrícula:', fontSize: 6, margin: [0, 2, 0, 0] }
                    ],
                    margin: [2, 2, 2, 2]
                  },
                  {
                    stack: [
                      { text: 'Recebido por:', fontSize: 6, bold: true },
                      { text: ' ', fontSize: 7, margin: [0, 2, 0, 2] }, 
                      { text: '________________________________', alignment: 'center', fontSize: 6, margin: [0, 10, 0, 0] },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 6 },
                      { text: 'Matrícula:', fontSize: 6, margin: [0, 2, 0, 0] }
                    ],
                    margin: [2, 2, 2, 2]
                  }
                ]
              ]
            },
            margin: [0, 0, 0, 8] // Reduzimos o espaço abaixo das assinaturas
          },

          // TABELA PRINCIPAL DE ITENS
          {
            table: {
              widths: colWidths,
              headerRows: 1,
              body: bodyRows
            },
            layout: {
              hLineWidth: function (i, node) { return 1; },
              vLineWidth: function (i, node) { return 1; },
              hLineColor: function (i, node) { return '#cbd5e1'; },
              vLineColor: function (i, node) { return '#cbd5e1'; },
            }
          }
        ],
        defaultStyle: { 
          font: 'Roboto',
          color: '#0f172a'
        }
      };

      pdfMake.createPdf(docDefinition).open();

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      if (showAlert) showAlert("Erro", "Ocorreu um problema ao compilar os dados para o PDF.", "error");
    } finally {
      setGerando(false);
      if (closeAlert) closeAlert();
    }
  };

  return (
    <span 
      className="badge-pl"
      onClick={handleGerarPdf}
      style={{ 
        cursor: gerando ? 'not-allowed' : 'pointer', 
        transition: 'all 0.2s', 
        userSelect: 'none',
        opacity: gerando ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
      title="Clique para abrir o Boletim Detalhado em PDF numa nova aba"
      onMouseOver={(e) => { 
        if(!gerando) {
          e.currentTarget.style.backgroundColor = '#dbeafe'; 
          e.currentTarget.style.borderColor = '#93c5fd'; 
        }
      }}
      onMouseOut={(e) => { 
        if(!gerando) {
          e.currentTarget.style.backgroundColor = '#eff6ff'; 
          e.currentTarget.style.borderColor = '#bfdbfe'; 
        }
      }}
    >
      <FileText size={14} /> 
      {gerando ? 'A Gerar...' : (linha.pl && linha.pl !== '-' && linha.pl !== '—' ? linha.pl : 'Gerar PDF')}
    </span>
  );
}
