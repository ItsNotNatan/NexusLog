import React from 'react';
import './Dashboard.css'; // <-- Importando o arquivo CSS
import { 
  Settings, 
  ClipboardList, 
  FileCheck2, 
  Clock, 
  Activity, 
  Target,
  CheckCircle2,
  XCircle,
  BarChart3,
  TrendingUp,
  FileText,
  Download
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="painel-container">
      
      {/* Cabeçalho */}
      <header className="painel-header">
        <div>
          <h1 className="header-title">
            Painel Geral
          </h1>
          <p className="header-subtitle">
            Atualizado em 23 de junho, 13:38
          </p>
        </div>
        
        <div className="header-actions">
          <div className="target-badge">
            <Settings size={16} />
            <span>Target: 3d</span>
          </div>
          <select className="period-select">
            <option>Este Mês</option>
            <option>Mês Passado</option>
            <option>Este Ano</option>
          </select>
        </div>
      </header>

      {/* Cards Superiores */}
      <div className="cards-grid">
        
        {/* Card 1 */}
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">SOLICITAÇÕES</h3>
            <div className="icon-wrapper icon-blue">
              <ClipboardList size={20} />
            </div>
          </div>
          <p className="card-value value-blue">14</p>
          <p className="card-description">26 itens no período</p>
        </div>

        {/* Card 2 */}
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">BS EMITIDOS</h3>
            <div className="icon-wrapper icon-blue">
              <FileCheck2 size={20} />
            </div>
          </div>
          <p className="card-value value-blue">12</p>
          <p className="card-description">24 linhas de BS</p>
        </div>

        {/* Card 3 */}
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">AGUARDANDO</h3>
            <div className="icon-wrapper icon-orange">
              <Clock size={20} />
            </div>
          </div>
          <p className="card-value value-orange">0</p>
          <p className="card-description">Pendentes de aprovação</p>
        </div>

        {/* Card 4 */}
        <div className="stat-card">
          <div className="card-header">
            <h3 className="card-title">EM SEPARAÇÃO</h3>
            <div className="icon-wrapper icon-blue">
              <Activity size={20} />
            </div>
          </div>
          <p className="card-value value-blue">1</p>
          <p className="card-description">Em andamento agora</p>
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
            
            {/* Barras do Gráfico construídas com divs */}
            <div className="grafico-barras">
              <div className="barra-container">
                <span className="barra-label-topo" style={{opacity: 0}}>0</span>
                <div className="barra-preenchimento verde" style={{height: '0%'}}></div>
              </div>
              <div className="barra-container">
                <span className="barra-label-topo">1</span>
                {/* 1 num máximo de 12 = ~8.3% */}
                <div className="barra-preenchimento vermelha" style={{height: '8.3%'}}></div>
              </div>
              <div className="barra-container">
                <span className="barra-label-topo">11</span>
                {/* 11 num máximo de 12 = ~91.6% */}
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

            {/* GRÁFICO DE LINHA (SVG Puro) */}
            <div className="grafico-svg-layer">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{overflow: 'visible'}}>
                {/* Fundo Verde Claro (Área) */}
                <polygon points="0,100 80,100 100,25 100,100" fill="rgba(16, 185, 129, 0.1)" />
                
                {/* Linha Verde (BS Emitidos) -> Vai de 0 a 12 (75% da altura) */}
                <polyline points="0,100 20,100 40,100 60,100 80,100 100,25" fill="none" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx="0" cy="100" r="4" fill="#10b981" vectorEffect="non-scaling-stroke" />
                <circle cx="40" cy="100" r="4" fill="#10b981" vectorEffect="non-scaling-stroke" />
                <circle cx="80" cy="100" r="4" fill="#10b981" vectorEffect="non-scaling-stroke" />
                <circle cx="100" cy="25" r="4" fill="#10b981" vectorEffect="non-scaling-stroke" />

                {/* Linha Azul (Solicitações) -> Vai de 0 a 14 (87.5% da altura) */}
                <polyline points="0,100 20,100 40,100 60,100 80,100 100,12.5" fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx="100" cy="12.5" r="4" fill="#2563eb" vectorEffect="non-scaling-stroke" />
                <circle cx="100" cy="12.5" r="2" fill="#ffffff" vectorEffect="non-scaling-stroke" />
              </svg>
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

      </div>

    </div>
  );
};

export default Dashboard;