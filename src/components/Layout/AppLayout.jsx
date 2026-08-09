// =================================================================
// ARQUIVO: src/components/Layout/AppLayout.jsx
// DESCRIÇÃO: "App Shell" - Layout profissional com Cabeçalho fixo e Scroll interno
// =================================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header'; 

export default function AppLayout({ modulo }) {
  return (
    // ✨ CORREÇÃO 1: 'position: fixed' e as coordenadas a 0 prendem a aplicação aos limites exatos do ecrã!
    // Isto ignora qualquer margem do navegador e impede o scroll da janela inteira.
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', backgroundColor: '#f4f5f7', overflow: 'hidden' }}>
      
      {/* Esquerda: Menu Lateral (Sidebar) */}
      <Sidebar modulo={modulo} />
      
      {/* Direita: Coluna que guarda o Cabeçalho e as Páginas */}
      {/* ✨ CORREÇÃO 2: Adicionámos 'overflow: hidden' aqui para que esta coluna nunca estique mais do que deve */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        
        {/* O CABEÇALHO (Header) */}
        {/* Adicionei uma pequena sombra (boxShadow) para dar um destaque profissional quando a página rolar por baixo */}
        <div style={{ zIndex: 50, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Header modulo={modulo} /> 
        </div>
        
        {/* O ENVELOPE DAS PÁGINAS (Main) */}
        {/* Apenas esta área tem permissão para fazer scroll vertical */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </main>

      </div>
      
    </div>
  );
}