import React, { useState } from 'react';
import { Database, AlertCircle, FileSpreadsheet, Save } from 'lucide-react';

// Importação dos contextos globais para alertas e utilizador
import { useAlert } from '../../../../contexts/AlertContext';
import { useAuth } from '../../../../contexts/AuthContext';

// Formatadores auxiliares
import { formatarDinheiro } from '../../../../utils/formatadores';

// Hook personalizado para processar o Excel
import { useProcessadorExcel } from '../../../../hooks/useProcessadorExcel';

// Serviço de comunicação com o backend
import { apiFetch } from '../../../../services/api';

// Componentes visuais
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

  /**
   * 1. FUNÇÃO DE TRADUÇÃO ULTRA-TURBO
   * Apaga todos os espaços e símbolos para criar blocos de texto únicos.
   * Exemplo: "Nº PEDIDO DE COMPRA / CPV" vira "NPEDIDODECOMPRACPV".
   */
  const obterValor = (itemExcel, palavrasChave) => {
    if (!itemExcel || typeof itemExcel !== 'object') return '';
    const chavesReais = Object.keys(itemExcel);
    
    const limparTexto = (texto) => {
      if (!texto) return '';
      return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ""); // APAGA TUDO o que não for letra ou número (junta tudo num bloco só)
    };

    for (const palavra of palavrasChave) {
      const palavraLimpa = limparTexto(palavra);
      if (!palavraLimpa) continue;
      
      // 1ª Tentativa: Correspondência EXATA
      let chaveEncontrada = chavesReais.find(k => limparTexto(k) === palavraLimpa);

      // 2ª Tentativa: Se não achar igual, tenta ver se está contido
      if (!chaveEncontrada && palavraLimpa.length > 4) {
        chaveEncontrada = chavesReais.find(k => {
          const kLimpa = limparTexto(k);
          return kLimpa.includes(palavraLimpa) || palavraLimpa.includes(kLimpa);
        });
      }

      if (chaveEncontrada && itemExcel[chaveEncontrada] !== undefined && itemExcel[chaveEncontrada] !== null && String(itemExcel[chaveEncontrada]).trim() !== '' && String(itemExcel[chaveEncontrada]).trim() !== '-') {
        return itemExcel[chaveEncontrada];
      }
    }
    return '';
  };

  /**
   * 2. FORMATADOR UNIVERSAL DE DATAS
   * Resolve a anomalia das datas do Excel (números de série, pontos, barras).
   */
  const formatarDataExcel = (valor) => {
    if (!valor || valor === '-' || String(valor).trim() === '') return '';

    if (valor instanceof Date) {
      if (isNaN(valor.getTime())) return '';
      return valor.toISOString().split('T')[0];
    }

    let stringValor = String(valor).trim().split(' ')[0];

    // Trata Números de Série do Excel (Ex: 45674)
    if (/^\d{4,5}$/.test(stringValor)) {
      const numeroDias = parseInt(stringValor, 10);
      const dataBaseExcel = new Date(Date.UTC(1899, 11, 30));
      const dataConvertida = new Date(dataBaseExcel.getTime() + numeroDias * 86400000);
      return dataConvertida.toISOString().split('T')[0];
    }

    // Uniformiza pontos para barras (Ex: 04.02.2025 -> 04/02/2025)
    stringValor = stringValor.replace(/\./g, '/');

    const partes = stringValor.split(/[\/\-]/);
    if (partes.length === 3) {
      let dia, mes, ano;

      if (partes[0].length === 4) {
        ano = partes[0];
        mes = partes[1].padStart(2, '0');
        dia = partes[2].padStart(2, '0');
      } else {
        ano = partes[2];
        if (ano.length === 2) ano = '20' + ano; 

        // Diferencia Formato Americano (M/D/A) do Brasileiro (D/M/A)
        if (parseInt(partes[1], 10) > 12) {
          mes = partes[0].padStart(2, '0');
          dia = partes[1].padStart(2, '0');
        } else {
          dia = partes[0].padStart(2, '0');
          mes = partes[1].padStart(2, '0');
        }
      }

      const dataFormatada = `${ano}-${mes}-${dia}`;
      const dataTeste = new Date(dataFormatada);
      if (!isNaN(dataTeste.getTime())) {
        return dataFormatada;
      }
    }

    return '';
  };

  /**
   * 3. FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
   */
  const handleImportar = async (arquivo) => {
    const itensPlanilha = await iniciarProcessamento(arquivo);
    
    if (itensPlanilha && itensPlanilha.length > 0) {
      
      // 👇 MAPEAMENTO ROBUSTO COM PRIORIZAÇÃO DOS DADOS PROCESSADOS E FALLBACKS
      const novosItensFormatados = itensPlanilha.map((item, index) => {
        // Pedido de Compra / CPV
        let pedidoVal = item.docCompras;
        if (!pedidoVal || pedidoVal === '-') {
          pedidoVal = obterValor(item, ['DOC COMPRAS', 'DOCCOMPRAS', 'Nº PEDIDO DE COMPRA / CPV', 'PEDIDO DE COMPRA', 'CPV', 'COMPRAS']);
        }
        if (pedidoVal === '-') pedidoVal = '';

        // Valor Unitário Nota Fiscal
        let precoVal = item.poNetPrice;
        if (!precoVal || precoVal === '-') {
          precoVal = obterValor(item, ['PO NET PRICE', 'PONETPRICE', 'VLR. UNITÁRIO NOTA FISCAL', 'VALOR UNITARIO NOTA FISCAL', 'VLR. UNITÁRIO', 'VALOR UNITÁRIO', 'VLR UNITARIO']);
        }
        if (precoVal === '-') precoVal = '';
        if (precoVal !== '') {
          precoVal = formatarDinheiro(precoVal);
        }

        return {
          id: `excel-${Date.now()}-${index}`,
          desenhoSAP: item.desenhoSAP || obterValor(item, ['NUM SAP | DESENHO', 'NUM SAP', 'DESENHO SAP']),
          vendorDescription: item.vendorDescription || item.materialDescription || obterValor(item, ['DESCRIÇÃO', 'DESCRICAO', 'MATERIAL DESCRIPTION']),
          numPecaFabricante: item.numPecaFabricante || obterValor(item, ['FABRICANTE', 'PART NUMBER']),
          qtdFornecida: item.qtdFornecida || obterValor(item, ['QTDE ENTRADA', 'QUANTIDADE', 'QTD']) || 1,
          referencia: item.referencia || obterValor(item, ['REFERÊNCIA', 'REFERENCIA']),
          unidadeMedida: item.unidadeMedida || obterValor(item, ['UNID. MEDIDA', 'UNIDADE MEDIDA', 'UNIDADE']) || 'Unid',
          nfEntrada: item.nfEntrada || obterValor(item, ['NUM DA NOTA FISCAL', 'NUMERO DA NOTA FISCAL', 'NOTA FISCAL DE ENTRADA']),
          fornecedor: item.fornecedor || obterValor(item, ['FORNECEDOR / REGISTRO', 'FORNECEDOR']),
          wbsElement: String(item.wbs || obterValor(item, ['CENTRO DE CUSTO - WBS', 'CENTRO DE CUSTO WBS', 'WBS']) || '').trim(),
          nomeProjeto: item.nomeProjeto || obterValor(item, ['NOME CENTRO DE CUSTO / PROJETO', 'NOME CENTRO DE CUSTO', 'PROJETO']),
          
          // As datas usam agora o formatador e os nomes exatos!
          emissaoNF: formatarDataExcel(item.emissaoNF || obterValor(item, ['EMISSÃO NF', 'EMISSAO NF'])),
          recebNF: formatarDataExcel(item.recebNF || obterValor(item, ['RECEB. NF', 'RECEB NF'])),
          
          // Os pedidos e valores não vão roubar dados uns aos outros
          docCompras: pedidoVal ? String(pedidoVal).trim() : '',
          poNetPrice: precoVal || '',
          
          centro: item.centro || obterValor(item, ['FILIAL']) || 'BR04',
          deposito: item.deposito || obterValor(item, ['DEPÓSITO', 'DEPOSITO']) || '20',
          alocacao: item.alocacao || obterValor(item, ['ALOCAÇÃO', 'ALOCACAO'])
        };
      });

      const itensValidos = novosItensFormatados.filter(
        item => item.vendorDescription !== '' || item.numPecaFabricante !== '' || item.desenhoSAP !== ''
      );

      setItens(itensValidos);
    }
  };

  /**
   * ATUALIZAÇÃO MANUAL DA TABELA
   */
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

  /**
   * GRAVAÇÃO FINAL NO BANCO DE DADOS
   */
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
          nome: usuario?.nome_completo || 'Sistema de Importação',
          filial_id: usuario?.filial_padrao_id || 'BR04',
          wbs: '-',
          observacoes: 'Carga Base Inicial (Importação Excel)',
          tipo: 'Entrada'
        },
        itens: itensFormatadosParaBanco,
        anexos: []
      };

      const res = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(dadosEnvio)
      });

      closeAlert(); 

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
                <li>A planilha deve seguir rigorosamente os cabeçalhos.</li>
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
