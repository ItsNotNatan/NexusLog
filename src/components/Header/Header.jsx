import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Limpa os dados do contexto e LocalStorage
    navigate('/login', { replace: true }); // Redireciona para o login e impede voltar na seta do navegador
  };

  return (
    <header className="app-header">
      <div className="header-user-info">
        <div className="user-badge">
          <User size={16} />
          {/* Exibe o nome do utilizador e o cargo (ou fallback se não carregar a tempo) */}
          <span>{usuario?.nome || 'Utilizador'} ({usuario?.cargo || 'Visitante'})</span>
        </div>
        
        <button className="btn-logout" onClick={handleLogout} type="button">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}