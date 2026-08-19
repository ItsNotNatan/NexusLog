// =================================================================
// ARQUIVO: src/components/Header/Header.jsx
// DESCRIÇÃO: Cabeçalho global com controle de filiais 100% dinâmico
// =================================================================

import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; 
import { MapPin } from 'lucide-react'; 
import './Header.css';

const Header = ({ modulo }) => {
    // ✨ Consome as filiaisGlobais do Contexto
    const { usuario, logout, estoqueAtual, setEstoqueAtual, filiaisGlobais } = useContext(AuthContext);

    // ✨ CORREÇÃO: Como o nome na base de dados já inclui o código (ex: "BR06 — Betim"),
    // retornamos apenas filial.nome para evitar duplicação.
    const obterNomeAmigavel = (id) => {
        const filial = filiaisGlobais.find(f => f.id === id);
        return filial ? filial.nome : id;
    };

    // A lógica de "Todas as Filiais" adapta-se automaticamente à quantidade de filiais na BD
    const TOTAL_FILIAIS_SISTEMA = filiaisGlobais.length > 0 ? filiaisGlobais.length : 3;

    const filiaisPermitidas = Array.isArray(usuario?.filiais_acesso) && usuario.filiais_acesso.length > 0
        ? usuario.filiais_acesso 
        : (usuario?.filial ? [usuario.filial] : []);

    const temAcessoATodas = filiaisPermitidas.length >= TOTAL_FILIAIS_SISTEMA;
    const filiaisPermitidasString = filiaisPermitidas.join(',');

    useEffect(() => {
        if (usuario && filiaisPermitidas.length > 0 && filiaisGlobais.length > 0) {
            const podeAcessarAtual = filiaisPermitidas.includes(estoqueAtual) || (estoqueAtual === 'TODOS' && temAcessoATodas);
            if (!podeAcessarAtual) {
                setEstoqueAtual(filiaisPermitidas[0]);
            }
        }
    }, [usuario, estoqueAtual, filiaisPermitidasString, temAcessoATodas, setEstoqueAtual, filiaisGlobais]);

    return (
        <header className="app-header">
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
                        value={estoqueAtual || 'TODOS'}
                        onChange={(e) => setEstoqueAtual(e.target.value)}
                    >
                        {usuario ? (
                            <>
                                {temAcessoATodas && (
                                    <option value="TODOS">Todas as Filiais</option>
                                )}
                                {filiaisPermitidas.map(filial => (
                                    <option key={filial} value={filial}>
                                        {obterNomeAmigavel(filial)}
                                    </option>
                                ))}
                            </>
                        ) : (
                            <>
                                <option value="TODOS">Todas as Filiais</option>
                                {/* ✨ CORREÇÃO: Renderizamos apenas filial.nome aqui também */}
                                {filiaisGlobais.map(filial => (
                                    <option key={filial.id} value={filial.id}>
                                        {filial.nome}
                                    </option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
            </div>

            <div className="header-user-info">
                {usuario ? (
                    <>
                        <div className="user-badge">
                            <p className="user-name">{usuario.nome_completo || usuario.nome || 'Usuário'}</p>
                            <p className="user-role">{usuario.cargo}</p>
                        </div>
                        <button onClick={logout} className="btn-logout" type="button">Sair</button>
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