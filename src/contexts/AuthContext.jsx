// =================================================================
// ARQUIVO: src/contexts/AuthContext.jsx
// DESCRIÇÃO: Gestão global do estado de autenticação e filiais do sistema
// =================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  
  const [filiaisGlobais, setFiliaisGlobais] = useState([]);

  // ✨ EXTRAÍMOS A FUNÇÃO PARA PODER SER CHAMADA DE FORA
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

  useEffect(() => {
    const iniciarSistema = async () => {
      // 1. Vai buscar as filiais à base de dados logo de início
      await atualizarFiliaisGlobais();

      // 2. Lê a sessão do utilizador
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
      atualizarFiliaisGlobais // ✨ AGORA A FUNÇÃO ESTÁ DISPONÍVEL GLOBALMENTE
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);