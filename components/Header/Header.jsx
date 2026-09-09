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

    const obterNomeAmigavel = (id) => {
        if (!id) return '';
        
        const filial = filiaisGlobais?.find(
            f => String(f.id).toUpperCase() === String(id).toUpperCase()
        );

        if (!filial) return `${String(id).toUpperCase()} — A carregar...`;

        const nomeUpper = String(filial.nome).toUpperCase();
        const idUpper = String(id).toUpperCase();

        if (nomeUpper.includes(idUpper)) return filial.nome; 
        
        return `${idUpper} — ${filial.nome}`;
    };

    const TOTAL_FILIAIS_SISTEMA = filiaisGlobais?.length > 0 ? filiaisGlobais.length : 3;

    // ✨ 1. Pega as filiais que o utilizador tem na sua conta
    const filiaisPermitidasBrutas = Array.isArray(usuario?.filiais_acesso) && usuario.filiais_acesso.length > 0
        ? usuario.filiais_acesso 
        : (usuario?.filial ? [usuario.filial] : []);

    // ✨ 2. FILTRAGEM INTELIGENTE: Remove da lista do Header qualquer filial que tenha sido deletada do sistema!
    const filiaisPermitidas = filiaisPermitidasBrutas.filter(idPermitida => 
        filiaisGlobais?.some(fGlobal => String(fGlobal.id).toUpperCase() === String(idPermitida).toUpperCase())
    );

    const temAcessoATodas = filiaisPermitidas.length >= TOTAL_FILIAIS_SISTEMA;
    const filiaisPermitidasString = filiaisPermitidas.join(',');

    // ✨ 3. PROTEÇÃO ATIVA: Se ele estiver numa filial que acabou de ser apagada, o sistema muda de filial sozinho!
    useEffect(() => {
        if (usuario && filiaisPermitidas.length > 0 && filiaisGlobais?.length > 0) {
            const podeAcessarAtual = filiaisPermitidas.includes(estoqueAtual) || (estoqueAtual === 'TODOS' && temAcessoATodas);
            if (!podeAcessarAtual) {
                setEstoqueAtual(filiaisPermitidas[0]); // Pula para a primeira filial válida que sobrou
            }
        } else if (!usuario && estoqueAtual !== 'TODOS' && filiaisGlobais?.length > 0) {
            // Segurança para o Cliente Público
            const filialAindaExiste = filiaisGlobais.some(f => f.id === estoqueAtual);
            if (!filialAindaExiste) {
                setEstoqueAtual('TODOS');
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