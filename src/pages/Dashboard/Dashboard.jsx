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
        
        <div className="grafico-card">
          <div className="grafico-header">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone"><TrendingUp size={18} /></div>
              <div className="grafico-textos">
                <h3>Evolução Histórica — Últimos 6 Meses</h3>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="grafico-area" style={{height: '250px'}}>
            <div className="grafico-eixo-y">
              <span>16</span><span>12</span><span>8</span><span>4</span><span>0</span>
            </div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>

            {/* GRÁFICO DE LINHA - Correção para manter bolinhas redondas */}
            <div className="grafico-svg-layer">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{overflow: 'visible'}}>
                {/* Linhas SVG */}
                <polygon points="0,100 80,100 100,25 100,100" fill="rgba(16, 185, 129, 0.1)" />
                <polyline points="0,100 20,100 40,100 60,100 80,100 100,25" fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <polyline points="0,100 20,100 40,100 60,100 80,100 100,12.5" fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              
              {/* Pontos HTML sobrepostos para não esticarem */}
              {[0, 20, 40, 60, 80].map(pos => (
                <React.Fragment key={`hist-${pos}`}>
                  <div className="ponto-grafico verde" style={{ left: `${pos}%`, bottom: '0%' }}></div>
                  <div className="ponto-grafico azul" style={{ left: `${pos}%`, bottom: '0%' }}></div>
                </React.Fragment>
              ))}
              <div className="ponto-grafico verde" style={{ left: '100%', bottom: '75%' }}></div>
              <div className="ponto-grafico azul-branco" style={{ left: '100%', bottom: '87.5%' }}></div>
            </div>

            <div className="grafico-eixo-x">
              <span>jan/26</span><span>fev/26</span><span>mar/26</span><span>abr/26</span><span>mai/26</span><span>jun/26</span>
            </div>
          </div>
          
          <div className="grafico-legenda">
            <div className="legenda-item"><div className="legenda-cor azul-claro"></div> Solicitações</div>
            <div className="legenda-item"><div className="legenda-ponto-verde"></div> BS Emitidos</div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* GRÁFICO 4: Volume Diário — Últimos 7 Dias                    */}
        {/* ============================================================ */}
        <div className="grafico-card">
          <div className="grafico-header">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone"><TrendingUp size={18} /></div>
              <div className="grafico-textos">
                <h3>Volume Diário — Últimos 7 Dias</h3>
              </div>
            </div>
            <button className="btn-csv"><Download size={14}/> CSV</button>
          </div>

          <div className="grafico-area" style={{height: '250px'}}>
            <div className="grafico-eixo-y">
              <span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
            </div>
            <div className="grafico-linhas">
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal"></div><div className="linha-horizontal"></div>
              <div className="linha-horizontal" style={{borderTopStyle: 'solid'}}></div>
            </div>

            {/* GRÁFICO DE LINHA - Correção das bolinhas */}
            <div className="grafico-svg-layer">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{overflow: 'visible'}}>
                <polyline points="0,100 16.6,100 33.3,100 50,100 66.6,100 83.3,100 100,100" fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <polyline points="0,100 16.6,100 33.3,100 50,100 66.6,100 83.3,100 100,100" fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              
              {/* Pontos HTML */}
              {[0, 16.6, 33.3, 50, 66.6, 83.3, 100].map(pos => (
                <React.Fragment key={`vol-${pos}`}>
                  <div className="ponto-grafico azul" style={{ left: `${pos}%`, bottom: '0%' }}></div>
                  <div className="ponto-grafico verde pequeno" style={{ left: `${pos}%`, bottom: '0%' }}></div>
                </React.Fragment>
              ))}
            </div>

            <div className="grafico-eixo-x">
              <span>25/06</span><span>26/06</span><span>27/06</span><span>28/06</span><span>29/06</span><span>30/06</span><span>01/07</span>
            </div>
          </div>
          
          <div className="grafico-legenda">
            <div className="legenda-item"><div className="legenda-cor azul-claro"></div> Solicitações</div>
            <div className="legenda-item"><div className="legenda-ponto-verde"></div> BS Emitidos</div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARTÃO 5: Top Solicitantes e Em Separação Agora              */}
        {/* ============================================================ */}
        <div className="grafico-card cartao-sem-padding">
          <div className="top-solicitantes-header">
            <div className="grafico-titulo-grupo">
              <Users size={20} color="#2563eb" />
              <h3>Top Solicitantes</h3>
            </div>
            <select className="select-simples">
              <option>Este Mês</option>
            </select>
          </div>
          
          <div className="top-solicitantes-body">
            Nenhum solicitante no período
          </div>
          
          <div className="em-separacao-container">
            <div className="em-separacao-titulo">
              <div className="ponto-azul-pequeno"></div>
              EM SEPARAÇÃO AGORA
            </div>
            <div className="em-separacao-linha">
              <span className="ps-destaque">PS: 2306261114</span>
              <span className="alerta-texto">
                <AlertTriangle size={16} /> 185h 45min
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}