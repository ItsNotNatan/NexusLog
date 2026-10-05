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

      // Tratamento de datas (Data de entrega removida conforme solicitado)
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

      // ✨ GARANTIR EXATAMENTE 20 LINHAS DE ITENS NO TOTAL
      // 1 linha de cabeçalho + 20 linhas de itens = 21 linhas totais
      const totalLinhasDesejadas = 21; 
      while (bodyRows.length < totalLinhasDesejadas) {
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
          // CABEÇALHO COM TÍTULO (Linha única mais compacta)
          {
            table: {
              widths: ['100%'],
              body: [
                [
                  { text: tituloPrincipal, alignment: 'center', bold: true, fontSize: 11, fillColor: '#e2e8f0', margin: [0, 2] }
                ]
              ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 4] 
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
                      { text: 'Formulário\nPASTA DRIVE', fontSize: 7, bold: true, color: '#1d4ed8', alignment: 'center', margin: [0, 1], border: [true, true, true, false] },
                      { 
                        stack: [
                          { text: 'APROVAÇÃO:', fontSize: 6, bold: true, margin: [0, 0, 0, 0] },
                          { text: 'GESTÃO DA SEGURANÇA E PATRIMONIO/LOGÍSTICA E PROJETOS', fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        fillColor: '#f1f5f9', border: [true, true, true, false], margin: [2, 1] 
                      }
                    ],
                    [
                      { 
                        stack: [
                          { text: 'ORIGEM MATERIAL:', fontSize: 6, bold: true, margin: [0, 0, 0, 0] },
                          { text: nomeFilial || 'N/A', fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 1], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        stack: [
                          { text: 'DESTINO MATERIAL:', fontSize: 6, bold: true, margin: [0, 0, 0, 0] },
                          { text: destinoMaterial, fontSize: 6, bold: true, color: '#b91c1c' }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 1], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        stack: [
                          { text: 'PROJETO TAREFA WBS:', fontSize: 6, bold: true, margin: [0, 0, 0, 0] },
                          { text: linha.wbs || 'N/A', fontSize: 6, bold: true }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 1], border: [true, false, true, false] 
                      },
                      {}
                    ],
                    [
                      { 
                        stack: [
                          { text: 'NOME DA WBS:', fontSize: 6, bold: true, margin: [0, 0, 0, 0] },
                          { text: ' ', fontSize: 6 }
                        ], 
                        colSpan: 2, fillColor: '#f1f5f9', margin: [2, 1], border: [true, false, true, true] 
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
                  { text: 'PDF', alignment: 'center', bold: true, fontSize: 20, color: '#dc2626', margin: [0, 15, 0, 0] }
                ]
              },
