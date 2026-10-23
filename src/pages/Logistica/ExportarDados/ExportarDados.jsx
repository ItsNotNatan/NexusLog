// =================================================================
// ARQUIVO: src/pages/Logistica/ExportarDados/ExportarDados.jsx
// DESCRIÇÃO: Página de exportação de dados com indicadores de Target e Paginação.
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import './ExportarDados.css';
import { 
  Download, FileText, Activity, BarChart3, 
  CheckCircle2, Loader2, TrendingUp, Search, Filter
} from 'lucide-react';

import { apiFetch } from '../../../services/api';
import { AuthContext } from '../../../contexts/AuthContext'; 

import FiltroExportacaoModal from '../../../components/FiltroExportacaoModal/FiltroExportacaoModal';
import PaginacaoTabela from '../../../components/PaginacaoTabela/PaginacaoTabela';
import ScrollDuplo from '../../../components/ScrollDuplo/ScrollDuplo';

export default function ExportarDados() {
  const { estoqueAtual } = useContext(AuthContext);

  const [dadosTabela, setDadosTabela] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('ps-pl');

  const [busca, setBusca] = useState('');
  
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    periodo: 'Todo Período',
    status: 'Todos os Status',
    tipo: 'Todos',
    target: 'Todos',
    solicitante: '',
    wbs: '',
    pl: ''
  });

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtrosAvancados]);

  const abasNav = [
    { id: 'ps-pl', label: 'PS + PL (Solicitações)', icone: <FileText size={16} /> },
    { id: 'target', label: 'Dentro vs Fora do Target', icone: <TrendingUp size={16} /> },
    { id: 'evolucao', label: 'Evolução Histórica', icone: <Activity size={16} /> },
    { id: 'volume', label: 'Volume Diário', icone: <BarChart3 size={16} /> },
    { id: 'status', label: 'Status dos PL', icone: <CheckCircle2 size={16} /> },
  ];

  const parseDataBackend = (dataStr) => {
    if (!dataStr) return null;
    if (dataStr instanceof Date) return dataStr;
    if (typeof dataStr !== 'string') return null;
    
    const strLimpa = dataStr.replace(/às/gi, '').replace(/as/gi, '').replace(/\s+/g, ' ').trim();
    if (!strLimpa || strLimpa === '-' || strLimpa === '—' || strLimpa === 'não definido') return null;

    const brRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/;
    const matchBr = strLimpa.match(brRegex);
    if (matchBr) {
       const dia = parseInt(matchBr[1], 10);
       const mes = parseInt(matchBr[2], 10) - 1;
       const ano = parseInt(matchBr[3], 10);
       const hora = matchBr[4] ? parseInt(matchBr[4], 10) : 0;
       const min = matchBr[5] ? parseInt(matchBr[5], 10) : 0;
       const sec = matchBr[6] ? parseInt(matchBr[6], 10) : 0;
       const dataBr = new Date(ano, mes, dia, hora, min, sec);
       if (!isNaN(dataBr.getTime())) return dataBr;
    }

    const dataIso = new Date(strLimpa);
    if (!isNaN(dataIso.getTime())) return dataIso;
    
    return null;
  };

  const formatarDataHora = (dataInput) => {
    const data = parseDataBackend(dataInput);
    if (!data) return 'não definido';
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  };

  useEffect(() => {
    const carregarDadosExportacao = async () => {
      try {
        setCarregando(true);
        const filtroFilial = estoqueAtual && estoqueAtual !== 'TODOS' ? `&filial=${estoqueAtual}` : '';
        const resultado = await apiFetch(`/solicitacoes/listar?limit=1000${filtroFilial}`);

        if (resultado.sucesso) {
          const agora = new Date();

          const dadosFormatados = resultado.dados.map((item) => {
            const dataCriacao = parseDataBackend(item.dataCriacaoISO || item.created_at || item.dataSolicitacao);
            const dataEntregaFisica = parseDataBackend(item.dataEntrega || item.data_entrega);
            const dataPrazoExpira = parseDataBackend(item.prazoFinalizacao); 
            
            let leadTimeDias = null;
            let dentroTarget = null;
            const targetDias = 3;

            const tiposIgnoradosSLA = ['Crossdocking', 'Nota Fiscal', 'Reintegracao', 'Reintegração', 'Cancelado'];
            const tipoLimpo = item.tipo || '';
            const statusLimpo = item.status || '';
            const deveComputarSLA = !tiposIgnoradosSLA.includes(tipoLimpo) && statusLimpo !== 'Cancelado';

            if (deveComputarSLA) {
              if (item.status === 'Concluído') {
                if (dataCriacao && dataEntregaFisica) {
                  const diferencaMs = dataEntregaFisica.getTime() - dataCriacao.getTime();
                  leadTimeDias = diferencaMs / (1000 * 60 * 60 * 24);
                  
                  if (leadTimeDias < 0 && leadTimeDias > -0.005) {
                    leadTimeDias = 0;
                  }
                  
                  dentroTarget = leadTimeDias <= targetDias;
                }
              } else if (item.status === 'Em Separação' && dataPrazoExpira) {
                dentroTarget = agora <= dataPrazoExpira;
              }
            }

            const valorTotal = (item.itens || []).reduce((acc, it) => {
              const qtd = Number(it.quantidade_solicitada || 1);
              const val = Number(it.valor_unitario_manual || 0);
              return acc + (qtd * val);
            }, 0);

            let plApresentacao = item.pl || '-';

            return {
              id: item.ps || `PS:${item.id.replace(/\D/g, '') || item.id}`,
              solicitante: item.solicitante || 'Não informado',
              wbs: item.wbs || '-',
              tipo: item.tipo || '-', 
              status: item.status || 'Pendente',
              pl: plApresentacao,
              criacaoPsRaw: dataCriacao,
              criacaoPsFormatada: formatarDataHora(dataCriacao),
              dataEntregaFormatada: dataEntregaFisica ? formatarDataHora(dataEntregaFisica) : '-',
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
  }, [estoqueAtual]); 

  const listaFiltrada = dadosTabela.filter((item) => {
    const termo = busca.toLowerCase();
    const batePesquisa = 
      item.id.toLowerCase().includes(termo) ||
      item.solicitante.toLowerCase().includes(termo) ||
      item.wbs.toLowerCase().includes(termo) ||
      item.pl.toLowerCase().includes(termo) ||
      item.tipo.toLowerCase().includes(termo);

    const bateStatus = filtrosAvancados.status === 'Todos os Status' || item.status === filtrosAvancados.status;
    const bateTipo = filtrosAvancados.tipo === 'Todos' || item.tipo === filtrosAvancados.tipo;
    
    let bateTarget = true;
    if (filtrosAvancados.target === 'Dentro') bateTarget = item.dentroTarget === true;
    if (filtrosAvancados.target === 'Fora') bateTarget = item.dentroTarget === false;

    let bateSolicitante = true;
    if (filtrosAvancados.solicitante) bateSolicitante = item.solicitante.toLowerCase().includes(filtrosAvancados.solicitante.toLowerCase());

    let bateWbs = true;
    if (filtrosAvancados.wbs) bateWbs = item.wbs.toLowerCase().includes(filtrosAvancados.wbs.toLowerCase());

    let batePl = true;
    if (filtrosAvancados.pl) batePl = item.pl.toLowerCase().includes(filtrosAvancados.pl.toLowerCase());

    let bateData = true;
    if (filtrosAvancados.periodo !== 'Todo Período' && item.criacaoPsRaw) {
      const hoje = new Date();
      const dataItem = new Date(item.criacaoPsRaw);
      
      if (filtrosAvancados.periodo === 'Hoje') {
        bateData = dataItem.toDateString() === hoje.toDateString();
      } else if (filtrosAvancados.periodo === 'Este Mês') {
        bateData = dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
      } else if (filtrosAvancados.periodo === 'Semana Passada') {
        const semanaPassada = new Date();
        semanaPassada.setDate(hoje.getDate() - 7);
        bateData = dataItem >= semanaPassada;
      }
    }

    return batePesquisa && bateStatus && bateTipo && bateTarget && bateData && bateSolicitante && bateWbs && batePl;
  });

  const totalRegistrosFiltrados = listaFiltrada.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistrosFiltrados / itensPorPagina));
  const indexPrimeiroItem = (paginaAtual - 1) * itensPorPagina;
  const indexUltimoItem = paginaAtual * itensPorPagina;
  const dadosPaginados = listaFiltrada.slice(indexPrimeiroItem, indexUltimoItem);

  const listaStatusUnicos = ['Todos os Status', ...new Set(dadosTabela.map(i => i.status))];

  const avaliadosTarget = listaFiltrada.filter(i => i.dentroTarget !== null);
  const qtdDentro = avaliadosTarget.filter(i => i.dentroTarget === true).length;
  const qtdFora = avaliadosTarget.filter(i => i.dentroTarget === false).length;
  
  let eficiencia = 0;
  if (avaliadosTarget.length > 0) {
    eficiencia = Math.round((qtdDentro / avaliadosTarget.length) * 100);
  }

  const handleLimparFiltros = () => {
    setFiltrosAvancados({
      periodo: 'Todo Período',
      status: 'Todos os Status',
      tipo: 'Todos',
      target: 'Todos',
      solicitante: '',
      wbs: '',
      pl: ''
    });
    setBusca('');
  };

  const temFiltroAtivo = filtrosAvancados.periodo !== 'Todo Período' || 
                         filtrosAvancados.status !== 'Todos os Status' || 
                         filtrosAvancados.tipo !== 'Todos' || 
                         filtrosAvancados.target !== 'Todos' ||
                         filtrosAvancados.solicitante !== '' ||
                         filtrosAvancados.wbs !== '' ||
                         filtrosAvancados.pl !== '';

  const exportarCSV = () => {
    if (listaFiltrada.length === 0) {
      alert("Não existem dados disponíveis para exportação.");
      return;
    }

    const cabecalho = "PS_ID;SOLICITANTE;WBS;TIPO;STATUS_PS;PL;CRIACAO_PS;DATA_ENTREGA;LEAD_TIME_DIAS;TARGET;ITENS;VALOR_TOTAL\n";
    const linhas = listaFiltrada.map(row => {
      const leadTimeExport = row.leadTime !== null ? row.leadTime.toFixed(2) : '';
      const targetExport = row.dentroTarget === true ? 'Dentro' : (row.dentroTarget === false ? 'Fora' : '');
      const valorExport = row.valorTotal > 0 ? row.valorTotal.toFixed(2) : '';
      
      return `"${row.id}";"${row.solicitante}";"${row.wbs}";"${row.tipo}";"${row.status}";"${row.pl}";"${row.criacaoPsFormatada}";"${row.dataEntregaFormatada}";"${leadTimeExport}";"${targetExport}";"${row.itensCount}";"${valorExport}"`;
    }).join("\n");

    const blob = new Blob(['\ufeff' + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
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
          <strong className="kpi-valor-export kpi-preto">{carregando ? '-' : totalRegistrosFiltrados}</strong>
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
        <div className="tabela-controles-exportar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div className="pesquisa-exportar-wrapper" style={{ flex: 1, maxWidth: '400px' }}>
            <Search className="icone-pesquisa-exportar" size={16} />
            <input type="text" placeholder="Buscar PS, PL, WBS, Tipo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          <button 
            onClick={() => setModalFiltroAberto(true)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer', height: '40px' }}
          >
            <Filter size={18} color="#475569" />
            Filtros Avançados
            {temFiltroAtivo && <span style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>}
          </button>
        </div>

        <div className="tabela-info-exportar">
          <span>{totalRegistrosFiltrados} registros no total</span>
          <span>Target: 3 dia(s) — Lead Time = Criação PS &rarr; Data de Entrega</span>
        </div>

        {carregando ? (
          <div className="estado-carregando-exportar">
            <Loader2 size={32} className="animate-spin" />
            <span>A carregar relatórios do servidor...</span>
          </div>
        ) : (
          <>
            <div className="tabela-scroll-exportar">
              <ScrollDuplo larguraConteudo="1400px">
                <table className="dados-table-exportar" style={{ width: '100%', minWidth: '1400px' }}>
                  <thead>
                    <tr>
                      <th>PS ID</th>
                      <th>SOLICITANTE</th>
                      <th>WBS</th>
                      <th>TIPO</th>
                      <th>STATUS PS</th>
                      <th>PL</th>
                      <th>CRIAÇÃO PS</th>
                      <th>DATA ENTREGA</th>
                      <th>LEAD TIME</th>
                      <th>TARGET</th>
                      <th style={{ textAlign: 'center' }}>ITENS</th>
                      <th>VALOR TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosPaginados.length === 0 ? (
                      <tr>
                        <td colSpan="12" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                          Nenhum registo encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      dadosPaginados.map((linha, index) => (
                        <tr key={index}>
                          <td className="fonte-negrito">{linha.id}</td>
                          <td>{linha.solicitante}</td>
                          <td><span className="link-azul">{linha.wbs}</span></td>
                          <td>
                            <span style={{ fontWeight: '500', color: '#475569' }}>
                              {linha.tipo}
                            </span>
                          </td>
                          <td><span className="badge-status-simples">{linha.status}</span></td>
                          <td>{linha.pl !== '-' ? <span className="link-azul">{linha.pl}</span> : <span className="texto-cinza">-</span>}</td>
                          <td className="texto-cinza">{linha.criacaoPsFormatada}</td>
                          <td className="texto-cinza fonte-negrito">{linha.dataEntregaFormatada}</td>
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
              </ScrollDuplo>
            </div>

            {totalRegistrosFiltrados > 0 && (
              <PaginacaoTabela 
                paginaAtual={paginaAtual}
                totalPaginas={totalPaginas}
                totalRegistrosFiltrados={totalRegistrosFiltrados}
                indexPrimeiroItem={indexPrimeiroItem}
                indexUltimoItem={indexUltimoItem}
                dadosPaginadosLength={dadosPaginados.length}
                itensPorPagina={itensPorPagina}
                setItensPorPagina={setItensPorPagina}
                setPaginaAtual={setPaginaAtual}
                carregando={carregando}
              />
            )}
          </>
        )}
      </div>

      <FiltroExportacaoModal 
        aberto={modalFiltroAberto}
        onClose={() => setModalFiltroAberto(false)}
        filtros={filtrosAvancados}
        setFiltros={setFiltrosAvancados}
        onLimpar={handleLimparFiltros}
        opcoesStatus={listaStatusUnicos}
      />
    </div>
  );
}
