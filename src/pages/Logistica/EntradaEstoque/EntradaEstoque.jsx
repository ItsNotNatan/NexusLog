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
import { useAlert } from '../../../contexts/AlertContext';
import { supabase } from '../../../supabaseClient';
import { apiFetch } from '../../../services/api';

const LIMITE_LOGISTICA = 60;

export default function EntradaEstoque() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useAlert();
  
  // ✨ ESTADO ATUALIZADO: Sem o WBS global
  const [formDados, setFormDados] = useState({
    nome: '', observacoes: ''
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
    wbsElement: '', // Fica vazio para ser preenchido na tabela
    nomeProjeto: '', 
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
  
  // ESTADO: Guarda as NFs de Crossdockings que estão "Pendentes"
  const [nfsCrossdocking, setNfsCrossdocking] = useState([]);
  const processador = useProcessadorExcel();

  // EFEITO: Busca TUDO e faz o filtro cirúrgico no Frontend
  useEffect(() => {
    const buscarCrossdockingsPendentes = async () => {
      try {
        const filialFiltro = estoqueAtual === 'TODOS' ? '' : estoqueAtual;
        
        const resultado = await apiFetch(`/solicitacoes/listar?filial=${filialFiltro}&limit=1000`);
        
        if (resultado.sucesso && Array.isArray(resultado.dados)) {
          const nfsAguardadas = resultado.dados
            .filter(sol => sol.tipo === 'Crossdocking' && sol.status === 'Pendente')
            .map(sol => sol.nfCrossdocking)
            .filter(nf => nf !== null && nf !== undefined && nf !== ''); 
            
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
        desenhoSAP: item['NUM SAP | DESENHO'] || item['Desenho SAP'] || item.desenhoSAP || '',
        referencia: item['REFERÊNCIA'] || item['Referência'] || item.referencia || '',
        vendorDescription: item['DESCRIÇÃO'] || item['Vendor Description'] || item.vendorDescription || '',
        numPecaFabricante: item['FABRICANTE'] || item['Nº peça fabricante'] || item.numPecaFabricante || '',
        qtdFornecida: item['QTDE ENTRADA'] || item['Qtd.fornecida'] || item.qtdFornecida || 1,
        unidadeMedida: item['UNID. MEDIDA'] || item['Unidade de medida'] || item.unidadeMedida || 'Unid',
        nfEntrada: item['NUM DA NOTA FISCAL'] || item['NF DE ENTRADA'] || item.nfEntrada || '',
        fornecedor: item['FORNECEDOR / REGISTRO'] || item['FORNECEDOR'] || item.fornecedor || '',
        wbsElement: item['CENTRO DE CUSTO - WBS'] || item['WBS Element'] || item.wbs || '',
        nomeProjeto: item['NOME CENTRO DE CUSTO / PROJETO'] || item.nomeProjeto || '',
        emissaoNF: item['EMISSÃO NF'] || item.emissaoNF || '',
        recebNF: item['RECEB. NF'] || item.recebNF || '',
        docCompras: item['Nº PEDIDO DE COMPRA / CPV'] || item['Documento de compras'] || item.docCompras || '',
        poNetPrice: item['VLR. UNITÁRIO NOTA FISCAL'] || item['PO Net Price'] || item.poNetPrice || '',
        centro: item['FILIAL'] || item['Centro'] || item.centro || '',
        deposito: item['DEPÓSITO'] || item['Depósito'] || item.deposito || '',
        alocacao: item['ALOCAÇÃO'] || item['Alocação'] || item.alocacao || ''
      }));

      setItens(prev => {
        const listaLimpa = prev.filter(i => i.numPecaFabricante !== '');
        const novaLista = [...listaLimpa, ...novosItensFormatados];

        if (novaLista.length > LIMITE_LOGISTICA) {
          showAlert("Limite de Linhas Excedido", `A planilha contém mais itens do que o limite permitido de ${LIMITE_LOGISTICA}. Apenas as primeiras ${LIMITE_LOGISTICA} linhas foram importadas.`, "warning");
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
      showAlert("Limite Atingido", `O limite máximo é de ${LIMITE_LOGISTICA} itens.`, "warning");
    }
  };

  const atualizarCampo = (id, campo, novoValor) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        let valorValidado = novoValor;
        if (campo === 'qtdFornecida') {
          if (novoValor === '') {
            valorValidado = ''; 
          } else {
            valorValidado = parseInt(novoValor, 10);
            if (isNaN(valorValidado) || valorValidado < 1) valorValidado = 1;
          }
        }
        return { ...item, [campo]: valorValidado };
      }
      return item;
    }));
  };

  const handleAnexar = (arquivo) => setAnexos([...anexos, arquivo]);
  const removerAnexo = (indexRemover) => setAnexos(anexos.filter((_, index) => index !== indexRemover));
  
  const removerItem = (idParaRemover) => {
    setItens(itens.filter(item => item.id !== idParaRemover));
  };

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Ação Bloqueada", "Por favor, selecione uma filial específica no topo da página antes de registar a entrada.", "warning");
      return;
    }

    // ✨ VALIDAÇÃO ATUALIZADA: Exige apenas o nome agora
    if (!formDados.nome) {
      showAlert("Campos Obrigatórios", "Preencha o Nome do operador.", "warning");
      return;
    }
    
    if (itens.length === 0) {
      showAlert("Lista Vazia", "Adicione pelo menos um item à tabela para registar a entrada.", "warning");
      return;
    }

    if (itens.some(i => !i.numPecaFabricante || !i.qtdFornecida || i.qtdFornecida === '')) {
      showAlert("Dados da Tabela", "Preencha os campos obrigatórios (Nº Peça e Qtd) em todas as linhas. A quantidade deve ser no mínimo 1.", "warning");
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
            showAlert("Erro de Anexo", `Falha ao anexar o ficheiro: ${arquivo.name}.`, "error");
            return; 
          }
          const { data: linkPublico } = supabase.storage.from('documentos').getPublicUrl(caminhoNoStorage);
          anexosProcessados.push({
            nome_arquivo: arquivo.name, url_arquivo: linkPublico.publicUrl, origem: 'logistica'
          });
        }
      }

      const payload = {
        solicitante: { 
          ...formDados, 
          tipo: 'Entrada', 
          filial_id: estoqueAtual 
        },
        itens: itens.map(item => ({
          desenho_sap: item.desenhoSAP || '-',
          part_number: item.numPecaFabricante || '-',
          fornecedor: item.fornecedor || null,
          referencia: item.referencia || null,
          qtd: parseInt(item.qtdFornecida, 10) || 1,
          unidade_medida: item.unidadeMedida || 'Unid',
          nf_entrada: item.nfEntrada || null,
          descricao: item.vendorDescription || 'Sem descrição',
          materialDescription: item.vendorDescription || 'Sem descrição',
          wbs_element: item.wbsElement || '-',
          nome_projeto: item.nomeProjeto || null,
          emissao_nf: item.emissaoNF || null,
          receb_nf: item.recebNF || null,
          documento_compras: item.docCompras || null,
          valor_unitario: item.poNetPrice || null,
          centro: item.centro || null,
          deposito: item.deposito || null,
          alocacao: item.alocacao || null
        })),
        anexos: anexosProcessados 
      };

      const dados = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (dados.sucesso || dados.ps_id || dados.ps) {
        showAlert("Operação Concluída!", `Entrada registrada automaticamente no galpão ${estoqueAtual}.\nNúmero de acompanhamento: ${dados.ps_id || dados.ps}`, "success");
        setFormDados({ nome: '', observacoes: '' }); // Limpa sem o WBS
        setItens([]);
        setAnexos([]);
      } else {
        showAlert("Erro no Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", `Falha ao conectar com o servidor. Motivo: ${error.message}`, "error");
    }
  };

  const nfsNormalizadas = nfsCrossdocking.map(nf => String(nf).trim().toUpperCase());
  const nfsNaTabela = itens
    .map(i => String(i.nfEntrada || '').trim().toUpperCase())
    .filter(nf => nf !== '' && nfsNormalizadas.includes(nf));
    
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
        
        {/* ✨ GRID ATUALIZADO: Sem o campo WBS */}
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>NOME *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({...formDados, nome: e.target.value})} style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none' }} />
          </div>
          
          <div className="input-grupo" style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais para a conferência..." value={formDados.observacoes} onChange={(e) => setFormDados({...formDados, observacoes: e.target.value})} style={{ minHeight: '42px', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', resize: 'vertical' }}></textarea>
          </div>
        </div>
      </div>

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

      <TabelaInsercaoItens 
        itens={itens}
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