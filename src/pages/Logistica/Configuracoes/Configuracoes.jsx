// =================================================================
// ARQUIVO: src/pages/Logistica/Configuracoes/Configuracoes.jsx
// DESCRIÇÃO: Painel de configurações organizador com Tempo Real
// =================================================================

import React, { useState, useEffect, useContext } from 'react';
import './Configuracoes.css';
import { Target, Users, Building } from 'lucide-react';

import { useAlert } from '../../../contexts/AlertContext';
import { AuthContext } from '../../../contexts/AuthContext'; // ✨ Para atualizar o Header
import { io } from 'socket.io-client'; // ✨ TEMPO REAL

// Importação das Abas Separadas
import CadastroFiliais from './Abas/CadastroFiliais';
import GestaoPerfis from './Abas/GestaoPerfis';
import TargetEficiencia from './Abas/TargetEficiencia';

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('filiais'); 
  const { showAlert } = useAlert();
  
  // ✨ Trazemos a função que atualiza as filiais globais no Header
  const { atualizarFiliaisGlobais } = useContext(AuthContext);

  // ✨ GATILHO DE ATUALIZAÇÃO: Quando este número mudar, as abas recarregam os dados
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const SOCKET_URL = API_URL.replace(/\/api\/?$/, ''); 

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('🟢 Configurações conectadas ao Tempo Real!');
    });

    // Se alguém editar as filiais
    socket.on('filiais_atualizadas', () => {
      console.log('⚡ Filiais atualizadas! A atualizar o sistema...');
      setRefreshKey(prev => prev + 1); // Força a aba a recarregar
      atualizarFiliaisGlobais();       // Atualiza a lista do cabeçalho (Header) na hora!
    });

    // Se alguém editar os utilizadores
    socket.on('usuarios_atualizados', () => {
      console.log('⚡ Utilizadores atualizados! A atualizar a tela...');
      setRefreshKey(prev => prev + 1);
    });

    // Se alguém mudar o target
    socket.on('configuracoes_atualizadas', () => {
      console.log('⚡ Target de eficiência atualizado!');
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [atualizarFiliaisGlobais]);

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

      {/* Passamos o gatilho para as abas saberem quando atualizar */}
      {abaAtiva === 'filiais' && <CadastroFiliais refreshKey={refreshKey} />}
      {abaAtiva === 'perfis' && <GestaoPerfis refreshKey={refreshKey} />}
      {abaAtiva === 'target' && <TargetEficiencia refreshKey={refreshKey} />}
    </div>
  );
}