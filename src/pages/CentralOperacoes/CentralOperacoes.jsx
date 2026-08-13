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
            {/* ✨ NOME ATUALIZADO AQUI */}
            Bem-vindo ao STOCK<span className="logo-accent">Log</span>
          </h1>
          <p className="home-instructions">
            Uma plataforma centralizada para controle de estoque, solicitações, aprovações e rastreabilidade em tempo real.
          </p>
        </header>

        <main className="home-hub-grid">
          <div 
            className="hub-card hub-card--blue"
            onClick={() => navigate('/cliente/consulta-estoque')}
            role="button"
            tabIndex={0}
          >
            <div className="hub-card-icon">
              <Box size={36} />
            </div>
            <h3>Portal do Cliente</h3>
            <p>Consulte estoque, faça solicitações e acompanhe seus pedidos.</p>
            <div className="area-tags">
              <span className="tag">Estoque</span>
              <span className="tag">Solicitações</span>
              <span className="tag">Rastreabilidade</span>
            </div>
            <div className="hub-card-action-btn">
              Acessar Portal <span className="arrow-transition">&rarr;</span>
            </div>
          </div>

          <div 
            className="hub-card hub-card--indigo"
            onClick={() => navigate('/login')}
            role="button"
            tabIndex={0}
          >
            <div className="hub-card-icon">
              <LayoutGrid size={36} />
            </div>
            <h3>Área da Logística</h3>
            <p>Dashboard operacional, aprovações de Packing List, painel geral e controle de estoque.</p>
            <div className="area-tags">
              <span className="tag">Dashboard</span>
              <span className="tag">Aprovação de Solicitações</span>
              <span className="tag">Rota de Coleta</span>
            </div>
            <div className="hub-card-action-btn">
              Acessar Logística <span className="arrow-transition">&rarr;</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}