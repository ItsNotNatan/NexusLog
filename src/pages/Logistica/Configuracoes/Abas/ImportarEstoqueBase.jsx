import React, { useState } from 'react';
import { Database, AlertCircle, FileSpreadsheet, Save } from 'lucide-react';
import { useAlert } from '../../../../contexts/AlertContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useProcessadorExcel } from '../../../../hooks/useProcessadorExcel';
import { apiFetch } from '../../../../services/api';

import ModalProcessamento from '../../../../components/ModalProcessamento/ModalProcessamento';
import CarregarArquivo from '../../../../components/CarregarArquivo/CarregarArquivo';
import ExemploExcel from '../../../../components/ExemploExcel/ExemploExcel';
import TabelaInsercaoItens from '../../../../components/TabelaInsercaoItens/TabelaInsercaoItens';
import BotaoAcaoGlobal from '../../../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

export default function ImportarEstoqueBase() {
  const { showAlert, showConfirm, showLoading, closeAlert } = useAlert();
  const { usuario } = useAuth();
  
  const [itens, setItens] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const {
    estaProcessando, concluido, estadoProgresso, resultado, erroFatal,
    iniciarProcessamento, resetarProcessador
  } = useProcessadorExcel();

  // ✨ FUNÇÃO DE TRADUÇÃO (Copiada do EntradaMaterial para funcionar igual)
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

  const handleImportar = async (arquivo) => {
    const itensPlanilha = await iniciarProcessamento(arquivo);
    
    if (itensPlanilha && itensPlanilha.length > 0) {
      // ✨ AGORA SIM! Formatando os dados para a tabela entender (igual no EntradaMaterial)
      const novosItensFormatados = itensPlanilha.map((item, index) => ({
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
        centro: obterValor(item, ['FILIAL', 'CENTRO']) || 'BR04',
        deposito: obterValor(item, ['DEPÓSITO', 'DEPOSITO']) || '20',
        alocacao: obterValor(item, ['ALOCAÇÃO', 'ALOCACAO'])
      }));

      setItens(novosItensFormatados);
    }
  };

  const handleAtualizarCampo = (id, campo, valor) => {
    setItens(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const handleRemoverItem = (id) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  const handleAdicionarLinha = () => {
    const novaLinha = {
      id: Date.now().toString(), desenhoSAP: '', vendorDescription: '', numPecaFabricante: '',
      qtdFornecida: 1, referencia: '', unidadeMedida: 'Unid', nfEntrada: '', fornecedor: '',
      wbsElement: '', nomeProjeto: '', emissaoNF: '', recebNF: '', docCompras: '',
      poNetPrice: '', centro: 'BR04', deposito: '20', alocacao: ''
    };
    setItens([novaLinha, ...itens]);
  };

  const handleGravarNoBanco = async () => {
    if (itens.length === 0) return showAlert("Aviso", "A tabela está vazia.", "warning");

    const confirm = await showConfirm(
      "Salvar no Banco?", 
      `Deseja registrar definitivamente estes ${itens.length} itens no estoque oficial?`, 
      "warning", "Sim, Gravar"
    );
    if (!confirm) return;

    showLoading("Gravando...", "A inserir os dados no banco de dados. Este processo pode demorar alguns segundos.");
    setSalvando(true);

    try {
      // ✨ Mapeamento para o backend igual ao que você fez no EntradaMaterial
      const itensFormatadosParaBanco = itens.map(item => ({
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
        centro: item.centro || 'BR04',
        deposito: item.deposito || '20',
        alocacao: item.alocacao || null
      }));

      const dadosEnvio = {
        solicitante: {
          nome: usuario.nome_completo || 'Sistema de Importação',
          filial_id: usuario.filial_padrao_id || 'BR04',
          wbs: '-',
          observacoes: 'Carga Base Inicial (Importação Excel)',
          tipo: 'Entrada' // Adicionado para garantir o padrão
        },
        itens: itensFormatadosParaBanco,
        anexos: []
      };

      const res = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(dadosEnvio)
      });

      closeAlert();

      // Ajuste na verificação de sucesso para seguir o padrão da sua API
      if (!res.sucesso && !res.ps && !res.ps_id) {
        throw new Error(res.erro || "Falha ao gravar no banco.");
      }

      showAlert("Sucesso!", "A carga base foi importada e salva no estoque com sucesso!", "success");
      setItens([]); 
      resetarProcessador();

    } catch (e) {
      closeAlert();
      showAlert("Erro ao Gravar", e.message, "error");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="aba-conteudo" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      <ModalProcessamento 
        estaProcessando={estaProcessando} concluido={concluido}
        estadoProgresso={estadoProgresso} resultado={resultado}
        erroFatal={erroFatal} onClose={resetarProcessador}
      />

      {itens.length === 0 && !estaProcessando && !concluido && (
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="#2563eb" /> Carga Inicial de Estoque
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
            Utilize esta ferramenta apenas para carregar o estoque físico inicial a partir de uma planilha Excel padronizada.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ flex: 1 }}>
              <CarregarArquivo
                variante="area"
                accept=".xlsx, .xls"
                label="Clique ou arraste a planilha Excel aqui"
                icone={<FileSpreadsheet size={32} color="#10b981" />}
                onFileSelect={handleImportar}
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={20} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#b45309', fontSize: '0.95rem' }}>Importante antes de importar:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>A planilha deve seguir rigorosamente a ordem das colunas do sistema.</li>
                <li>Saldos vazios serão considerados como "0" (Zero).</li>
                <li>A importação é processada em blocos para não sobrecarregar o seu navegador.</li>
              </ul>
              <div style={{ marginTop: '12px' }}>
                <ExemploExcel />
              </div>
            </div>
          </div>
        </div>
      )}

      {itens.length > 0 && !estaProcessando && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <TabelaInsercaoItens 
            itens={itens}
            limiteLinhas={5000} 
            onAtualizarCampo={handleAtualizarCampo}
            onRemoverItem={handleRemoverItem}
            onAdicionarLinha={handleAdicionarLinha}
            onImportarExcel={handleImportar}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '12px' }}>
            <button 
              onClick={() => { setItens([]); resetarProcessador(); }} 
              style={{ background: 'none', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <BotaoAcaoGlobal 
              texto="Gravar Base no Sistema" 
              icone={<Save size={18} />} 
              cor="azul" 
              onClick={handleGravarNoBanco} 
              carregando={salvando} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
