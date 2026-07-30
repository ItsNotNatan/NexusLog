import React, { useState, useEffect } from 'react';
import './Configuracoes.css';
// Adicionámos o ícone 'Search' (Lupa) para a nossa barra de pesquisa
import { Target, Info, RotateCcw, Save, Users, Edit, Plus, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export default function Configuracoes() {
  const [prazo, setPrazo] = useState(3);

  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // --- NOVO: ESTADO DA PESQUISA ---
  const [termoPesquisa, setTermoPesquisa] = useState('');

  // --- ESTADOS DA PAGINAÇÃO ---
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;
  
  const [usuarioAtual, setUsuarioAtual] = useState({
    id: '',
    nome: '',
    email: '',
    senha: '',
    cargo: 'OPERADOR', 
    filial: 'BR06'
  });

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
      alert("Erro de conexão! O backend está desligado ou a porta está errada. Detalhe: " + erro.message);
    }
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setUsuarioAtual({ id: '', nome: '', email: '', senha: '', cargo: 'OPERADOR', filial: 'BR06' });
    setModalAberto(true);
  };

  const abrirModalEditar = (user) => {
    setModoEdicao(true);
    setUsuarioAtual({
      id: user.id,
      nome: user.nome_completo,
      email: user.email,
      senha: '', 
      cargo: user.cargo,
      filial: user.filial_padrao_id
    });
    setModalAberto(true);
  };

  const guardarUsuario = async () => {
    try {
      const token = localStorage.getItem('token');
      const dadosParaEnviar = {
        nome: usuarioAtual.nome, 
        email: usuarioAtual.email,
        cargo: usuarioAtual.cargo,
        filial_padrao_id: usuarioAtual.filial
      };

      if (!modoEdicao) {
        dadosParaEnviar.senha = usuarioAtual.senha;
      }

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
  // LÓGICA DE FILTRO E PAGINAÇÃO COMBINADAS
  // ==========================================
  
  // 1. Primeiro filtramos a lista inteira com base na palavra digitada
  const usuariosFiltrados = usuarios.filter(user => {
    // Transformamos o que o utilizador digitou em letras minúsculas para facilitar a busca
    const busca = termoPesquisa.toLowerCase();
    
    // Verificamos se a palavra existe em qualquer uma destas 4 colunas (transformando tudo em minúsculas)
    // Usamos o '?' (Optional Chaining) para evitar erros caso algum campo venha vazio do banco
    return (
      user.nome_completo?.toLowerCase().includes(busca) ||
      user.email?.toLowerCase().includes(busca) ||
      user.cargo?.toLowerCase().includes(busca) ||
      user.filial_padrao_id?.toLowerCase().includes(busca)
    );
  });

  // 2. Com a lista já filtrada, calculamos a paginação
  const indiceUltimoItem = paginaAtual * itensPorPagina;
  const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
  
  // 3. Cortamos a lista filtrada para mostrar apenas 10 por página
  const usuariosAtuais = usuariosFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);
  
  // 4. O total de páginas agora depende de quantos itens sobraram após o filtro
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina);

  const paginaAnterior = () => {
    if (paginaAtual > 1) setPaginaAtual(paginaAtual - 1);
  };

  const proximaPagina = () => {
    if (paginaAtual < totalPaginas) setPaginaAtual(paginaAtual + 1);
  };

  // Função para lidar com a digitação na pesquisa
  const aoMudarPesquisa = (evento) => {
    setTermoPesquisa(evento.target.value);
    setPaginaAtual(1); // Sempre que escrevemos algo, voltamos à página 1 para não haver conflitos
  };

  return (
    <div className="config-wrapper">
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      {/* --- CARTÃO 1: TARGET DE EFICIÊNCIA --- */}
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

      {/* --- CARTÃO 2: GESTÃO DE UTILIZADORES --- */}
      <div className="config-cartao" style={{ marginTop: '24px' }}>
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

        {/* --- BARRA DE PESQUISA --- */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', color: '#888', display: 'flex', alignItems: 'center' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            className="input-padrao" 
            placeholder="Pesquisar por nome, e-mail, cargo ou filial..." 
            value={termoPesquisa}
            onChange={aoMudarPesquisa}
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
                <th style={{ padding: '12px' }}>Filial Padrão</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {usuariosAtuais.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{user.nome_completo}</td>
                  <td style={{ padding: '12px', color: '#555' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}><span className={`badge-cargo ${user.cargo.toLowerCase()}`}>{user.cargo}</span></td>
                  <td style={{ padding: '12px' }}>{user.filial_padrao_id}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button onClick={() => abrirModalEditar(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}>
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Ajustamos a mensagem de erro para quando a pesquisa não encontra nada */}
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

        {/* --- CONTROLOS DE PAGINAÇÃO --- */}
        {usuariosFiltrados.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>
              A mostrar {indicePrimeiroItem + 1} a {Math.min(indiceUltimoItem, usuariosFiltrados.length)} de {usuariosFiltrados.length} utilizadores
            </span>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={paginaAnterior} 
                disabled={paginaAtual === 1}
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '6px 12px', 
                  backgroundColor: paginaAtual === 1 ? '#f3f4f6' : '#fff', 
                  border: '1px solid #d1d5db', borderRadius: '6px', 
                  cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer',
                  color: paginaAtual === 1 ? '#9ca3af' : '#374151'
                }}>
                <ChevronLeft size={16} /> Anterior
              </button>
              
              <span style={{ fontSize: '14px', fontWeight: '500', padding: '0 8px' }}>
                Página {paginaAtual} de {totalPaginas || 1}
              </span>
              
              <button 
                onClick={proximaPagina} 
                disabled={paginaAtual === totalPaginas || totalPaginas === 0}
                style={{ 
                  display: 'flex', alignItems: 'center', padding: '6px 12px', 
                  backgroundColor: (paginaAtual === totalPaginas || totalPaginas === 0) ? '#f3f4f6' : '#fff', 
                  border: '1px solid #d1d5db', borderRadius: '6px', 
                  cursor: (paginaAtual === totalPaginas || totalPaginas === 0) ? 'not-allowed' : 'pointer',
                  color: (paginaAtual === totalPaginas || totalPaginas === 0) ? '#9ca3af' : '#374151'
                }}>
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL DE CRIAÇÃO / EDIÇÃO (Continua igual) --- */}
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

            {!modoEdicao && (
              <div className="form-grupo" style={{ marginBottom: '16px' }}>
                <label>Senha</label>
                <input type="password" className="input-padrao" value={usuarioAtual.senha} onChange={(e) => setUsuarioAtual({...usuarioAtual, senha: e.target.value})} />
              </div>
            )}

            <div className="form-grupo" style={{ marginBottom: '16px' }}>
              <label>Cargo</label>
              <select className="input-padrao" value={usuarioAtual.cargo} onChange={(e) => setUsuarioAtual({...usuarioAtual, cargo: e.target.value})}>
                <option value="OPERADOR">Operador</option>
                <option value="LIDER">Líder</option>
                <option value="ADM">Administrador (ADM)</option>
              </select>
            </div>

            <div className="form-grupo" style={{ marginBottom: '24px' }}>
              <label>Filial Padrão</label>
              <select className="input-padrao" value={usuarioAtual.filial} onChange={(e) => setUsuarioAtual({...usuarioAtual, filial: e.target.value})}>
                <option value="BR02">BR02 — Santo André</option>
                <option value="BR04">BR04 — Goiana</option>
                <option value="BR06">BR06 — Betim</option>
              </select>
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