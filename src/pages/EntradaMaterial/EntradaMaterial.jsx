import React, { useState } from 'react';
import { Package, User, Plus, Send, Trash2, Paperclip, X } from 'lucide-react';
import CarregarArquivo from '../../components/CarregarArquivo/CarregarArquivo';

export default function EntradaMaterial() {
  // 1. ESTADO: Dados gerais do formulário
  const [formDados, setFormDados] = useState({
    nome: '',
    wbs: '',
    observacoes: ''
  });

  // 2. ESTADO: Tabela dinâmica de itens (começa com 1 linha vazia)
  const [itens, setItens] = useState([
    { id: Date.now(), desenhoSAP: '', partNumber: '', descricao: '', qtd: '', unid: 'Unid', fornecedor: '', valorUnit: '' }
  ]);

  // 3. ESTADO: Ficheiros anexados
  const [anexos, setAnexos] = useState([]);

  // --- FUNÇÕES DE MANIPULAÇÃO ---

  const adicionarItem = () => {
    setItens([
      ...itens,
      { id: Date.now(), desenhoSAP: '', partNumber: '', descricao: '', qtd: '', unid: 'Unid', fornecedor: '', valorUnit: '' }
    ]);
  };

  const removerItem = (id) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== id));
    } else {
      alert("A solicitação precisa ter pelo menos um item.");
    }
  };

  const atualizarItem = (id, campo, valor) => {
    setItens(itens.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const handleAnexar = (arquivo) => {
    setAnexos([...anexos, arquivo]);
  };

  const removerAnexo = (indexRemover) => {
    setAnexos(anexos.filter((_, index) => index !== indexRemover));
  };

  const handleEnviar = () => {
    // Validação básica
    if (!formDados.nome || !formDados.wbs) {
      alert("Preencha o Nome e o WBS do solicitante.");
      return;
    }

    const itensIncompletos = itens.some(i => !i.partNumber || !i.descricao || !i.qtd);
    if (itensIncompletos) {
      alert("Preencha os campos obrigatórios (Part Number, Descrição e Qtd) em todas as linhas.");
      return;
    }

    console.log("DADOS A ENVIAR PARA O SUPABASE:", { solicitante: formDados, itens, anexos });
    alert("Solicitação de Entrada enviada com sucesso!");
    // Aqui no futuro chamaremos a função do Supabase para salvar
  };

  return (
    <div className="entrada-container">
      
      {/* --- AVISO SUPERIOR --- */}
      <div className="banner-aviso banner-verde">
        <Package size={24} />
        <div>
          <strong>Entrada de Material</strong>
          <p>Preencha os dados dos itens a receber. A <strong>alocação física</strong> no armazém será definida pela equipe de Logística após a aprovação.</p>
        </div>
      </div>

      {/* --- BLOCO 1: DADOS DO SOLICITANTE --- */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-claro"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME *</label>
            <input 
              type="text" 
              className="input-campo foco-verde" 
              placeholder="Seu nome completo" 
              value={formDados.nome}
              onChange={(e) => setFormDados({...formDados, nome: e.target.value})}
            />
          </div>
          <div className="input-grupo">
            <label>WBS *</label>
            <input 
              type="text" 
              className="input-campo foco-verde" 
              placeholder="Ex: WBS-PRJ-2024-001" 
              value={formDados.wbs}
              onChange={(e) => setFormDados({...formDados, wbs: e.target.value})}
            />
          </div>
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea 
              className="input-campo foco-verde" 
              placeholder="Informações adicionais para a conferência..."
              value={formDados.observacoes}
              onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})}
            ></textarea>
          </div>
        </div>
      </div>

      {/* --- BLOCO 2: ITENS DINÂMICOS --- */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-quadrado"><Package size={18} /></div>
            <h2>Itens para Entrada</h2>
          </div>
          <button className="btn-adicionar-item" onClick={adicionarItem}>
            <Plus size={16} /> Adicionar Item
          </button>
        </div>
        
        <div className="itens-scroll-wrapper" style={{ overflowX: 'auto' }}>
          <div className="itens-grid-container" style={{ minWidth: '900px' }}>
            
            {/* CABEÇALHOS DA TABELA */}
            <div className="itens-grid-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 2fr 0.8fr 0.8fr 1.5fr 1fr 40px', gap: '8px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>
              <span>DESENHO SAP</span>
              <span>PART NUMBER *</span>
              <span>DESCRIÇÃO *</span>
              <span>QTD *</span>
              <span>UNID</span>
              <span>FORNECEDOR</span>
              <span>VALOR UNIT.</span>
              <span></span>
            </div>

            {/* LINHAS DINÂMICAS */}
            {itens.map((item) => (
              <div key={item.id} className="itens-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 2fr 0.8fr 0.8fr 1.5fr 1fr 40px', gap: '8px', marginBottom: '8px' }}>
                <input type="text" className="input-campo foco-verde" placeholder="SAP..." value={item.desenhoSAP} onChange={(e) => atualizarItem(item.id, 'desenhoSAP', e.target.value)} />
                <input type="text" className="input-campo foco-verde" placeholder="PN..." value={item.partNumber} onChange={(e) => atualizarItem(item.id, 'partNumber', e.target.value)} />
                <input type="text" className="input-campo foco-verde" placeholder="Descrição da peça..." value={item.descricao} onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)} />
                <input type="number" className="input-campo foco-verde" placeholder="0" min="1" value={item.qtd} onChange={(e) => atualizarItem(item.id, 'qtd', e.target.value)} />
                <select className="input-campo foco-verde" value={item.unid} onChange={(e) => atualizarItem(item.id, 'unid', e.target.value)}>
                  <option value="Unid">Unid</option>
                  <option value="Kg">Kg</option>
                  <option value="Metro">Metro</option>
                  <option value="Caixa">Caixa</option>
                  <option value="Litro">Litro</option>
                </select>
                <input type="text" className="input-campo foco-verde" placeholder="Nome..." value={item.fornecedor} onChange={(e) => atualizarItem(item.id, 'fornecedor', e.target.value)} />
                <input type="text" className="input-campo foco-verde" placeholder="R$ 0,00" value={item.valorUnit} onChange={(e) => atualizarItem(item.id, 'valorUnit', e.target.value)} />
                
                <button 
                  onClick={() => removerItem(item.id)} 
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Remover linha"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* --- BLOCO 3: ANEXOS --- */}
      <div className="form-cartao">
        <div className="input-grupo">
          <label>ANEXOS (OPCIONAL - Notas Fiscais, Manuais, Fotos)</label>
          
          <div style={{ marginTop: '8px' }}>
            <CarregarArquivo 
              variante="botao"
              accept=".pdf, .jpg, .png, .xlsx"
              label="Anexar Arquivo"
              icone={<Paperclip size={16} />}
              onFileSelect={handleAnexar}
            />
          </div>

          {/* LISTA DE ARQUIVOS ANEXADOS */}
          {anexos.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anexos.map((arquivo, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: 'fit-content', minWidth: '300px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{arquivo.name}</span>
                  <button onClick={() => removerAnexo(index)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* --- BLOCO 4: AÇÃO FINAL --- */}
      <div className="form-acoes-final">
        <button className="btn-enviar-azul" style={{ backgroundColor: '#10b981' }} onClick={handleEnviar}>
          <Send size={16} /> Solicitar Entrada de Material
        </button>
      </div>
      
    </div>
  );
}