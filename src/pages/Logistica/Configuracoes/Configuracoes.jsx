import React, { useState, useEffect } from 'react';
import './Configuracoes.css';
// Adicionámos novos ícones: Users, Edit, Plus e X
import { Target, Info, RotateCcw, Save, Users, Edit, Plus, X } from 'lucide-react';

export default function Configuracoes() {
  // ==========================================
  // ESTADOS DO TARGET DE EFICIÊNCIA
  // ==========================================
  const [prazo, setPrazo] = useState(3);

  // ==========================================
  // ESTADOS DA GESTÃO DE UTILIZADORES
  // ==========================================
  const [usuarios, setUsuarios] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Estado para armazenar os dados do formulário do modal
  const [usuarioAtual, setUsuarioAtual] = useState({
    id: '',
    nome: '',
    email: '',
    senha: '',
    cargo: 'Requerente',
    filial: 'BR06'
  });

  // ==========================================
  // EFEITOS (CARREGAR DADOS)
  // ==========================================
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const token = localStorage.getItem('token'); // Pega o token para passar na catraca
      const resposta = await fetch('http://localhost:3001/api/usuarios/listar', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resposta.json();
      if (data.sucesso) {
        setUsuarios(data.dados);
      }
    } catch (erro) {
      console.error("Erro ao carregar utilizadores:", erro);
    }
  };

  // ==========================================
  // FUNÇÕES DO MODAL E FORMULÁRIO
  // ==========================================
  const abrirModalNovo = () => {
    setModoEdicao(false);
    setUsuarioAtual({ id: '', nome: '', email: '', senha: '', cargo: 'Requerente', filial: 'BR06' });
    setModalAberto(true);
  };

  const abrirModalEditar = (user) => {
    setModoEdicao(true);
    setUsuarioAtual({
      id: user.id,
      nome: user.nome_completo,
      email: user.email,
      senha: '', // A senha não vem do banco por segurança, deixamos em branco
      cargo: user.cargo,
      filial: user.filial_padrao_id
    });
    setModalAberto(true);
  };

  const guardarUsuario = async () => {
    try {
      const token = localStorage.getItem('token');
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
        body: JSON.stringify(usuarioAtual)
      });

      const data = await resposta.json();

      if (data.sucesso) {
        setModalAberto(false);
        carregarUsuarios(); // Atualiza a tabela com os novos dados
        alert(data.mensagem); // Idealmente, podes trocar isto pelo teu AlertContext!
      } else {
        alert(data.erro);
      }
    } catch (erro) {
      console.error("Erro ao guardar utilizador:", erro);
    }
  };

  return (
    <div className="config-wrapper">
      {/* --- CABEÇALHO DA PÁGINA --- */}
      <header className="config-cabecalho">
        <h1>Configurações</h1>
        <p>Gira métricas do sistema e acessos de utilizadores</p>
      </header>

      {/* ========================================= */}
      {/* CARTÃO 1: TARGET DE EFICIÊNCIA          */}
      {/* ========================================= */}
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
            id="prazo-input"
            type="number" 
            className="input-padrao" 
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
          <p className="texto-ajuda">
            Um BS é considerado "Dentro do Target" se o tempo entre a <strong>criação da PS</strong> e a <strong>data de finalização do BS</strong> for &le; {prazo || 0} dia(s).
          </p>
        </div>

        <div className="caixa-info">
          <div className="info-titulo">
            <Info size={18} />
            <span>Como é calculado?</span>
          </div>
          <ul className="info-lista">
            <li>Lead Time = Data Finalização BS &minus; Data Criação da Solicitação PS</li>
            <li>Se Lead Time &le; Target &rarr; conta como "Dentro do Target"</li>
          </ul>
        </div>
      </div>

      {/* ========================================= */}
      {/* CARTÃO 2: GESTÃO DE UTILIZADORES        */}
      {/* ========================================= */}
      <div className="config-cartao" style={{ marginTop: '24px' }}>
        <div className="cartao-topo" style={{ justifyContent: 'space-between' }}>
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

        {/* TABELA DE UTILIZADORES */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', textAlign: 'left' }}>
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
              {usuarios.map(user => (
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
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#999' }}>Nenhum utilizador encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL DE CRIAÇÃO / EDIÇÃO                 */}
      {/* ========================================= */}
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
                <label>Senha Provisória</label>
                <input type="password" className="input-padrao" value={usuarioAtual.senha} onChange={(e) => setUsuarioAtual({...usuarioAtual, senha: e.target.value})} />
              </div>
            )}

            <div className="form-grupo" style={{ marginBottom: '16px' }}>
              <label>Cargo</label>
              <select className="input-padrao" value={usuarioAtual.cargo} onChange={(e) => setUsuarioAtual({...usuarioAtual, cargo: e.target.value})}>
                <option value="Requerente">Requerente</option>
                <option value="Logística">Logística</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            <div className="form-grupo" style={{ marginBottom: '24px' }}>
              <label>Filial Padrão</label>
              <select className="input-padrao" value={usuarioAtual.filial} onChange={(e) => setUsuarioAtual({...usuarioAtual, filial: e.target.value})}>
                <option value="BR02">BR02</option>
                <option value="BR04">BR04</option>
                <option value="BR06">BR06</option>
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