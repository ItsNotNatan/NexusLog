import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; // Ajuste o caminho conforme seu projeto
import './Header.css';

const Header = () => {
    // Puxamos a variável e a função de alterar direto do contexto
    const { usuario, logout, estoqueAtual, setEstoqueAtual } = useContext(AuthContext);

    return (
        <header className="app-header">

            {/* LADO ESQUERDO: Título e Seletor de Estoque */}
            <div className="header-left">
                <h2 className="header-title">Painel Logística</h2>


                {/* O SELETOR DE ESTOQUE */}
                <div className="seletor-estoque-wrapper">
                    <label htmlFor="seletor-estoque">
                        Estoque Atual:
                    </label>
                    <select
                        id="seletor-estoque"
                        value={estoqueAtual}
                        onChange={(e) => setEstoqueAtual(e.target.value)}
                    >
                        <option value="BR02">BR02 — Santo André (SP)</option>
                        <option value="BR04">BR04 — Goiana (PE)</option>
                        <option value="BR06">BR06 — Betim (MG)</option>
                    </select>
                </div>


            </div>

            {/* LADO DIREITO: Perfil do Utilizador e Logout */}
            <div className="header-user-info">
                <div className="user-badge">
                    <p className="user-name">{usuario?.nome || 'Usuário'}</p>
                    <p className="user-role">{usuario?.cargo}</p>
                </div>

                <button
                    onClick={logout}
                    className="btn-logout"
                    type="button"
                >
                    Sair
                </button>
            </div>

        </header>
    );
};

export default Header;