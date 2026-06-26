import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';

// Recebemos a prop 'modulo' que vem lá do routes.jsx
export default function AppLayout({ modulo }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      
      {/* Passamos o "modulo" para a Sidebar saber qual menu desenhar! */}
      <Sidebar modulo={modulo} />
      
      {/* Direita: O conteúdo dinâmico (As tuas páginas) */}
      <main style={{ flex: 1, overflowX: 'hidden' }}>
        <Outlet />
      </main>
      
    </div>
  );
}