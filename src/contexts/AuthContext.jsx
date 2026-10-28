// =================================================================
// ARQUIVO: src/contexts/AuthContext.jsx
// DESCRIÇÃO: Gestão global do estado de autenticação e filiais do sistema
// =================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, urlDoServidor } from '../services/api';
import { io } from 'socket.io-client'; 

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

  // 2. RADAR GLOBAL: Ouve as filiais em tempo real
  useEffect(() => {
    const SOCKET_URL = urlDoServidor();
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('filiais_atualizadas', () => {
      console.log('⚡ AuthContext: Uma filial foi adicionada ou apagada! A sincronizar...');
      atualizarFiliaisGlobais();
    });

    return () => socket.disconnect();
  }, []);

  const logout = () => {
    setUsuario(null);
    setToken(null);
    setEstoqueAtual('TODOS'); 

    localStorage.removeItem('@NexusLog:token');
    localStorage.removeItem('@NexusLog:usuario');
    localStorage.removeItem('@NexusLog:filialAtiva');
  };

  // ✨ 3. GESTOR DE INATIVIDADE E SESSÃO EXPIRADA
  useEffect(() => {
    // Só monitorizamos a inatividade se houver alguém logado
    if (!usuario) return;

    const TEMPO_LIMITE_MS = 30 * 60 * 1000; // 30 minutos de inatividade máxima
    let timeoutInatividade;

    const forcarLogoutEAlertar = (mensagem) => {
      logout();
      window.alert(mensagem);
      window.location.href = '/login';
    };

    // A - Cronómetro de Inatividade Física (Rato/Teclado)
    const resetarTimer = () => {
      if (timeoutInatividade) clearTimeout(timeoutInatividade);
      timeoutInatividade = setTimeout(() => {
        forcarLogoutEAlertar('A sua sessão expirou por inatividade. Por favor, faça login novamente.');
      }, TEMPO_LIMITE_MS);
    };

    const eventosAtividade = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    eventosAtividade.forEach(evento => window.addEventListener(evento, resetarTimer));
    resetarTimer(); // Arranca o cronómetro imediatamente

    // B - Ouvinte do erro 401/403 disparado pela API (Tokens caducados)
    const lidarComErroDaAPI = (e) => {
      const msgErro = e.detail?.erro || 'A sua sessão expirou por segurança. Por favor, faça login novamente.';
      forcarLogoutEAlertar(msgErro);
    };

    window.addEventListener('nexuslog:sessao-expirada', lidarComErroDaAPI);

    // Limpeza ao desmontar ou ao deslogar
    return () => {
      if (timeoutInatividade) clearTimeout(timeoutInatividade);
      eventosAtividade.forEach(evento => window.removeEventListener(evento, resetarTimer));
      window.removeEventListener('nexuslog:sessao-expirada', lidarComErroDaAPI);
    };
  }, [usuario]); // O useEffect reage sempre que o estado 'usuario' muda (entra ou sai)

  const login = async (dadosUsuario, tokenRecebido) => {
    setUsuario(dadosUsuario);
    setToken(tokenRecebido);

    const filialInicial = dadosUsuario.filial || (dadosUsuario.filiais_acesso && dadosUsuario.filiais_acesso[0]) || '';
    setEstoqueAtual(filialInicial);

    localStorage.setItem('@NexusLog:token', tokenRecebido);
    localStorage.setItem('@NexusLog:usuario', JSON.stringify(dadosUsuario));
    localStorage.setItem('@NexusLog:filialAtiva', filialInicial);
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
