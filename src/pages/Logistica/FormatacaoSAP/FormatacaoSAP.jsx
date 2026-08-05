import React, { useState } from 'react';
import { FileSpreadsheet, Download, RefreshCw, CheckCircle, FileText } from 'lucide-react';
import './FormatacaoSAP.css';

export default function FormatacaoSAP() {
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [dadosSAP, setDadosSAP] = useState([]);

  const token = localStorage.getItem('@NexusLog:token') || '';

  const carregarEDatarmatarSAP = async () => {
    try {
      setCarregando(true);
      setSucesso(false);

      const resposta = await fetch('http://localhost:3001/api/solicitacoes/listar?status=Conclu%C3%ADdo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resultado = await resposta.json();

      if (resposta.ok && resultado.sucesso) {
        // Formata os dados no padrao de colunas do SAP usando PL
        const dadosFormatados = resultado.dados.map((sol) => ({
          DOCUMENTO_SAP: sol.id,
          NUMERO_PL: sol.pl || sol.bs || 'N/A',
          CENTRO_EMISSOR: sol.filial || 'BR02',
          WBS_ELEMENTO: sol.wbs || 'MIG-0000',
          SOLICITANTE: sol.solicitante,
          TIPO_MOVIMENTO: sol.tipo === 'Transferencia WBS' ? '311' : '261',
          DATA_DOCUMENTO: sol.dataSolicitacao ? sol.dataSolicitacao.split(' ')[0] : '01/08/2026',
          STATUS_INTEGRACAO: 'PRONTO_SAP'
        }));

        setDadosSAP(dadosFormatados);
        setSucesso(true);
      } else {
        alert('Erro ao carregar dados concluídos para formatação SAP.');
      }
    } catch (error) {
      console.error('Erro na integração SAP:', error);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const exportarCSV = () => {
    if (dadosSAP.length === 0) return;

    const cabecalho = "DOCUMENTO_SAP;NUMERO_PL;CENTRO_EMISSOR;WBS_ELEMENTO;SOLICITANTE;TIPO_MOVIMENTO;DATA_DOCUMENTO;STATUS_INTEGRACAO\n";
    const linhas = dadosSAP.map(row => 
      `${row.DOCUMENTO_SAP};${row.NUMERO_PL};${row.CENTRO_EMISSOR};${row.WBS_ELEMENTO};${row.SOLICITANTE};${row.TIPO_MOVIMENTO};${row.DATA_DOCUMENTO};${row.STATUS_INTEGRACAO}`
    ).join("\n");

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LAYOUT_SAP_PL_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sap-wrapper">
      <header className="sap-cabecalho">
        <div>
          <h1>Formatação & Exportação SAP</h1>
          <p>Gere o layout padronizado de Packing Lists (PL) concluídos para importação no ERP SAP</p>
        </div>
      </header>

      <div className="sap-cartao">
        <div className="sap-acoes-topo">
          <button className="btn-sap-gerar" onClick={carregarEDatarmatarSAP} disabled={carregando}>
            <RefreshCw size={18} className={carregando ? "animate-spin" : ""} />
            {carregando ? "A processar..." : "Gerar Tabela SAP (PLs Concluídas)"}
          </button>

          {dadosSAP.length > 0 && (
            <button className="btn-sap-exportar" onClick={exportarCSV}>
              <Download size={18} />
              Exportar CSV SAP
            </button>
          )}
        </div>

        {sucesso && (
          <div className="alerta-sucesso-sap">
            <CheckCircle size={18} />
            <span>Formatados <strong>{dadosSAP.length}</strong> registos de PL para o layout padrão SAP.</span>
          </div>
        )}

        <div className="tabela-scroll">
          <table className="tabela-sap">
            <thead>
              <tr>
                <th>DOC. SAP (ID)</th>
                <th>Nº DA PL</th>
                <th>CENTRO</th>
                <th>ELEMENTO WBS</th>
                <th>SOLICITANTE</th>
                <th>TIPO MOV.</th>
                <th>DATA DOC.</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {dadosSAP.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Clique no botão acima para carregar e formatar as solicitações de PL.
                  </td>
                </tr>
              ) : (
                dadosSAP.map((item, index) => (
                  <tr key={index}>
                    <td className="fonte-negrito">{item.DOCUMENTO_SAP}</td>
                    <td>
                      <span className="badge-sap-pl">
                        <FileText size={13} /> {item.NUMERO_PL}
                      </span>
                    </td>
                    <td>{item.CENTRO_EMISSOR}</td>
                    <td className="texto-wbs">{item.WBS_ELEMENTO}</td>
                    <td>{item.SOLICITANTE}</td>
                    <td><code>{item.TIPO_MOVIMENTO}</code></td>
                    <td>{item.DATA_DOCUMENTO}</td>
                    <td>
                      <span className="badge-sap-status">{item.STATUS_INTEGRACAO}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}