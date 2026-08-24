// =================================================================
// ARQUIVO: src/pages/Logistica/EntradaEstoque/EntradaEstoque.jsx
// DESCRIÇÃO: Registo de Entrada de Estoque (Back-Office) utilizando a Tabela Componentizada
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import './EntradaEstoque.css';
import { User, Send, Paperclip, X, Truck } from 'lucide-react';

import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import TabelaInsercaoItens from '../../../components/TabelaInsercaoItens/TabelaInsercaoItens'; 
import { AuthContext } from '../../../contexts/AuthContext';
import { supabase } from '../../../supabaseClient';
import { apiFetch } from '../../../services/api';

const LIMITE_LOGISTICA = 60;

export default function EntradaEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  
  const [formDados, setFormDados] = useState({
    nome: '', wbs: '', observacoes: ''
  });

  const gerarLinhaVazia = () => ({
    id: `linha-vazia-${Date.now()}-${Math.random()}`, 
    desenhoSAP: '', 
    numPecaFabricante: '', 
    fornecedor: '', 
    referencia: '', 
    qtdFornecida: 1, 
    nfEntrada: '', 
    unidadeMedida: 'Unid', 
    vendorDescription: '', 
    wbsElement: '', 
    emissaoNF: '', 
    recebNF: '', 
    docCompras: '', 
    poNetPrice: '', 
    centro: '', 
    deposito: '', 
    alocacao: ''
  });

  const [itens, setItens] = useState([]);
  const [anexos, setAnexos] = useState([]);
  
  // ✨ ESTADO: Guarda as NFs de Crossdockings que estão "Pendentes"
  const [nfsCrossdocking, setNfsCrossdocking] = useState([]);
  const processador = useProcessadorExcel();

  // ✨ EFEITO: Busca TUDO e faz o filtro cirúrgico no Frontend
  useEffect(() => {
    const buscarCrossdockingsPendentes = async () => {
      try {
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        
        // Buscamos as solicitações apenas pela filial para evitar conflitos na API
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);
        
        if (resultado.sucesso && Array.isArray(resultado.dados)) {
          // Filtramos manualmente pelo Tipo e Status para ter certeza absoluta que funciona
          const nfsAguardadas = resultado.dados
            .filter(sol => sol.tipo === 'Crossdocking' && sol.status === 'Pendente')
            .map(sol => sol.nfCrossdocking)
            .filter(nf => nf !== null && nf !== undefined && nf !== ''); // Ignora as vazias
            
          setNfsCrossdocking(nfsAguardadas);
        }
      } catch (error) {
        console.error("Erro ao buscar as solicitações de Crossdocking:", error);
      }
    };

    if (estoqueAtual) {
      buscarCrossdockingsPendentes();
    }
  }, [estoqueAtual]);

  const handleImportarExcel = async (arquivo) => {
    const itensProcessados = await processador.iniciarProcessamento(arquivo);
    if (itensProcessados && Array.isArray(itensProcessados)) {
      const novosItensFormatados = itensProcessados.map((item, index) => ({
        id: `excel-${Date.now()}-${index}`,
        desenhoSAP: item['Desenho SAP'] || item.desenhoSAP || '',
        numPecaFabricante: item['Nº peça fabricante'] || item.numPecaFabricante || '',
        fornecedor: item['FORNECEDOR'] || item['Fornecedor'] || item.fornecedor || '',
        referencia: item['REFERÊNCIA'] || item['Referência'] || item.referencia || '',
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
        const novaLista = [...listaLimpa, ...novosItensFormatados];

        if (novaLista.length > LIMITE_LOGISTICA) {
          alert(`AVISO: A planilha contém mais itens do que o limite permitido de ${LIMITE_LOGISTICA}. Apenas as primeiras ${LIMITE_LOGISTICA} linhas foram importadas.`);
          return novaLista.slice(0, LIMITE_LOGISTICA);
        }

        return novaLista;
      });
    }
  };

  const adicionarLinhaEmBranco = () => {
    if (itens.length < LIMITE_LOGISTICA) {
      setItens([...itens, gerarLinhaVazia()]);
    } else {
      alert(`Limite máximo de ${LIMITE_LOGISTICA} itens atingido.`);
    }
  };

  const atualizarCampo = (id, campo, novoValor) => setItens(itens.map(item => item.id === id ? { ...item, [campo]: novoValor } : item));
  const handleAnexar = (arquivo) => setAnexos([...anexos, arquivo]);
  const removerAnexo = (indexRemover) => setAnexos(anexos.filter((_, index) => index !== indexRemover));
  
  const removerItem = (idParaRemover) => {
    setItens(itens.filter(item => item.id !== idParaRemover));
  };

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      alert("⚠️ AÇÃO BLOQUEADA: Por favor, selecione uma filial específica no topo da página antes de registar a entrada.");
      return;
    }

    if (!formDados.nome || !formDados.wbs) {
      alert("Preencha o Nome e o WBS do operador.");
      return;
    }
    
    if (itens.length === 0) {
      alert("Adicione pelo menos um item à tabela para registar a entrada.");
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
          desenhoSAP: item.desenhoSAP || '-', 
          materialDescription: item.vendorDescription || 'Sem descrição'
        })),
        anexos: anexosProcessados 
      };

      const dados = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps_id) {
        alert(`Sucesso! Solicitação de Entrada gerada no sistema. ID: ${dados.ps_id || dados.ps}`);
        setFormDados({ nome: '', wbs: '', observacoes: '' });
        setItens([]);
        setAnexos([]);
      } else {
        alert(`Erro do servidor: ${dados.erro}`);
      }
    } catch (error) {
      alert(`Falha ao conectar com o servidor. Motivo: ${error.message}`);
    }
  };

  // ✨ LÓGICA DO INDICADOR: Verifica cada batida de tecla!
  const nfsNormalizadas = nfsCrossdocking.map(nf => String(nf).trim().toUpperCase());
  const nfsNaTabela = itens
    .map(i => String(i.nfEntrada || '').trim().toUpperCase())
    .filter(nf => nf !== '' && nfsNormalizadas.includes(nf));
    
  // Tira duplicatas para exibir no alerta
  const nfsUnicasEncontradas = [...new Set(nfsNaTabela)];
  const temCrossdockingAguardando = nfsUnicasEncontradas.length > 0;

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
            <div className="icone-fundo-azul" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb' }}><User size={18} /></div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, color: '#0f172a' }}>Operador Responsável</h2>
          </div>
        </div>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>NOME *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }} />
          </div>
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>WBS *</label>
            <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" value={formDados.wbs} onChange={(e) => setFormDados({...formDados, wbs: e.target.value})} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }} />
          </div>
          <div className="input-grupo" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais para a conferência..." value={formDados.observacoes} onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})} style={{ minHeight: '42px', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', resize: 'vertical' }}></textarea>
          </div>
        </div>
      </div>

      {/* ✨ BANNER ANIMADO DE AVISO DE CROSSDOCKING */}
      {temCrossdockingAguardando && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          backgroundColor: '#e0f2fe', border: '1px solid #bae6fd',
          padding: '16px 24px', borderRadius: '12px', marginBottom: '24px',
          color: '#0369a1', animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ backgroundColor: '#bae6fd', padding: '10px', borderRadius: '50%', color: '#0284c7' }}>
            <Truck size={24} />
          </div>
          <div>
            <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '4px' }}>
              Crossdocking Identificado!
            </strong>
            <span style={{ fontSize: '0.85rem' }}>
              A Nota Fiscal <strong>{nfsUnicasEncontradas.join(', ')}</strong> pertence a uma solicitação de Crossdocking pendente. Ao registar esta entrada, o pedido de Crossdocking ficará automaticamente disponível para aprovação e separação!
            </span>
          </div>
        </div>
      )}

      {/* COMPONENTE DA TABELA */}
      <TabelaInsercaoItens 
        itens={itens}
        mostrarDataNecessidade={true}
        limiteLinhas={LIMITE_LOGISTICA} 
        onAtualizarCampo={atualizarCampo}
        onRemoverItem={removerItem}
        onAdicionarLinha={adicionarLinhaEmBranco}
        onImportarExcel={handleImportarExcel}
      />

      <div className="form-cartao" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginTop: '24px' }}>
        <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>ANEXOS (OPCIONAL - Notas Fiscais, Manuais, Fotos)</label>
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