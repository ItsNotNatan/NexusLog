import React from 'react';
import './Dashboard.css';
import { 
  Settings, ClipboardList, FileCheck2, Clock, Activity, 
  Target, CheckCircle2, XCircle, BarChart3, TrendingUp, 
  FileText, Download, Users, AlertTriangle 
} from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      
      {/* --- CABEÇALHO --- */}
      <header className="dashboard-header">
        <div>
          <h1>Dashboard de Operações</h1>
          <p>Métricas de desempenho e visão geral da logística</p>
        </div>
        
        <div className="header-actions">
          <div className="target-badge">
            <Settings size={16} />
            <span>Target Atual: <strong>3 Dias</strong></span>
          </div>
          <select className="period-select">
            <option>Todo Período</option>
            <option>Este Mês</option>
            <option>Semana Passada</option>
          </select>
        </div>
      </header>

      {/* --- CARDS SUPERIORES (KPIs) --- */}
      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Solicitações Recebidas</h3>
            <div className="icon-wrapper icon-blue"><ClipboardList size={20} /></div>
          </div>
          <p className="card-value value-blue">14</p>
          <p className="card-description">Total de PS no período</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">BS Emitidos</h3>
            <div className="icon-wrapper icon-blue"><FileCheck2 size={20} /></div>
          </div>
          <p className="card-value value-blue">12</p>
          <p className="card-description">Boletins criados</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Aguardando Aprovação</h3>
            <div className="icon-wrapper icon-orange"><Clock size={20} /></div>
          </div>
          <p className="card-value value-orange">0</p>
          <p className="card-description">Pendentes na fila</p>
        </div>

        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">Em Separação</h3>
            <div className="icon-wrapper icon-blue"><Activity size={20} /></div>
          </div>
          <p className="card-value value-blue">1</p>
          <p className="card-description">Sendo processados agora</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECÇÃO: EFICIÊNCIA DE ATENDIMENTO                            */}
      {/* ============================================================ */}
      <div className="efficiency-section">
        <div className="efficiency-header">
          <div className="efficiency-icon">
            <Target size={20} />
          </div>
          <div className="efficiency-textos">
            <h2>Eficiência de Atendimento</h2>
            <p>Lead time: Data Criação &rarr; Data de Finalização &middot; Target: 3 dia(s)</p>
          </div>
        </div>

        <div className="efficiency-grid">
          <div className="eff-card green">
            <CheckCircle2 size={24} strokeWidth={1.5} />
            <span>Dentro do Target</span>
            <strong>0</strong>
          </div>
          <div className="eff-card red">
            <XCircle size={24} strokeWidth={1.5} />
            <span>Fora do Target</span>
            <strong>0</strong>
          </div>
          <div className="eff-card gray">
            <BarChart3 size={24} strokeWidth={1.5} />
            <span>Total Avaliado</span>
            <strong>0</strong>
          </div>
        </div>

        <p className="efficiency-footer">
          Nenhum BS concluído ainda para cálculo de eficiência.
        </p>
      </div>

      {/* ============================================================ */}
      {/* LINHA 1 DE GRÁFICOS (2 Colunas)                              */}
      {/* ============================================================ */}
      <div className="graficos-grid-2col">
        
        {/* GRÁFICO 1: Dentro vs Fora do Target */}
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
              <div key={mes} className="mes-box">
                <span>{mes}</span>
                <span style={{color: '#cbd5e1'}}>—</span>
              </div>
            ))}
          </div>

          <div className="grafico-area">
            <div className="grafico-eixo-y">
              <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>
            <div className="grafico-eixo-x">
              <span>jan/26</span><span>fev/26</span><span>mar/26</span><span>abr/26</span><span>mai/26</span><span>jun/26</span>
            </div>
          </div>
          <div className="grafico-legenda">
            <div className="legenda-item"><div className="legenda-cor verde"></div> Dentro (%)</div>
            <div className="legenda-item"><div className="legenda-cor vermelha"></div> Fora (%)</div>
            <div className="legenda-item"><TrendingUp size={14} color="#eab308" /> Evolução (%)</div>
          </div>
        </div>

        {/* GRÁFICO 2: Acompanhamento de BS por Status */}
        <div className="grafico-card">
          <div className="grafico-header">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone"><FileText size={18} /></div>
              <div className="grafico-textos">
                <h3>Acompanhamento de BS por Status</h3>
                <p>Finalizados · Recusados · Em Andamento</p>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="status-caixas-grid">
            <div className="status-box status-verde"><span>Finalizados</span><strong>0</strong></div>
            <div className="status-box status-vermelho"><span>Recusados</span><strong>1</strong></div>
            <div className="status-box status-azul"><span>Em Andamento</span><strong>11</strong></div>
          </div>

          <div className="grafico-area">
            <div className="grafico-eixo-y">
              <span>12</span><span>9</span><span>6</span><span>3</span><span>0</span>
            </div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>
            
            {/* Barras do Gráfico */}
            <div className="grafico-barras">
              <div className="barra-container">
                <span className="barra-label-topo" style={{opacity: 0}}>0</span>
                <div className="barra-preenchimento verde" style={{height: '0%'}}></div>
              </div>
              <div className="barra-container">
                <span className="barra-label-topo">1</span>
                <div className="barra-preenchimento vermelha" style={{height: '8.3%'}}></div>
              </div>
              <div className="barra-container">
                <span className="barra-label-topo">11</span>
                <div className="barra-preenchimento azul" style={{height: '91.6%'}}></div>
              </div>
            </div>

            <div className="grafico-eixo-x" style={{padding: '0 30px'}}>
              <span>Finalizados</span><span>Recusados</span><span>Em Andamento</span>
            </div>
          </div>
        </div>

      </div>

      

      {/* ============================================================ */}
      {/* LINHA 2 DE GRÁFICOS (1 Coluna Completa)                      */}
      {/* ============================================================ */}
      <div className="graficos-grid-1col">
        



      </div>

    </div>
  );
}