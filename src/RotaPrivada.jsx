import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// ✨ RADAR ANTI-ERRO VITE: Interceta erros de cache e recarrega a página silenciosamente
window.addEventListener('unhandledrejection', (evento) => {
  if (evento.reason && evento.reason.message && evento.reason.message.includes('Failed to fetch dynamically')) {
    evento.preventDefault();
    window.location.reload();
  }
});

window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

export default function RotaPrivada() {
  // 1. O "segurança" procura o crachá (token) no cofre do navegador
  const token = localStorage.getItem('@NexusLog:token');

  // 2. Se o token existir, ele abre a porta (renderiza o <Outlet />, que são as tuas páginas)
  // Se não existir, ele redireciona a pessoa para a página inicial de Login ("/")
  return token ? <Outlet /> : <Navigate to="/" replace />;
}
