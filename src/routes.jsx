import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Importação do Layout Base
import AppLayout from './components/Layout/AppLayout';

// Importação das Páginas de Entrada (Sem barra lateral)
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import SelecionarFilial from './pages/SelecionarFilial/SelecionarFilial';

// Importação das tuas Páginas Internas Existentes
import PainelGeral from './pages/PainelGeral/PainelGeral';
import Dashboard from './pages/Dashboard/Dashboard';
import EntradaEstoque from './pages/EntradaEstoque/EntradaEstoque';
import Traceabilly from './pages/Traceabilly/Traceabilly';
import ExportarDados from './pages/ExportarDados/ExportarDados';
import FormatacaoSAP from './pages/FormatacaoSAP/FormatacaoSAP';
import Configuracoes from './pages/Configuracoes/Configuracoes';

// --- IMPORTAÇÃO DAS TRÊS NOVAS PÁGINAS ---
import FazerSolicitacao from './pages/FazerSolicitacao/FazerSolicitacao';
import ConsultaEstoque from './pages/ConsultaEstoque/ConsultaEstoque';
import AcompanhamentoSolicitacoes from './pages/AcompanhamentoSolicitacoes/AcompanhamentoSolicitacoes';

export const router = createBrowserRouter([
  {
    // Portal de entrada 1
    path: "/",
    element: <CentralDeOperacoes />
  },
  {
    // Portal de entrada 2
    path: "/selecionar-filial",
    element: <SelecionarFilial />
  },
  {
    // Layout que envolve todas as páginas internas com a barra lateral (Sidebar)
    element: <AppLayout />, 
    children: [
      { path: "/painel", element: <PainelGeral /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/entrada-estoque", element: <EntradaEstoque /> },
      { path: "/traceabilly", element: <Traceabilly /> },
      { path: "/exportar", element: <ExportarDados /> },
      { path: "/formatacao-sap", element: <FormatacaoSAP /> },
      { path: "/configuracoes", element: <Configuracoes /> },
      
      // --- NOVAS ROTAS ADICIONADAS AQUI ---
      { path: "/fazer-solicitacao", element: <FazerSolicitacao /> },
      { path: "/consulta-estoque", element: <ConsultaEstoque /> },
      { path: "/acompanhamento-solicitacoes", element: <AcompanhamentoSolicitacoes /> }
    ]
  }
]);