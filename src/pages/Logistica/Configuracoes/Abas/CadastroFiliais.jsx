import React, { useState, useEffect, useContext } from 'react';
import { Building, Plus, MapPin, Trash2, Edit, Save, X } from 'lucide-react';
import { apiFetch } from '../../../../services/api';
import { AuthContext } from '../../../../contexts/AuthContext';

export default function CadastroFiliais() {
  const { atualizarFiliaisGlobais } = useContext(AuthContext);
  const [filiais, setFiliais] = useState([]);
  const [novaFilial, setNovaFilial] = useState({ id: '', nome: '', cidade: '' });

  // ✨ ESTADOS PARA A EDIÇÃO
  const [filialEditando, setFilialEditando] = useState(null);
  const [dadosEdicao, setDadosEdicao] = useState({ nome: '', cidade: '' });

  useEffect(() => {
    carregarFiliais();
  }, []);

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
        atualizarFiliaisGlobais();
      } else {
        alert("Erro ao apagar filial: " + data.erro);
      }
    } catch (error) {
      alert("Falha de conexão ao apagar filial.");
    }
  };

  // ✨ FUNÇÕES DE EDIÇÃO
  const iniciarEdicao = (filial) => {
    setFilialEditando(filial.id);
    setDadosEdicao({ nome: filial.nome, cidade: filial.cidade || '' });
  };

  const cancelarEdicao = () => {
    setFilialEditando(null);
    setDadosEdicao({ nome: '', cidade: '' });
  };

  const salvarEdicao = async (idFilial) => {
    if (!dadosEdicao.nome) {
      alert("O nome da filial não pode estar vazio.");
      return;
    }

    try {
      const payload = {
        nome: dadosEdicao.nome.toUpperCase(),
        cidade: dadosEdicao.cidade
      };

      const data = await apiFetch(`/filiais/${idFilial}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      if (data.sucesso) {
        setFiliais(filiais.map(f => f.id === idFilial ? { ...f, ...payload } : f));
        cancelarEdicao();
        atualizarFiliaisGlobais();
      } else {
        alert("Erro ao atualizar filial: " + data.erro);
      }
    } catch (error) {
      alert("Falha de conexão com o servidor ao atualizar filial.");
    }
  };

  return (
    <div className="config-cartao">
      <div className="cartao-topo">
        <div className="icone-destaque" style={{ backgroundColor: '#faf5ff', color: '#a855f7' }}>
          <Building size={24} />
        </div>
        <div className="textos-topo">
          <h2>Cadastro de Filiais</h2>
          <p>Crie e edite as filiais disponíveis no sistema</p>
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
            <div className="filial-item" key={filial.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              
              <div className="filial-item-esquerda" style={{ flex: 1, minWidth: '250px' }}>
                <div className="filial-icone-bg">
                  <MapPin size={20} />
                </div>
                
                {filialEditando === filial.id ? (
                  // ✨ MODO DE EDIÇÃO
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <input 
                      className="input-padrao" 
                      style={{ padding: '8px', fontSize: '0.875rem' }} 
                      value={dadosEdicao.nome} 
                      onChange={(e) => setDadosEdicao({...dadosEdicao, nome: e.target.value})} 
                      placeholder="Nome da Filial"
                    />
                    <input 
                      className="input-padrao" 
                      style={{ padding: '8px', fontSize: '0.875rem' }} 
                      value={dadosEdicao.cidade} 
                      onChange={(e) => setDadosEdicao({...dadosEdicao, cidade: e.target.value})} 
                      placeholder="Cidade"
                    />
                  </div>
                ) : (
                  // ✨ MODO NORMAL
                  <div className="filial-info">
                    <span className="filial-codigo">{filial.id}</span>
                    <span className="filial-detalhes">
                      <strong>{filial.nome}</strong> {filial.cidade ? `— ${filial.cidade}` : ''}
                    </span>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {filialEditando === filial.id ? (
                  <>
                    <button 
                      onClick={() => salvarEdicao(filial.id)} 
                      style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
                    >
                      <Save size={16} /> Salvar
                    </button>
                    <button 
                      onClick={cancelarEdicao} 
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}
                    >
                      <X size={16} /> Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => iniciarEdicao(filial)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '8px' }}
                      title="Editar Filial"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="btn-excluir-filial" 
                      title="Apagar Filial"
                      onClick={() => excluirFilial(filial.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}