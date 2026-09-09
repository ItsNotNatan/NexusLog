import React, { useState, useEffect } from 'react';
import { Target, Edit2, Save, X, Loader2 } from 'lucide-react';
import { useAlert } from '../../../../contexts/AlertContext'; 
import { apiFetch } from '../../../../services/api'; // Importa a comunicação com a API

export default function TargetEficiencia() {
  const [prazoAtual, setPrazoAtual] = useState(3);
  const [editando, setEditando] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState(3);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const { showConfirm, showAlert } = useAlert();

  // ✨ 1. Busca o valor do banco de dados ao abrir a tela
  useEffect(() => {
    const buscarTarget = async () => {
      try {
        const resposta = await apiFetch('/configuracoes/target');
        if (resposta.sucesso && resposta.dados) {
          setPrazoAtual(Number(resposta.dados));
        }
      } catch (error) {
        console.error("Erro ao buscar target:", error);
      } finally {
        setCarregando(false);
      }
    };
    buscarTarget();
  }, []);

  const iniciarEdicao = async () => {
    const confirmado = await showConfirm(
      "Alterar Target de Eficiência",
      "Tem a certeza que deseja alterar o prazo de expiração das Packing Lists? Isto afetará o cálculo de eficiência em todo o Dashboard.",
      "warning",
      "Sim, Alterar"
    );

    if (confirmado) {
      setNovoPrazo(prazoAtual); 
      setEditando(true);
    }
  };

  // ✨ 2. Salva o valor no banco de dados
  const salvarAlteracao = async () => {
    if (!novoPrazo || novoPrazo < 1) {
      showAlert("Valor Inválido", "O prazo tem de ser de pelo menos 1 dia.", "error");
      return;
    }

    setSalvando(true);
    try {
      const resposta = await apiFetch('/configuracoes/target', {
        method: 'POST',
        body: JSON.stringify({ valor: novoPrazo })
      });

      if (resposta.sucesso) {
        setPrazoAtual(Number(novoPrazo));
        setEditando(false);
        showAlert("Target Atualizado", `O novo target de eficiência foi configurado para ${novoPrazo} dias com sucesso!`, "success");
      } else {
        showAlert("Erro", resposta.erro || "Falha ao atualizar o target.", "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível ligar ao servidor.", "error");
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicao = () => {
    setEditando(false);
  };

  return (
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
      
      {carregando ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', padding: '16px' }}>
          <Loader2 size={18} className="animate-spin" /> Carregando configuração...
        </div>
      ) : !editando ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '0.05em' }}>
              Prazo Atual Configurado
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
              {prazoAtual} dias
            </span>
          </div>
          <button onClick={iniciarEdicao} className="btn-padrao">
            <Edit2 size={16} /> Alterar Target
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe', animation: 'fadeIn 0.2s ease-out' }}>
          <div className="form-grupo" style={{ marginBottom: '16px' }}>
            <label htmlFor="prazo-input" style={{ color: '#1d4ed8' }}>NOVO PRAZO TARGET (EM DIAS)</label>
            <input 
              id="prazo-input" 
              type="number" 
              className="input-padrao" 
              value={novoPrazo} 
              onChange={(e) => setNovoPrazo(e.target.value)}
              min="1"
              style={{ borderColor: '#93c5fd', width: '150px' }}
              disabled={salvando}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={salvarAlteracao} className="btn-salvar" disabled={salvando}>
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              {salvando ? 'A salvar...' : 'Salvar Novo Prazo'}
            </button>
            <button onClick={cancelarEdicao} className="btn-padrao" disabled={salvando}>
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}