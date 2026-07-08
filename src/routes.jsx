import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import SelecionarFilial from './pages/SelecionarFilial/SelecionarFilial';
import LoginLogistica from './pages/LoginLogistica/LoginLogistica';

// --- PÁGINAS DA LOGÍSTICA ---
import Dashboard from './pages/Dashboard/Dashboard';
import PainelGeralSolicitacoes from './pages/PainelGeralSolicitacoes/PainelGeralSolicitacoes';
import PainelAprovacao from './pages/PainelAprovacao/PainelAprovacao';
import EntradaEstoque from './pages/EntradaEstoque/EntradaEstoque';
import Traceabilly from './pages/Traceabilly/Traceabilly';
import ExportarDados from './pages/ExportarDados/ExportarDados';
import FormatacaoSAP from './pages/FormatacaoSAP/FormatacaoSAP';
import Configuracoes from './pages/Configuracoes/Configuracoes';

// --- PÁGINAS DO CLIENTE ---
import FazerSolicitacao from './pages/Cliente/FazerSolicitacao/FazerSolicitacao';
import ConsultaEstoque from './pages/Cliente/ConsultaEstoque/ConsultaEstoque';
import AcompanhamentoSolicitacoes from './pages/Client/AcompanhamentoSolicitacoes/AcompanhamentoSolicitacoes';

export const router = createBrowserRouter([
  { path: "/", element: <CentralDeOperacoes /> },
  { path: "/selecionar-filial", element: <SelecionarFilial /> },
  { path: "/login", element: <LoginLogistica /> },
  
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

  // ÁREA DA LOGÍSTICA (PROTEGIDA!)
  {
    path: "/logistica",
    // O ProtectedRoute garante que SÓ Operadores e ADMs passem daqui pra baixo
    element: <ProtectedRoute allowedRoles={['OPERADOR', 'ADM']} />, 
    children: [
      {
        element: <AppLayout modulo="logistica" />, 
        children: [
          { path: "painel", element: <PainelGeralSolicitacoes /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "PainelAprovacao", element: <PainelAprovacao /> },
          { path: "entrada-estoque", element: <EntradaEstoque /> },
          { path: "traceabilly", element: <Traceabilly /> },
          { path: "exportar", element: <ExportarDados /> },
          { path: "formatacao-sap", element: <FormatacaoSAP /> },
          
          // Exemplo de rota ultra-restrita: Só ADM pode acessar as configurações
          { 
            element: <ProtectedRoute allowedRoles={['ADM']} />,
            children: [
              { path: "configuracoes", element: <Configuracoes /> }
            ]
          }
        ]
      }
    ]
  }
]);