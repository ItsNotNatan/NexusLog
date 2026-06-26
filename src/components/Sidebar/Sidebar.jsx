import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import { 
  LayoutDashboard, ListTodo, PackagePlus, Archive, Download, FileSpreadsheet, Settings, Hexagon,
  ClipboardEdit, Boxes, FileClock 
} from 'lucide-react';

export default function Sidebar({ modulo }) {
  // 1. Menu EXCLUSIVO do Cliente (Apenas as 3 opções que pediste!)
  const menuCliente = [
    { path: '/cliente/consulta-estoque', label: 'Consulta de Estoque', icon: <Boxes size={20} /> },
    { path: '/cliente/fazer-solicitacao', label: 'Fazer Solicitação', icon: <ClipboardEdit size={20} /> },
    { path: '/cliente/acompanhamento-solicitacoes', label: 'Acompanhamento', icon: <FileClock size={20} /> },
  ];

  // 2. Menu EXCLUSIVO da Logística
  const menuLogistica = [
    { path: '/logistica/painel', label: 'Painel Geral', icon: <LayoutDashboard size={20} /> },
    { path: '/logistica/dashboard', label: 'Dashboard BS/PS', icon: <ListTodo size={20} /> },
    { path: '/logistica/entrada-estoque', label: 'Entrada de Estoque', icon: <PackagePlus size={20} /> },
    { path: '/logistica/traceabilly', label: 'Traceabilly', icon: <Archive size={20} /> },
    { path: '/logistica/exportar', label: 'Exportar Dados', icon: <Download size={20} /> },
    { path: '/logistica/formatacao-sap', label: 'Formatação SAP', icon: <FileSpreadsheet size={20} /> },
    { path: '/logistica/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
  ];

  // Aqui a tua lógica escolhe qual menu desenhar com base na palavra que veio do AppLayout
  const menuItems = modulo === 'cliente' ? menuCliente : menuLogistica;
  const tituloSidebar = modulo === 'cliente' ? 'Portal do Cliente' : 'NexusLog';

  return (
    <aside className="sidebar-container">
      <div className="sidebar-logo">
        <div className="logo-icone">
          <Hexagon size={24} />
        </div>
        <h2>{tituloSidebar}</h2>
      </div>

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