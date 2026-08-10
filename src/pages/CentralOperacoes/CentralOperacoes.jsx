import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CentralOperacoes.css';
import { Box, LayoutGrid } from 'lucide-react';
import logoComau from '../../assets/logo-comau.png';

export default function CentralDeOperacoes() {
  const navigate = useNavigate();

  return (
    <div className="home-hub-container fade-in">
      
      {/* 🌟 PLANO DE FUNDO ONDULADO (SVG) 🌟 */}
      <div className="wave-container">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#eff6ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path fill="url(#wave-gradient)" d="M0,192L60,202.7C120,213,240,235,360,213.3C480,192,600,128,720,112C840,96,960,128,1080,144C1200,160,1320,160,1380,160L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>
      </div>

      <div className="home-hub-content-wrapper">
        <header className="home-hub-header">
          <img src={logoComau} alt="Logo Comau" className="home-hub-logo" />
          
          <h1 className="home-greeting">
            Central de Operações <br />
            <span className="logo-accent">COMAU Logistics</span>
          </h1>
          <p className="home-instructions">
            Controle de estoque, solicitações, aprovações e rastreabilidade em tempo real.
          </p>
        </header>

        <main className="home-hub-grid">
          {/* Módulo 1: Portal do Cliente */}
          <div className="hub-card hub-card--blue">
            <div className="hub-card-icon">
              <Box size={20} />
            </div>
            <h3>Portal do Cliente</h3>
            <p>Consulte estoque, faça solicitações e acompanhe seus pedidos.</p>
            <div className="area-tags">
              <span className="tag">Estoque</span>
              <span className="tag">Solicitações</span>
              <span className="tag">Rastreabilidade</span>
            </div>
            <button
              className="hub-card-action-btn"
              onClick={() => navigate('/cliente/consulta-estoque')}
            >
              Acessar Portal <span className="arrow-transition">&rarr;</span>
            </button>
          </div>

          {/* Módulo 2: Área da Logística */}
          <div className="hub-card hub-card--indigo">
            <div className="hub-card-icon">
              <LayoutGrid size={20} />
            </div>
            <h3>Área da Logística</h3>
            <p>Dashboard operacional, aprovações de PL, painel geral e controle de estoque.</p>
            <div className="area-tags">
              <span className="tag">Dashboard</span>
              <span className="tag">Aprovação de PL</span>
              <span className="tag">Painel Geral</span>
            </div>
            <button
              className="hub-card-action-btn"
              onClick={() => navigate('/login')}
            >
              Acessar Logística <span className="arrow-transition">&rarr;</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}