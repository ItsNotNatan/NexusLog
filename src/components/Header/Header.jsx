import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; // Ajuste o caminho conforme seu projeto
import { MapPin } from 'lucide-react'; 
import './Header.css';

// Recebemos a prop 'modulo' que vem do AppLayout
const Header = ({ modulo }) => {
    // Puxamos as variáveis do contexto
    const { usuario, logout, estoqueAtual, setEstoqueAtual } = useContext(AuthContext);

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
                        <MapPin size={16} color="#1d4ed8" style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                        Estoque Atual:
                    </label>

                    {/* Agora tanto Cliente como Logística podem escolher a filial, incluindo a opção TODOS */}
                    <select
                        id="seletor-estoque"
                        value={estoqueAtual}
                        onChange={(e) => setEstoqueAtual(e.target.value)}
                    >
                        <option value="TODOS">Todas as Filiais</option>
                        <option value="BR02">BR02 — Santo André (SP)</option>
                        <option value="BR04">BR04 — Goiana (PE)</option>
                        <option value="BR06">BR06 — Betim (MG)</option>
                    </select>
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