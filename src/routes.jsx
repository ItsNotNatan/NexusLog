import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Importação do Layout
import AppLayout from './components/Layout/AppLayout';

// Importação das tuas Páginas
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import SelecionarFilial from './pages/SelecionarFilial/SelecionarFilial';
import PainelGeral from './pages/PainelGeral/PainelGeral';
import Dashboard from './pages/Dashboard/Dashboard';
import EntradaEstoque from './pages/EntradaEstoque/EntradaEstoque';
import Traceabilly from './pages/Traceabilly/Traceabilly';
import ExportarDados from './pages/ExportarDados/ExportarDados';
import FormatacaoSAP from './pages/FormatacaoSAP/FormatacaoSAP';
import Configuracoes from './pages/Configuracoes/Configuracoes';

export const router = createBrowserRouter([
  {
    // 1. PRIMEIRA TELA: Central de Operações
    path: "/",
    element: <CentralDeOperacoes />
  },
  {
    // 2. SEGUNDA TELA: Selecionar Filial (Chegamos aqui clicando na Central)
    path: "/selecionar-filial",
    element: <SelecionarFilial />
  },
  {
    // 3. O SISTEMA EM SI: Layout com Barra Lateral
    element: <AppLayout />, 
    children: [
      { path: "/painel", element: <PainelGeral /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/entrada-estoque", element: <EntradaEstoque /> },
      { path: "/traceabilly", element: <Traceabilly /> },
      { path: "/exportar", element: <ExportarDados /> },
      { path: "/formatacao-sap", element: <FormatacaoSAP /> },
      { path: "/configuracoes", element: <Configuracoes /> }
    ]
  }
]);