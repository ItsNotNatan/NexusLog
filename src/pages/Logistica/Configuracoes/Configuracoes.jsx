import React, { useState, useEffect } from 'react';
import './Configuracoes.css';
import { Target, Info, RotateCcw, Save, Users, Edit, Plus, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function Configuracoes() {
  // ==========================================
  // 1. ESTADOS DA PÁGINA E ABAS
  // ==========================================
  const [abaAtiva, setAbaAtiva] = useState('target'); 

  // Estado do Target
  const [prazo, setPrazo] = useState(3);

  // Estados dos Utilizadores
  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Estado da Pesquisa e Paginação
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  // Estado do Formulário (Modal)
  const [usuarioAtual, setUsuarioAtual] = useState({
    id: '',
    nome: '',
    email: '',
    senha: '',
    cargo: 'OPERADOR', 
    filiais_acesso: ['BR06'] 
  });

  // ✨ LISTA MESTRA DE FILIAIS (Usada para a lógica do "Selecionar Todas")
  const TODAS_AS_FILIAIS = ['BR02', 'BR04', 'BR06'];

  // ==========================================
  // 2. EFEITOS E REQUISIÇÕES (API)
  // ==========================================
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'meu-token-de-teste-123');
      }
      const token = localStorage.getItem('token');

      const resposta = await fetch('http://localhost:3001/api/usuarios/listar', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await resposta.json();

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
        alert("Por favor, selecione pelo menos uma filial de acesso.");
        return;
      }

      const token = localStorage.getItem('token');
      
      const dadosParaEnviar = {
        nome: usuarioAtual.nome, 
        email: usuarioAtual.email,
        cargo: usuarioAtual.cargo,
        filiais_acesso: usuarioAtual.filiais_acesso,
        senha: usuarioAtual.senha
      };

      const url = modoEdicao 
        ? `http://localhost:3001/api/usuarios/${usuarioAtual.id}` 
        : 'http://localhost:3001/api/usuarios/criar';
      
      const metodo = modoEdicao ? 'PATCH' : 'POST';

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dadosParaEnviar)
      });

      const data = await resposta.json();

      if (data.sucesso) {
        setModalAberto(false);
        carregarUsuarios(); 
        alert("Guardado com sucesso!"); 
      } else {
        alert(data.erro);
      }
    } catch (erro) {
      console.error("Erro ao guardar utilizador:", erro);
    }
  };

  // ==========================================
  // 3. FUNÇÕES AUXILIARES
  // ==========================================
  
  // Função para marcar/desmarcar UMA filial específica
  const alternarFilial = (filialId) => {
    setUsuarioAtual(prev => {
      const novasFiliais = prev.filiais_acesso.includes(filialId)
        ? prev.filiais_acesso.filter(f => f !== filialId)
        : [...prev.filiais_acesso, filialId];
        
      return { ...prev, filiais_acesso: novasFiliais };
    });
  };

  // ✨ NOVA FUNÇÃO: Função para marcar/desmarcar TODAS as filiais de uma vez
  const alternarTodasFiliais = (marcarTodas) => {
    setUsuarioAtual(prev => ({
      ...prev,
      // Se clicar para marcar, enviamos a lista mestra completa. Se desmarcar, enviamos lista vazia.
      filiais_acesso: marcarTodas ? [...TODAS_AS_FILIAIS] : []
    }));
  };

  // ✨ AUTO CHECK: Verifica se o utilizador já tem as 3 filiais para marcar a caixa "Todas" automaticamente
  const todasSelecionadas = TODAS_AS_FILIAIS.every(filial => 
    usuarioAtual.filiais_acesso.includes(filial)
  );

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setUsuarioAtual({ id: '', nome: '', email: '', senha: '', cargo: 'OPERADOR', filiais_acesso: ['BR06'] });
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

  const aoMudarPesquisa = (evento) => {
    setTermoPesquisa(evento.target.value);
    setPaginaAtual(1);
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

  const paginaAnterior = () => { if (paginaAtual > 1) setPaginaAtual(paginaAtual - 1); };
  const proximaPagina = () => { if (paginaAtual < totalPaginas) setPaginaAtual(paginaAtual + 1); };

  // ==========================================
  // 4. INTERFACE (RENDERIZAÇÃO)
  // ==========================================
  return (
    <div className="config-wrapper">
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      {/* --- MENU DE ABAS --- */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
        <button 
          onClick={() => setAbaAtiva('target')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            color: abaAtiva === 'target' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'target' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Target size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Target de Eficiência
        </button>

        <button 
          onClick={() => setAbaAtiva('perfis')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            color: abaAtiva === 'perfis' ? '#0056b3' : '#6b7280',
            borderBottom: abaAtiva === 'perfis' ? '3px solid #0056b3' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Gestão de Perfis
        </button>
      </div>

      {/* --- CONTEÚDO DA ABA 1: TARGET --- */}
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

      {/* --- CONTEÚDO DA ABA 2: PERFIS DE UTILIZADORES --- */}
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

          {/* BARRA DE PESQUISA */}
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

          {/* TABELA DE UTILIZADORES */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', color: '#666' }}>
                  <th style={{ padding: '12px' }}>Nome</th>
                  <th style={{ padding: '12px' }}>E-mail</th>
                  <th style={{ padding: '12px' }}>Cargo</th>
                  <th style={{ padding: '12px' }}>Filiais de Acesso</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ação</th>
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
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => abrirModalEditar(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}>
                        <Edit size={18} />
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

          {/* CONTROLOS DE PAGINAÇÃO */}
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

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO --- */}
      {modalAberto && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-conteudo" style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
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
                placeholder="Introduza a senha"
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

            {/* ✨ CHECKBOXES DAS FILIAIS COM OPÇÃO "TODAS" */}
            <div className="form-grupo" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Acesso às Filiais (Selecione 1 ou mais)
              </label>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                
                {/* BOTÃO "TODAS AS FILIAIS" - Destacado com uma cor diferente (azul clarinho) */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: '600', color: '#1d4ed8', width: '100%' }}>
                  <input 
                    type="checkbox" 
                    checked={todasSelecionadas}
                    onChange={(e) => alternarTodasFiliais(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Todas as Filiais
                </label>

                {/* OPÇÕES INDIVIDUAIS */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb', flex: '1' }}>
                  <input 
                    type="checkbox" 
                    checked={usuarioAtual.filiais_acesso.includes('BR02')}
                    onChange={() => alternarFilial('BR02')}
                    style={{ width: '16px', height: '16px' }}
                  />
                  BR02
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb', flex: '1' }}>
                  <input 
                    type="checkbox" 
                    checked={usuarioAtual.filiais_acesso.includes('BR04')}
                    onChange={() => alternarFilial('BR04')}
                    style={{ width: '16px', height: '16px' }}
                  />
                  BR04
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb', flex: '1' }}>
                  <input 
                    type="checkbox" 
                    checked={usuarioAtual.filiais_acesso.includes('BR06')}
                    onChange={() => alternarFilial('BR06')}
                    style={{ width: '16px', height: '16px' }}
                  />
                  BR06
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-padrao" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={guardarUsuario}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}