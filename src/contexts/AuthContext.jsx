// =================================================================
// ARQUIVO: src/contexts/AuthContext.jsx
// DESCRIÇÃO: Gestão global do estado de autenticação e filiais do sistema
// =================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, urlDoServidor } from '../services/api';
import { io } from 'socket.io-client'; // ✨ IMPORTAÇÃO DO SOCKET NO CONTEXTO GLOBAL

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  
  const [filiaisGlobais, setFiliaisGlobais] = useState([]);

  const atualizarFiliaisGlobais = async () => {
    try {
      const resFiliais = await apiFetch('/filiais/listar');
      if (resFiliais.sucesso) {
        setFiliaisGlobais(resFiliais.dados);
      }
    } catch (error) {
      console.error("Erro ao atualizar filiais globais", error);
    }
  };

  // 1. CARREGAMENTO INICIAL DO SISTEMA
  useEffect(() => {
    const iniciarSistema = async () => {
      await atualizarFiliaisGlobais();

      const tokenSalvo = localStorage.getItem('@NexusLog:token');
      const usuarioSalvo = localStorage.getItem('@NexusLog:usuario');
      const filialSalva = localStorage.getItem('@NexusLog:filialAtiva');

      setEstoqueAtual(filialSalva || 'TODOS');

      if (tokenSalvo && usuarioSalvo) {
        try {
          if (usuarioSalvo !== 'undefined') {
            const usuarioObj = JSON.parse(usuarioSalvo);
            setToken(tokenSalvo);
            setUsuario(usuarioObj);
          }
        } catch (e) {
          console.warn("Sessão corrompida, a limpar dados.");
          localStorage.removeItem('@NexusLog:usuario');
          localStorage.removeItem('@NexusLog:token');
        }
      }
      setCarregandoInicial(false);
    };

    iniciarSistema();
  }, []);

  // ✨ 2. RADAR GLOBAL: Ouve as filiais em tempo real de qualquer ecrã!
  useEffect(() => {
    const SOCKET_URL = urlDoServidor();
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('filiais_atualizadas', () => {
      console.log('⚡ AuthContext: Uma filial foi adicionada ou apagada! A sincronizar...');
      atualizarFiliaisGlobais();
    });

    return () => socket.disconnect();
  }, []);

  const login = async (dadosUsuario, tokenRecebido) => {
    setUsuario(dadosUsuario);
    setToken(tokenRecebido);

    const filialInicial = dadosUsuario.filial || (dadosUsuario.filiais_acesso && dadosUsuario.filiais_acesso[0]) || '';
    setEstoqueAtual(filialInicial);

    localStorage.setItem('@NexusLog:token', tokenRecebido);
    localStorage.setItem('@NexusLog:usuario', JSON.stringify(dadosUsuario));
    localStorage.setItem('@NexusLog:filialAtiva', filialInicial);
  };

  const logout = () => {
    setUsuario(null);
    setToken(null);
    setEstoqueAtual('TODOS'); 

    localStorage.removeItem('@NexusLog:token');
    localStorage.removeItem('@NexusLog:usuario');
    localStorage.removeItem('@NexusLog:filialAtiva');
  };

  const MudarFilial = (novaFilialId) => {
    setEstoqueAtual(novaFilialId);
    localStorage.setItem('@NexusLog:filialAtiva', novaFilialId);
  };

  return (
    <AuthContext.Provider value={{
      signed: !!usuario,
      usuario,
      token,
      estoqueAtual,                  
      setEstoqueAtual: MudarFilial,  
      login,
      logout,
      carregandoInicial,
      filiaisGlobais,
      atualizarFiliaisGlobais 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);