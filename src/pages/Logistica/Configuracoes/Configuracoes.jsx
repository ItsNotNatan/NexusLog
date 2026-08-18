// =================================================================
// ARQUIVO: src/pages/Logistica/Configuracoes/Configuracoes.jsx
// DESCRIÇÃO: Painel de configurações organizador
// =================================================================

import React, { useState } from 'react';
import './Configuracoes.css';
import { Target, Users, Building } from 'lucide-react';

// Importação das Abas Separadas
import CadastroFiliais from './Abas/CadastroFiliais';
import GestaoPerfis from './Abas/GestaoPerfis';
import TargetEficiencia from './Abas/TargetEficiencia';

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('filiais'); 

  return (
    <div className="config-wrapper">
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', overflowX: 'auto' }}>
        <button 
          onClick={() => setAbaAtiva('filiais')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'filiais' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'filiais' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Building size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Cadastro de Filiais
        </button>

        <button 
          onClick={() => setAbaAtiva('perfis')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'perfis' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'perfis' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Gestão de Perfis
        </button>

        <button 
          onClick={() => setAbaAtiva('target')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'target' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'target' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Target size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Target de Eficiência
        </button>
      </div>

      {abaAtiva === 'filiais' && <CadastroFiliais />}
      {abaAtiva === 'perfis' && <GestaoPerfis />}
      {abaAtiva === 'target' && <TargetEficiencia />}
    </div>
  );
}