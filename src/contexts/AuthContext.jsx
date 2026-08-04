// =================================================================
// ARQUIVO: src/contexts/AuthContext.jsx
// DESCRIÇÃO: Gestão global do estado de autenticação e filial ativa
// =================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [filialSelecionada, setFilialSelecionada] = useState('');
  const [carregandoInicial, setCarregandoInicial] = useState(true);

  // 1. RESTAURA A SESSÃO AO CARREGAR A PÁGINA
// 1. RESTAURA A SESSÃO AO CARREGAR A PÁGINA
  useEffect(() => {
    const tokenSalvo = localStorage.getItem('@NexusLog:token');
    const usuarioSalvo = localStorage.getItem('@NexusLog:usuario');
    const filialSalva = localStorage.getItem('@NexusLog:filialAtiva');

    if (tokenSalvo && usuarioSalvo) {
      try {
        // Verifica se o valor não é a string 'undefined' antes de fazer o parse
        if (usuarioSalvo !== 'undefined') {
          const usuarioObj = JSON.parse(usuarioSalvo);
          setToken(tokenSalvo);
          setUsuario(usuarioObj);
          setFilialSelecionada(filialSalva || usuarioObj.filial || '');
        }
      } catch (e) {
        console.warn("Sessão corrompida, a limpar dados.");
        localStorage.removeItem('@NexusLog:usuario');
        localStorage.removeItem('@NexusLog:token');
      }
    }

    setCarregandoInicial(false);
  }, []);

  // 2. FUNÇÃO DE LOGIN (Chamada pelo LoginLogistica.jsx)
  const login = async (dadosUsuario, tokenRecebido) => {
    // Guarda o token e o utilizador no estado do React
    setUsuario(dadosUsuario);
    setToken(tokenRecebido);

    // Define a filial inicial (se tiver acesso a filiais)
    const filialInicial = dadosUsuario.filial || (dadosUsuario.filiais_acesso && dadosUsuario.filiais_acesso[0]) || '';
    setFilialSelecionada(filialInicial);

    // 🛡️ CHAVES OFICIAIS NO LOCALSTORAGE:
    localStorage.setItem('@NexusLog:token', tokenRecebido);
    localStorage.setItem('@NexusLog:usuario', JSON.stringify(dadosUsuario));
    localStorage.setItem('@NexusLog:filialAtiva', filialInicial);
  };

  // 3. FUNÇÃO DE LOGOUT
  const logout = () => {
    setUsuario(null);
    setToken(null);
    setFilialSelecionada('');

    // Limpa todas as chaves da sessão
    localStorage.removeItem('@NexusLog:token');
    localStorage.removeItem('@NexusLog:usuario');
    localStorage.removeItem('@NexusLog:filialAtiva');
  };

  // 4. TROCAR FILIAL ATIVA
  const MudarFilial = (novaFilialId) => {
    setFilialSelecionada(novaFilialId);
    localStorage.setItem('@NexusLog:filialAtiva', novaFilialId);
  };

  return (
    <AuthContext.Provider value={{
      signed: !!usuario,
      usuario,
      token,
      filialSelecionada,
      login,
      logout,
      MudarFilial,
      carregandoInicial
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);