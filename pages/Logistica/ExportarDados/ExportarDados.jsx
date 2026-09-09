// =================================================================
// ARQUIVO: src/pages/Logistica/ExportarDados/ExportarDados.jsx
// DESCRIÇÃO: Página de exportação de dados com indicadores de Target.
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import './ExportarDados.css';
import { 
  Download, FileText, Activity, BarChart3, 
  CheckCircle2, Loader2, TrendingUp, Search
} from 'lucide-react';

import { apiFetch } from '../../../services/api';
import { AuthContext } from '../../../contexts/AuthContext'; // ✨ Importação do Contexto

export default function ExportarDados() {
  // ✨ Puxa a filial selecionada no Header
  const { estoqueAtual } = useContext(AuthContext);

  const [dadosTabela, setDadosTabela] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('ps-pl');

  const [busca, setBusca] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todo Período');
  const [filtroStatus, setFiltroStatus] = useState('Todos os Status');

  const abasNav = [
    { id: 'ps-pl', label: 'PS + PL (Solicitações)', icone: <FileText size={16} /> },
    { id: 'target', label: 'Dentro vs Fora do Target', icone: <TrendingUp size={16} /> },
    { id: 'evolucao', label: 'Evolução Histórica', icone: <Activity size={16} /> },
    { id: 'volume', label: 'Volume Diário', icone: <BarChart3 size={16} /> },
    { id: 'status', label: 'Status dos PL', icone: <CheckCircle2 size={16} /> },
  ];

  const parseDataBackend = (dataStr) => {
    if (!dataStr || dataStr === '-' || dataStr === '—' || dataStr === 'não definido') return null;
    let data = new Date(dataStr);
    if (!isNaN(data.getTime())) return data;
    return null;
  };

  const formatarDataHora = (dataString) => {
    const data = parseDataBackend(dataString);
    if (!data) return 'não definido';
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  // 🔄 CARREGAMENTO DOS DADOS (Agora com Filtro de Filial)
  useEffect(() => {
    const carregarDadosExportacao = async () => {
      try {
        setCarregando(true);
        // ✨ O Relatório passa a respeitar a filial escolhida no cabeçalho
        const filtroFilial = estoqueAtual && estoqueAtual !== 'TODOS' ? `&filial=${estoqueAtual}` : '';
        const resultado = await apiFetch(`/solicitacoes/listar?limit=1000${filtroFilial}`);

        if (resultado.sucesso) {
          const agora = new Date();

          const dadosFormatados = resultado.dados.map((item) => {
            const dataCriacao = parseDataBackend(item.dataCriacaoISO || item.created_at);
            const dataFinalConclusao = parseDataBackend(item.dataFinalizacaoISO || item.updated_at);
            const dataPrazoExpira = parseDataBackend(item.prazoFinalizacao); 
            
            let leadTimeDias = null;
            let dentroTarget = null;
            const targetDias = 3;

            if (item.status === 'Concluído' && dataCriacao && dataFinalConclusao) {
              const diferencaMs = dataFinalConclusao.getTime() - dataCriacao.getTime();
              leadTimeDias = diferencaMs / (1000 * 60 * 60 * 24);
              dentroTarget = leadTimeDias <= targetDias;
            } else if (item.status === 'Em Separação' && dataPrazoExpira) {
              dentroTarget = agora <= dataPrazoExpira;
            }

            const valorTotal = (item.itens || []).reduce((acc, it) => {
              const qtd = Number(it.quantidade_solicitada || 1);
              const val = Number(it.valor_unitario_manual || 0);
              return acc + (qtd * val);
            }, 0);

            let plApresentacao = item.pl || '-';
            let textoFinalizacaoPL = 'não definido';
            let expirado = false;

            if (dataPrazoExpira) {
              textoFinalizacaoPL = formatarDataHora(item.prazoFinalizacao);
              if (agora > dataPrazoExpira && item.status !== 'Concluído') {
                expirado = true;
              }
            } else if (item.status === 'Concluído' && dataFinalConclusao) {
              textoFinalizacaoPL = formatarDataHora(item.dataFinalizacaoISO || item.updated_at);
            }

            return {
              id: item.ps || `PS:${item.id.replace(/\D/g, '') || item.id}`,
              solicitante: item.solicitante || 'Não informado',
              wbs: item.wbs || '-',
              status: item.status || 'Pendente',
              pl: plApresentacao,
              criacaoPsFormatada: formatarDataHora(item.dataCriacaoISO || item.created_at),
              finalizacaoPlFormatada: textoFinalizacaoPL,
              itemExpirado: expirado,
              leadTime: leadTimeDias,
              dentroTarget: dentroTarget,
              itensCount: item.itens ? item.itens.length : 0,
              valorTotal: valorTotal
            };
          });

          setDadosTabela(dadosFormatados);
        }
      } catch (error) {
        console.error("Erro ao carregar dados para exportação:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarDadosExportacao();
  }, [estoqueAtual]); // ✨ Recarrega ao mudar a filial

  const listaFiltrada = dadosTabela.filter((item) => {
    const termo = busca.toLowerCase();
    const batePesquisa = 
      item.id.toLowerCase().includes(termo) ||
      item.solicitante.toLowerCase().includes(termo) ||
      item.wbs.toLowerCase().includes(termo) ||
      item.pl.toLowerCase().includes(termo);

    const bateStatus = filtroStatus === 'Todos os Status' || item.status === filtroStatus;
    return batePesquisa && bateStatus;
  });

  const listaStatusUnicos = ['Todos os Status', ...new Set(dadosTabela.map(i => i.status))];

  const totalPs = listaFiltrada.length;
  const avaliadosTarget = listaFiltrada.filter(i => i.dentroTarget !== null);
  const qtdDentro = avaliadosTarget.filter(i => i.dentroTarget === true).length;
  const qtdFora = avaliadosTarget.filter(i => i.dentroTarget === false).length;
  
  let eficiencia = 0;
  if (avaliadosTarget.length > 0) {
    eficiencia = Math.round((qtdDentro / avaliadosTarget.length) * 100);
  }

  const exportarCSV = () => {
    if (listaFiltrada.length === 0) {
      alert("Não existem dados disponíveis para exportação.");
      return;
    }

    const cabecalho = "PS_ID;SOLICITANTE;WBS;STATUS_PS;PL;CRIACAO_PS;EXPIRACAO_FINALIZACAO_PL;LEAD_TIME_DIAS;TARGET;ITENS;VALOR_TOTAL\n";
    const linhas = listaFiltrada.map(row => {
      const leadTimeExport = row.leadTime !== null ? row.leadTime.toFixed(2) : '';
      const targetExport = row.dentroTarget === true ? 'Dentro' : (row.dentroTarget === false ? 'Fora' : '');
      const valorExport = row.valorTotal > 0 ? row.valorTotal.toFixed(2) : '';
      
      return `"${row.id}";"${row.solicitante}";"${row.wbs}";"${row.status}";"${row.pl}";"${row.criacaoPsFormatada}";"${row.finalizacaoPlFormatada}";"${leadTimeExport}";"${targetExport}";"${row.itensCount}";"${valorExport}"`;
    }).join("\n");

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    // ✨ ATUALIZAÇÃO DO NOME DO FICHEIRO PARA STOCKLOG
    link.setAttribute('download', `RELATORIO_STOCKLOG_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="exportar-wrapper">
      
      <header className="exportar-cabecalho">
        <div>
          <h1>Exportar Dados</h1>
          <p>Exporte os dados das solicitações e dos gráficos do Dashboard</p>
        </div>
        <button className="btn-exportar" onClick={exportarCSV} disabled={carregando || listaFiltrada.length === 0}>
          <Download size={18} /> Exportar ({listaFiltrada.length}) .CSV
        </button>
      </header>

      <div className="abas-container">
        {abasNav.map((aba) => (
          <button key={aba.id} className={`aba-item ${abaAtiva === aba.id ? 'ativo' : ''}`} onClick={() => setAbaAtiva(aba.id)}>
            {aba.icone} {aba.label}
          </button>
        ))}
      </div>

      <div className="kpis-grid-export">
        <div className="kpi-card-export">
          <span className="kpi-titulo-export">Total de PS</span>
          <strong className="kpi-valor-export kpi-preto">{carregando ? '-' : totalPs}</strong>
        </div>
        <div className="kpi-card-export">
          <span className="kpi-titulo-export">Dentro do Target</span>
          <strong className="kpi-valor-export kpi-verde">{carregando ? '-' : qtdDentro}</strong>
          <span className="kpi-subtitulo-verde">{eficiencia}% de eficiência</span>
        </div>
        <div className="kpi-card-export">
          <span className="kpi-titulo-export">Fora do Target</span>
          <strong className="kpi-valor-export kpi-vermelho">{carregando ? '-' : qtdFora}</strong>
        </div>
        <div className="kpi-card-export">
          <span className="kpi-titulo-export">Target Atual</span>
          <strong className="kpi-valor-export kpi-azul">3d</strong>
          <span className="kpi-subtitulo-export">Configurável no Dashboard</span>
        </div>
      </div>

      <div className="tabela-exportar-container">
        <div className="tabela-controles-exportar">
          <div className="controles-dropdowns">
            <select className="select-filtro-exportar" value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
              <option>Todo Período</option>
              <option>Este Mês</option>
              <option>Semana Passada</option>
            </select>
            <select className="select-filtro-exportar" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              {listaStatusUnicos.map((status, idx) => (
                <option key={idx} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="pesquisa-exportar-wrapper">
            <Search className="icone-pesquisa-exportar" size={16} />
            <input type="text" placeholder="Buscar PS, PL, WBS..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        <div className="tabela-info-exportar">
          <span>{listaFiltrada.length} registros</span>
          <span>Target: 3 dia(s) — Lead Time = Criação PS &rarr; Expiração/Finalização PL</span>
        </div>

        {carregando ? (
          <div className="estado-carregando-exportar">
            <Loader2 size={32} className="animate-spin" />
            <span>A carregar relatórios do servidor...</span>
          </div>
        ) : (
          <div className="tabela-scroll-exportar">
            <table className="dados-table-exportar">
              <thead>
                <tr>
                  <th>PS ID</th>
                  <th>SOLICITANTE</th>
                  <th>WBS</th>
                  <th>STATUS PS</th>
                  <th>PL</th>
                  <th>CRIAÇÃO PS</th>
                  <th>FINALIZAÇÃO PL (EXPIRAÇÃO)</th>
                  <th>LEAD TIME</th>
                  <th>TARGET</th>
                  <th style={{ textAlign: 'center' }}>ITENS</th>
                  <th>VALOR TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Nenhum registo encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  listaFiltrada.map((linha, index) => (
                    <tr key={index}>
                      <td className="fonte-negrito">{linha.id}</td>
                      <td>{linha.solicitante}</td>
                      <td><span className="link-azul">{linha.wbs}</span></td>
                      <td><span className="badge-status-simples">{linha.status}</span></td>
                      <td>{linha.pl !== '-' ? <span className="link-azul">{linha.pl}</span> : <span className="texto-cinza">-</span>}</td>
                      <td className="texto-cinza">{linha.criacaoPsFormatada}</td>
                      <td className={linha.finalizacaoPlFormatada === 'não definido' ? 'texto-amarelo' : (linha.itemExpirado ? 'texto-vermelho fonte-negrito' : 'texto-verde')}>{linha.finalizacaoPlFormatada}</td>
                      <td>{linha.leadTime !== null ? <span className="fonte-negrito">{linha.leadTime.toFixed(2)}d</span> : <span className="texto-cinza">—</span>}</td>
                      <td>
                        {linha.dentroTarget === true && <span className="badge-target badge-dentro">Dentro</span>}
                        {linha.dentroTarget === false && <span className="badge-target badge-fora">Fora</span>}
                        {linha.dentroTarget === null && <span className="texto-cinza">—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{linha.itensCount}</td>
                      <td>{linha.valorTotal > 0 ? <span className="fonte-negrito">R$ {linha.valorTotal.toFixed(2)}</span> : <span className="texto-cinza">—</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}