import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'// Ajuste o caminho conforme seu projeto

const Header = () => {
  // Puxamos a variável e a função de alterar direto do contexto
  const { usuario, logout, estoqueAtual, setEstoqueAtual } = useContext(AuthContext);

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-sm border-b border-gray-200">
      
      {/* LADO ESQUERDO: Título e Seletor de Estoque */}
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold text-gray-800">Painel Logística</h2>
        
        {/* O SELETOR DE ESTOQUE (Destacado) */}
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
          <label htmlFor="seletor-estoque" className="text-sm font-semibold text-blue-700">
            Estoque Atual:
          </label>
          <select 
            id="seletor-estoque"
            value={estoqueAtual} 
            onChange={(e) => setEstoqueAtual(e.target.value)}
            className="bg-transparent border-none text-blue-900 font-bold text-sm focus:ring-0 cursor-pointer outline-none"
          >
            <option value="ESTOQUE_1">Estoque 1 (Principal)</option>
            <option value="ESTOQUE_2">Estoque 2</option>
            <option value="ESTOQUE_3">Estoque 3</option>
          </select>
        </div>
      </div>

      {/* LADO DIREITO: Perfil do Utilizador e Logout */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">{usuario?.nome || 'Usuário'}</p>
          <p className="text-xs text-gray-500">{usuario?.cargo}</p>
        </div>
        
        <button 
          onClick={logout}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold"
        >
          Sair
        </button>
      </div>

    </header>
  );
};

export default Header;