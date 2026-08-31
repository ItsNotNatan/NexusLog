import React, { useState, useContext } from 'react';
import { User, Send, Paperclip, X, MapPin } from 'lucide-react'; 

import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import TabelaInsercaoItens from '../../../components/TabelaInsercaoItens/TabelaInsercaoItens';
import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { apiFetch, enviarArquivos } from '../../../services/api';

import { formatarWBS } from '../../../utils/formatadores';

const LIMITE_CLIENTE = 20;

export default function EntradaMaterial() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [formDados, setFormDados] = useState({ nome: '', wbs: '', observacoes: '' });
  const [itens, setItens] = useState([]);
  const [anexos, setAnexos] = useState([]);
  
  const processador = useProcessadorExcel();

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
    wbsElement: formDados.wbs || '', 
    nomeProjeto: '', 
    emissaoNF: '', 
    recebNF: '', 
    docCompras: '', 
    poNetPrice: '', 
    centro: '', 
    deposito: '', 
    alocacao: ''
  });

  const handleWbsGlobalChange = (e) => {
    const novoWbs = formatarWBS(e.target.value);
    setFormDados({ ...formDados, wbs: novoWbs });
    setItens(prevItens => prevItens.map(it => ({ ...it, wbsElement: novoWbs })));
  };

  const obterValor = (itemExcel, palavrasChave) => {
    const chavesReais = Object.keys(itemExcel);
    for (const palavra of palavrasChave) {
      const chaveEncontrada = chavesReais.find(k => k.trim().toUpperCase().includes(palavra));
      if (chaveEncontrada && itemExcel[chaveEncontrada] !== undefined) {
        return itemExcel[chaveEncontrada];
      }
    }
    return '';
  };

  const handleImportarExcel = async (arquivo) => {
    const itensProcessados = await processador.iniciarProcessamento(arquivo);
    if (itensProcessados && Array.isArray(itensProcessados)) {
      
      const novosItensFormatados = itensProcessados.map((item, index) => ({
        id: `excel-${Date.now()}-${index}`,
        desenhoSAP: obterValor(item, ['NUM SAP', 'DESENHO SAP', 'SAP']),
        referencia: obterValor(item, ['REFERÊNCIA', 'REFERENCIA']),
        vendorDescription: obterValor(item, ['DESCRIÇÃO', 'DESCRICAO']),
        numPecaFabricante: obterValor(item, ['FABRICANTE', 'Nº PEÇA', 'PART NUMBER', 'PN']),
        qtdFornecida: obterValor(item, ['QTDE ENTRADA', 'QTD', 'QUANTIDADE']) || 1,
        unidadeMedida: obterValor(item, ['UNID. MEDIDA', 'UNIDADE DE MEDIDA', 'UNID']) || 'Unid',
        nfEntrada: obterValor(item, ['NUM DA NOTA FISCAL', 'NF DE ENTRADA', 'NOTA FISCAL']),
        fornecedor: obterValor(item, ['FORNECEDOR']),
        wbsElement: String(obterValor(item, ['CENTRO DE CUSTO - WBS', 'WBS'])).trim(),
        nomeProjeto: obterValor(item, ['NOME CENTRO DE CUSTO', 'PROJETO']),
        emissaoNF: obterValor(item, ['EMISSÃO NF', 'EMISSAO']),
        recebNF: obterValor(item, ['RECEB. NF', 'RECEBIMENTO']),
        docCompras: obterValor(item, ['PEDIDO DE COMPRA', 'CPV', 'COMPRAS']),
        poNetPrice: obterValor(item, ['VLR. UNITÁRIO', 'VALOR UNITÁRIO', 'PO NET PRICE']),
        centro: obterValor(item, ['FILIAL', 'CENTRO']),
        deposito: obterValor(item, ['DEPÓSITO', 'DEPOSITO']),
        alocacao: obterValor(item, ['ALOCAÇÃO', 'ALOCACAO'])
      }));

      // ✨ VERIFICAÇÃO DE DIVERGÊNCIA: Pega em todos os WBS preenchidos na planilha e unifica
      const wbsPreenchidos = novosItensFormatados
        .map(i => i.wbsElement.toUpperCase()) // Padroniza para comparar
        .filter(w => w !== '');
      
      const wbsUnicosDaPlanilha = [...new Set(wbsPreenchidos)];

      // ❌ Se houver mais do que 1 WBS diferente dentro do Excel, bloqueia a importação!
      if (wbsUnicosDaPlanilha.length > 1) {
        showAlert(
          "Planilha Bloqueada", 
          `A sua planilha contém múltiplos WBS diferentes (${wbsUnicosDaPlanilha.join(', ')}). A entrada de material deve ser feita para um único projeto por vez. Por favor, corrija a planilha e tente novamente.`, 
          "error"
        );
        return; // Interrompe o processo e não carrega nada na tela!
      }

      // Se passou da trava, ou a planilha tem apenas 1 WBS, ou nenhum (neste caso usa o do form).
      const wbsDaPlanilha = novosItensFormatados.find(i => i.wbsElement !== '')?.wbsElement || '';
      
      if (wbsDaPlanilha) {
        const wbsFormatado = formatarWBS(wbsDaPlanilha);
        setFormDados(prev => ({ ...prev, wbs: wbsFormatado }));
        novosItensFormatados.forEach(i => i.wbsElement = wbsFormatado);
      } else {
        novosItensFormatados.forEach(i => i.wbsElement = formDados.wbs);
      }

      setItens(prev => {
        const listaLimpa = prev.filter(i => i.numPecaFabricante !== '');
        
        const listaAntigaAtualizada = listaLimpa.map(i => ({ ...i, wbsElement: wbsDaPlanilha ? formatarWBS(wbsDaPlanilha) : formDados.wbs }));
        
        const novaLista = [...listaAntigaAtualizada, ...novosItensFormatados];
        if (novaLista.length > LIMITE_CLIENTE) {
          showAlert("Limite de Linhas Excedido", `A planilha contém mais itens do que o limite permitido de ${LIMITE_CLIENTE}. Apenas as primeiras ${LIMITE_CLIENTE} linhas foram importadas.`, "warning");
          return novaLista.slice(0, LIMITE_CLIENTE);
        }
        return novaLista;
      });
    }
  };

  const adicionarLinhaEmBranco = () => {
    if (itens.length < LIMITE_CLIENTE) {
      const novaLinha = gerarLinhaVazia();
      novaLinha.wbsElement = formDados.wbs;
      setItens([...itens, novaLinha]);
    } else {
      showAlert("Limite Atingido", `O limite máximo é de ${LIMITE_CLIENTE} itens por solicitação.`, "warning");
    }
  };

  const removerItem = (idParaRemover) => setItens(itens.filter(item => item.id !== idParaRemover));
  
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

  const handleEnviar = async () => {
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      showAlert("Filial Inválida", "Por favor, selecione em qual filial você está dando entrada lá no topo da página antes de enviar.", "warning");
      return;
    }
    if (!formDados.nome || !formDados.wbs) {
      showAlert("Campos Obrigatórios", "Preencha o Nome e o WBS do solicitante.", "warning");
      return;
    }
    if (itens.length === 0) {
      showAlert("Lista Vazia", "Adicione pelo menos um item à tabela para dar entrada.", "warning");
      return;
    }
    if (itens.some(i => !i.numPecaFabricante || !i.qtdFornecida || i.qtdFornecida === '')) {
      showAlert("Dados da Tabela", "Preencha os campos obrigatórios (Nº Peça e Qtd) em todas as linhas. A quantidade deve ser no mínimo 1.", "warning");
      return;
    }

    try {
      const anexosProcessados = [];
      
      if (anexos.length > 0) {
        try {
          anexosProcessados.push(...await enviarArquivos(anexos));
        } catch (erroUpload) {
          showAlert("Erro de Anexo", erroUpload.message || "Falha ao anexar os ficheiros.", "error");
          return;
        }
      }

      const payload = {
        solicitante: { 
          ...formDados, 
          filial_id: estoqueAtual, 
          tipo: 'Entrada' 
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
          wbs_element: formDados.wbs || '-',
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

      const dados = await apiFetch('/solicitacoes/entrada', { method: 'POST', body: JSON.stringify(payload) });

      if (dados.sucesso || dados.ps || dados.ps_id) {
        showAlert("Operação Concluída!", `Entrada registrada automaticamente no galpão ${estoqueAtual}.\nNúmero de acompanhamento: ${dados.ps || dados.ps_id}`, "success");
        setFormDados({ nome: '', wbs: '', observacoes: '' });
        setItens([]); setAnexos([]);
      } else {
        showAlert("Erro no Servidor", dados.erro, "error");
      }
    } catch (error) {
      showAlert("Erro de Conexão", "Falha ao conectar com o servidor.", "error");
    }
  };

  return (
    <div className="entrada-container">
      <ModalProcessamento estaProcessando={processador.estaProcessando} concluido={processador.concluido} estadoProgresso={processador.estadoProgresso} resultado={processador.resultado} erroFatal={processador.erroFatal} onClose={processador.resetarProcessador} />

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
            <input type="text" className="input-campo foco-verde" placeholder="Seu nome completo" value={formDados.nome} onChange={(e) => setFormDados({ ...formDados, nome: e.target.value })} />
          </div>
          <div className="input-grupo">
            <label>WBS *</label>
            <input 
              type="text" 
              className="input-campo foco-verde" 
              placeholder="Ex: ABCDE-12345" 
              value={formDados.wbs} 
              onChange={handleWbsGlobalChange}
            />
          </div>
          <div className="input-grupo">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> FILIAL DE ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" color="#10b981" />
              <input type="text" className="input-campo" value={estoqueAtual} readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
          <div className="input-grupo">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo foco-verde" placeholder="Informações adicionais para a conferência..." value={formDados.observacoes} onChange={(e) => setFormDados({ ...formDados, observacoes: e.target.value })}></textarea>
          </div>
        </div>
      </div>
      
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

      <TabelaInsercaoItens
        itens={itens} 
        limiteLinhas={LIMITE_CLIENTE} 
        wbsGlobal={formDados.wbs}
        onAtualizarCampo={atualizarCampo} 
        onRemoverItem={removerItem}
        onAdicionarLinha={adicionarLinhaEmBranco} 
        onImportarExcel={handleImportarExcel}
      />

      <BotaoAcaoGlobal texto="Registrar Entrada" icone={<Send size={16} />} cor="verde" onClick={handleEnviar} />
    </div>
  );
}