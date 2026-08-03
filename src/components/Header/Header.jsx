// =================================================================
// ARQUIVO: src/components/Header/Header.jsx
// DESCRIÇÃO: Cabeçalho global com controle de filiais por utilizador
// =================================================================

import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; 
import { MapPin } from 'lucide-react'; 
import './Header.css';

// Dicionário para formatar os nomes das filiais de forma amigável
const NOME_FILIAIS = {
    'BR02': 'BR02 — Santo André (SP)',
    'BR04': 'BR04 — Goiana (PE)',
    'BR06': 'BR06 — Betim (MG)'
};

// Definimos o total de filiais do sistema para a nossa regra
const TOTAL_FILIAIS_SISTEMA = 3;

const Header = ({ modulo }) => {
    const { usuario, logout, estoqueAtual, setEstoqueAtual } = useContext(AuthContext);

    // Extraímos as filiais permitidas do utilizador logado
    const filiaisPermitidas = usuario?.filiais_acesso?.length > 0 
        ? usuario.filiais_acesso 
        : (usuario?.filial ? [usuario.filial] : []);

    // A opção "Todas" só é verdadeira se ele tiver as 3 (ou mais) filiais
    const temAcessoATodas = filiaisPermitidas.length >= TOTAL_FILIAIS_SISTEMA;

    // 🛡️ BOA PRÁTICA: Criamos uma string estática para monitorizar mudanças no array de acessos
    const filiaisPermitidasString = filiaisPermitidas.join(',');

    // ✨ AUTO-CORREÇÃO DE SEGURANÇA
    // Sempre que o utilizador mudar ou a filial selecionada não for permitida, o sistema corrige a rota
    useEffect(() => {
        if (usuario && filiaisPermitidas.length > 0) {
            // Verifica se a filial atual está na lista dele OU se é "TODOS" e ele tem acesso total
            const podeAcessarAtual = filiaisPermitidas.includes(estoqueAtual) || (estoqueAtual === 'TODOS' && temAcessoATodas);
            
            // Se ele não puder aceder à opção atual, forçamos para a primeira válida da sua lista
            if (!podeAcessarAtual) {
                setEstoqueAtual(filiaisPermitidas[0]);
            }
        }
    }, [usuario, estoqueAtual, filiaisPermitidasString, temAcessoATodas, setEstoqueAtual]);

    return (
        <header className="app-header">

            {/* LADO ESQUERDO: Título e Seletor de Estoque */}
            <div className="header-left">
                <h2 className="header-title">
                    {modulo === 'cliente' ? 'Portal do Cliente' : 'Painel Logística'}
                </h2>

                <div className="seletor-estoque-wrapper">
                    <label htmlFor="seletor-estoque">
                        <MapPin size={16} color="#1d4ed8" style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                        Estoque Atual:
                    </label>

                    <select
                        id="seletor-estoque"
                        value={estoqueAtual}
                        onChange={(e) => setEstoqueAtual(e.target.value)}
                    >
                        {/* SE FOR UM UTILIZADOR DA LOGÍSTICA LOGADO */}
                        {usuario ? (
                            <>
                                {/* A opção "Todas" só aparece se ele for ADM/Líder com acesso total */}
                                {temAcessoATodas && (
                                    <option value="TODOS">Todas as Filiais</option>
                                )}
                                
                                {/* Percorre a lista de acessos do utilizador e constrói o menu */}
                                {filiaisPermitidas.map(filial => (
                                    <option key={filial} value={filial}>
                                        {NOME_FILIAIS[filial] || filial}
                                    </option>
                                ))}
                            </>
                        ) : (
                            /* SE FOR O CLIENTE (ACESSO PÚBLICO) - Mantém as opções fixas */
                            <>
                                <option value="TODOS">Todas as Filiais</option>
                                <option value="BR02">BR02 — Santo André (SP)</option>
                                <option value="BR04">BR04 — Goiana (PE)</option>
                                <option value="BR06">BR06 — Betim (MG)</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            {/* LADO DIREITO: Perfil do Utilizador e Logout */}
            <div className="header-user-info">
                {usuario ? (
                    <>
                        <div className="user-badge">
                            <p className="user-name">{usuario.nome_completo || usuario.nome || 'Usuário'}</p>
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