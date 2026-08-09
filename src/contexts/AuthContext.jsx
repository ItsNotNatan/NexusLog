// =================================================================
// ARQUIVO: src/contexts/AuthContext.jsx
// DESCRIÇÃO: Gestão global do estado de autenticação e filial ativa
// =================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [carregandoInicial, setCarregandoInicial] = useState(true);

  // 1. RESTAURA A SESSÃO AO CARREGAR A PÁGINA (F5)
  useEffect(() => {
    const tokenSalvo = localStorage.getItem('@NexusLog:token');
    const usuarioSalvo = localStorage.getItem('@NexusLog:usuario');
    const filialSalva = localStorage.getItem('@NexusLog:filialAtiva');

    // ✨ A CORREÇÃO ESTÁ AQUI:
    // Lemos a filial do navegador para TODOS (clientes públicos e funcionários).
    // Se não houver nenhuma guardada no navegador, forçamos o 'TODOS' por padrão.
    setEstoqueAtual(filialSalva || 'TODOS');

    // Recupera os dados do utilizador apenas se houver login
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
  }, []);

  // 2. FUNÇÃO DE LOGIN
  const login = async (dadosUsuario, tokenRecebido) => {
    setUsuario(dadosUsuario);
    setToken(tokenRecebido);

    const filialInicial = dadosUsuario.filial || (dadosUsuario.filiais_acesso && dadosUsuario.filiais_acesso[0]) || '';
    setEstoqueAtual(filialInicial);

    localStorage.setItem('@NexusLog:token', tokenRecebido);
    localStorage.setItem('@NexusLog:usuario', JSON.stringify(dadosUsuario));
    localStorage.setItem('@NexusLog:filialAtiva', filialInicial);
  };

  // 3. FUNÇÃO DE LOGOUT
  const logout = () => {
    setUsuario(null);
    setToken(null);
    // ✨ Ao sair, garantimos que volta para a visão de cliente restrita
    setEstoqueAtual('TODOS'); 

    localStorage.removeItem('@NexusLog:token');
    localStorage.removeItem('@NexusLog:usuario');
    localStorage.removeItem('@NexusLog:filialAtiva');
  };

  // 4. TROCAR FILIAL ATIVA (Guarda no estado e no navegador)
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
      carregandoInicial
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);