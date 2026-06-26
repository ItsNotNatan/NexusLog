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
  // --- NOVOS ÍCONES IMPORTADOS ---
  ClipboardEdit,  // Ícone para Fazer Solicitação
  Boxes,          // Ícone para Consulta de Estoque
  FileClock       // Ícone para Acompanhamento
} from 'lucide-react';

// Adicionámos os novos itens à lista do menu de navegação
const menuItems = [
  { path: '/painel', label: 'Painel Geral', icon: <LayoutDashboard size={20} /> },
  { path: '/dashboard', label: 'Dashboard BS/PS', icon: <ListTodo size={20} /> },
  
  // --- NOVOS MENUS INSERIDOS AQUI ---
  { path: '/fazer-solicitacao', label: 'Fazer Solicitação', icon: <ClipboardEdit size={20} /> },
  { path: '/consulta-estoque', label: 'Consulta de Estoque', icon: <Boxes size={20} /> },
  { path: '/acompanhamento-solicitacoes', label: 'Acompanhamento', icon: <FileClock size={20} /> },
  
  // Menus de Back-Office e Configuração existentes
  { path: '/entrada-estoque', label: 'Entrada de Estoque', icon: <PackagePlus size={20} /> },
  { path: '/traceabilly', label: 'Traceabilly', icon: <Archive size={20} /> },
  { path: '/exportar', label: 'Exportar Dados', icon: <Download size={20} /> },
  { path: '/formatacao-sap', label: 'Formatação SAP', icon: <FileSpreadsheet size={20} /> },
  { path: '/configuracoes', label: 'Configurações', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  return (
    <aside className="sidebar-container">
      
      {/* Logotipo do Sistema */}
      <div className="sidebar-logo">
        <div className="logo-icone">
          <Hexagon size={24} />
        </div>
        <h2>NexusLog</h2>
      </div>

      {/* Lista de Navegação Dinâmica */}
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