import React, { useState, useEffect } from 'react';
import './ExportarDados.css';
import { Download, FileText, Activity, BarChart3, CheckCircle2, Loader2 } from 'lucide-react';

// Componentes da Aplicação
import TabelaDemandas from '../../../components/TabelaDemandas/TabelaDemandas';

// 1. IMPORTAÇÃO DA NOSSA FUNÇÃO CENTRALIZADA DE API
// O apiFetch inclui o token JWT e chaveia a URL entre Localhost e Vercel automaticamente
import { apiFetch } from '../../../services/api';

export default function ExportarDados() {
  // ==========================================
  // ESTADOS DO COMPONENTE
  // ==========================================
  const [dadosTabela, setDadosTabela] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('ps-bs');

  // Configuração das Abas do Relatório
  const abasNav = [
    { id: 'ps-bs', label: 'PS + BS (Solicitações)', icone: <FileText size={16} /> },
    { id: 'evolucao', label: 'Evolução Histórica', icone: <Activity size={16} /> },
    { id: 'volume', label: 'Volume Diário', icone: <BarChart3 size={16} /> },
    { id: 'status', label: 'Status dos BS', icone: <CheckCircle2 size={16} /> },
  ];

  // ==========================================
  // 🔄 CARREGAMENTO DOS DADOS REAIS DA API
  // ==========================================
  useEffect(() => {
    const carregarDadosExportacao = async () => {
      try {
        setCarregando(true);
        
        // Requisição dinâmica centralizada
        const resultado = await apiFetch('/solicitacoes/listar?limit=1000');

        if (resultado.sucesso) {
          const dadosFormatados = resultado.dados.map((item) => ({
            id: `PS:${item.id.replace(/\D/g, '') || item.id}`,
            solicitante: item.solicitante || 'Não informado',
            wbs: item.wbs || '-',
            status: item.status || 'Pendente',
            bs: item.pl || item.bs || '-',
            criacaoBs: item.dataSolicitacao || '-',
            dataEntrega: item.dataEntrega || 'não definido',
            contagem: item.status === 'Concluído' ? 'Entregue' : 'Em andamento',
            contagemStatus: item.status === 'Concluído' ? 'neutro' : 'verde'
          }));

          setDadosTabela(dadosFormatados);
        }
      } catch (error) {
        console.error("Erro ao carregar dados para exportação:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarDadosExportacao();
  }, []);

  // ==========================================
  // 📊 CÁLCULO DINÂMICO DOS KPIS
  // ==========================================
  const totalPs = dadosTabela.length;
  const concluidos = dadosTabela.filter(i => i.status === 'Concluído').length;
  const cancelados = dadosTabela.filter(i => i.status === 'Cancelado' || i.status === 'Recusado').length;
  const emSeparacao = dadosTabela.filter(i => i.status === 'Em Separação').length;

  const kpisDinamicos = [
    { titulo: 'Total de PS', valor: totalPs, estilo: 'padrao' },
    { titulo: 'Concluídos', valor: concluidos, estilo: 'sucesso' },
    { titulo: 'Cancelados', valor: cancelados, estilo: 'alerta' },
    { titulo: 'Em Separação', valor: emSeparacao, estilo: 'info' },
  ];

  // ==========================================
  // 📥 FUNÇÃO DE EXPORTAÇÃO PARA ARQUIVO CSV
  // ==========================================
  const exportarCSV = () => {
    if (dadosTabela.length === 0) {
      alert("Não existem dados disponíveis para exportação.");
      return;
    }

    const cabecalho = "DOCUMENTO_PS;SOLICITANTE;WBS_PROJETO;STATUS;PL_BS_SAIDA;DATA_CRIACAO;DATA_ENTREGA\n";
    const linhas = dadosTabela.map(row => 
      `"${row.id}";"${row.solicitante}";"${row.wbs}";"${row.status}";"${row.bs}";"${row.criacaoBs}";"${row.dataEntrega}"`
    ).join("\n");

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RELATORIO_NEXUSLOG_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="exportar-wrapper">
      
      {/* CABEÇALHO */}
      <header className="exportar-cabecalho">
        <div>
          <h1>Exportar Dados</h1>
          <p>Exporte os dados das solicitações e dos gráficos do Dashboard em formato de planilha</p>
        </div>
        <button className="btn-exportar" onClick={exportarCSV} disabled={carregando || dadosTabela.length === 0}>
          <Download size={18} /> Exportar ({dadosTabela.length}) .CSV
        </button>
      </header>

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="abas-container">
        {abasNav.map((aba) => (
          <button 
            key={aba.id} 
            className={`aba-item ${abaAtiva === aba.id ? 'ativo' : ''}`}
            onClick={() => setAbaAtiva(aba.id)}
          >
            {aba.icone} {aba.label}
          </button>
        ))}
      </div>

      {/* CARDS DE INDICADORES (KPIS) */}
      <div className="kpis-grid">
        {kpisDinamicos.map((kpi, index) => (
          <div key={index} className={`kpi-card ${kpi.estilo}`}>
            <span className="kpi-titulo">{kpi.titulo}</span>
            <span className="kpi-valor">{carregando ? '-' : kpi.valor}</span>
          </div>
        ))}
      </div>

      {/* TABELA DE DEMANDAS */}
      {carregando ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', color: '#94a3b8', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
          <span>A carregar relatórios do servidor...</span>
        </div>
      ) : (
        <TabelaDemandas dados={dadosTabela} />
      )}

    </div>
  );
}