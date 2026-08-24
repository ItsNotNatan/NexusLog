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

  // Trata a formatação de datas
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

      // Título Principal Baseado no Tipo
      let tituloPrincipal = 'BOLETIM DE SAÍDA - COMUNICAÇÃO INTERNA: SAÍDA DE MATERIAIS DA COMAU';
      if (isReintegracao) tituloPrincipal = 'BOLETIM DE ENTRADA - COMUNICAÇÃO INTERNA: REINTEGRAÇÃO DE MATERIAIS';
      if (isCancelamento) tituloPrincipal = 'BOLETIM DE CANCELAMENTO - COMUNICAÇÃO INTERNA: ESTORNO DE SOLICITAÇÃO';

      // Datas
      const dataSolicitacao = linha.dataSolicitacao ? linha.dataSolicitacao.split(' ')[0] : '';
      const dataEntrega = formatarDataSimples(linha.data_entrega || linha.dataEntrega);

      // ==========================================
      // CONSTRUÇÃO DA TABELA DE ITENS (Igual à imagem)
      // ==========================================
      const colWidths = ['4%', '12%', '14%', '5%', '6%', '23%', '10%', '6%', '7%', '7%', '6%'];
      
      const headerRow = [
        { text: 'ITEM', bold: true, fontSize: 6, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 2] },
        { text: 'DESENHO', bold: true, fontSize: 6, fillColor: '#e2e8f0', margin: [0, 2] },
        { text: 'PART NUMBER', bold: true, fontSize: 6, fillColor: '#e2e8f0', margin: [0, 2] },
        { text: 'QTD', bold: true, fontSize: 6, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 2] },
        { text: 'UNID', bold: true, fontSize: 6, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 2] },
        { text: 'DESCRIÇÃO', bold: true, fontSize: 6, fillColor: '#e2e8f0', margin: [0, 2] },
        { text: 'FORNECEDOR', bold: true, fontSize: 6, fillColor: '#e2e8f0', margin: [0, 2] },
        { text: 'NF ENTRADA', bold: true, fontSize: 6, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 2] },
        { text: 'ALOCAÇÃO', bold: true, fontSize: 6, fillColor: '#e2e8f0', margin: [0, 2] },
        { text: 'VLOR UNIT', bold: true, fontSize: 6, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 2] },
        { text: 'WBS', bold: true, fontSize: 6, fillColor: '#e2e8f0', alignment: 'center', margin: [0, 2] }
      ];

      let bodyRows = [headerRow];
      
      if (linha.itens && linha.itens.length > 0) {
        linha.itens.forEach((it, index) => {
          bodyRows.push([
            { text: (index + 1).toString(), fontSize: 6, alignment: 'center', margin: [0, 3] },
            { text: it.desenho_sap_manual || '-', fontSize: 6, margin: [0, 3] },
            { text: it.part_number_manual || '-', fontSize: 6, bold: true, margin: [0, 3] },
            { text: it.quantidade_solicitada || '-', fontSize: 6, alignment: 'center', margin: [0, 3] },
            { text: it.unidade_medida_manual || 'Un', fontSize: 6, alignment: 'center', margin: [0, 3] },
            { text: it.descricao_manual || '-', fontSize: 6, margin: [0, 3] },
            { text: it.fornecedor || '-', fontSize: 6, margin: [0, 3] },
            { text: it.nf_entrada || linha.nfCrossdocking || '-', fontSize: 6, alignment: 'center', margin: [0, 3] },
            { text: it.alocacao || '-', fontSize: 6, margin: [0, 3] },
            { text: it.valor_unitario_manual ? `R$ ${Number(it.valor_unitario_manual).toFixed(2)}` : '-', fontSize: 6, alignment: 'center', margin: [0, 3] },
            { text: it.wbs_element || '-', fontSize: 6, color: '#2563eb', alignment: 'center', margin: [0, 3], bold: true }
          ]);
        });
      }

      // Preencher linhas vazias para criar a grelha estilo formulário físico
      const minRows = 20;
      for (let i = bodyRows.length; i <= minRows; i++) {
        bodyRows.push([
          { text: '', fontSize: 6, margin: [0, 5] }, { text: '', fontSize: 6 }, { text: '', fontSize: 6 },
          { text: '', fontSize: 6 }, { text: '', fontSize: 6 }, { text: '', fontSize: 6 },
          { text: '', fontSize: 6 }, { text: '', fontSize: 6 }, { text: '', fontSize: 6 },
          { text: '', fontSize: 6 }, { text: '', fontSize: 6 }
        ]);
      }

      // ==========================================
      // DEFINIÇÃO DO PDF
      // ==========================================
      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [15, 15, 15, 15], 
        content: [
          
          // --- BLOCO 1: CABEÇALHO (Grid Igual à Imagem) ---
          {
            table: {
              widths: ['15%', '35%', '15%', '20%', '15%'],
              body: [
                // Linha 1: Título e Caixa Verde
                [
                  { text: 'Formulário       PASTA DRIVE', fontSize: 7, color: '#2563eb', alignment: 'center', decoration: 'underline', margin: [0, 5], fillColor: '#e2e8f0' },
                  { text: tituloPrincipal, colSpan: 3, alignment: 'center', bold: true, fontSize: 11, fillColor: '#e2e8f0', margin: [0, 5] },
                  {}, {},
                  { text: linha.pl ? linha.pl.replace('PL #', '') : 'S/ PL', alignment: 'center', bold: true, fontSize: 18, fillColor: '#00FF00', margin: [0, 2] }
                ],
                // Linha 2
                [
                  { text: 'APROVAÇÃO:', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: 'GESTÃO DA SEGURANÇA E PATRIMONIO / LOGÍSTICA E PROJETOS', colSpan: 2, alignment: 'center', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  {},
                  { text: 'NÚMERO DO BS (SEQUENCIAL):', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: `PS:${linha.ps || linha.id}`, alignment: 'center', bold: true, fontSize: 10, fillColor: '#00FFFF', margin: [0, 2] }
                ],
                // Linha 3
                [
                  { text: 'ORIGEM MATERIAL:', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: nomeFilial || 'N/A', fontSize: 7, color: '#dc2626', bold: true },
                  { text: 'DATA INÍCIO SEPARAÇÃO', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: 'NÚMERO FORMULÁRIO P & S / CROSS DOCKING / LOGISTICA', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: linha.dataSolicitacao || '', alignment: 'center', fontSize: 7, fillColor: '#00FFFF' }
                ],
                // Linha 4
                [
                  { text: 'DESTINO MATERIAL:', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: linha.destino || linha.observacoes || 'N/A', fontSize: 7, color: '#dc2626', bold: true },
                  { text: 'DATA FIM SEPARAÇÃO', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: 'DATA DO SOLICITAÇÃO FORMULÁRIO', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: dataSolicitacao, alignment: 'center', fontSize: 7 }
                ],
                // Linha 5
                [
                  { text: 'PROJETO TAREFA WBS:', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: linha.wbs || 'N/A', fontSize: 7, bold: true },
                  { text: '', fontSize: 7, fillColor: '#e2e8f0' },
                  { text: 'DATA DA ENTREGA', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: dataEntrega, alignment: 'center', fontSize: 7, bold: true, color: '#2563eb' }
                ],
                // Linha 6
                [
                  { text: 'NOME DA WBS:', fontSize: 7, fillColor: '#e2e8f0', bold: true },
                  { text: '', fontSize: 7 },
                  { text: '', fontSize: 7, fillColor: '#e2e8f0' },
                  { text: '', fontSize: 7, fillColor: '#e2e8f0' },
                  { text: '', alignment: 'center', fontSize: 7 }
                ]
              ]
            },
            margin: [0, 0, 0, 5]
          },

          // --- BLOCO 2: APROVAÇÕES ---
          {
            table: {
              widths: ['33.3%', '33.3%', '33.4%'],
              body: [
                [
                  { text: 'Aprovação / Recebimento', colSpan: 3, fontSize: 7, bold: true, fillColor: '#e2e8f0' },
                  {}, {}
                ],
                [
                  {
                    stack: [
                      { text: 'Solicitado por:', fontSize: 7 },
                      { text: linha.solicitante || 'N/A', fontSize: 9, bold: true, alignment: 'center', fillColor: '#FFFF00', margin: [30, 8, 30, 8] },
                      { text: '________________________________', alignment: 'center', fontSize: 7 },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 7 },
                      { text: 'Matrícula:', fontSize: 7, margin: [0, 5, 0, 0] }
                    ],
                    margin: [2, 2, 2, 2]
                  },
                  {
                    stack: [
                      { text: 'Separado e Double Check por:', fontSize: 7 },
                      { text: '\n\n\n' },
                      { text: '________________________________', alignment: 'center', fontSize: 7 },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 7 },
                      { text: 'Matrícula:', fontSize: 7, margin: [0, 5, 0, 0] }
                    ],
                    margin: [2, 2, 2, 2]
                  },
                  {
                    stack: [
                      { text: 'Recebido por:', fontSize: 7 },
                      { text: '\n\n\n' },
                      { text: '________________________________', alignment: 'center', fontSize: 7 },
                      { text: 'Assinatura/carimbo', alignment: 'center', fontSize: 7 },
                      { text: 'Matrícula:', fontSize: 7, margin: [0, 5, 0, 0] }
                    ],
                    margin: [2, 2, 2, 2]
                  }
                ]
              ]
            },
            margin: [0, 0, 0, 5]
          },

          // --- BLOCO 3: TABELA DE ITENS ---
          {
            table: {
              widths: colWidths,
              headerRows: 1,
              body: bodyRows
            }
          }
        ],
        defaultStyle: { 
          font: 'Roboto',
          color: '#1e293b'
        }
      };

      // Abre o PDF numa nova aba
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