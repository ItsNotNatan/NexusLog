import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      
      {/* Esquerda: Barra de Navegação */}
      <Sidebar />
      
      {/* Direita: O conteúdo dinâmico (As tuas páginas) */}
      <main style={{ flex: 1, overflowX: 'hidden' }}>
        <Outlet />
      </main>
      
    </div>
  );
}