// =================================================================
// ARQUIVO: src/pages/Logistica/Configuracoes/Configuracoes.jsx
// DESCRIÇÃO: Painel de configurações organizador com Tempo Real
// =================================================================

import React, { useState, useEffect, useContext } from 'react';
import './Configuracoes.css';
import { Target, Users, Building, Database } from 'lucide-react'; // ✨ Novo ícone adicionado

import { useAlert } from '../../../contexts/AlertContext';
import { AuthContext } from '../../../contexts/AuthContext';
import { io } from 'socket.io-client';

// Importação das Abas Separadas
import CadastroFiliais from './Abas/CadastroFiliais';
import GestaoPerfis from './Abas/GestaoPerfis';
import TargetEficiencia from './Abas/TargetEficiencia';
import ImportarEstoqueBase from './Abas/ImportarEstoqueBase'; // ✨ Nova aba que vamos criar
import { urlDoServidor } from '../../../services/api';

export default function Configuracoes() {
  const [abaAtiva, setAbaAtiva] = useState('filiais'); 
  const { showAlert } = useAlert();
  
  const { atualizarFiliaisGlobais } = useContext(AuthContext);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const SOCKET_URL = urlDoServidor();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('🟢 Configurações conectadas ao Tempo Real!');
    });

    socket.on('filiais_atualizadas', () => {
      console.log('⚡ Filiais atualizadas! A atualizar o sistema...');
      setRefreshKey(prev => prev + 1); 
      atualizarFiliaisGlobais();       
    });

    socket.on('usuarios_atualizados', () => {
      console.log('⚡ Utilizadores atualizados! A atualizar a tela...');
      setRefreshKey(prev => prev + 1);
    });

    socket.on('configuracoes_atualizadas', () => {
      console.log('⚡ Target de eficiência atualizado!');
      setRefreshKey(prev => prev + 1);
    });

    // Se houver importação massiva, também avisa
    socket.on('estoque_atualizado', () => {
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [atualizarFiliaisGlobais]);

  const estiloBotao = (aba) => ({
    background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
    color: abaAtiva === aba ? '#0056b3' : '#6b7280',
    borderBottom: abaAtiva === aba ? '3px solid #0056b3' : '3px solid transparent',
    transition: 'all 0.2s'
  });

  return (
    <div className="config-wrapper">
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', overflowX: 'auto' }}>
        <button onClick={() => setAbaAtiva('filiais')} style={estiloBotao('filiais')}>
          <Building size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Cadastro de Filiais
        </button>

        <button onClick={() => setAbaAtiva('perfis')} style={estiloBotao('perfis')}>
          <Users size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Gestão de Perfis
        </button>

        <button onClick={() => setAbaAtiva('target')} style={estiloBotao('target')}>
          <Target size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Target de Eficiência
        </button>

        {/* ✨ NOVA ABA ADICIONADA */}
        <button onClick={() => setAbaAtiva('importar')} style={estiloBotao('importar')}>
          <Database size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Importar Base Inicial
        </button>
      </div>

      {abaAtiva === 'filiais' && <CadastroFiliais refreshKey={refreshKey} />}
      {abaAtiva === 'perfis' && <GestaoPerfis refreshKey={refreshKey} />}
      {abaAtiva === 'target' && <TargetEficiencia refreshKey={refreshKey} />}
      {abaAtiva === 'importar' && <ImportarEstoqueBase refreshKey={refreshKey} />}
    </div>
  );
}
