import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Importação do Layout
import AppLayout from './components/Layout/AppLayout';

// Importação das tuas Páginas
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import SelecionarFilial from './pages/SelecionarFilial/SelecionarFilial'; // <-- Importamos a nova tela
import PainelGeral from './pages/PainelGeral/PainelGeral';
import Dashboard from './pages/Dashboard/Dashboard';
import EntradaEstoque from './pages/EntradaEstoque/EntradaEstoque';
import Traceabilly from './pages/Traceabilly/Traceabilly';
import ExportarDados from './pages/ExportarDados/ExportarDados';
import FormatacaoSAP from './pages/FormatacaoSAP/FormatacaoSAP';
import Configuracoes from './pages/Configuracoes/Configuracoes';

export const router = createBrowserRouter([
  {
    // Tela Inicial
    path: "/",
    element: <CentralDeOperacoes />
  },
  {
    // Tela de Selecionar Filial (Sem barra lateral)
    path: "/selecionar-filial",
    element: <SelecionarFilial />
  },
  {
    // Layout com Barra Lateral
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