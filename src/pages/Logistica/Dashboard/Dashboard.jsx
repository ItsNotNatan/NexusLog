// =================================================================
// ARQUIVO: src/pages/Logistica/Dashboard/Dashboard.jsx
// DESCRIÇÃO: Dashboard de Operações com datas formatadas em PT-BR,
//            gráficos dinâmicos, SLA em tempo real e Socket.io.
// =================================================================
import React, { useState, useEffect, useMemo, useContext } from 'react';
import './Dashboard.css';
import { 
  Settings, ClipboardList, Clock, Activity, 
  Target, CheckCircle2, XCircle, BarChart3, TrendingUp, 
  FileText, Download, Loader2 
} from 'lucide-react';
import TabelaDemandas from '../../../components/TabelaDemandas/TabelaDemandas';
import { apiFetch } from '../../../services/api';
import { AuthContext } from '../../../contexts/AuthContext';
import { io } from 'socket.io-client'; // ✨ IMPORTAÇÃO DO SOCKET NO TOPO

const parseDataBackend = (dataStr) => {
  if (!dataStr || typeof dataStr !== 'string') return null;
  
  const strLimpa = dataStr.trim();
  if (!strLimpa || strLimpa === '—' || strLimpa === '-' || strLimpa === 'não definido') return null;

  if (strLimpa.includes('/')) {
    try {
      const [dataParte, horaParte] = strLimpa.split(' ');
      const partesData = dataParte.split('/');
      
      if (partesData.length === 3) {
        const dia = parseInt(partesData[0], 10);
        const mes = parseInt(partesData[1], 10) - 1;
        const ano = parseInt(partesData[2], 10);

        const horaMin = horaParte ? horaParte.split(':') : [0, 0, 0];
        const hora = parseInt(horaMin[0] || 0, 10);
        const minuto = parseInt(horaMin[1] || 0, 10);
        const segundo = parseInt(horaMin[2] || 0, 10);

        const dataBr = new Date(ano, mes, dia, hora, minuto, segundo);
        if (!isNaN(dataBr.getTime())) return dataBr;
      }
    } catch (e) {
      // Fallback
    }
  }

  const dataIso = new Date(strLimpa);
  if (!isNaN(dataIso.getTime())) {
    return dataIso;
  }

  return null;
};

const formatarDataBr = (dataStr) => {
  const d = parseDataBackend(dataStr);
  if (!d) return '—';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
};

