import React, { useState } from 'react';
import { Package, User, Plus, Send, Trash2, Paperclip, X, FileSpreadsheet } from 'lucide-react';

// NOSSOS COMPONENTES E HOOKS
import CarregarArquivo from '../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal'; // <-- Importação do Botão Global!

export default function EntradaMaterial() {
  // 1. ESTADO: Dados gerais do formulário
  const [formDados, setFormDados] = useState({
    nome: '',
    wbs: '',
    observacoes: ''
  });

  // 2. ESTADO: Tabela dinâmica de itens (começa com 1 linha vazia)
  const [itens, setItens] = useState([
    { 
      id: `linha-vazia-${Date.now()}`, 
      desenhoSAP: '', 
      partNumber: '', 
      descricao: '', 
      qtdSelecionada: 1, 
      unidadeMedida: 'Unid', 
      fornecedor: '', 
      referencia: '',
      wbs: '',
      alocacao: ''
    }
  ]);

  // 3. ESTADO: Ficheiros anexados
  const [anexos, setAnexos] = useState([]);

  // INICIA O MAESTRO (Hook de Processamento do Excel)
  const processador = useProcessadorExcel();

  // --- FUNÇÕES DE MANIPULAÇÃO DA TABELA ---

  const handleImportarExcel = async (arquivo) => {
    const novosItens = await processador.iniciarProcessamento(arquivo);
    if (novosItens && Array.isArray(novosItens)) {
      setItens(prev => {
        // Remove a linha vazia inicial se o usuário estiver importando um Excel
        const listaLimpa = prev.filter(i => i.partNumber !== '' || i.descricao !== '');
        return [...listaLimpa, ...novosItens];
      });
    }
  };

  const adicionarLinhaEmBranco = () => {
    setItens([
      ...itens,
      { 
        id: `linha-vazia-${Date.now()}`, 
        desenhoSAP: '', 
        partNumber: '', 
        descricao: '', 
        qtdSelecionada: 1, 
        unidadeMedida: 'Unid', 
        fornecedor: '', 
        referencia: '',
        wbs: '',
        alocacao: '' 
      }
    ]);
  };

  const removerItem = (idParaRemover) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== idParaRemover));
    } else {
      alert("A solicitação precisa ter pelo menos um item.");
    }
  };

  const atualizarCampo = (id, campo, novoValor) => {
    setItens(itens.map(item => item.id === id ? { ...item, [campo]: novoValor } : item));
  };

  const handleAnexar = (arquivo) => {
    setAnexos([...anexos, arquivo]);
  };

  const removerAnexo = (indexRemover) => {
    setAnexos(anexos.filter((_, index) => index !== indexRemover));
  };

  // --- ENVIO PARA O BACKEND (NODE.JS) ---
  const handleEnviar = async () => {
    // Validação básica
    if (!formDados.nome || !formDados.wbs) {
      alert("Preencha o Nome e o WBS do solicitante.");
      return;
    }

    const itensIncompletos = itens.some(i => !i.numPecaFabricante && !i.partNumber || (!i.materialDescription && !i.descricao) || !i.qtdSelecionada);
    if (itensIncompletos) {
      alert("Preencha os campos obrigatórios (Part Number, Descrição e Qtd) em todas as linhas.");
      return;
    }

    // Prepara o pacote de dados para enviar ao Node.js
    const payload = {
      solicitante: formDados,
      itens: itens
    };

    try {
      // Faz a requisição POST para o seu servidor backend
      const resposta = await fetch('http://localhost:3001/api/solicitacoes/nova', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        alert(`Sucesso! Solicitação de Entrada enviada. ID: ${dados.ps_id}`);
        // Limpa o formulário
        setFormDados({ nome: '', wbs: '', observacoes: '' });
        setItens([{ id: `linha-vazia-${Date.now()}`, desenhoSAP: '', partNumber: '', descricao: '', qtdSelecionada: 1, unidadeMedida: 'Unid', fornecedor: '', referencia: '', wbs: '', alocacao: '' }]);
        setAnexos([]);
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Falha ao conectar com o servidor. Verifique se o backend está rodando na porta 3001.");
    }
  };

  return (
    <div className="entrada-container">
      
      {/* TELA DE CARREGAMENTO DO EXCEL (MODAL) */}
      <ModalProcessamento 
        estaProcessando={processador.estaProcessando}
        concluido={processador.concluido}
        estadoProgresso={processador.estadoProgresso}
        resultado={processador.resultado}
        erroFatal={processador.erroFatal}
        onClose={processador.resetarProcessador}
      />

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

      {/* --- BLOCO 2: ITENS PARA ENTRADA (ESTILO "ITENS SELECIONADOS") --- */}
      <div className="form-cartao" style={{ padding: 0, overflow: 'hidden' }}>
        
        {/* Cabeçalho da Tabela */}
        <div className="form-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
          <div className="form-header-esquerda">
            <div className="form-header-icone verde-quadrado" style={{ width: '28px', height: '28px' }}><Package size={16} /></div>
            <h2 style={{ fontSize: '1rem' }}>Itens para Entrada</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* BOTÃO NOVA LINHA */}
            <button 
              onClick={adicionarLinhaEmBranco} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '6px 12px', backgroundColor: '#ffffff', 
                border: '1px solid #cbd5e1', borderRadius: '8px', 
                fontSize: '0.75rem', fontWeight: '600', color: '#475569', 
                cursor: 'pointer' 
              }}
            >
              <Plus size={16} /> Nova Linha
            </button>

            {/* BOTÃO IMPORTAR EXCEL */}
            <CarregarArquivo 
              variante="botao"
              accept=".xlsx, .xls"
              label="Importar Excel"
              icone={<FileSpreadsheet size={16} color="#10b981" />}
              onFileSelect={handleImportarExcel}
            />

            {/* CONTADOR */}
            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '999px' }}>
              {itens.length} itens
            </span>
          </div>
        </div>
        
        {/* Corpo da Tabela */}
        <div className="scroll-tabela-solicitacao">
          <table className="tabela-solicitacao-dados">
            <thead>
              <tr>
                <th>AÇÕES</th>
                <th>MATERIAL DESCRIPTION</th>
                <th>Nº PEÇA FABRICANTE</th>
                <th>QTD. SOLICITADA</th>
                <th>DESENHO SAP</th>
                <th>FORNECEDOR</th>
                <th>REFERÊNCIA</th>
                <th>UNIDADE</th>
                <th>WBS</th>
                <th>ALOCAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => removerItem(item.id)} className="btn-deletar-linha">
                      <Trash2 size={16} />
                    </button>
                  </td>
                  <td style={{ minWidth: '220px' }}>
                    <input className="input-editavel-tabela texto-preto" value={item.descricao || item.materialDescription || ''} onChange={(e) => atualizarCampo(item.id, 'materialDescription', e.target.value)} placeholder="Descrição do item" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela badge-partnumber" value={item.partNumber || item.numPecaFabricante || ''} onChange={(e) => atualizarCampo(item.id, 'numPecaFabricante', e.target.value)} placeholder="PN" />
                  </td>
                  <td className="qtd-solicitada-destaque">
                    <input type="number" className="input-inline-tabela" value={item.qtdSelecionada || 1} onChange={(e) => atualizarCampo(item.id, 'qtdSelecionada', e.target.value)} placeholder="0" min="1" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela texto-cinza-claro" value={item.desenhoSAP || ''} onChange={(e) => atualizarCampo(item.id, 'desenhoSAP', e.target.value)} placeholder="SAP" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela texto-cinza-escuro" value={item.fornecedor || ''} onChange={(e) => atualizarCampo(item.id, 'fornecedor', e.target.value)} placeholder="Fornecedor" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela texto-cinza" value={item.referencia || ''} onChange={(e) => atualizarCampo(item.id, 'referencia', e.target.value)} placeholder="Ref" />
                  </td>
                  <td>
                    <select className="input-editavel-tabela texto-cinza" style={{ width: '80px', appearance: 'auto', padding: '4px' }} value={item.unidadeMedida || 'Unid'} onChange={(e) => atualizarCampo(item.id, 'unidadeMedida', e.target.value)}>
                      <option value="Unid">Unid</option>
                      <option value="Kg">Kg</option>
                      <option value="Metro">Metro</option>
                      <option value="Caixa">Caixa</option>
                      <option value="Litro">Litro</option>
                    </select>
                  </td>
                  <td>
                    <input className="input-editavel-tabela link-azul-fake" value={item.wbs || ''} onChange={(e) => atualizarCampo(item.id, 'wbs', e.target.value)} placeholder="WBS" />
                  </td>
                  <td>
                    <input className="input-editavel-tabela link-azul-fake" value={item.alocacao || ''} onChange={(e) => atualizarCampo(item.id, 'alocacao', e.target.value)} placeholder="Alocação" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* --- BLOCO 4: AÇÃO FINAL (Usando BotaoAcaoGlobal) --- */}
      <BotaoAcaoGlobal 
        texto="Solicitar Entrada de Material" 
        icone={<Send size={16} />} 
        cor="verde" 
        onClick={handleEnviar} 
      />
      
    </div>
  );
}