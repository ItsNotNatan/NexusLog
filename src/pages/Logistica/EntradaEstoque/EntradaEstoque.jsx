import React, { useState, useContext } from 'react';
import './EntradaEstoque.css';
import { User, Send, Paperclip, X } from 'lucide-react';

// NOSSOS COMPONENTES E HOOKS
import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import TabelaInsercaoItens from '../../../components/TabelaInsercaoItens/TabelaInsercaoItens'; // ✨ AQUI
import { AuthContext } from '../../../contexts/AuthContext';

// Cliente do Supabase
import { supabase } from '../../../supabaseClient';

export default function EntradaEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  
  const [formDados, setFormDados] = useState({
    nome: '', wbs: '', observacoes: ''
  });

  const gerarLinhaVazia = () => ({
    id: `linha-vazia-${Date.now()}-${Math.random()}`, numPecaFabricante: '', fornecedor: '', qtdFornecida: 1, nfEntrada: '', unidadeMedida: 'Unid', vendorDescription: '', wbsElement: '', emissaoNF: '', recebNF: '', docCompras: '', poNetPrice: '', centro: '', deposito: '', alocacao: ''
  });

  const [itens, setItens] = useState([gerarLinhaVazia()]);
  const [anexos, setAnexos] = useState([]);
  const processador = useProcessadorExcel();

  const handleImportarExcel = async (arquivo) => {
    const itensProcessados = await processador.iniciarProcessamento(arquivo);
    if (itensProcessados && Array.isArray(itensProcessados)) {
      const novosItensFormatados = itensProcessados.map((item, index) => ({
        id: `excel-${Date.now()}-${index}`,
        numPecaFabricante: item['Nº peça fabricante'] || item.numPecaFabricante || '',
        fornecedor: item['FORNECEDOR'] || item['Fornecedor'] || item.fornecedor || '',
        qtdFornecida: item['Qtd.fornecida'] || item.qtdFornecida || 1,
        nfEntrada: item['NF DE ENTRADA'] || '',
        unidadeMedida: item['Unidade de medida'] || item.unidadeMedida || 'Unid',
        vendorDescription: item['Vendor Description'] || item.vendorDescription || '',
        wbsElement: item['WBS Element'] || item.wbs || '',
        emissaoNF: item['EMISSÃO NF'] || item.emissaoNF || '',
        recebNF: item['RECEB. NF'] || item.recebNF || '',
        docCompras: item['Documento de compras'] || item.docCompras || '',
        poNetPrice: item['PO Net Price'] || item.poNetPrice || '',
        centro: item['Centro'] || item.centro || '',
        deposito: item['Depósito'] || item.deposito || '',
        alocacao: item['Alocação'] || item.alocacao || ''
      }));

      setItens(prev => {
        const listaLimpa = prev.filter(i => i.numPecaFabricante !== '');
        return [...listaLimpa, ...novosItensFormatados];
      });
    }
  };

  const adicionarLinhaEmBranco = () => setItens([...itens, gerarLinhaVazia()]);
  const atualizarCampo = (id, campo, novoValor) => setItens(itens.map(item => item.id === id ? { ...item, [campo]: novoValor } : item));
  const handleAnexar = (arquivo) => setAnexos([...anexos, arquivo]);
  const removerAnexo = (indexRemover) => setAnexos(anexos.filter((_, index) => index !== indexRemover));
  
  const removerItem = (idParaRemover) => {
    if (itens.length > 1) {
      setItens(itens.filter(item => item.id !== idParaRemover));
    } else {
      alert("A solicitação precisa ter pelo menos um item.");
    }
  };

  const handleEnviar = async () => {
    if (!formDados.nome || !formDados.wbs) {
      alert("Preencha o Nome e o WBS do solicitante.");
      return;
    }
    if (itens.some(i => !i.numPecaFabricante || !i.qtdFornecida)) {
      alert("Preencha os campos obrigatórios (Nº Peça e Qtd) em todas as linhas.");
      return;
    }

    try {
      const anexosProcessados = [];
      if (anexos.length > 0) {
        for (const arquivo of anexos) {
          const extensao = arquivo.name.split('.').pop();
          const caminhoNoStorage = `uploads/${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
          const { error: erroUpload } = await supabase.storage.from('documentos').upload(caminhoNoStorage, arquivo);

          if (erroUpload) {
            alert(`Falha ao anexar o ficheiro: ${arquivo.name}.`);
            return; 
          }
          const { data: linkPublico } = supabase.storage.from('documentos').getPublicUrl(caminhoNoStorage);
          anexosProcessados.push({
            nome_arquivo: arquivo.name, url_arquivo: linkPublico.publicUrl, origem: 'logistica'
          });
        }
      }

      const payload = {
        solicitante: { ...formDados, tipo: 'Entrada', filial_id: estoqueAtual },
        itens: itens.map(item => ({
          ...item,
          nfEntrada: item.nfEntrada ? item.nfEntrada.trim() : '', 
          qtd: item.qtdFornecida,
          desenhoSAP: '-', 
          materialDescription: item.vendorDescription || 'Sem descrição'
        })),
        anexos: anexosProcessados 
      };

      const resposta = await fetch('http://localhost:3001/api/solicitacoes/entrada', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const dados = await resposta.json();

      if (resposta.ok) {
        alert(`Sucesso! Solicitação de Entrada gerada no sistema. ID: ${dados.ps_id}`);
        setFormDados({ nome: '', wbs: '', observacoes: '' });
        setItens([gerarLinhaVazia()]);
        setAnexos([]);
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      alert("Falha ao conectar com o servidor. Verifique se o backend está rodando na porta 3001.");
    }
  };

  return (
    <div className="estoque-wrapper">
      <ModalProcessamento estaProcessando={processador.estaProcessando} concluido={processador.concluido} estadoProgresso={processador.estadoProgresso} resultado={processador.resultado} erroFatal={processador.erroFatal} onClose={processador.resetarProcessador} />

      <header className="estoque-cabecalho">
        <h1>Entrada de Estoque</h1>
        <p>Cadastro detalhado de itens — Back-Office Logística</p>
      </header>

      <div className="estoque-cartao form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="icone-fundo-azul" style={{ width: '32px', height: '32px' }}><User size={18} className="icone-azul" /></div>
            <h2>Operador Responsável</h2>
          </div>
        </div>
        <div className="form-grid">
          <div className="input-grupo"><label>NOME *</label><input type="text" className="input-campo" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} /></div>
          <div className="input-grupo"><label>WBS *</label><input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" value={formDados.wbs} onChange={(e) => setFormDados({...formDados, wbs: e.target.value})} /></div>
          <div className="input-grupo"><label>OBSERVAÇÕES</label><textarea className="input-campo" placeholder="Informações adicionais para a conferência..." value={formDados.observacoes} onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})} style={{ minHeight: '42px' }}></textarea></div>
        </div>
      </div>

      {/* ✨ MAGIA ACONTECENDO AQUI: Tabela Componentizada */}
      <TabelaInsercaoItens 
        itens={itens}
        mostrarDataNecessidade={false} // 👈 Oculta a Data de Necessidade na logística
        mostrarExemploExcel={false}
        onAtualizarCampo={atualizarCampo}
        onRemoverItem={removerItem}
        onAdicionarLinha={adicionarLinhaEmBranco}
        onImportarExcel={handleImportarExcel}
      />

      <div className="form-cartao">
        <div className="input-grupo">
          <label>ANEXOS (OPCIONAL - Notas Fiscais, Manuais, Fotos)</label>
          <div style={{ marginTop: '8px' }}>
            <CarregarArquivo variante="botao" accept=".pdf, .jpg, .png, .xlsx" label="Anexar Arquivo" icone={<Paperclip size={16} />} onFileSelect={handleAnexar} />
          </div>
          {anexos.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {anexos.map((arquivo, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: 'fit-content', minWidth: '300px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{arquivo.name}</span>
                  <button onClick={() => removerAnexo(index)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BotaoAcaoGlobal texto="Registrar Entrada" icone={<Send size={16} />} cor="verde" onClick={handleEnviar} />
    </div>
  );
}