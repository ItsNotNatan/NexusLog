import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// ----------------------------------------------------------------------
// 1. CARREGAMENTO IMEDIATO (Layouts, Guardiões e Login devem ser instantâneos)
// ----------------------------------------------------------------------
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import RequerFilialEspecifica from './components/RequerFilialEspecifica/RequerFilialEspecifica';
import CentralDeOperacoes from './pages/CentralOperacoes/CentralOperacoes';
import LoginLogistica from './pages/LoginLogistica/LoginLogistica';

// ----------------------------------------------------------------------
// 2. LAZY LOADING (Carregamento "Preguiçoso" sob demanda)
// Só baixa o código destas páginas quando o utilizador clica para abri-las.
// ----------------------------------------------------------------------
const EsqueciSenha = React.lazy(() => import('./pages/RecuperarSenha/EsqueciSenha'));
const RedefinirSenha = React.lazy(() => import('./pages/RecuperarSenha/RedefinirSenha'));

// --- LOGÍSTICA ---
const Dashboard = React.lazy(() => import('./pages/Logistica/Dashboard/Dashboard'));
const PainelAprovacao = React.lazy(() => import('./pages/Logistica/PainelAprovacao/PainelAprovacao'));
const EntradaEstoque = React.lazy(() => import('./pages/Logistica/EntradaEstoque/EntradaEstoque'));
const Traceabilly = React.lazy(() => import('./pages/Logistica/Traceabilly/Traceabilly'));
const ExportarDados = React.lazy(() => import('./pages/Logistica/ExportarDados/ExportarDados'));
const FormatacaoSAP = React.lazy(() => import('./pages/Logistica/FormatacaoSAP/FormatacaoSAP'));
const Configuracoes = React.lazy(() => import('./pages/Logistica/Configuracoes/Configuracoes'));
const RotaColeta = React.lazy(() => import('./pages/Logistica/RotaColeta/RotaColeta'));
const VisaoGeralEstoque = React.lazy(() => import('./pages/Logistica/VisaoGeralEstoque/VisaoGeralEstoque'));
const TransferenciaEstoque = React.lazy(() => import('./pages/Logistica/TransferenciaEstoque/TransferenciaEstoque'));

// --- CLIENTE ---
const FazerSolicitacao = React.lazy(() => import('./pages/Cliente/FazerSolicitacao/FazerSolicitacao'));
const AcompanhamentoSolicitacoes = React.lazy(() => import('./pages/Cliente/AcompanhamentoSolicitacoes/AcompanhamentoSolicitacoes'));

// ----------------------------------------------------------------------
// COMPONENTE DE ESPERA (Aparece por milissegundos enquanto o código é baixado)
// ----------------------------------------------------------------------
const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', color: '#64748b', flexDirection: 'column', gap: '12px' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <span style={{ fontSize: '14px', fontWeight: '500' }}>A carregar módulo...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Helper para encapsular o Suspense facilmente
const Lazy = (Component, props = {}) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component {...props} />
  </Suspense>
);


export const router = createBrowserRouter([
  { path: "/", element: <CentralDeOperacoes /> },
  { path: "/login", element: <LoginLogistica /> },
  { path: "/esqueci-senha", element: Lazy(EsqueciSenha) },
  { path: "/redefinir-senha", element: Lazy(RedefinirSenha) },

  // ==========================================
  // 🟢 ÁREA DO CLIENTE (AGORA PÚBLICA / LIVRE DE LOGIN)
  // ==========================================
  {
    path: "/cliente",
    element: <AppLayout modulo="cliente" />, 
    children: [
      // 1. ROTA LIVRE: A consulta de estoque permite a visualização de "TODOS"
      { path: "consulta-estoque", element: Lazy(VisaoGeralEstoque, { perfil: "cliente" }) },
      
      // 2. ROTAS RESTRITAS: O nosso guardião envolve as páginas que exigem uma filial específica
      {
        element: <RequerFilialEspecifica />,
        children: [
          { path: "fazer-solicitacao", element: Lazy(FazerSolicitacao) },
          { path: "acompanhamento-solicitacoes", element: Lazy(AcompanhamentoSolicitacoes, { perfil: "cliente" }) },
          { path: "rastreabilidade", element: Lazy(Traceabilly, { perfil: "cliente" }) }
        ]
      }
    ]
  },

  // ==========================================
  // 🔴 ÁREA DA LOGÍSTICA (PROTEGIDA!)
  // ==========================================
  {
    path: "/logistica",
    // 🛡️ 1º Escudo: O utilizador TEM de ser da logística (Operador, Líder ou ADM)
    element: <ProtectedRoute allowedRoles={['OPERADOR', 'LIDER', 'ADM']} />,
    children: [
      {
        element: <AppLayout modulo="logistica" />,
        children: [

          // --- ROTAS NÍVEL 1 (Acesso de Operador, Líder e ADM) ---
          { path: "entrada-estoque", element: Lazy(EntradaEstoque) },
          { path: "formatacao-sap", element: Lazy(FormatacaoSAP) },
          { path: "traceabilly", element: Lazy(Traceabilly, { perfil: "logistica" }) },
          { path: "painel", element: Lazy(AcompanhamentoSolicitacoes, { perfil: "logistica" }) },
          { path: "visao-geral", element: Lazy(VisaoGeralEstoque) },
          { path: "transferencia-estoque", element: Lazy(TransferenciaEstoque) },

          {
            // 🛡️ 2º Escudo: A partir daqui, Operador é barrado! Só Líder e ADM passam.
            element: <ProtectedRoute allowedRoles={['LIDER', 'ADM']} />,
            children: [
              { path: "dashboard", element: Lazy(Dashboard) },
              { path: "PainelAprovacao", element: Lazy(PainelAprovacao) },
              { path: "exportar", element: Lazy(ExportarDados) },
              { path: "rota-coleta", element: Lazy(RotaColeta) },

              {
                // 🛡️ 3º Escudo: A partir daqui, Líder é barrado! Só ADM entra.
                element: <ProtectedRoute allowedRoles={['ADM']} />,
                children: [
                  { path: "configuracoes", element: Lazy(Configuracoes) }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]);
