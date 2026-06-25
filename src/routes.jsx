import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Importação do Layout
import AppLayout from './components/Layout/AppLayout';

// Importação das tuas Páginas
import PainelGeral from './pages/PainelGeral/PainelGeral';
import Dashboard from './pages/Dashboard/Dashboard';
import EntradaEstoque from './pages/EntradaEstoque/EntradaEstoque';
import Traceabilly from './pages/Traceabilly/Traceabilly';
import ExportarDados from './pages/ExportarDados/ExportarDados';
import FormatacaoSAP from './pages/FormatacaoSAP/FormatacaoSAP';
import Configuracoes from './pages/Configuracoes/Configuracoes';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />, // O AppLayout envolve tudo aqui dentro
    children: [
      { path: "/", element: <PainelGeral /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/entrada-estoque", element: <EntradaEstoque /> },
      { path: "/traceabilly", element: <Traceabilly /> },
      { path: "/exportar", element: <ExportarDados /> },
      { path: "/formatacao-sap", element: <FormatacaoSAP /> },
      { path: "/configuracoes", element: <Configuracoes /> }
    ]
  }
]);