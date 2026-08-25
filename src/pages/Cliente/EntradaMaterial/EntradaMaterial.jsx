import React, { useState, useEffect, useContext } from 'react';
import { User, Send, Paperclip, X, MapPin, AlertTriangle, Upload } from 'lucide-react'; 

import CarregarArquivo from '../../../components/CarregarArquivo/CarregarArquivo';
import ModalProcessamento from '../../../components/ModalProcessamento/ModalProcessamento';
import { useProcessadorExcel } from '../../../hooks/useProcessadorExcel';
import BotaoAcaoGlobal from '../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import TabelaInsercaoItens from '../../../components/TabelaInsercaoItens/TabelaInsercaoItens';

import { supabase } from '../../../supabaseClient';
import { AuthContext } from '../../../contexts/AuthContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';

// ✨ IMPORTAÇÃO DO NOSSO FORMATADOR CENTRALIZADO
import { formatarWBS } from '../../../utils/formatadores';

const LIMITE_CLIENTE = 20;

export default function EntradaMaterial() {
  const { estoqueAtual } = useContext(AuthContext);
  const { showAlert } = useContext(AlertContext);

  const [formDados, setFormDados] = useState({ nome: '', wbs: '', observacoes: '' });
  const [dataMinima, setDataMinima] = useState('');

  useEffect(() => {
    const hoje = new Date();
    const timezoneOffset = hoje.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(hoje.getTime() - timezoneOffset)).toISOString().split('T')[0];
    setDataMinima(localISOTime);
  }, []);

  const gerarLinhaVazia = () => ({
    id: `linha-vazia-${Date.now()}-${Math.random()}`, desenhoSAP: '', numPecaFabricante: '', fornecedor: '',
    referencia: '', qtdFornecida: 1, nfEntrada: '', unidadeMedida: 'Unid', vendorDescription: '',
    wbsElement: '', dataNecessidade: '', emissaoNF: '', recebNF: '', docCompras: '', poNetPrice: '', centro: '', deposito: '', alocacao: ''
  });

  const [itens, setItens] = useState([]);
  const [anexos, setAnexos] = useState([]);
  const [anexoAutorizacao, setAnexoAutorizacao] = useState(null); 
  
  const processador = useProcessadorExcel();

  // ✨ LÓGICA DE DIVERGÊNCIA: Compara apenas o que está antes do primeiro hífen "-"
  const prefixoWbsPrincipal = formDados.wbs.split('-')[0].trim().toUpperCase();
  
  const temWbsDivergente = itens.some(item => {
    const itemWbs = (item.wbsElement || '').trim().toUpperCase();
    if (itemWbs === '' || itemWbs === '-') return false;
    const prefixoItemWbs = itemWbs.split('-')[0].trim().toUpperCase();
    return prefixoWbsPrincipal !== '' && prefixoItemWbs !== prefixoWbsPrincipal;
  });

  // Limpa o anexo se a divergência for resolvida
  useEffect(() => {
    if (!temWbsDivergente && anexoAutorizacao) {
      setAnexoAutorizacao(null);
    }
  }, [temWbsDivergente, anexoAutorizacao]);

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
        dataNecessidade: item['Data de Necessidade'] || item.dataNecessidade || '',
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
        if (novaLista.length > LIMITE_CLIENTE) {
          showAlert("Limite de Linhas Excedido", `A planilha contém mais itens do que o limite permitido de ${LIMITE_CLIENTE}. Apenas as primeiras ${LIMITE_CLIENTE} linhas foram importadas.`, "warning");
          return novaLista.slice(0, LIMITE_CLIENTE);
        }
        return novaLista;
      });
    }
  };

  const adicionarLinhaEmBranco = () => {
    if (itens.length < LIMITE_CLIENTE) setItens([...itens, gerarLinhaVazia()]);
    else showAlert("Limite Atingido", `O limite máximo é de ${LIMITE_CLIENTE} itens por solicitação.`, "warning");
  };

  const removerItem = (idParaRemover) => setItens(itens.filter(item => item.id !== idParaRemover));
  const atualizarCampo = (id, campo, novoValor) => setItens(itens.map(item => item.id === id ? { ...item, [campo]: novoValor } : item));
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
    if (itens.some(i => !i.numPecaFabricante || !i.qtdFornecida)) {
      showAlert("Dados da Tabela", "Preencha os campos obrigatórios (Nº Peça e Qtd) em todas as linhas.", "warning");
      return;
    }
    
    // ✨ TRAVA DE SEGURANÇA
    if (temWbsDivergente && !anexoAutorizacao) {
      showAlert("Autorização Pendente", "Como existe divergência no prefixo da WBS nos itens, é obrigatório anexar a autorização do responsável no banner amarelo.", "warning");
      return;
    }

    try {
      const anexosProcessados = [];
      
      // 1. Sobe os anexos normais
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
          anexosProcessados.push({ nome_arquivo: arquivo.name, url_arquivo: linkPublico.publicUrl });
        }
      }

      // ✨ 2. Sobe o anexo de autorização WBS
      if (temWbsDivergente && anexoAutorizacao) {
        const extensao = anexoAutorizacao.name.split('.').pop();
        const caminhoNoStorage = `uploads/auth-wbs-${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`;
        const { error: erroUploadAuth } = await supabase.storage.from('documentos').upload(caminhoNoStorage, anexoAutorizacao);

        if (erroUploadAuth) {
          showAlert("Erro de Autorização", `Falha ao anexar o documento de autorização.`, "error");
          return;
        }
        const { data: linkAuth } = supabase.storage.from('documentos').getPublicUrl(caminhoNoStorage);
        anexosProcessados.push({ nome_arquivo: `[AUTORIZAÇÃO WBS] ${anexoAutorizacao.name}`, url_arquivo: linkAuth.publicUrl });
      }

      const payload = {
        solicitante: { ...formDados, filial_id: estoqueAtual, tipo: 'Entrada' },
        itens: itens.map(item => ({
          ...item, qtd: item.qtdFornecida, desenhoSAP: item.desenhoSAP || '-', referencia: item.referencia || null, materialDescription: item.vendorDescription || 'Sem descrição'
        })),
        anexos: anexosProcessados
      };

      const dados = await apiFetch('/solicitacoes/entrada', { method: 'POST', body: JSON.stringify(payload) });

      if (dados.sucesso || dados.ps || dados.ps_id) {
        showAlert("Operação Concluída!", `Entrada registrada automaticamente no galpão ${estoqueAtual}.\nNúmero de acompanhamento: ${dados.ps || dados.ps_id}`, "success");
        setFormDados({ nome: '', wbs: '', observacoes: '' });
        setItens([]); setAnexos([]); setAnexoAutorizacao(null);
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
              onChange={(e) => setFormDados({ ...formDados, wbs: formatarWBS(e.target.value) })} 
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

      {/* ✨ BANNER DE WBS DIVERGENTE COM O EXATO VISUAL DA IMAGEM */}
      {temWbsDivergente && (
        <div style={{ 
          backgroundColor: '#fffbeb', 
          border: '1px solid #fde68a', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '24px',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
            <AlertTriangle size={20} />
            <strong style={{ fontSize: '1rem' }}>Atenção: WBS Divergente</strong>
          </div>
          <p style={{ color: '#78350f', fontSize: '0.875rem', marginBottom: '16px', marginTop: 0 }}>
            Um ou mais itens pertencem a um macro-projeto (prefixo) diferente da WBS informada. É necessário anexar a autorização do responsável.
          </p>
          
          {!anexoAutorizacao ? (
            <div style={{ 
              border: '1px dashed #fcd34d', 
              borderRadius: '8px', 
              backgroundColor: '#fffbeb',
              transition: 'all 0.2s',
              overflow: 'hidden'
            }}>
              <CarregarArquivo 
                variante="area" 
                accept=".pdf, .jpg, .png, .jpeg, .msg" 
                label="Anexar autorização do responsável (obrigatório)" 
                icone={<Upload size={20} color="#f59e0b" />} 
                onFileSelect={(file) => setAnexoAutorizacao(file)} 
              />
            </div>
          ) : (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', 
              border: '1px solid #fcd34d' 
            }}>
              <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>
                {anexoAutorizacao.name}
              </span>
              <button 
                onClick={() => setAnexoAutorizacao(null)} 
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                title="Remover autorização"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      <TabelaInsercaoItens
        itens={itens} dataMinima={dataMinima} mostrarDataNecessidade={true} mostrarExemploExcel={true}
        limiteLinhas={LIMITE_CLIENTE} onAtualizarCampo={atualizarCampo} onRemoverItem={removerItem}
        onAdicionarLinha={adicionarLinhaEmBranco} onImportarExcel={handleImportarExcel}
      />

      <BotaoAcaoGlobal texto="Registrar Entrada" icone={<Send size={16} />} cor="verde" onClick={handleEnviar} />
    </div>
  );
}