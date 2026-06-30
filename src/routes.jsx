import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import SelecionarFilial from './pages/SelecionarFilial/SelecionarFilial';

// --- PÁGINAS DA LOGÍSTICA ---
import Dashboard from './pages/Dashboard/Dashboard'; // <- Caminho corrigido!
import PainelGeralSolicitacoes from './pages/PainelGeralSolicitacoes/PainelGeralSolicitacoes'; // <- Adicionado!
import PainelAprovacao from './pages/PainelAprovacao/PainelAprovacao';
import EntradaEstoque from './pages/EntradaEstoque/EntradaEstoque';
import Traceabilly from './pages/Traceabilly/Traceabilly';
import ExportarDados from './pages/ExportarDados/ExportarDados';
import FormatacaoSAP from './pages/FormatacaoSAP/FormatacaoSAP';
import Configuracoes from './pages/Configuracoes/Configuracoes';

// --- PÁGINAS DO CLIENTE ---
import FazerSolicitacao from './pages/FazerSolicitacao/FazerSolicitacao';
import ConsultaEstoque from './pages/ConsultaEstoque/ConsultaEstoque';
import AcompanhamentoSolicitacoes from './pages/AcompanhamentoSolicitacoes/AcompanhamentoSolicitacoes';

export const router = createBrowserRouter([
  { path: "/", element: <CentralDeOperacoes /> },
  { path: "/selecionar-filial", element: <SelecionarFilial /> },
  
  // ÁREA DO CLIENTE
  {
    path: "/cliente",
    element: <AppLayout modulo="cliente" />, 
    children: [
      { path: "consulta-estoque", element: <ConsultaEstoque /> },
      { path: "fazer-solicitacao", element: <FazerSolicitacao /> },
      { path: "acompanhamento-solicitacoes", element: <AcompanhamentoSolicitacoes /> }
    ]
  },

  // ÁREA DA LOGÍSTICA
  {
    path: "/logistica",
    element: <AppLayout modulo="logistica" />, 
    children: [
      { path: "painel", element: <PainelGeralSolicitacoes /> }, // Rota do Painel da Tabela
      { path: "dashboard", element: <Dashboard /> }, // Rota do Dashboard de Gráficos
      { path: "PainelAprovacao", element: <PainelAprovacao /> },
      { path: "entrada-estoque", element: <EntradaEstoque /> },
      { path: "traceabilly", element: <Traceabilly /> },
      { path: "exportar", element: <ExportarDados /> },
      { path: "formatacao-sap", element: <FormatacaoSAP /> },
      { path: "configuracoes", element: <Configuracoes /> }
    ]
  }
]);