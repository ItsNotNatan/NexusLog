// =================================================================
// ARQUIVO: src/components/BotaoGerarPDF/BotaoGerarPDF.jsx
// =================================================================
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

  const formatarDataSimples = (data) => {
    if (!data) return '';
    if (data.includes('/')) return data; 
    try {
      return new Date(data).toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
      }).replace(',', ' às');
    } catch {
      return data;
    }
  };

  const formatarMoedaPdf = (valor) => {
    if (valor === undefined || valor === null || valor === '-' || String(valor).trim() === 'NaN' || String(valor).trim() === '') return '-';
    if (typeof valor === 'string' && valor.includes('R$')) return valor;
    
    const numero = parseFloat(String(valor).replace(',', '.'));
    if (!isNaN(numero)) return `R$ ${numero.toFixed(2).replace('.', ',')}`;
    
    return String(valor);
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

      const dataSolicitacao = formatarDataSimples(linha.dataCriacaoISO || linha.created_at || linha.dataSolicitacao);

      let destinoMaterial = linha.destino || linha.deParaDestino || 'N/A';
      if (destinoMaterial === 'Não informado' || destinoMaterial.trim() === '') {
        destinoMaterial = 'N/A';
      }

      let observacoesTexto = linha.observacoes || 'N/A';
      if (observacoesTexto.trim() === '') {
        observacoesTexto = 'N/A';
      }

      const bsNumero = linha.pl ? linha.pl.replace(/PL #|BS/g, '').trim() : '';

      const colWidths = [
        '3%',  // ITEM
        '10%', // DESENHO
        '15%', // REFERÊNCIA
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
        { text: 'ITEM', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'DESENHO', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'REFERÊNCIA', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'QTD', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'UNID', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'DESCRIÇÃO', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'FORNECEDOR', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', margin: [0, 4] },
        { text: 'ALOCAÇÃO', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'NF ENTRADA', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'VLOR UNIT', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] },
        { text: 'WBS', bold: true, fontSize: 7.5, fillColor: '#bfdbfe', alignment: 'center', margin: [0, 4] }
      ];

      let bodyRows = [headerRow];
      
      if (linha.itens && linha.itens.length > 0) {
        linha.itens.forEach((it, index) => {
          // ✨ EXTRAÇÃO INTELIGENTE DA NF: Procura no item e, se não encontrar, procura na linha geral da solicitação
          const notaFiscalFinal = it.nf_entrada || it.nfEntrada || it.nf || linha.nfCrossdocking || linha.nf_entrada || '-';

          bodyRows.push([
            { text: (index + 1).toString(), fontSize: 7, alignment: 'center', margin: [0, 3] },
            { text: it.desenho_sap_manual || it.desenho_sap || '-', fontSize: 7, margin: [0, 3] },
            { text: it.referencia || '-', fontSize: 7, bold: true, margin: [0, 3] },
            { text: it.quantidade_solicitada || it.qtd || '-', fontSize: 7, alignment: 'center', margin: [0, 3] },
            { text: it.unidade_medida_manual || it.unidade_medida || 'Un', fontSize: 7, alignment: 'center', margin: [0, 3] },
            { text: it.descricao_manual || it.descricao || '-', fontSize: 7, margin: [0, 3] },
            { text: it.fornecedor || '-', fontSize: 7, margin: [0, 3] },
            { text: (it.alocacao || '').startsWith('CROSSDOCKING') ? 'CROSSDOCKING' : (it.alocacao || '-'), fontSize: 7, alignment: 'center', margin: [0, 3] },
            // Inserção da Nota Fiscal com fallback garantido
            { text: notaFiscalFinal, fontSize: 7, alignment: 'center', margin: [0, 3] },
            { text: formatarMoedaPdf(it.valor_unitario_enriquecido ?? it.valor_unitario_manual ?? it.valor_unitario ?? it.poNetPrice), fontSize: 7, alignment: 'center', margin: [0, 3] },
            { text: it.wbs_element || it.wbs || '-', fontSize: 7, alignment: 'center', margin: [0, 3] }
          ]);
        });
      }

      while (bodyRows.length <= 20) {
        bodyRows.push([
          { text: '', fontSize: 7, margin: [0, 3] }, { text: '', fontSize: 7 }, { text: '', fontSize: 7 },
          { text: '', fontSize: 7 }, { text: '', fontSize: 7 }, { text: '', fontSize: 7 },
          { text: '', fontSize: 7 }, { text: '', fontSize: 7 }, { text: '', fontSize: 7 },
          { text: '', fontSize: 7 }, { text: '', fontSize: 7 }
        ]);
      }

      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [15, 15, 15, 15], 
        content: [
          {
            table: {
              widths: ['100%'],
              body: [
                [
                  { text: tituloPrincipal, alignment: 'center', bold: true, fontSize: 11, fillColor: '#e2e8f0', margin: [0, 3] }
                ]
              ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 4] 
          },

          {
            columns: [
              {
                width: '42%',
                table: {
                  widths: ['35%', '65%'],
                  body: [
                    [
                      { 
                        text: [
                          { text: 'DESTINO MATERIAL: ', fontSize: 6, bold: true },
                          { text: destinoMaterial, fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [4, 2], border: [true, true, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        text: [
                          { text: 'PROJETO TAREFA WBS: ', fontSize: 6, bold: true },
                          { text: linha.wbs || 'N/A', fontSize: 6, bold: true }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [4, 2], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        text: [
                          { text: 'OBSERVAÇÕES: ', fontSize: 6, bold: true },
                          { text: observacoesTexto, fontSize: 6 }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [4, 2], border: [true, false, true, true] 
                      },
                      {}
                    ]
                  ]
                }
              },
              
              {
                width: '16%', 
                stack: [
                  { 
                    text: nomeFilial ? nomeFilial.toUpperCase() : 'FILIAL', 
                    alignment: 'center', 
                    bold: true, 
                    fontSize: 10, 
                    color: '#1e293b', 
                    margin: [0, 10, 0, 0] 
                  }
                ]
              },

              {
                width: '42%',
                table: {
                  widths: ['50%', '50%'],
                  body: [
                    [
                      { text: 'NÚMERO DO BS (SEQUENCIAL):', fontSize: 7, bold: true, alignment: 'right', margin: [0, 1, 4, 0], border: [false, false, false, false] },
                      { 
                        stack: [
                          { text: '-= BS =-', alignment: 'center', fontSize: 7, bold: true },
                          { text: bsNumero, alignment: 'center', fontSize: 15, bold: true, fillColor: '#86efac' }
                        ],
                        border: [true, true, true, true]
                      }
                    ],
                    [
                      { text: 'NÚMERO FORMULÁRIO:\nP&S/CROSS DOCKING/LOGISTICA', fontSize: 6, bold: true, alignment: 'right', margin: [0, 1, 4, 0], border: [false, false, false, false] },
                      { text: `${linha.ps || linha.id}`, alignment: 'center', fontSize: 9, bold: true, fillColor: '#a5f3fc', margin: [0, 1], border: [true, true, true, true] }
                    ],
                    [
                      { text: 'DATA DO SOLICITAÇÃO FORMULÁRIO:', fontSize: 6, bold: true, alignment: 'right', margin: [0, 1, 4, 0], border: [false, false, false, false] },
                      { text: dataSolicitacao, alignment: 'center', fontSize: 7, margin: [0, 1], border: [true, true, true, true] }
                    ]
                  ]
                },
                layout: 'noBorders' 
              }
            ],
            columnGap: 10,
            margin: [0, 0, 0, 4] 
          },

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
                      { text: linha.solicitante || 'N/A', fontSize: 7, bold: true, alignment: 'center', fillColor: '#fef08a', margin: [10, 1, 10, 1] },
                      { text: '________________________________', alignment: 'center', fontSize: 6, margin: [0, 8, 0, 0] },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 6 },
                      { text: 'Matrícula:', fontSize: 6, margin: [0, 1, 0, 0] }
                    ],
                    margin: [2, 1, 2, 1]
                  },
                  {
                    stack: [
                      { text: 'Separado e Double Check por:', fontSize: 6, bold: true },
                      { text: ' ', fontSize: 7, margin: [0, 1, 0, 1] }, 
                      { text: '________________________________', alignment: 'center', fontSize: 6, margin: [0, 8, 0, 0] },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 6 },
                      { text: 'Matrícula:', fontSize: 6, margin: [0, 1, 0, 0] }
                    ],
                    margin: [2, 1, 2, 1]
                  },
                  {
                    stack: [
                      { text: 'Recebido por:', fontSize: 6, bold: true },
                      { text: ' ', fontSize: 7, margin: [0, 1, 0, 1] }, 
                      { text: '________________________________', alignment: 'center', fontSize: 6, margin: [0, 8, 0, 0] },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 6 },
                      { text: 'Matrícula:', fontSize: 6, margin: [0, 1, 0, 0] }
                    ],
                    margin: [2, 1, 2, 1]
                  }
                ]
              ]
            },
            margin: [0, 0, 0, 4] 
          },

          {
            table: {
              widths: colWidths,
              headerRows: 1,
              body: bodyRows
            },
            layout: {
              hLineWidth: function () { return 0.5; },
              vLineWidth: function () { return 0.5; },
              hLineColor: function () { return '#94a3b8'; },
              vLineColor: function () { return '#94a3b8'; },
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
