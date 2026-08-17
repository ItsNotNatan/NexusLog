import React from 'react';
import { FileText } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function BotaoGerarPDF({ linha, nomeFilial, showAlert }) {

  const gerarBoletimPDF = (e) => {
    e.stopPropagation(); // Impede que a linha da tabela expanda ao clicar no botão
    showAlert("Gerando PDF...", "Aguarde enquanto o documento de Packing List é processado e transferido.", "info");

    setTimeout(() => {
      // 1. Abre a aba imediatamente para evitar bloqueio de Pop-ups do navegador
      const novaAba = window.open('', '_blank');
      novaAba.document.write(`
        <html>
          <head><title>A gerar Boletim PDF...</title></head>
          <body style="font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f1f5f9; color: #475569; margin: 0;">
            <h2 style="font-weight: 500;">A compilar o boletim PDF. Por favor, aguarde...</h2>
          </body>
        </html>
      `);

      // 2. Prepara os itens da tabela para o HTML
      let itensHtml = '';
      if (linha.itens && linha.itens.length > 0) {
        itensHtml = linha.itens.map((item, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 10px; color: #64748b;">${item.desenho_sap_manual || '-'}</td>
            <td style="padding: 10px; font-weight: 600; color: #1e293b;">${item.part_number_manual || '-'}</td>
            <td style="padding: 10px; color: #334155;">${item.descricao_manual || '-'}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: #2563eb;">${item.quantidade_solicitada} ${item.unidade_medida_manual || 'Un'}</td>
          </tr>
        `).join('');
      } else {
        itensHtml = `<tr><td colSpan="4" style="padding: 20px; text-align: center; color: #94a3b8;">Nenhum item individual especificado na solicitação.</td></tr>`;
      }

      // 3. Monta o elemento HTML invisível em memória
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 40px; font-family: Helvetica, Arial, sans-serif; width: 800px; background-color: white;">
          <!-- HEADER DA EMPRESA -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
              <h1 style="margin: 0; color: #1e293b; font-size: 28px; font-weight: 800;">STOCK<span style="color: #2563eb;">Log</span></h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Boletim de Packing List / Entrada</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #2563eb; font-size: 24px;">${linha.pl}</h2>
              <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;">Identificador Interno (PS): ${linha.prefixo}:${linha.id}</p>
            </div>
          </div>

          <!-- INFORMAÇÕES DA SOLICITAÇÃO -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="width: 48%;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">Solicitante</p>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b; font-weight: 600;">${linha.solicitante}</p>
              
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">WBS / Projeto / Destino</p>
              <p style="margin: 0; font-size: 15px; color: #1e293b;">${linha.wbs}</p>
            </div>
            <div style="width: 48%;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">Filial</p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b;">${nomeFilial}</p>
              
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600;">Data do Registo do Sistema</p>
              <p style="margin: 0; font-size: 15px; color: #1e293b;">${linha.dataSolicitacao}</p>
            </div>
          </div>

          <!-- TABELA DE ITENS -->
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Itens da Solicitação (${linha.tipo})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px 10px; text-align: left; color: #475569; font-weight: 600; text-transform: uppercase;">Desenho SAP</th>
                <th style="padding: 12px 10px; text-align: left; color: #475569; font-weight: 600; text-transform: uppercase;">Part Number</th>
                <th style="padding: 12px 10px; text-align: left; color: #475569; font-weight: 600; text-transform: uppercase;">Descrição</th>
                <th style="padding: 12px 10px; text-align: center; color: #475569; font-weight: 600; text-transform: uppercase;">Qtd</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <!-- OBSERVAÇÕES -->
          ${linha.observacoes ? `
            <div style="margin-bottom: 40px; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #b45309; font-weight: 700; text-transform: uppercase;">Observações / Motivo</p>
              <p style="margin: 0; font-size: 14px; color: #92400e;">${linha.observacoes}</p>
            </div>
          ` : ''}

          <!-- ASSINATURAS -->
          <div style="display: flex; justify-content: space-between; margin-top: 80px; padding-top: 20px;">
            <div style="width: 40%; text-align: center;">
              <div style="border-top: 1px solid #94a3b8; padding-top: 12px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">Solicitante</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${linha.solicitante}</p>
              </div>
            </div>
            <div style="width: 40%; text-align: center;">
              <div style="border-top: 1px solid #94a3b8; padding-top: 12px;">
                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">Responsável Almoxarifado / Logística</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Data e Assinatura</p>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #cbd5e1;">
            Documento gerado automaticamente pelo sistema STOCKLog em ${new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      `;

      // 4. Configura as opções e gera o Blob do PDF
      const opt = {
        margin:       0,
        filename:     `Boletim_${linha.pl || linha.id}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).output('bloburl').then((pdfBlobUrl) => {
        // 5. Substitui o conteúdo da aba "Aguarde..." pelo visualizador PDF nativo
        novaAba.location.replace(pdfBlobUrl);
      }).catch(err => {
        console.error("Erro ao gerar PDF:", err);
        novaAba.close();
        showAlert("Erro", "Houve um problema ao gerar o documento PDF.", "error");
      });
    }, 400); // Dá 400ms para a interface respirar e renderizar o aviso antes de congelar a tela
  };

  return (
    <span 
      className="badge-pl"
      onClick={gerarBoletimPDF}
      style={{ cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none' }}
      title="Clique para abrir o Boletim em PDF numa nova aba"
      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
    >
      <FileText size={14} /> {linha.pl}
    </span>
  );
}