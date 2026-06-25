import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { 
  LayoutDashboard, 
  ListTodo, 
  PackagePlus, 
  Archive, 
  Download, 
  FileSpreadsheet, 
  Settings,
  Hexagon 
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Painel Geral', icon: <LayoutDashboard size={20} /> },
  { path: '/dashboard', label: 'Dashboard BS/PS', icon: <ListTodo size={20} /> },
  { path: '/entrada-estoque', label: 'Entrada de Estoque', icon: <PackagePlus size={20} /> },
  { path: '/traceabilly', label: 'Traceabilly', icon: <Archive size={20} /> },
  { path: '/exportar', label: 'Exportar Dados', icon: <Download size={20} /> },
  { path: '/formatacao-sap', label: 'Formatação SAP', icon: <FileSpreadsheet size={20} /> },
  { path: '/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  return (
    <aside className="sidebar-container">
      
      {/* Logotipo */}
      <div className="sidebar-logo">
        <div className="logo-icone">
          <Hexagon size={24} />
        </div>
        <h2>NexusLog</h2>
      </div>

      {/* Navegação */}
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => isActive ? "nav-item ativo" : "nav-item"}
              >
                <span className="nav-icone">{item.icon}</span>
                <span className="nav-texto">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

    </aside>
  );
}