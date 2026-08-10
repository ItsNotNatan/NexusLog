// =================================================================
// ARQUIVO: src/pages/Logistica/Dashboard/Dashboard.jsx
// DESCRIÇÃO: Dashboard de Operações integrado com a data de aprovação
//            da PL e finalização real do banco de dados.
// =================================================================
import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { 
  Settings, ClipboardList, Clock, Activity, 
  Target, CheckCircle2, XCircle, BarChart3, TrendingUp, 
  FileText, Download, Loader2 
} from 'lucide-react';
import TabelaDemandas from '../../../components/TabelaDemandas/TabelaDemandas';
import { apiFetch } from '../../../services/api';

export default function Dashboard() {
  const [dadosTabela, setDadosTabela] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [tempoAtual, setTempoAtual] = useState(new Date());

  // ---------------------------------------------------------------------------
  // 1. BUSCA E FORMATAÇÃO DOS DADOS DA API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const buscarDados = async () => {
      try {
        const resultado = await apiFetch('/solicitacoes/listar');

        if (resultado.sucesso) {
          const dadosFormatados = resultado.dados.map((item) => {
            
            // Definição de prefixos por tipo de solicitação
            let prefixo = "PS"; 
            if (item.tipo === "Crossdocking") prefixo = "CD";
            else if (item.tipo === "Nota Fiscal") prefixo = "NF";
            else if (item.tipo === "Transferencia WBS") prefixo = "TR";
            else if (item.tipo === "Reintegracao") prefixo = "REI";
            else if (item.tipo === "Entrada") prefixo = "EN";

            const idLimpo = item.id.replace(/\D/g, '') || item.id;

            // REGRA DA PL E DATA DE APROVAÇÃO:
            // Capturamos o número da PL e a data real da aprovação enviada pelo Back-end
            let numeroPL = "-";
            let dataCriacaoPL = null;

            if (item.status !== "Pendente" && item.status !== "Cancelado" && item.status !== "Recusado") {
                numeroPL = item.pl || item.bs || "-";
                dataCriacaoPL = item.dataAprovacaoPL || item.criacaoPl || item.criacao_pl || item.updated_at || item.created_at || item.dataSolicitacao;
            }

            return {
              id: `${prefixo}:${idLimpo}`,
              tipo: item.tipo,
              solicitante: item.solicitante,
              wbs: item.wbs,
              status: item.status,
              pl: numeroPL,
              criacaoPl: dataCriacaoPL || '—', // Data do início do Target (momento da PL)
              dataSolicitacao: item.dataSolicitacao || item.created_at, // Registro original
              dataEntrega: item.dataEntrega || 'não definido',
              dataFinalizacaoISO: item.dataFinalizacaoISO // ✨ Data real de quando o pedido foi finalizado
            };
          });
          
          setDadosTabela(dadosFormatados);
        }
      } catch (error) {
        console.error("Erro ao carregar os dados do Dashboard:", error.message);
      } finally {
        setCarregando(false);
      }
    };

    buscarDados();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. CRONÓMETRO EM TEMPO REAL
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const intervalo = setInterval(() => {
      setTempoAtual(new Date());
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  // ---------------------------------------------------------------------------
  // 3. LEITOR UNIVERSAL DE DATAS
  // Converte strings ISO ou formato brasileiro (DD/MM/YYYY) para objeto Date
  // ---------------------------------------------------------------------------
  const parseDataBackend = (dataStr) => {
    if (!dataStr || typeof dataStr !== 'string') return null;
    
    const strLimpa = dataStr.trim();
    if (!strLimpa || strLimpa === '—' || strLimpa === '-' || strLimpa === 'não definido') return null;

    // Tentativa 1: Formato Nativo ISO (ex: "2026-08-09T21:43:00.000Z")
    let data = new Date(strLimpa);
    if (!isNaN(data.getTime())) {
      return data;
    }

    // Tentativa 2: Formato Brasileiro (ex: "09/08/2026 21:43:00" ou "09/08/2026")
    if (strLimpa.includes('/')) {
      try {
        const [dataParte, horaParte] = strLimpa.split(' ');
        const partesData = dataParte.split('/');
        
        if (partesData.length === 3) {
          const dia = parseInt(partesData[0], 10);
          const mes = parseInt(partesData[1], 10) - 1;
          const ano = parseInt(partesData[2], 10);

          const horaMin = horaParte ? horaParte.split(':') : [0, 0];
          const hora = parseInt(horaMin[0] || 0, 10);
          const minuto = parseInt(horaMin[1] || 0, 10);
          const segundo = parseInt(horaMin[2] || 0, 10);

          data = new Date(ano, mes, dia, hora, minuto, segundo);
          if (!isNaN(data.getTime())) {
            return data;
          }
        }
      } catch (e) {
        return null;
      }
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // 4. CÁLCULO DO TEMPO RESTANTE DO TARGET (3 DIAS PÓS-PL)
  // ---------------------------------------------------------------------------
  const calcularTempoRestante = (item) => {
    const { criacaoPl, status, tipo, dataSolicitacao, dataFinalizacaoISO, dataEntrega } = item;

    // Caso 1: Cancelados ou Recusados
    if (status === 'Cancelado' || status === 'Recusado') {
      return { texto: 'Cancelado', cor: 'neutro', dentroTarget: null };
    }

    // Caso 2: Exceção Entrada de Material (Instantâneo)
    const ehEntrada = tipo === 'Entrada' || (item.id && item.id.startsWith('EN:'));
    if (ehEntrada) {
      if (status === 'Concluído') {
        return { texto: 'Entregue', cor: 'neutro', dentroTarget: true };
      }
      return { texto: 'Instantâneo', cor: 'verde', dentroTarget: true };
    }

    // Caso 3: Em 'Pendente' (sem PL gerada ainda)
    if (status === 'Pendente' || !criacaoPl || criacaoPl === '—') {
      return { texto: 'Aguardando Aprovação', cor: 'neutro', dentroTarget: null };
    }

    // Caso 4: Aprovado -> Target de 3 Dias a contar da data de aprovação da PL
    const dataAprovacaoPL = parseDataBackend(criacaoPl) || parseDataBackend(dataSolicitacao);
    
    if (!dataAprovacaoPL || isNaN(dataAprovacaoPL.getTime())) {
      return { texto: '—', cor: 'neutro', dentroTarget: null };
    }

    const prazoTargetMs = 3 * 24 * 60 * 60 * 1000; // 3 dias em ms
    const dataLimite = new Date(dataAprovacaoPL.getTime() + prazoTargetMs);

    // Se já tiver sido concluída/entregue, compara com a data REAL da conclusão
    if (status === 'Concluído') {
      const dataConclusao = parseDataBackend(dataFinalizacaoISO) || parseDataBackend(dataEntrega) || tempoAtual;
      const cumpriuTarget = dataConclusao.getTime() <= dataLimite.getTime();
      return { texto: 'Entregue', cor: 'neutro', dentroTarget: cumpriuTarget };
    }

    // Para itens em separação (contagem regressiva ao vivo)
    const diferencaMs = dataLimite.getTime() - tempoAtual.getTime();
    const pad = (num) => String(num).padStart(2, '0');

    if (diferencaMs < 0) {
      const atrasoAbsoluto = Math.abs(diferencaMs);
      const dias = Math.floor(atrasoAbsoluto / (1000 * 60 * 60 * 24));
      const horas = Math.floor((atrasoAbsoluto / (1000 * 60 * 60)) % 24);
      const minutos = Math.floor((atrasoAbsoluto / 1000 / 60) % 60);
      const segundos = Math.floor((atrasoAbsoluto / 1000) % 60);

      return { 
        texto: `-${dias}d ${pad(horas)}:${pad(minutos)}:${pad(segundos)}`, 
        cor: 'vermelho', 
        dentroTarget: false 
      };
    } else {
      const dias = Math.floor(diferencaMs / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diferencaMs / (1000 * 60 * 60)) % 24);
      const minutos = Math.floor((diferencaMs / 1000 / 60) % 60);
      const segundos = Math.floor((diferencaMs / 1000) % 60);
      const corStatus = dias === 0 ? 'amarelo' : 'verde';

      return { 
        texto: `${dias}d ${pad(horas)}:${pad(minutos)}:${pad(segundos)}`, 
        cor: corStatus, 
        dentroTarget: true 
      };
    }
  };

  // Mapeamento dos dados com recálculo em tempo real
  const dadosTabelaAoVivo = dadosTabela.map(item => {
    const contagemAoVivo = calcularTempoRestante(item);
    return {
      ...item,
      contagem: contagemAoVivo.texto,
      contagemStatus: contagemAoVivo.cor,
      dentroTarget: contagemAoVivo.dentroTarget
    };
  });

  // Indicadores dos Cards de Eficiência
  const solicitacoesConcluidas = dadosTabelaAoVivo.filter(i => i.status === 'Concluído');
  const dentroTargetCount = solicitacoesConcluidas.filter(i => i.dentroTarget === true).length;
  const foraTargetCount = solicitacoesConcluidas.filter(i => i.dentroTarget === false).length;
  const totalAvaliados = solicitacoesConcluidas.length;

  // ---------------------------------------------------------------------------
  // 5. ESTRUTURA VISUAL
  // ---------------------------------------------------------------------------
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard de Operações</h1>
          <p>Métricas de desempenho e visão geral da logística</p>
        </div>
        <div className="header-actions">
          <div className="target-badge">
            <Settings size={16} />
            <span>Target Atual: <strong>3 Dias (Pós-PL)</strong></span>
          </div>
          <select className="period-select">
            <option>Todo Período</option>
            <option>Este Mês</option>
            <option>Semana Passada</option>
          </select>
        </div>
      </header>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Solicitações Recebidas</h3>
            <div className="icon-wrapper icon-blue"><ClipboardList size={20} /></div>
          </div>
          <p className="card-value value-blue">{carregando ? '-' : dadosTabela.length}</p>
          <p className="card-description">Total de pedidos no período</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Aguardando Aprovação</h3>
            <div className="icon-wrapper icon-orange"><Clock size={20} /></div>
          </div>
          <p className="card-value value-orange">
            {carregando ? '-' : dadosTabela.filter(i => i.status === 'Pendente').length}
          </p>
          <p className="card-description">Pendentes na fila</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Em Separação</h3>
            <div className="icon-wrapper icon-blue"><Activity size={20} /></div>
          </div>
          <p className="card-value value-blue">
            {carregando ? '-' : dadosTabela.filter(i => i.status === 'Em Separação').length}
          </p>
          <p className="card-description">Sendo processados agora</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Finalizados</h3>
            <div className="icon-wrapper icon-blue"><CheckCircle2 size={20} /></div>
          </div>
          <p className="card-value value-blue">
            {carregando ? '-' : dadosTabela.filter(i => i.status === 'Concluído').length}
          </p>
          <p className="card-description">Demandas entregues</p>
        </div>
      </div>

      {/* EFICIÊNCIA DE ATENDIMENTO */}
      <div className="efficiency-section">
        <div className="efficiency-header">
          <div className="efficiency-icon">
            <Target size={20} />
          </div>
          <div className="efficiency-textos">
            <h2>Eficiência de Atendimento</h2>
            <p>Lead time: Geração de PL &rarr; Finalização &middot; Target: 3 dia(s) (Entrada: Instantâneo)</p>
          </div>
        </div>

        <div className="efficiency-grid">
          <div className="eff-card green">
            <CheckCircle2 size={24} strokeWidth={1.5} />
            <span>Dentro do Target</span>
            <strong>{carregando ? '0' : dentroTargetCount}</strong>
          </div>
          <div className="eff-card red">
            <XCircle size={24} strokeWidth={1.5} />
            <span>Fora do Target</span>
            <strong>{carregando ? '0' : foraTargetCount}</strong>
          </div>
          <div className="eff-card gray">
            <BarChart3 size={24} strokeWidth={1.5} />
            <span>Total Avaliado</span>
            <strong>{carregando ? '0' : totalAvaliados}</strong>
          </div>
        </div>
        <p className="efficiency-footer">
          {totalAvaliados === 0 
            ? "Nenhum PL concluído ainda para cálculo de eficiência." 
            : `Total de ${totalAvaliados} solicitação(ões) avaliada(s) segundo a regra do Target pós-PL.`}
        </p>
      </div>

      <div className="graficos-grid-2col">
        <div className="grafico-card">
          <div className="grafico-header">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone"><TrendingUp size={18} /></div>
              <div className="grafico-textos">
                <h3>Dentro vs. Fora do Target</h3>
                <p>% sobre finalizados por mês · variação mês a mês</p>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="meses-selecao">
            {['jan/26', 'fev/26', 'mar/26', 'abr/26', 'mai/26', 'jun/26'].map(mes => (
              <div key={mes} className="mes-box"><span>{mes}</span><span style={{color: '#cbd5e1'}}>—</span></div>
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
            <div className="grafico-eixo-x">
              <span>jan/26</span><span>fev/26</span><span>mar/26</span><span>abr/26</span><span>mai/26</span><span>jun/26</span>
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
              <div className="grafico-icone"><FileText size={18} /></div>
              <div className="grafico-textos">
                <h3>Acompanhamento de PL por Status</h3>
                <p>Finalizados · Recusados · Em Andamento</p>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="status-caixas-grid">
            <div className="status-box status-verde"><span>Finalizados</span><strong>{dadosTabela.filter(i => i.status === 'Concluído').length}</strong></div>
            <div className="status-box status-vermelho"><span>Recusados</span><strong>{dadosTabela.filter(i => i.status === 'Recusado' || i.status === 'Cancelado').length}</strong></div>
            <div className="status-box status-azul"><span>Em Andamento</span><strong>{dadosTabela.filter(i => i.status === 'Em Separação').length}</strong></div>
          </div>

          <div className="grafico-area">
            <div className="grafico-eixo-y"><span>12</span><span>9</span><span>6</span><span>3</span><span>0</span></div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>
            <div className="grafico-barras">
              <div className="barra-container"><span className="barra-label-topo" style={{opacity: 0}}>0</span><div className="barra-preenchimento verde" style={{height: '0%'}}></div></div>
              <div className="barra-container"><span className="barra-label-topo">1</span><div className="barra-preenchimento vermelha" style={{height: '8.3%'}}></div></div>
              <div className="barra-container"><span className="barra-label-topo">11</span><div className="barra-preenchimento azul" style={{height: '91.6%'}}></div></div>
            </div>
            <div className="grafico-eixo-x" style={{padding: '0 30px'}}>
              <span>Finalizados</span><span>Recusados</span><span>Em Andamento</span>
            </div>
          </div>
        </div>
      </div>

      <div className="graficos-grid-1col" style={{ marginTop: '24px' }}>
         {carregando ? (
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
             <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
             <span>A sincronizar os dados do servidor...</span>
           </div>
         ) : (
           <TabelaDemandas dados={dadosTabelaAoVivo} />
         )}
      </div>

    </div>
  );
}