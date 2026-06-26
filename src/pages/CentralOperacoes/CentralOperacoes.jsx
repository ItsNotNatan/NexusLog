import React from 'react';
// Importamos o hook de navegação do react-router-dom
import { useNavigate } from 'react-router-dom'; 
import './CentralOperacoes.css';
import { Box, LayoutGrid, ClipboardList, ShieldCheck, Activity, ArrowRight } from 'lucide-react';

export default function CentralDeOperacoes() {
  // Inicializamos a função navigate
  const navigate = useNavigate();

  return (
    <div className="painel-container">
      
      {/* CABEÇALHO */}
      <header className="cabecalho">
        <h1 className="cabecalho-titulo">
            Central de Operações <br />
            <span className="destaque-azul">COMAU Logistics</span>
        </h1>
        <p className="cabecalho-subtitulo">
            Controle de estoque, solicitações, aprovações e rastreabilidade em tempo real para todas as filiais.
        </p>
      </header>

      {/* CARTÕES PRINCIPAIS */}
      <main className="grelha-principal">
        
        {/* Cartão 1: Portal do Cliente */}
        <div className="cartao">
            <div className="icone-destaque-azul">
                <Box size={24} />
            </div>
            <h2 className="cartao-titulo">Portal do Cliente</h2>
            <p className="cartao-descricao">
                Consulte estoque, faça solicitações e acompanhe seus pedidos por filial.
            </p>
            <div className="area-tags">
                <span className="tag">Estoque</span>
                <span className="tag">Solicitações</span>
                <span className="tag">Rastreabilidade</span>
            </div>
            {/* Adicionado o evento onClick aqui! */}
            <button 
                className="botao-acao" 
                onClick={() => navigate('/selecionar-filial')}
            >
                Selecionar Filial <ArrowRight size={18} className="icone-seta" />
            </button>
        </div>

        {/* Cartão 2: Área da Logística */}
        <div className="cartao">
            <div className="icone-destaque-azul">
                <LayoutGrid size={24} />
            </div>
            <h2 className="cartao-titulo">Área da Logística</h2>
            <p className="cartao-descricao">
                Dashboard operacional, aprovações de BS, painel geral e controle de estoque.
            </p>
            <div className="area-tags">
                <span className="tag">Dashboard</span>
                <span className="tag">Aprovação de BS</span>
                <span className="tag">Painel Geral</span>
            </div>
            {/* Adicionado o evento onClick aqui! */}
            <button 
                className="botao-acao"
                onClick={() => navigate('/selecionar-filial')}
            >
                Acessar Logística <ArrowRight size={18} className="icone-seta" />
            </button>
        </div>
      </main>

      {/* CARTÕES DE ATALHO */}
      <section className="grelha-secundaria">
        
        <div className="cartao cartao-pequeno">
            <div className="icone-destaque-cinza">
                <Box size={20} />
            </div>
            <h3 className="cartao-pequeno-titulo">Controle de Estoque</h3>
            <p className="cartao-pequeno-subtitulo">3 filiais independentes</p>
        </div>

        <div className="cartao cartao-pequeno">
            <div className="icone-destaque-cinza">
                <ClipboardList size={20} />
            </div>
            <h3 className="cartao-pequeno-titulo">Solicitações</h3>
            <p className="cartao-pequeno-subtitulo">Materiais e NFs</p>
        </div>

        <div className="cartao cartao-pequeno">
            <div className="icone-destaque-cinza">
                <ShieldCheck size={20} />
            </div>
            <h3 className="cartao-pequeno-titulo">Aprovações</h3>
            <p className="cartao-pequeno-subtitulo">Geração de BS</p>
        </div>

        <div className="cartao cartao-pequeno">
            <div className="icone-destaque-cinza">
                <Activity size={20} />
            </div>
            <h3 className="cartao-pequeno-titulo">Rastreabilidade</h3>
            <p className="cartao-pequeno-subtitulo">Histórico completo</p>
        </div>

      </section>

      {/* RODAPÉ */}
      <footer className="rodape">
        <p>
            COMAU &copy; 2026 &middot; Nexus Log v4.0 &middot; BR02 &middot; BR04 &middot; BR06
        </p>
      </footer>

    </div>
  );
}