import React, { useState } from 'react';
import './TransferenciaWBS.css';
import { ArrowLeftRight, Search, Plus, Send, Trash2, Zap } from 'lucide-react'; 

// DADOS MOCK (Estoque Disponível na filial atual)
// Nota: Em um cenário real, o 'wbs' listado aqui é o WBS de ORIGEM.
const itensDisponiveis = [
  { id: 1, pn: '1534534', desc: 'SENSOR DE INDUÇÃO', wbs: 'BRBCBBB20', qtd: 10 },
  { id: 2, pn: 'PN-TUB-7890', desc: 'Tubo Aço Inox 316L 6" Sch40', wbs: 'WBS-PRJ-2024-001', qtd: 4 },
  { id: 3, pn: 'PN-FLG-1580', desc: 'Flange Cego 4" ANSI 150', wbs: 'WBS-PRJ-2024-001', qtd: 17 },
];

export default function TransferenciaWBS() {
  // 1. ESTADO: Dados do formulário de transferência
  const [formDados, setFormDados] = useState({
    nome: '',
    wbsDestino: '',
    justificativa: '',
    entregaUrgente: false
  });

  // 2. ESTADO: Guarda os itens que o usuário clicou para transferir
  const [itensSelecionados, setItensSelecionados] = useState([]);

  // Função para adicionar um item à coluna da direita
  const adicionarItem = (item) => {
    // Verifica se o item já foi adicionado para não duplicar
    if (!itensSelecionados.find(i => i.id === item.id)) {
      setItensSelecionados([...itensSelecionados, { ...item, qtdTransferencia: 1 }]);
    }
  };

  // Função para remover da coluna da direita
  const removerItem = (id) => {
    setItensSelecionados(itensSelecionados.filter(i => i.id !== id));
  };

  // Função para mudar a quantidade a transferir
  const atualizarQuantidade = (id, novaQtd) => {
    // Impede que o usuário transfira mais do que tem disponível ou menos que 1
    const qtdFormatada = Math.max(1, parseInt(novaQtd) || 1);
    
    setItensSelecionados(itensSelecionados.map(i => 
      i.id === id ? { ...i, qtdTransferencia: qtdFormatada } : i
    ));
  };

  // 3. FUNÇÃO DE ENVIO PARA O BACKEND
  const handleEnviar = async () => {
    // Validação básica
    if (!formDados.nome || !formDados.wbsDestino) {
      alert("Preencha o Nome do Solicitante e o WBS de Destino.");
      return;
    }

    if (itensSelecionados.length === 0) {
      alert("Selecione pelo menos um item para transferir.");
      return;
    }

    // Prepara o pacote adaptando os nomes das variáveis para o que o backend Node.js espera
    const payload = {
      solicitante: {
        nome: formDados.nome,
        wbs: formDados.wbsDestino, // Enviamos como WBS padrão, o Node salva no wbs_destino
        observacoes: formDados.justificativa,
        entregaUrgente: formDados.entregaUrgente,
        tipo: 'Transferencia WBS' // Enviamos uma flag para facilitar no futuro
      },
      itens: itensSelecionados.map(item => ({
        numPecaFabricante: item.pn,
        materialDescription: item.desc,
        qtd: item.qtdTransferencia, // Importante: O Node.js procura por "qtd"
        wbsOrigem: item.wbs // Guardamos o WBS antigo caso precise no futuro
      }))
    };

    try {
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert(`Sucesso! Transferência solicitada. ID: ${dados.ps_id}`);
        // Limpa a tela após o sucesso
        setFormDados({ nome: '', wbsDestino: '', justificativa: '', entregaUrgente: false });
        setItensSelecionados([]);
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Falha ao conectar com o servidor. O backend está rodando na porta 3001?");
    }
  };

  return (
    <>
      <div className="form-cartao">

        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone"><ArrowLeftRight size={18} /></div>
            <h2>Dados da Transferência</h2>
          </div>
        </div>

        <div className="form-grid">
          <div className="input-grupo">
            <label>SOLICITANTE *</label>
            <input 
              type="text" 
              className="input-campo" 
              placeholder="Seu nome"
              value={formDados.nome}
              onChange={(e) => setFormDados({...formDados, nome: e.target.value})}
            />
          </div>

          <div className="input-grupo">
            <label>WBS DE DESTINO *</label>
            <input 
              type="text" 
              className="input-campo" 
              placeholder="WBS do projeto destino"
              value={formDados.wbsDestino}
              onChange={(e) => setFormDados({...formDados, wbsDestino: e.target.value})}
            />
          </div>

          <div className="input-grupo span-2">
            <label>JUSTIFICATIVA</label>
            <textarea 
              className="input-campo" 
              placeholder="Motivo da transferência..." 
              rows="2"
              value={formDados.justificativa}
              onChange={(e) => setFormDados({...formDados, justificativa: e.target.value})}
            ></textarea>
          </div>
        </div>

        {/* --- CHECKBOX: ENTREGA URGENTE --- */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          marginTop: '20px'
        }}>
          <input 
            type="checkbox" 
            id="checkbox-urgente"
            checked={formDados.entregaUrgente}
            onChange={(e) => setFormDados({...formDados, entregaUrgente: e.target.checked})}
            style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#475569" />
              <label htmlFor="checkbox-urgente" style={{ fontWeight: '600', color: '#0f172a', margin: 0, cursor: 'pointer' }}>
                Processamento Urgente
              </label>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              Marque esta opção se a transferência de custo e material for crítica e imediata.
            </span>
          </div>
        </div>

        <div className="anexos-grupo mt-4">
          <span>ANEXOS (OPCIONAL)</span>
          <button className="btn-anexo">
            <Plus size={16} /> Adicionar Arquivo
          </button>
        </div>

      </div>

      <div className="transferencia-grid-inferior">

        {/* COLUNA ESQUERDA - Itens Disponíveis */}
        <div className="coluna-cartao">

          <div className="coluna-esquerda-header">
            <h3>Selecionar Itens para Transferência</h3>
            <div className="pesquisa-itens-wrapper">
              <Search size={16} className="icone-busca-itens" />
              <input type="text" placeholder="Buscar por SAP, PN, Descrição..." />
            </div>
          </div>

          <div className="lista-itens-scroll">
            {itensDisponiveis.map(item => (
              <div 
                key={item.id} 
                className="item-lista" 
                onClick={() => adicionarItem(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="item-lista-pn">{item.pn}</div>
                <div className="item-lista-desc">{item.desc}</div>
                <div>
                  <span className="item-lista-wbs" title="WBS Origem">{item.wbs}</span>
                  <span className="item-lista-qtd">Disponível: {item.qtd}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* COLUNA DIREITA - Itens Selecionados */}
        <div className="coluna-cartao">

          <div className="coluna-direita-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeftRight size={20} className="icone-header-direita" /> Itens para Transferência
            </div>
            {itensSelecionados.length > 0 && (
              <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>
                {itensSelecionados.length} itens
              </span>
            )}
          </div>

          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-itens" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Selecione os itens à esquerda para transferir de WBS
            </div>
          ) : (
            <div className="lista-itens-scroll">
              {itensSelecionados.map(item => (
                <div key={`selecionado-${item.id}`} className="item-lista" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  <div style={{ flex: 1 }}>
                    <div className="item-lista-pn">{item.pn}</div>
                    <div className="item-lista-desc">{item.desc}</div>
                    
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>QTD:</label>
                      <input 
                        type="number" 
                        min="1"
                        max={item.qtd}
                        value={item.qtdTransferencia}
                        onChange={(e) => atualizarQuantidade(item.id, e.target.value)}
                        style={{ width: '70px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', color: '#1e293b', fontSize: '0.875rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {item.qtd}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => removerItem(item.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}
                    title="Remover item"
                  >
                    <Trash2 size={18} />
                  </button>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      <div className="form-acoes-final mt-4">
        {/* Adicionado o onClick aqui! */}
        <button className="btn-enviar-azul" onClick={handleEnviar}>
          <Send size={16} /> Confirmar Transferência
        </button>
      </div>
    </>
  );
}