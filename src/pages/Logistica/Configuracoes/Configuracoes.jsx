// =================================================================
// ARQUIVO: src/pages/Logistica/Configuracoes/Configuracoes.jsx
// DESCRIÇÃO: Painel de configurações (Target, Perfis e Cadastro de Filiais)
// =================================================================

import React, { useState, useEffect } from 'react';
import './Configuracoes.css';
import { Target, Users, Edit, Plus, X, ChevronLeft, ChevronRight, Search, Trash2, Building, MapPin } from 'lucide-react';

import { apiFetch } from '../../../services/api';

export default function Configuracoes() {
  // ==========================================
  // 1. ESTADOS DA PÁGINA E ABAS
  // ==========================================
  const [abaAtiva, setAbaAtiva] = useState('filiais'); 

  // Estado do Target
  const [prazo, setPrazo] = useState(3);

  // Estados dos Utilizadores
  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Gestão da Exclusão
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  
  // Estado da Pesquisa e Paginação (Usuários)
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  // Estado do Formulário (Modal de Criação/Edição)
  const [usuarioAtual, setUsuarioAtual] = useState({
    id: '', nome: '', email: '', senha: '', cargo: 'OPERADOR', filiais_acesso: ['BR06'] 
  });

  // ✨ ESTADOS PARA A GESTÃO DE FILIAIS
  const [filiais, setFiliais] = useState([
    { id: 'BR02', nome: 'SANTO ANDRÉ', cidade: 'Santo André, SP' },
    { id: 'BR04', nome: 'GOIANA', cidade: 'Goiana, PE' },
    { id: 'BR06', nome: 'BETIM', cidade: 'Betim, MG' },
  ]);
  
  const [novaFilial, setNovaFilial] = useState({ id: '', nome: '', cidade: '' });

  // Array dinâmico que o Modal de Novo Utilizador vai usar para listar os checkboxes
  const TODAS_AS_FILIAIS = filiais.map(f => f.id);

  // ==========================================
  // 2. EFEITOS E REQUISIÇÕES (API)
  // ==========================================
  useEffect(() => {
    if (abaAtiva === 'perfis') {
      carregarUsuarios();
    } else if (abaAtiva === 'filiais') {
      carregarFiliais();
    }
  }, [abaAtiva]);

  // 🔄 BUSCAR FILIAIS NO BANCO
  const carregarFiliais = async () => {
    try {
      const data = await apiFetch('/filiais/listar');
      if (data.sucesso && data.dados.length > 0) {
        setFiliais(data.dados);
      }
    } catch (erro) {
      console.warn("Rota de filiais não encontrada ou falha na conexão. A usar dados locais.");
    }
  };

  // 💾 CADASTRAR NOVA FILIAL
  const cadastrarFilial = async () => {
    if (!novaFilial.id || !novaFilial.nome) {
      alert("⚠️ Preencha o Código (ex: BR08) e o Nome da filial.");
      return;
    }

    try {
      // Formata os dados antes de enviar
      const payload = {
        id: novaFilial.id.toUpperCase().trim(),
        nome: novaFilial.nome.toUpperCase(),
        cidade: novaFilial.cidade || ''
      };

      // Simulação visual imediata (Caso o backend ainda não tenha a rota, a tela funciona na mesma)
      setFiliais([...filiais, payload]);
      setNovaFilial({ id: '', nome: '', cidade: '' });

      // Chamada real para o Backend
      await apiFetch('/filiais/criar', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
    } catch (error) {
      console.error("Erro ao guardar filial:", error);
    }
  };

  // 🗑️ EXCLUIR FILIAL
  const excluirFilial = async (idFilial) => {
    const confirmar = window.confirm(`Tem certeza que deseja apagar a filial ${idFilial}?`);
    if (!confirmar) return;

    try {
      setFiliais(filiais.filter(f => f.id !== idFilial));
      await apiFetch(`/filiais/${idFilial}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Erro ao apagar filial:", error);
    }
  };

  // 🔄 BUSCAR UTILIZADORES NO BANCO
  const carregarUsuarios = async () => {
    try {
      const data = await apiFetch('/usuarios/listar');
      if (data.sucesso) {
        setUsuarios(data.dados);
        setPaginaAtual(1); 
      }
    } catch (erro) {
      console.error(erro.message);
    }
  };

  // 💾 SALVAR OU ATUALIZAR UTILIZADOR
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
      alert("Falha de conexão com o servidor.");
    }
  };

  // 🗑️ EXCLUIR UTILIZADOR COM CONFIRMAÇÃO DE SENHA
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
      alert("Falha na conexão ao tentar excluir.");
    }
  };

  // ==========================================
  // 3. FUNÇÕES AUXILIARES DE INTERFACE
  // ==========================================
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

  const todasSelecionadas = TODAS_AS_FILIAIS.every(filial => 
    usuarioAtual.filiais_acesso.includes(filial)
  );

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setUsuarioAtual({ id: '', nome: '', email: '', senha: '', cargo: 'OPERADOR', filiais_acesso: [TODAS_AS_FILIAIS[0] || ''] });
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

  // Lógica de Filtro e Paginação
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

  return (
    <div className="config-wrapper">
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      {/* --- MENU DE ABAS --- */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', overflowX: 'auto' }}>
        <button 
          onClick={() => setAbaAtiva('filiais')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
            color: abaAtiva === 'filiais' ? '#0056b3' : '#64748b',
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
            color: abaAtiva === 'perfis' ? '#0056b3' : '#64748b',
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
            color: abaAtiva === 'target' ? '#0056b3' : '#64748b',
            borderBottom: abaAtiva === 'target' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Target size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Target de Eficiência
        </button>
      </div>

      {/* ========================================== */}
      {/* ABA 1: CADASTRO DE FILIAIS (NOVA!)           */}
      {/* ========================================== */}
      {abaAtiva === 'filiais' && (
        <div className="config-cartao">
          
          <div className="cartao-topo">
            <div className="icone-destaque" style={{ backgroundColor: '#faf5ff', color: '#a855f7' }}>
              <Building size={24} />
            </div>
            <div className="textos-topo">
              <h2>Cadastro de Filiais</h2>
              <p>Crie novas filiais dinamicamente — herdam automaticamente as regras de transferência (PS/BS) e entrada via Excel</p>
            </div>
          </div>

          <hr className="divisor" />

          {/* FORMULÁRIO DE NOVA FILIAL */}
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

          {/* LISTA DE FILIAIS CADASTRADAS */}
          <div className="filiais-lista-titulo">
            Filiais Cadastradas ({filiais.length})
          </div>

          <div>
            {filiais.map((filial) => (
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
            ))}
          </div>

        </div>
      )}

      {/* --- ABA 2: TARGET --- */}
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

      {/* --- ABA 3: GESTÃO DE PERFIS --- */}
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
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px' }}>Nome</th>
                  <th style={{ padding: '12px' }}>E-mail</th>
                  <th style={{ padding: '12px' }}>Cargo</th>
                  <th style={{ padding: '12px' }}>Filiais de Acesso</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosAtuais.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{user.nome_completo}</td>
                    <td style={{ padding: '12px', color: '#64748b', fontSize: '0.9rem' }}>{user.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', 
                        borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' 
                      }}>
                        {user.cargo}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', color: '#475569' }}>
                      {user.filiais_acesso?.length > 0 
                        ? user.filiais_acesso.join(', ') 
                        : user.filial_padrao_id}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      <button onClick={() => abrirModalEditar(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }} title="Editar">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => prepararExclusao(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Excluir">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Nenhum utilizador encontrado com o termo "{termoPesquisa}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CONTROLOS DE PAGINAÇÃO */}
          {usuariosFiltrados.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                A mostrar {indicePrimeiroItem + 1} a {Math.min(indiceUltimoItem, usuariosFiltrados.length)} de {usuariosFiltrados.length}
              </span>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={paginaAnterior} disabled={paginaAtual === 1}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', backgroundColor: paginaAtual === 1 ? '#f1f5f9' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', color: paginaAtual === 1 ? '#94a3b8' : '#334155' }}>
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', padding: '0 8px', color: '#475569' }}>Página {paginaAtual} de {totalPaginas || 1}</span>
                <button 
                  onClick={proximaPagina} disabled={paginaAtual === totalPaginas || totalPaginas === 0}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', backgroundColor: (paginaAtual === totalPaginas || totalPaginas === 0) ? '#f1f5f9' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: (paginaAtual === totalPaginas || totalPaginas === 0) ? 'not-allowed' : 'pointer', color: (paginaAtual === totalPaginas || totalPaginas === 0) ? '#94a3b8' : '#334155' }}>
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO --- */}
      {modalAberto && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-conteudo" style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>{modoEdicao ? 'Editar Utilizador' : 'Novo Utilizador'}</h3>
              <button onClick={() => setModalAberto(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', color: '#64748b' }}><X size={20}/></button>
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
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Acesso às Filiais (Dinâmico)
              </label>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontWeight: '600', color: '#1d4ed8', width: '100%' }}>
                  <input 
                    type="checkbox" 
                    checked={todasSelecionadas}
                    onChange={(e) => alternarTodasFiliais(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Todas as Filiais
                </label>

                {TODAS_AS_FILIAIS.map(filialId => (
                  <label key={filialId} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', flex: '1', minWidth: '100px', fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
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

      {/* --- MODAL DE EXCLUSÃO COM SENHA --- */}
      {modalExcluirAberto && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-conteudo" style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={24} /> Confirmar Exclusão
            </h3>
            
            <p style={{ marginBottom: '16px', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Tem certeza que deseja apagar o utilizador <strong>{usuarioParaExcluir?.nome_completo}</strong> permanentemente?
            </p>
            <p style={{ marginBottom: '12px', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
              Por favor, insira a <strong>SUA</strong> senha de acesso para confirmar:
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
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}
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