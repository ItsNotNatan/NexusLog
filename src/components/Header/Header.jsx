// =================================================================
// ARQUIVO: src/components/Header/Header.jsx
// DESCRIÇÃO: Cabeçalho global com controle de filiais 100% dinâmico
// =================================================================

import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; 
import { MapPin } from 'lucide-react'; 
import './Header.css';

const Header = ({ modulo }) => {
    const { usuario, logout, estoqueAtual, setEstoqueAtual, filiaisGlobais } = useContext(AuthContext);

    // ✨ CORREÇÃO E SEGURANÇA: Garante sempre o formato "ID — Nome"
    const obterNomeAmigavel = (id) => {
        if (!id) return '';
        
        // 1. Procura a filial ignorando se está em maiúsculas ou minúsculas
        const filial = filiaisGlobais?.find(
            f => String(f.id).toUpperCase() === String(id).toUpperCase()
        );

        // 2. Se por acaso ainda estiver a carregar do banco, mostra pelo menos o ID e "A carregar..."
        if (!filial) return `${String(id).toUpperCase()} — A carregar...`;

        // 3. Verifica se o nome guardado no banco já tem o "BRXX" lá dentro
        const nomeUpper = String(filial.nome).toUpperCase();
        const idUpper = String(id).toUpperCase();

        if (nomeUpper.includes(idUpper)) {
            return filial.nome; // Já está como "BR04 - Goiana"
        }
        
        // 4. Se no banco só estiver guardado "Goiana", nós forçamos a junção visualmente!
        return `${idUpper} — ${filial.nome}`;
    };

    const TOTAL_FILIAIS_SISTEMA = filiaisGlobais?.length > 0 ? filiaisGlobais.length : 3;

    const filiaisPermitidas = Array.isArray(usuario?.filiais_acesso) && usuario.filiais_acesso.length > 0
        ? usuario.filiais_acesso 
        : (usuario?.filial ? [usuario.filial] : []);

    const temAcessoATodas = filiaisPermitidas.length >= TOTAL_FILIAIS_SISTEMA;
    const filiaisPermitidasString = filiaisPermitidas.join(',');

    useEffect(() => {
        if (usuario && filiaisPermitidas.length > 0 && filiaisGlobais?.length > 0) {
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
                                {/* O Cliente público vê todas as que existem */}
                                {filiaisGlobais?.map(filial => (
                                    <option key={filial.id} value={filial.id}>
                                        {obterNomeAmigavel(filial.id)}
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