export default function Dashboard() {
  const { estoqueAtual } = useContext(AuthContext);

  const [dadosTabela, setDadosTabela] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [tempoAtual, setTempoAtual] = useState(new Date());

  // ---------------------------------------------------------------------------
  // 1. BUSCA DE DADOS (COM REFRESH SILENCIOSO PARA O SOCKET)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const buscarDados = async (silencioso = false) => {
      try {
        if (!silencioso) setCarregando(true);

        const filtroFilial = estoqueAtual && estoqueAtual !== 'TODOS' ? `&filial=${estoqueAtual}` : '';
        const resultado = await apiFetch(`/solicitacoes/listar?limit=1000${filtroFilial}`);

        if (resultado?.sucesso && Array.isArray(resultado.dados)) {
          const dadosFormatados = resultado.dados.map((item) => {
            let prefixo = "PS"; 
            if (item.tipo === "Crossdocking") prefixo = "CD";
            else if (item.tipo === "Nota Fiscal") prefixo = "NF";
            else if (item.tipo === "Transferencia WBS") prefixo = "TR";
            else if (item.tipo === "Reintegracao" || item.tipo === "Reintegração") prefixo = "REI";
            else if (item.tipo === "Entrada") prefixo = "EN";

            const idLimpo = item.id ? String(item.id).replace(/\D/g, '') : item.ps;

            let numeroPL = "-";
            let dataCriacaoPL = null;

            if (item.status !== "Pendente" && item.status !== "Cancelado" && item.status !== "Recusado") {
              numeroPL = item.pl || "-";
              dataCriacaoPL = item.dataAprovacaoPL || item.criacaoPl || item.updated_at || item.created_at;
            }

            return {
              id: `${prefixo}:${idLimpo || item.ps}`,
              tipo: item.tipo,
              solicitante: item.solicitante,
              wbs: item.wbs,
              status: item.status,
              pl: numeroPL,
              criacaoPl: dataCriacaoPL ? formatarDataBr(dataCriacaoPL) : '—',
              criacaoPlRaw: dataCriacaoPL,
              prazoFinalizacao: item.prazoFinalizacao || null,
              dataSolicitacao: item.dataSolicitacao || item.created_at,
              dataEntrega: item.dataEntrega || 'não definido',
              dataFinalizacaoISO: item.dataFinalizacaoISO || item.updated_at
            };
          });
          
          setDadosTabela(dadosFormatados);
        }
      } catch (error) {
        console.error("Erro ao carregar os dados do Dashboard:", error?.message || error);
      } finally {
        if (!silencioso) setCarregando(false);
      }
    };

    buscarDados();

    // ✨ SOCKET.IO: Atualiza gráficos e tabela em tempo real (Silenciosamente)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = API_URL.replace(/\/api\/?$/, ''); 
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('solicitacoes_atualizadas', () => {
      console.log('⚡ Dashboard: Novo status ou pedido detetado! Atualizando métricas...');
      buscarDados(true); 
    });

    return () => socket.disconnect();
  }, [estoqueAtual]); 

  // ---------------------------------------------------------------------------
  // 2. CRONÓMETRO GLOBAL QUE RODA A CADA SEGUNDO
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const intervalo = setInterval(() => {
      setTempoAtual(new Date());
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  // ---------------------------------------------------------------------------
  // 3. ✨ A MATEMÁTICA DAS CORES DO SLA (50%, 20% e Expirado)
  // ---------------------------------------------------------------------------
  const calcularTempoRestante = (item, agora) => {
    const { criacaoPlRaw, prazoFinalizacao, status, tipo, dataSolicitacao, dataFinalizacaoISO, dataEntrega } = item;

    if (status === 'Cancelado' || status === 'Recusado') {
      return { texto: 'Cancelado', cor: 'neutro', dentroTarget: null };
    }

    const ehEntrada = tipo === 'Entrada' || (item.id && item.id.startsWith('EN:'));
    if (ehEntrada) {
      if (status === 'Concluído') {
        return { texto: 'Entregue', cor: 'neutro', dentroTarget: true };
      }
      return { texto: 'Instantâneo', cor: 'verde', dentroTarget: true };
    }

    if (status === 'Pendente' || (!criacaoPlRaw && !prazoFinalizacao)) {
      return { texto: 'Aguardando Aprovação', cor: 'neutro', dentroTarget: null };
    }

    let dataLimite = parseDataBackend(prazoFinalizacao);
    const prazoTargetMs = 3 * 24 * 60 * 60 * 1000; // SLA de 3 dias em milissegundos
    
    if (!dataLimite) {
      const dataAprovacaoPL = parseDataBackend(criacaoPlRaw) || parseDataBackend(dataSolicitacao);
      if (dataAprovacaoPL && !isNaN(dataAprovacaoPL.getTime())) {
        dataLimite = new Date(dataAprovacaoPL.getTime() + prazoTargetMs);
      }
    }

    if (!dataLimite || isNaN(dataLimite.getTime())) {
      return { texto: '—', cor: 'neutro', dentroTarget: null };
    }

    if (status === 'Concluído') {
      const dataConclusao = parseDataBackend(dataFinalizacaoISO) || parseDataBackend(dataEntrega) || agora;
      const cumpriuTarget = dataConclusao.getTime() <= dataLimite.getTime();
      return { texto: 'Entregue', cor: 'neutro', dentroTarget: cumpriuTarget };
    }

    const diferencaMs = dataLimite.getTime() - agora.getTime();
    const pad = (num) => String(num).padStart(2, '0');

    const atrasoAbsoluto = Math.abs(diferencaMs);
    const dias = Math.floor(atrasoAbsoluto / (1000 * 60 * 60 * 24));
    const horas = Math.floor((atrasoAbsoluto / (1000 * 60 * 60)) % 24);
    const minutos = Math.floor((atrasoAbsoluto / 1000 / 60) % 60);
    const segundos = Math.floor((atrasoAbsoluto / 1000) % 60);

    const relogioFormatado = `${dias}d ${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;

    // ✨ REGRAS DE COR EXATAS (50% e 20%)
    if (diferencaMs < 0) {
      // Já passou do prazo (Expirado)
      return { 
        texto: `-${relogioFormatado}`, 
        cor: 'expirado', // Vai ativar o fundo vermelho
        dentroTarget: false 
      };
    } else {
      let corStatus = 'verde'; // O Padrão é Verde (Mais de 50% do tempo)
      
      if (diferencaMs <= (prazoTargetMs * 0.20)) {
        corStatus = 'vermelho'; // Falta 20% ou menos do tempo
      } else if (diferencaMs <= (prazoTargetMs * 0.50)) {
        corStatus = 'amarelo'; // Falta entre 20% e 50% do tempo
      }

      return { 
        texto: relogioFormatado, 
        cor: corStatus, 
        dentroTarget: true 
      };
    }
  };

  const { 
    dadosTabelaAoVivo, 
    dentroTargetCount, 
    foraTargetCount, 
    totalAvaliados,
    totalFinalizados,
    totalRecusados,
    totalEmAndamento,
    ultimosMeses,
    dadosGraficoLinha
  } = useMemo(() => {
    const aoVivo = dadosTabela.map(item => {
      const contagemAoVivo = calcularTempoRestante(item, tempoAtual);
      return {
        ...item,
        contagem: contagemAoVivo.texto,
        contagemStatus: contagemAoVivo.cor, // Passa a cor "verde", "amarelo", "vermelho" ou "expirado"
        dentroTarget: contagemAoVivo.dentroTarget
      };
    });

    const solicitacoesAvaliadas = aoVivo.filter(i => i.dentroTarget !== null);
    const dentroCount = solicitacoesAvaliadas.filter(i => i.dentroTarget === true).length;
    const foraCount = solicitacoesAvaliadas.filter(i => i.dentroTarget === false).length;
    const totalAv = solicitacoesAvaliadas.length;

    const finalizados = dadosTabela.filter(i => i.status === 'Concluído').length;
    const recusados = dadosTabela.filter(i => i.status === 'Recusado' || i.status === 'Cancelado').length;
    const emAndamento = dadosTabela.filter(i => i.status === 'Em Separação').length;

    const nomesMeses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const hoje = new Date();
    const meses = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesNum = d.getMonth();
      const ano = d.getFullYear();

      const itensDoMes = aoVivo.filter(item => {
        const dt = parseDataBackend(item.criacaoPlRaw || item.dataSolicitacao);
        return dt && dt.getMonth() === mesNum && dt.getFullYear() === ano && item.dentroTarget !== null;
      });

      const totalMes = itensDoMes.length;
      const dentroMes = itensDoMes.filter(item => item.dentroTarget === true).length;
      const pctDentro = totalMes > 0 ? Math.round((dentroMes / totalMes) * 100) : null;
      const pctFora = pctDentro !== null ? 100 - pctDentro : null;

      meses.push({ 
        rotulo: `${nomesMeses[mesNum]}/${String(ano).slice(-2)}`,
        mesNum, ano, totalMes, pctDentro, pctFora
      });
    }

    const larguraPlot = 100;
    const passoX = meses.length > 1 ? larguraPlot / (meses.length - 1) : 0;
    const pontosDentro = meses.map((m, idx) => {
      const x = idx * passoX;
      const y = m.pctDentro !== null ? 100 - m.pctDentro : null;
      return { x, y, val: m.pctDentro };
    });

    return {
      dadosTabelaAoVivo: aoVivo,
      dentroTargetCount: dentroCount,
      foraTargetCount: foraCount,
      totalAvaliados: totalAv,
      totalFinalizados: finalizados,
      totalRecusados: recusados,
      totalEmAndamento: emAndamento,
      ultimosMeses: meses,
      dadosGraficoLinha: pontosDentro
    };
  }, [dadosTabela, tempoAtual]);

  const maxStatusCount = Math.max(totalFinalizados, totalRecusados, totalEmAndamento, 1);
  const alturaVerde = `${(totalFinalizados / maxStatusCount) * 100}%`;
  const alturaVermelha = `${(totalRecusados / maxStatusCount) * 100}%`;
  const alturaAzul = `${(totalEmAndamento / maxStatusCount) * 100}%`;

  const caminhoSvgDentro = dadosGraficoLinha
    .filter(p => p.y !== null)
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard de Operações</h1>
          <p>Métricas de desempenho e visão geral da logística</p>
        </div>
        <div className="header-actions">
          <div className="target-badge">
            <Settings size={18} color="#2563eb" />
            <span>Target Atual: <strong>3 Dias (Expiração PL)</strong></span>
          </div>
          <select className="period-select" defaultValue="Todo Período">
            <option value="Todo Período">Todo Período</option>
            <option value="Este Mês">Este Mês</option>
            <option value="Semana Passada">Semana Passada</option>
          </select>
        </div>
      </header>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Solicitações Recebidas</h3>
            <div className="icon-wrapper icon-blue"><ClipboardList size={22} /></div>
          </div>
          <p className="card-value value-blue">{carregando ? '-' : dadosTabela.length}</p>
          <p className="card-description">Total de pedidos no período</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Aguardando Aprovação</h3>
            <div className="icon-wrapper icon-orange"><Clock size={22} /></div>
          </div>
          <p className="card-value value-orange">
            {carregando ? '-' : dadosTabela.filter(i => i.status === 'Pendente').length}
          </p>
          <p className="card-description">Pendentes na fila</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Em Separação</h3>
            <div className="icon-wrapper icon-blue"><Activity size={22} /></div>
          </div>
          <p className="card-value value-blue">
            {carregando ? '-' : totalEmAndamento}
          </p>
          <p className="card-description">Sendo processados agora</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Finalizados</h3>
            <div className="icon-wrapper icon-green"><CheckCircle2 size={22} /></div>
          </div>
          <p className="card-value value-blue">
            {carregando ? '-' : totalFinalizados}
          </p>
          <p className="card-description">Demandas entregues</p>
        </div>
      </div>

      <div className="efficiency-section">
        <div className="efficiency-header">
          <div className="efficiency-icon">
            <Target size={24} />
          </div>
          <div className="efficiency-textos">
            <h2>Eficiência de Atendimento</h2>
            <p>Lead time: Aprovação da PL &rarr; Finalização &middot; Target: 3 dia(s) até expirar (Entrada: Instantâneo)</p>
          </div>
        </div>

        <div className="efficiency-grid">
          <div className="eff-card green">
            <CheckCircle2 size={28} strokeWidth={2} />
            <span>Dentro do Target</span>
            <strong>{carregando ? '0' : dentroTargetCount}</strong>
          </div>
          <div className="eff-card red">
            <XCircle size={28} strokeWidth={2} />
            <span>Fora do Target (Expirados)</span>
            <strong>{carregando ? '0' : foraTargetCount}</strong>
          </div>
          <div className="eff-card gray">
            <BarChart3 size={28} strokeWidth={2} />
            <span>Total Avaliado</span>
            <strong>{carregando ? '0' : totalAvaliados}</strong>
          </div>
        </div>
        <p className="efficiency-footer">
          {totalAvaliados === 0 
            ? "Nenhum PL em processamento ou concluído para cálculo de eficiência." 
            : `Total de ${totalAvaliados} solicitação(ões) avaliada(s) segundo a regra de expiração de 3 dias.`}
        </p>
      </div>

      <div className="graficos-grid-2col">
        <div className="grafico-card">
          <div className="grafico-header">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone"><TrendingUp size={20} /></div>
              <div className="grafico-textos">
                <h3>Dentro vs. Fora do Target</h3>
                <p>% sobre finalizados e ativos por mês</p>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="meses-selecao">
            {ultimosMeses.map(m => (
              <div key={m.rotulo} className="mes-box">
                <span>{m.rotulo}</span>
                <span style={{ color: m.pctDentro !== null ? '#059669' : '#94a3b8', fontWeight: '800' }}>
                  {m.pctDentro !== null ? `${m.pctDentro}%` : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="grafico-area">
            <div className="grafico-eixo-y">
              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>

            <svg className="grafico-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              {caminhoSvgDentro && (
                <path d={caminhoSvgDentro} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              )}
              {dadosGraficoLinha.map((p, idx) => (
                p.y !== null && (
                  <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                )
              ))}
            </svg>

            <div className="grafico-eixo-x">
              {ultimosMeses.map(m => <span key={m.rotulo}>{m.rotulo}</span>)}
            </div>
          </div>
          <div className="grafico-legenda">
            <div className="legenda-item"><div className="legenda-cor verde"></div> Dentro (%)</div>
            <div className="legenda-item"><div className="legenda-cor vermelha"></div> Fora (%)</div>
          </div>
        </div>

        <div className="grafico-card">
          <div className="grafico-header">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone"><FileText size={20} /></div>
              <div className="grafico-textos">
                <h3>Acompanhamento de PL</h3>
                <p>Volume atual por fase</p>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="status-caixas-grid">
            <div className="status-box status-verde"><span>Finalizados</span><strong>{totalFinalizados}</strong></div>
            <div className="status-box status-vermelho"><span>Recusados</span><strong>{totalRecusados}</strong></div>
            <div className="status-box status-azul"><span>Em Andamento</span><strong>{totalEmAndamento}</strong></div>
          </div>

          <div className="grafico-area">
            <div className="grafico-eixo-y">
              <span>{maxStatusCount}</span>
              <span>{Math.round(maxStatusCount * 0.75)}</span>
              <span>{Math.round(maxStatusCount * 0.5)}</span>
              <span>{Math.round(maxStatusCount * 0.25)}</span>
              <span>0</span>
            </div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>
            <div className="grafico-barras">
              <div className="barra-container">
                <span className="barra-label-topo">{totalFinalizados}</span>
                <div className="barra-preenchimento verde" style={{ height: alturaVerde }}></div>
              </div>
              <div className="barra-container">
                <span className="barra-label-topo">{totalRecusados}</span>
                <div className="barra-preenchimento vermelha" style={{ height: alturaVermelha }}></div>
              </div>
              <div className="barra-container">
                <span className="barra-label-topo">{totalEmAndamento}</span>
                <div className="barra-preenchimento azul" style={{ height: alturaAzul }}></div>
              </div>
            </div>
            <div className="grafico-eixo-x" style={{ padding: '0 8%' }}>
              <span>Finalizados</span><span>Recusados</span><span>Em Andamento</span>
            </div>
          </div>
        </div>

      </div>

      <div className="graficos-grid-1col">
        {carregando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px', color: '#94a3b8' }}>
            <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px', color: '#3b82f6' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Sincronizando dados com o servidor...</span>
          </div>
        ) : (
          <TabelaDemandas dados={dadosTabelaAoVivo} />
        )}
      </div>

    </div>
  );
}