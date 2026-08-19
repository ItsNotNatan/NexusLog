import React, { useState } from 'react';
import { Target, Edit2, Save, X } from 'lucide-react';
import { useAlert } from '../../../../contexts/AlertContext'; // Importa o nosso gestor de alertas

export default function TargetEficiencia() {
  // Estado que guarda o valor oficial (no futuro, isto virá do banco de dados)
  const [prazoAtual, setPrazoAtual] = useState(3);
  
  // Estados para controlar o modo de edição
  const [editando, setEditando] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState(3);

  // Invoca a nossa caixa de confirmação
  const { showConfirm, showAlert } = useAlert();

  // 1. O utilizador clica em "Alterar"
  const iniciarEdicao = async () => {
    // 2. O sistema faz a pergunta
    const confirmado = await showConfirm(
      "Alterar Target de Eficiência",
      "Tem a certeza que deseja alterar o prazo de expiração das Packing Lists? Isto afetará o cálculo de eficiência em todo o Dashboard.",
      "warning",
      "Sim, Alterar"
    );

    // 3. Se ele disser "Sim", abre a caixa de edição
    if (confirmado) {
      setNovoPrazo(prazoAtual); // Puxa o valor atual para a caixa de texto
      setEditando(true);
    }
  };

  const salvarAlteracao = () => {
    if (!novoPrazo || novoPrazo < 1) {
      showAlert("Valor Inválido", "O prazo tem de ser de pelo menos 1 dia.", "error");
      return;
    }

    // Aqui, no futuro, você faria o "apiFetch" para salvar na base de dados
    setPrazoAtual(Number(novoPrazo));
    setEditando(false);
    showAlert("Target Atualizado", `O novo target de eficiência foi configurado para ${novoPrazo} dias com sucesso!`, "success");
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
      
      {!editando ? (
        /* VISÃO NORMAL (Leitura) */
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
        /* VISÃO DE EDIÇÃO */
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
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={salvarAlteracao} className="btn-salvar">
              <Save size={16} /> Salvar Novo Prazo
            </button>
            <button onClick={cancelarEdicao} className="btn-padrao">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}