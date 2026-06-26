import React from 'react';
import { Outlet } from 'react-router-dom';

// A correção está aqui: usamos '../' para voltar uma pasta para trás
import Sidebar from './components/Sidebar/Sidebar';

export default function AppLayout({ modulo }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      
      {/* Passamos o "modulo" para a Sidebar saber qual menu desenhar! */}
      <Sidebar modulo={modulo} />
      
      <main style={{ flex: 1, overflowX: 'hidden' }}>
        <Outlet />
      </main>
      
    </div>
  );
}