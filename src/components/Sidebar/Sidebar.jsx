import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import {
  LayoutDashboard, ListTodo, PackagePlus, Archive, Download, FileSpreadsheet, Settings, Hexagon,
  ClipboardEdit, Boxes, FileClock, ArrowLeft, Waypoints, ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ modulo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth(); // Pegamos o cargo do utilizador logado (ADM, LIDER ou OPERADOR)

  // Menu EXCLUSIVO do Cliente
  const menuCliente = [
    { path: '/cliente/consulta-estoque', label: 'Consulta de Estoque', icon: <Boxes size={20} /> },
    { path: '/cliente/fazer-solicitacao', label: 'Fazer Solicitação', icon: <ClipboardEdit size={20} /> },
    { path: '/cliente/acompanhamento-solicitacoes', label: 'Acompanhamento', icon: <FileClock size={20} /> },
    { path: '/cliente/rastreabilidade', label: 'Rastreabilidade', icon: <Archive size={20} /> },
  ];

// 👇 Menu da Logística atualizado
  const menuLogistica = [
    // --- NÍVEL 1: ACESSO LIVRE (ADM, LÍDER E OPERADOR) ---
    { path: '/logistica/entrada-estoque', label: 'Entrada de Estoque', icon: <PackagePlus size={20} />, roles: ['ADM', 'LIDER', 'OPERADOR'] },
    { path: '/logistica/formatacao-sap', label: 'Formatação SAP', icon: <FileSpreadsheet size={20} />, roles: ['ADM', 'LIDER', 'OPERADOR'] },
    { path: '/logistica/traceabilly', label: 'Rastreabilidade', icon: <Archive size={20} />, roles: ['ADM', 'LIDER', 'OPERADOR'] },
    { path: '/logistica/painel', label: 'Painel Geral', icon: <ClipboardList size={20} />, roles: ['ADM', 'LIDER', 'OPERADOR'] },
    
    // 👇 Visão Geral desceu para cá e agora inclui o OPERADOR!
    { path: '/logistica/visao-geral', label: 'Visão Geral do Estoque', icon: <Boxes size={20} />, roles: ['ADM', 'LIDER', 'OPERADOR'] },

    // --- NÍVEL 2: ACESSO INTERMÉDIO (ADM E LÍDER) ---
    { path: '/logistica/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADM', 'LIDER'] },
    { path: '/logistica/PainelAprovacao', label: 'Painel de Aprovação', icon: <ListTodo size={20} />, roles: ['ADM', 'LIDER'] },
    { path: '/logistica/exportar', label: 'Exportar Dados (PS)', icon: <Download size={20} />, roles: ['ADM', 'LIDER'] },
    { path: '/logistica/rota-coleta', label: 'Rota de Coleta', icon: <Waypoints size={20} />, roles: ['ADM', 'LIDER'] },

    // --- NÍVEL 3: ACESSO RESTRITO (SÓ ADM) ---
    { path: '/logistica/configuracoes', label: 'Configurações', icon: <Settings size={20} />, roles: ['ADM'] },
  ];

  // Filtra o menu da logística para mostrar apenas o que o cargo atual permite
  const menuLogisticaFiltrado = menuLogistica.filter(item => item.roles.includes(role));

  const menuItems = modulo === 'cliente' ? menuCliente : menuLogisticaFiltrado;
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

      <div className="sidebar-footer">
        <button
          className="btn-voltar-sidebar"
          onClick={() => navigate('/selecionar-filial', { state: { destinoFinal: location.pathname } })}
        >
          <ArrowLeft size={18} />
          Voltar a Galpões
        </button>
      </div>
    </aside>
  );
}