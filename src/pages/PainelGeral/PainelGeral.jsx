import React from 'react';
import './PainelGeral.css'; // <-- Importando o arquivo CSS
import { 
  Settings, 
  ClipboardList, 
  FileCheck2, 
  Clock, 
  Activity, 
  Target,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react';

const PainelGeral = () => {
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

      {/* Seção de Eficiência */}
      <section className="efficiency-section">
        
        {/* Cabeçalho da Seção */}
        <div className="efficiency-header">
          <div className="efficiency-icon">
            <Target size={24} />
          </div>
          <div>
            <h2 className="efficiency-title">Eficiência de Atendimento</h2>
            <p className="efficiency-subtitle">
              Lead time: Data Criação → Data de Finalização · Target: 3 dia(s)
            </p>
          </div>
        </div>

        {/* Cards de Eficiência */}
        <div className="efficiency-grid">
          
          {/* Dentro do Target */}
          <div className="efficiency-card card-green">
            <CheckCircle2 size={24} />
            <span className="eff-label">Dentro do Target</span>
            <p className="eff-value">0</p>
          </div>

          {/* Fora do Target */}
          <div className="efficiency-card card-red">
            <XCircle size={24} />
            <span className="eff-label">Fora do Target</span>
            <p className="eff-value">0</p>
          </div>

          {/* Total Avaliado */}
          <div className="efficiency-card card-gray">
            <BarChart3 size={24} />
            <span className="eff-label">Total Avaliado</span>
            <p className="eff-value">0</p>
          </div>

        </div>

        {/* Rodapé da Seção */}
        <p className="efficiency-footer">
          Nenhum BS concluído ainda para cálculo de eficiência.
        </p>

      </section>

    </div>
  );
};

export default PainelGeral;