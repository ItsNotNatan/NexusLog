// =================================================================
// ARQUIVO: src/components/Header/Header.jsx
// DESCRIÇÃO: Cabeçalho global com controle de filiais por utilizador (100% Dinâmico)
// =================================================================

import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext'; 
import { MapPin } from 'lucide-react'; 
import { apiFetch } from '../../services/api'; // ✨ Importação da nossa API
import './Header.css';

const Header = ({ modulo }) => {
    const { usuario, logout, estoqueAtual, setEstoqueAtual } = useContext(AuthContext);
    
    // ✨ NOVO ESTADO: Guarda as filiais que vêm do banco de dados
    const [filiaisCadastradas, setFiliaisCadastradas] = useState([]);

    // ✨ EFEITO: Busca as filiais automaticamente ao carregar a página
    useEffect(() => {
        const carregarFiliais = async () => {
            try {
                const data = await apiFetch('/filiais/listar');
                if (data.sucesso) {
                    setFiliaisCadastradas(data.dados);
                }
            } catch (error) {
                console.error("Erro ao carregar filiais no Header:", error);
            }
        };
        carregarFiliais();
    }, []);

    // Função auxiliar para mostrar o nome bonito (ex: "BR08 — MANAUS")
    const obterNomeAmigavel = (id) => {
        const filial = filiaisCadastradas.find(f => f.id === id);
        if (filial) {
            return `${filial.id} — ${filial.nome}`;
        }
        return id; // Fallback caso a filial não seja encontrada no array
    };

    // A lógica de "Todas as Filiais" agora depende da quantidade real de filiais no sistema
    const TOTAL_FILIAIS_SISTEMA = filiaisCadastradas.length > 0 ? filiaisCadastradas.length : 3;

    // 🛡️ BLINDAGEM: Garantimos um array vazio caso usuario ou filiais_acesso sejam nulos/undefined
    const filiaisPermitidas = Array.isArray(usuario?.filiais_acesso) && usuario.filiais_acesso.length > 0
        ? usuario.filiais_acesso 
        : (usuario?.filial ? [usuario.filial] : []);

    // A opção "Todas" só é verdadeira se ele tiver permissão para todas as filiais existentes
    const temAcessoATodas = filiaisPermitidas.length >= TOTAL_FILIAIS_SISTEMA;

    // String estática para monitorizar mudanças no array de acessos
    const filiaisPermitidasString = filiaisPermitidas.join(',');

    // ✨ AUTO-CORREÇÃO DE SEGURANÇA
    useEffect(() => {
        if (usuario && filiaisPermitidas.length > 0 && filiaisCadastradas.length > 0) {
            const podeAcessarAtual = filiaisPermitidas.includes(estoqueAtual) || (estoqueAtual === 'TODOS' && temAcessoATodas);
            
            if (!podeAcessarAtual) {
                setEstoqueAtual(filiaisPermitidas[0]);
            }
        }
    }, [usuario, estoqueAtual, filiaisPermitidasString, temAcessoATodas, setEstoqueAtual, filiaisCadastradas]);

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
                        value={estoqueAtual || 'TODOS'}
                        onChange={(e) => setEstoqueAtual(e.target.value)}
                    >
                        {/* SE FOR UM UTILIZADOR DA LOGÍSTICA LOGADO */}
                        {usuario ? (
                            <>
                                {temAcessoATodas && (
                                    <option value="TODOS">Todas as Filiais</option>
                                )}
                                
                                {/* Lista apenas as filiais a que ele tem acesso */}
                                {filiaisPermitidas.map(filial => (
                                    <option key={filial} value={filial}>
                                        {obterNomeAmigavel(filial)}
                                    </option>
                                ))}
                            </>
                        ) : (
                            /* SE FOR O CLIENTE (ACESSO PÚBLICO) - LÊ TODAS DIRETAMENTE DO BANCO */
                            <>
                                <option value="TODOS">Todas as Filiais</option>
                                {filiaisCadastradas.map(filial => (
                                    <option key={filial.id} value={filial.id}>
                                        {filial.id} — {filial.nome}
                                    </option>
                                ))}
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