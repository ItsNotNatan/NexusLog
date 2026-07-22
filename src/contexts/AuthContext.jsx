import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);

  // Quando o app carrega, verifica se já tem alguém logado (salvo no LocalStorage)
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('@NexusLog:usuario');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
  }, []);

  // Função para salvar o usuário ao fazer login
  const login = (dadosUsuario) => {
    setUsuario(dadosUsuario);
    localStorage.setItem('@NexusLog:usuario', JSON.stringify(dadosUsuario));
  };

  // Função para sair do sistema
  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('@NexusLog:usuario');
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};