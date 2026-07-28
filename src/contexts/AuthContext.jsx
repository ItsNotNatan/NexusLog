import React, { createContext, useState, useEffect, useContext } from 'react';

// Criando o contexto
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null); // ✨ CORREÇÃO 1: Adicionamos um estado para guardar o token na memória do React
  const [loading, setLoading] = useState(true);
  
  // Mude de 'ESTOQUE_1' para 'BR02'
  const [estoqueAtual, setEstoqueAtual] = useState('BR02');

  // Verifica se já existe um usuário logado ao carregar a aplicação
  useEffect(() => {
    const userSalvo = localStorage.getItem('@NexusLog:user');
    const tokenSalvo = localStorage.getItem('@NexusLog:token');
    const estoqueSalvo = localStorage.getItem('@NexusLog:estoque');

    if (userSalvo && tokenSalvo) {
      setUsuario(JSON.parse(userSalvo));
      setToken(tokenSalvo); // ✨ CORREÇÃO 2: Guardamos o token carregado do localStorage no estado
    }
    
    // Se o utilizador já tinha escolhido um estoque antes, recupera essa escolha
    if (estoqueSalvo) {
      setEstoqueAtual(estoqueSalvo);
    }
    
    setLoading(false);
  }, []);

  // Função de Login (ajuste conforme a sua chamada à API Node.js/Supabase)
  const login = async (dadosUsuario, tokenRecebido) => {
    setUsuario(dadosUsuario);
    setToken(tokenRecebido); // ✨ CORREÇÃO 3: Salva o token no estado durante o login
    
    localStorage.setItem('@NexusLog:user', JSON.stringify(dadosUsuario));
    localStorage.setItem('@NexusLog:token', tokenRecebido);
  };

  // Função de Logout
  const logout = () => {
    setUsuario(null);
    setToken(null); // ✨ CORREÇÃO 4: Limpa o token durante o logout
    
    localStorage.removeItem('@NexusLog:user');
    localStorage.removeItem('@NexusLog:token');
  };

  // Função personalizada para mudar o estoque e salvar no localStorage
  const mudarEstoque = (novoEstoque) => {
    setEstoqueAtual(novoEstoque);
    localStorage.setItem('@NexusLog:estoque', novoEstoque);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        usuario,
        token, // ✨ CORREÇÃO 5: Agora expomos o token para todas as outras telas usarem!
        signed: !!usuario, // Retorna true se houver usuário, false se for null
        loading, 
        login, 
        logout,
        estoqueAtual, 
        setEstoqueAtual: mudarEstoque 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado para usar a Autenticação facilmente
export const useAuth = () => useContext(AuthContext);