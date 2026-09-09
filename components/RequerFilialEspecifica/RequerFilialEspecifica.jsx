// =================================================================
// ARQUIVO: src/components/RequerFilialEspecifica/RequerFilialEspecifica.jsx
// DESCRIÇÃO: Guardião que impede o acesso a páginas quando "Todas as Filiais" está selecionado
// =================================================================

import React, { useContext, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';

export default function RequerFilialEspecifica() {
  // 1. Vamos buscar a filial atual e a função de mostrar alertas aos teus contextos globais
  const { estoqueAtual, carregandoInicial } = useContext(AuthContext);
  const { showAlert } = useAlert();

  // 2. Disparamos um alerta sempre que o utilizador tenta aceder com "TODOS"
  useEffect(() => {
    if (!carregandoInicial && estoqueAtual === 'TODOS') {
      showAlert(
        "Ação Restrita", 
        "Para aceder a esta funcionalidade, por favor selecione uma filial específica no topo da página.", 
        "warning"
      );
    }
  }, [estoqueAtual, carregandoInicial, showAlert]);

  // 3. Enquanto o sistema lê os dados guardados, não desenha nada para evitar falhas
  if (carregandoInicial) {
    return null;
  }

  // 4. Se a filial for 'TODOS', redireciona automaticamente (expulsa) de volta para o estoque
  if (estoqueAtual === 'TODOS') {
    return <Navigate to="/cliente/consulta-estoque" replace />;
  }

  // 5. Se estiver tudo bem (ex: filial for 'BR02'), permite renderizar as páginas filhas
  return <Outlet />;
}