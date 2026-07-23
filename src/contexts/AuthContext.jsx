import React, { createContext, useState, useEffect } from 'react';

// Criando o contexto
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // O novo estado para controlar a filial/estoque
  const [estoqueAtual, setEstoqueAtual] = useState('ESTOQUE_1');

  // Verifica se já existe um usuário logado ao carregar a aplicação
  useEffect(() => {
    const userSalvo = localStorage.getItem('@NexusLog:user');
    const tokenSalvo = localStorage.getItem('@NexusLog:token');
    const estoqueSalvo = localStorage.getItem('@NexusLog:estoque');

    if (userSalvo && tokenSalvo) {
      setUsuario(JSON.parse(userSalvo));
    }
    
    // Se o utilizador já tinha escolhido um estoque antes, recupera essa escolha
    if (estoqueSalvo) {
      setEstoqueAtual(estoqueSalvo);
    }
    
    setLoading(false);
  }, []);

  // Função de Login simulada (ajuste conforme a sua chamada à API Node.js/Supabase)
  const login = async (dadosUsuario, token) => {
    setUsuario(dadosUsuario);
    localStorage.setItem('@NexusLog:user', JSON.stringify(dadosUsuario));
    localStorage.setItem('@NexusLog:token', token);
  };

  // Função de Logout
  const logout = () => {
    setUsuario(null);
    localStorage.removeItem('@NexusLog:user');
    localStorage.removeItem('@NexusLog:token');
    // Nota: Optamos por não apagar o @NexusLog:estoque no logout para que, 
    // no próximo login, a última filial escolhida seja lembrada. 
    // Se preferir zerar, basta descomentar a linha abaixo:
    // localStorage.removeItem('@NexusLog:estoque');
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
        signed: !!usuario, // Retorna true se houver usuário, false se for null
        loading, 
        login, 
        logout,
        estoqueAtual, 
        setEstoqueAtual: mudarEstoque // Passamos a função customizada no lugar do setter padrão
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};