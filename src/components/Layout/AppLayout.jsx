import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header'; // 👈 Importamos o Cabeçalho

export default function AppLayout({ modulo }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f5f7' }}>
      
      {/* Esquerda: Menu Lateral */}
      <Sidebar modulo={modulo} />
      
      {/* Direita: Cabeçalho + O conteúdo dinâmico (As páginas) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        
        <Header /> {/* 👈 Injetamos o cabeçalho no topo de todas as telas */}
        
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
      
    </div>
  );
}