import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; // Ajuste o caminho conforme seu projeto
import { MapPin } from 'lucide-react'; // Adicionamos um ícone para a área do cliente
import './Header.css';

// Recebemos a prop 'modulo' que vem do AppLayout
const Header = ({ modulo }) => {
    // Puxamos as variáveis do contexto
    const { usuario, logout, estoqueAtual, setEstoqueAtual } = useContext(AuthContext);

    // Dicionário para formatar o nome da filial de forma legível para o cliente
    const nomesFiliais = {
        'BR02': 'BR02 — Santo André (SP)',
        'BR04': 'BR04 — Goiana (PE)',
        'BR06': 'BR06 — Betim (MG)'
    };

    return (
        <header className="app-header">

            {/* LADO ESQUERDO: Título e Seletor de Estoque */}
            <div className="header-left">
                {/* Título dinâmico consoante o módulo */}
                <h2 className="header-title">
                    {modulo === 'cliente' ? 'Portal do Cliente' : 'Painel Logística'}
                </h2>

                <div className="seletor-estoque-wrapper">
                    <label htmlFor="seletor-estoque">
                        Estoque Atual:
                    </label>

                    {/* Renderização Condicional do Seletor */}
                    {modulo === 'logistica' ? (
                        // 🟢 SE FOR LOGÍSTICA: Dropdown para trocar a filial
                        <select
                            id="seletor-estoque"
                            value={estoqueAtual}
                            onChange={(e) => setEstoqueAtual(e.target.value)}
                        >
                            <option value="BR02">BR02 — Santo André (SP)</option>
                            <option value="BR04">BR04 — Goiana (PE)</option>
                            <option value="BR06">BR06 — Betim (MG)</option>
                        </select>
                    ) : (
                        // 🔵 SE FOR CLIENTE: Badge apenas de leitura
                        <div 
                            className="badge-estoque-leitura"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '4px 8px', 
                                backgroundColor: '#f1f5f9', 
                                borderRadius: '4px',
                                color: '#334155',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}
                        >
                            <MapPin size={16} color="#64748b" />
                            <span>{nomesFiliais[estoqueAtual] || estoqueAtual}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* LADO DIREITO: Perfil do Utilizador e Logout */}
            <div className="header-user-info">
                {/* Verifica se existe utilizador (para evitar erros na área pública do cliente) */}
                {usuario ? (
                    <>
                        <div className="user-badge">
                            <p className="user-name">{usuario.nome || 'Usuário'}</p>
                            <p className="user-role">{usuario.cargo}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="btn-logout"
                            type="button"
                        >
                            Sair
                        </button>
                    </>
                ) : (
                    // Se for um cliente não logado, apresenta um perfil genérico
                    <div className="user-badge">
                        <p className="user-name">Cliente</p>
                        <p className="user-role">Acesso Público</p>
                    </div>
                )}
            </div>

        </header>
    );
};

export default Header;