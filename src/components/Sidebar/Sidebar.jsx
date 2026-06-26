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
  Hexagon,
  ClipboardEdit, 
  Boxes,         
  FileClock       
} from 'lucide-react';

// 1. As três opções do Portal do Cliente
const menuCliente = [
  { path: '/consulta-estoque', label: 'Consulta de Estoque', icon: <Boxes size={20} /> },
  { path: '/fazer-solicitacao', label: 'Fazer Solicitação', icon: <ClipboardEdit size={20} /> },
  { path: '/acompanhamento-solicitacoes', label: 'Acompanhamento', icon: <FileClock size={20} /> },
];

// 2. O resto das opções da Logística
const menuLogistica = [
  { path: '/painel', label: 'Painel Geral', icon: <LayoutDashboard size={20} /> },
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
      
      <div className="sidebar-logo">
        <div className="logo-icone">
          <Hexagon size={24} />
        </div>
        <h2>NexusLog</h2>
      </div>

      <nav className="sidebar-nav">
        
        {/* GRUPO 1: Portal do Cliente */}
        <div className="nav-grupo-titulo">Portal do Cliente</div>
        <ul>
          {menuCliente.map((item) => (
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

        {/* Linha separadora */}
        <div className="nav-separador"></div>

        {/* GRUPO 2: Operações Logísticas */}
        <div className="nav-grupo-titulo">Operações Logística</div>
        <ul>
          {menuLogistica.map((item) => (
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