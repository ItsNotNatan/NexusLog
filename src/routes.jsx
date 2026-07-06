import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'; // <-- Importe o segurança
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import SelecionarFilial from './pages/SelecionarFilial/SelecionarFilial';
import LoginLogistica from './pages/LoginLogistica/LoginLogistica'; // <-- Certifique-se de importar o login

// ... (importe as outras páginas normalmente) ...

export const router = createBrowserRouter([
  { path: "/", element: <CentralDeOperacoes /> },
  { path: "/selecionar-filial", element: <SelecionarFilial /> },
  { path: "/login", element: <LoginLogistica /> }, // <-- Rota de login pública
  
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
          // ... outras rotas normais ...
          
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
  // ... rotas de cliente (se houver) ...
]);