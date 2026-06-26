import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';

// 1. Recebemos o "modulo" aqui em cima
export default function AppLayout({ modulo }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      
      {/* 2. Passamos o "modulo" para a Sidebar saber qual menu desenhar! */}
      <Sidebar modulo={modulo} />
      
      <main style={{ flex: 1, overflowX: 'hidden' }}>
        <Outlet />
      </main>
      
    </div>
  );
}