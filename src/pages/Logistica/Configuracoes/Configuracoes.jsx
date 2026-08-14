// =================================================================
// ARQUIVO: src/pages/Logistica/Configuracoes/Configuracoes.jsx
// DESCRIÇÃO: Painel de configurações com gestão de utilizadores e Cadastro de Filiais
// =================================================================

import React, { useState, useEffect, useContext } from 'react';
import './Configuracoes.css';
import { Target, Users, Edit, Plus, X, ChevronLeft, ChevronRight, Search, Trash2, Building, MapPin } from 'lucide-react';

import { apiFetch } from '../../../services/api';
// ✨ IMPORTAÇÃO DO CONTEXTO DE AUTENTICAÇÃO
import { AuthContext } from '../../../contexts/AuthContext';

export default function Configuracoes() {
  // ✨ PUXAR A FUNÇÃO QUE ATUALIZA O HEADER INSTANTANEAMENTE
  const { atualizarFiliaisGlobais } = useContext(AuthContext);

  const [abaAtiva, setAbaAtiva] = useState('filiais'); 
  const [prazo, setPrazo] = useState(3);

  const [filiais, setFiliais] = useState([]);
  const [novaFilial, setNovaFilial] = useState({ id: '', nome: '', cidade: '' });

  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  const TODAS_AS_FILIAIS = filiais.map(f => f.id);

  const [usuarioAtual, setUsuarioAtual] = useState({
    id: '',
    nome: '',
    email: '',
    senha: '',
    cargo: 'OPERADOR', 
    filiais_acesso: [] 
  });

  useEffect(() => {
    carregarFiliais();
  }, []);

  useEffect(() => {
    if (abaAtiva === 'perfis') {
      carregarUsuarios();
    }
  }, [abaAtiva]);

  const carregarFiliais = async () => {
    try {
      const data = await apiFetch('/filiais/listar');
      if (data.sucesso) {
        setFiliais(data.dados);
      }
    } catch (erro) {
      console.warn("Falha ao carregar filiais da API.");
    }
  };

  const cadastrarFilial = async () => {
    if (!novaFilial.id || !novaFilial.nome) {
      alert("⚠️ Preencha o Código (ex: BR08) e o Nome da filial.");
      return;
    }

    try {
      const payload = {
        id: novaFilial.id.toUpperCase().trim(),
        nome: novaFilial.nome.toUpperCase(),
        cidade: novaFilial.cidade || ''
      };

      const data = await apiFetch('/filiais/criar', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.sucesso) {
        setFiliais([...filiais, payload]);
        setNovaFilial({ id: '', nome: '', cidade: '' });
        
        // ✨ A MÁGICA ACONTECE AQUI: Atualiza o Header global!
        atualizarFiliaisGlobais(); 
      } else {
        alert("Erro ao criar filial: " + data.erro);
      }
    } catch (error) {
      alert("Falha de conexão com o servidor ao criar filial.");
    }
  };

  const excluirFilial = async (idFilial) => {
    const confirmar = window.confirm(`Tem certeza que deseja apagar a filial ${idFilial}? Isso pode afetar o acesso de utilizadores a esta filial.`);
    if (!confirmar) return;

    try {
      const data = await apiFetch(`/filiais/${idFilial}`, { method: 'DELETE' });
      if (data.sucesso) {
        setFiliais(filiais.filter(f => f.id !== idFilial));
        
        // ✨ A MÁGICA ACONTECE AQUI TAMBÉM: Atualiza o Header global!
        atualizarFiliaisGlobais();
      } else {
        alert("Erro ao apagar filial: " + data.erro);
      }
    } catch (error) {
      alert("Falha de conexão ao apagar filial.");
    }
  };

  const carregarUsuarios = async () => {
    try {
      const data = await apiFetch('/usuarios/listar');

      if (data.sucesso) {
        setUsuarios(data.dados);
        setPaginaAtual(1); 
      } else {
        alert("O servidor recusou o pedido. Motivo: " + data.erro);
      }
    } catch (erro) {
      alert("Erro de conexão! Detalhe: " + erro.message);
    }
  };

  const guardarUsuario = async () => {
    try {
      if (usuarioAtual.filiais_acesso.length === 0) {
        alert("⚠️ AÇÃO BLOQUEADA: Por favor, selecione pelo menos uma filial de acesso.");
        return; 
      }

      if (!modoEdicao && usuarioAtual.senha.length < 6) {
        alert("⚠️ A senha deve ter no mínimo 6 caracteres.");
        return;
      }
      
      const dadosParaEnviar = {
        nome: usuarioAtual.nome, 
        nome_completo: usuarioAtual.nome, 
        email: usuarioAtual.email,
        cargo: usuarioAtual.cargo,
        filiais_acesso: usuarioAtual.filiais_acesso,
        senha: usuarioAtual.senha
      };

      const endpoint = modoEdicao ? `/usuarios/${usuarioAtual.id}` : '/usuarios/criar';
      const metodo = modoEdicao ? 'PATCH' : 'POST';

      const data = await apiFetch(endpoint, {
        method: metodo,
        body: JSON.stringify(dadosParaEnviar)
      });

      if (data.sucesso) {
        setModalAberto(false);
        carregarUsuarios(); 
        alert("Utilizador guardado com sucesso!"); 
      } else {
        alert("Erro ao guardar: " + data.erro);
      }
    } catch (erro) {
      console.error("Erro ao guardar utilizador:", erro);
      alert("Falha de conexão com o servidor.");
    }
  };

  const excluirUsuario = async () => {
    if (!senhaConfirmacao) {
      alert("Por favor, digite a sua senha para confirmar a exclusão.");
      return;
    }

    try {
      const data = await apiFetch(`/usuarios/${usuarioParaExcluir.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ senha_admin: senhaConfirmacao })
      });

      if (data.sucesso) {
        alert("Utilizador excluído com sucesso!");
        setModalExcluirAberto(false);
        setSenhaConfirmacao('');
        carregarUsuarios(); 
      } else {
        alert("Erro: " + data.erro);
      }
    } catch (erro) {
      console.error("Erro ao excluir utilizador:", erro);
      alert("Falha na conexão ao tentar excluir.");
    }
  };

  const alternarFilial = (filialId) => {
    setUsuarioAtual(prev => {
      const novasFiliais = prev.filiais_acesso.includes(filialId)
        ? prev.filiais_acesso.filter(f => f !== filialId)
        : [...prev.filiais_acesso, filialId];
        
      return { ...prev, filiais_acesso: novasFiliais };
    });
  };

  const alternarTodasFiliais = (marcarTodas) => {
    setUsuarioAtual(prev => ({
      ...prev,
      filiais_acesso: marcarTodas ? [...TODAS_AS_FILIAIS] : []
    }));
  };

  const todasSelecionadas = TODAS_AS_FILIAIS.length > 0 && TODAS_AS_FILIAIS.every(filial => 
    usuarioAtual.filiais_acesso.includes(filial)
  );

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setUsuarioAtual({ 
      id: '', nome: '', email: '', senha: '', cargo: 'OPERADOR', 
      filiais_acesso: TODAS_AS_FILIAIS.length > 0 ? [TODAS_AS_FILIAIS[0]] : [] 
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (user) => {
    setModoEdicao(true);
    setUsuarioAtual({
      id: user.id,
      nome: user.nome_completo,
      email: user.email,
      senha: user.senha || '', 
      cargo: user.cargo,
      filiais_acesso: user.filiais_acesso?.length > 0 ? user.filiais_acesso : [user.filial_padrao_id]
    });
    setModalAberto(true);
  };

  const prepararExclusao = (user) => {
    setUsuarioParaExcluir(user);
    setSenhaConfirmacao(''); 
    setModalExcluirAberto(true);
  };

  const aoMudarPesquisa = (evento) => {
    setTermoPesquisa(evento.target.value);
    setPaginaAtual(1);
  };

  const usuariosFiltrados = usuarios.filter(user => {
    const busca = termoPesquisa.toLowerCase();
    const acessoFiliaisStr = user.filiais_acesso ? user.filiais_acesso.join(', ').toLowerCase() : '';
    
    return (
      user.nome_completo?.toLowerCase().includes(busca) ||
      user.email?.toLowerCase().includes(busca) ||
      user.cargo?.toLowerCase().includes(busca) ||
      user.filial_padrao_id?.toLowerCase().includes(busca) ||
      acessoFiliaisStr.includes(busca)
    );
  });

  const indiceUltimoItem = paginaAtual * itensPorPagina;
  const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
  const usuariosAtuais = usuariosFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina);

  const paginaAnterior = () => { if (paginaAtual > 1) setPaginaAtual(paginaAtual - 1); };
  const proximaPagina = () => { if (paginaAtual < totalPaginas) setPaginaAtual(paginaAtual + 1); };

  return (
    <div className="config-wrapper">
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', overflowX: 'auto' }}>
        <button 
          onClick={() => setAbaAtiva('filiais')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'filiais' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'filiais' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Building size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Cadastro de Filiais
        </button>

        <button 
          onClick={() => setAbaAtiva('perfis')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'perfis' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'perfis' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Gestão de Perfis
        </button>

        <button 
          onClick={() => setAbaAtiva('target')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'target' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'target' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Target size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Target de Eficiência
        </button>
      </div>

      {abaAtiva === 'filiais' && (
        <div className="config-cartao">
          <div className="cartao-topo">
            <div className="icone-destaque" style={{ backgroundColor: '#faf5ff', color: '#a855f7' }}>
              <Building size={24} />
            </div>
            <div className="textos-topo">
              <h2>Cadastro de Filiais</h2>
              <p>Crie novas filiais dinamicamente — herdam automaticamente as regras do sistema</p>
            </div>
          </div>

          <hr className="divisor" />

          <div className="filial-form-box">
            <h4><Plus size={16} /> Nova Filial</h4>
            
            <div className="filial-grid">
              <div className="form-grupo" style={{ marginBottom: 0 }}>
                <label>Código *</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  placeholder="EX: BR08" 
                  value={novaFilial.id}
                  onChange={(e) => setNovaFilial({...novaFilial, id: e.target.value})}
                />
              </div>
              <div className="form-grupo" style={{ marginBottom: 0 }}>
                <label>Nome *</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  placeholder="ex: ESTOQUE AMAZONAS" 
                  value={novaFilial.nome}
                  onChange={(e) => setNovaFilial({...novaFilial, nome: e.target.value})}
                />
              </div>
              <div className="form-grupo" style={{ marginBottom: 0 }}>
                <label>Cidade/UF</label>
                <input 
                  type="text" 
                  className="input-padrao" 
                  placeholder="ex: Manaus, AM" 
                  value={novaFilial.cidade}
                  onChange={(e) => setNovaFilial({...novaFilial, cidade: e.target.value})}
                />
              </div>
            </div>

            <button className="btn-cadastrar-roxo" onClick={cadastrarFilial}>
              <Plus size={16} /> Cadastrar Filial
            </button>
          </div>

          <div className="filiais-lista-titulo">
            Filiais Cadastradas ({filiais.length})
          </div>

          <div>
            {filiais.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Nenhuma filial cadastrada.</p>
            ) : (
              filiais.map((filial) => (
                <div className="filial-item" key={filial.id}>
                  <div className="filial-item-esquerda">
                    <div className="filial-icone-bg">
                      <MapPin size={20} />
                    </div>
                    <div className="filial-info">
                      <span className="filial-codigo">{filial.id}</span>
                      <span className="filial-detalhes">
                        <strong>{filial.nome}</strong> {filial.cidade ? `— ${filial.cidade}` : ''}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    className="btn-excluir-filial" 
                    title="Apagar Filial"
                    onClick={() => excluirFilial(filial.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'target' && (
        <div className="config-cartao">
          <div className="cartao-topo">
            <div className="icone-destaque">
              <Target size={24} className="icone-azul" />
            </div>
            <div className="textos-topo">
              <h2>Target de Eficiência</h2>
              <p>Usado no KPI "Dentro do Target" do Dashboard</p>
            </div>
          </div>
          <hr className="divisor" />
          <div className="form-grupo">
            <label htmlFor="prazo-input">PRAZO TARGET (EM DIAS)</label>
            <input 
              id="prazo-input" type="number" className="input-padrao" 
              value={prazo} onChange={(e) => setPrazo(e.target.value)}
            />
          </div>
        </div>
      )}

      {abaAtiva === 'perfis' && (
        <div className="config-cartao">
          <div className="cartao-topo" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="icone-destaque">
                <Users size={24} className="icone-azul" />
              </div>
              <div className="textos-topo">
                <h2>Gestão de Acessos</h2>
                <p>Adicione ou edite os cargos e filiais da equipa</p>
              </div>
            </div>
            <button className="btn-salvar" onClick={abrirModalNovo} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Plus size={18} /> Novo Utilizador
            </button>
          </div>

          <hr className="divisor" />

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', color: '#888', display: 'flex', alignItems: 'center' }}>
              <Search size={18} />
            </div>
            <input 
              type="text" className="input-padrao" 
              placeholder="Pesquisar por nome, e-mail, cargo ou filial..." 
              value={termoPesquisa} onChange={aoMudarPesquisa}
              style={{ paddingLeft: '40px', width: '100%', maxWidth: '400px' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', color: '#666' }}>
                  <th style={{ padding: '12px' }}>Nome</th>
                  <th style={{ padding: '12px' }}>E-mail</th>
                  <th style={{ padding: '12px' }}>Cargo</th>
                  <th style={{ padding: '12px' }}>Filiais de Acesso</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosAtuais.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{user.nome_completo}</td>
                    <td style={{ padding: '12px', color: '#555' }}>{user.email}</td>
                    <td style={{ padding: '12px' }}><span className={`badge-cargo ${user.cargo?.toLowerCase()}`}>{user.cargo}</span></td>
                    <td style={{ padding: '12px' }}>
                      {user.filiais_acesso?.length > 0 
                        ? user.filiais_acesso.join(', ') 
                        : user.filial_padrao_id}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <button onClick={() => abrirModalEditar(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }} title="Editar">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => prepararExclusao(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }} title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                      Nenhum utilizador encontrado com o termo "{termoPesquisa}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {usuariosFiltrados.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                A mostrar {indicePrimeiroItem + 1} a {Math.min(indiceUltimoItem, usuariosFiltrados.length)} de {usuariosFiltrados.length}
              </span>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={paginaAnterior} disabled={paginaAtual === 1}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', backgroundColor: paginaAtual === 1 ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', color: paginaAtual === 1 ? '#9ca3af' : '#374151' }}>
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span style={{ fontSize: '14px', fontWeight: '500', padding: '0 8px' }}>Página {paginaAtual} de {totalPaginas || 1}</span>
                <button 
                  onClick={proximaPagina} disabled={paginaAtual === totalPaginas || totalPaginas === 0}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', backgroundColor: (paginaAtual === totalPaginas || totalPaginas === 0) ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: (paginaAtual === totalPaginas || totalPaginas === 0) ? 'not-allowed' : 'pointer', color: (paginaAtual === totalPaginas || totalPaginas === 0) ? '#9ca3af' : '#374151' }}>
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-conteudo" style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{modoEdicao ? 'Editar Utilizador' : 'Novo Utilizador'}</h3>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div className="form-grupo" style={{ marginBottom: '16px' }}>
              <label>Nome Completo</label>
              <input type="text" className="input-padrao" value={usuarioAtual.nome} onChange={(e) => setUsuarioAtual({...usuarioAtual, nome: e.target.value})} />
            </div>

            <div className="form-grupo" style={{ marginBottom: '16px' }}>
              <label>E-mail</label>
              <input type="email" className="input-padrao" value={usuarioAtual.email} onChange={(e) => setUsuarioAtual({...usuarioAtual, email: e.target.value})} />
            </div>

            <div className="form-grupo" style={{ marginBottom: '16px' }}>
              <label>Senha de Acesso</label>
              <input 
                type="text" 
                className="input-padrao" 
                value={usuarioAtual.senha} 
                onChange={(e) => setUsuarioAtual({...usuarioAtual, senha: e.target.value})} 
                placeholder={modoEdicao ? "Deixe em branco para não alterar" : "Introduza a senha"}
              />
            </div>

            <div className="form-grupo" style={{ marginBottom: '16px' }}>
              <label>Cargo</label>
              <select className="input-padrao" value={usuarioAtual.cargo} onChange={(e) => setUsuarioAtual({...usuarioAtual, cargo: e.target.value})}>
                <option value="OPERADOR">Operador</option>
                <option value="LIDER">Líder</option>
                <option value="ADM">Administrador (ADM)</option>
              </select>
            </div>

            <div className="form-grupo" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Acesso às Filiais (Dinâmico)
              </label>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: '600', color: '#1d4ed8', width: '100%' }}>
                  <input 
                    type="checkbox" 
                    checked={todasSelecionadas}
                    onChange={(e) => alternarTodasFiliais(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Todas as Filiais
                </label>

                {TODAS_AS_FILIAIS.map(filialId => (
                  <label key={filialId} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb', flex: '1' }}>
                    <input 
                      type="checkbox" 
                      checked={usuarioAtual.filiais_acesso.includes(filialId)}
                      onChange={() => alternarFilial(filialId)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    {filialId}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-padrao" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={guardarUsuario}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {modalExcluirAberto && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-conteudo" style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={24} /> Confirmar Exclusão
            </h3>
            
            <p style={{ marginBottom: '16px', color: '#4b5563' }}>
              Tem certeza que deseja apagar o utilizador <strong>{usuarioParaExcluir?.nome_completo}</strong> permanentemente?
            </p>
            <p style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
              Por favor, insira a <strong>SUA</strong> senha de acesso para confirmar esta ação:
            </p>

            <input 
              type="password" 
              className="input-padrao" 
              placeholder="Digite a sua senha"
              value={senhaConfirmacao}
              onChange={(e) => setSenhaConfirmacao(e.target.value)}
              style={{ marginBottom: '24px', width: '100%' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-padrao" onClick={() => setModalExcluirAberto(false)}>Cancelar</button>
              <button 
                onClick={excluirUsuario}
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}