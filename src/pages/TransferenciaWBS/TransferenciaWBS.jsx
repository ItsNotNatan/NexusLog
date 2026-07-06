import React, { useState } from 'react';
import './TransferenciaWBS.css';
import { ArrowLeftRight, Search, Plus, Send, Trash2 } from 'lucide-react'; // Adicionei Trash2 para a lixeira

// DADOS MOCK (Estoque Disponível na filial atual)
const itensDisponiveis = [
  { id: 1, pn: '1534534', desc: 'SENSOR DE INDUÇÃO', wbs: 'BRBCBBB20', qtd: '10 Unid' },
  { id: 2, pn: 'PN-TUB-7890', desc: 'Tubo Aço Inox 316L 6" Sch40', wbs: 'WBS-PRJ-2024-001', qtd: '4 Metro' },
  { id: 3, pn: 'PN-FLG-1580', desc: 'Flange Cego 4" ANSI 150', wbs: 'WBS-PRJ-2024-001', qtd: '17 Unid' },
];

export default function TransferenciaWBS() {
  // ESTADO: Guarda os itens que o usuário clicou para transferir
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
    setItensSelecionados(itensSelecionados.map(i => 
      i.id === id ? { ...i, qtdTransferencia: novaQtd } : i
    ));
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
            <input type="text" className="input-campo" placeholder="Seu nome" />
          </div>

          <div className="input-grupo">
            <label>WBS DE DESTINO *</label>
            <input type="text" className="input-campo" placeholder="WBS do projeto destino" />
          </div>

          <div className="input-grupo span-2">
            <label>JUSTIFICATIVA</label>
            <textarea className="input-campo" placeholder="Motivo da transferência..." rows="2"></textarea>
          </div>

        </div>

        <div className="anexos-grupo">
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
                onClick={() => adicionarItem(item)} // <-- Evento de Clique Adicionado aqui!
              >
                <div className="item-lista-pn">{item.pn}</div>
                <div className="item-lista-desc">{item.desc}</div>
                <div>
                  <span className="item-lista-wbs">{item.wbs}</span>
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
            {/* Mostra um contador de itens selecionados se houver algum */}
            {itensSelecionados.length > 0 && (
              <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>
                {itensSelecionados.length} itens
              </span>
            )}
          </div>

          {/* RENDERIZAÇÃO CONDICIONAL (Vazio vs Com Itens) */}
          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-itens">
              Selecione os itens à esquerda para transferir de WBS
            </div>
          ) : (
            <div className="lista-itens-scroll">
              {itensSelecionados.map(item => (
                <div key={`selecionado-${item.id}`} className="item-lista" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  {/* Info do Item */}
                  <div style={{ flex: 1 }}>
                    <div className="item-lista-pn">{item.pn}</div>
                    <div className="item-lista-desc">{item.desc}</div>
                    
                    {/* Campo para editar a quantidade a transferir */}
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>QTD:</label>
                      <input 
                        type="number" 
                        min="1"
                        value={item.qtdTransferencia}
                        onChange={(e) => atualizarQuantidade(item.id, e.target.value)}
                        style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', color: '#1e293b', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>

                  {/* Botão de Remover */}
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
        <button className="btn-enviar-azul">
          <Send size={16} /> Confirmar Transferência
        </button>
      </div>
    </>
  );
}