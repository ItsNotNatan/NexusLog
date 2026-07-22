import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Limpa os dados do contexto e os tokens do LocalStorage
    
    // 👇 CORREÇÃO AQUI: Em vez de ir para '/login', voltamos para a raiz '/'
    navigate('/', { replace: true }); 
  };

  return (
    <header className="app-header">
      <div className="header-user-info">
        <div className="user-badge">
          <User size={16} />
          {/* Se não houver utilizador logado (Cliente), exibe "Visitante" */}
          <span>{usuario?.nome || 'Cliente'} ({usuario?.cargo || 'Visitante'})</span>
        </div>
        
        <button className="btn-logout" onClick={handleLogout} type="button">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}