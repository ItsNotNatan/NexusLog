import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Quando a página carrega, verifica se o usuário já tinha logado antes
    const userSalvo = localStorage.getItem('nexus_user');
    if (userSalvo) {
      const parsed = JSON.parse(userSalvo);
      setUser(parsed);
      setRole(parsed.cargo);
    }
    setLoading(false);
  }, []);

  // Função para fazer o login manual
  const loginManual = (dadosUsuario) => {
    localStorage.setItem('nexus_user', JSON.stringify(dadosUsuario));
    setUser(dadosUsuario);
    setRole(dadosUsuario.cargo);
  };

  // Função para sair
  const logoutManual = () => {
    localStorage.removeItem('nexus_user');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginManual, logoutManual }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);