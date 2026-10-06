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
  // ✨ AQUI: Puxamos o estoqueAtual para saber qual filial está selecionada no cabeçalho
  const { usuario, estoqueAtual } = useAuth(); 
  
  const [itens, setItens] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const {
    estaProcessando, concluido, estadoProgresso, resultado, erroFatal,
    iniciarProcessamento, resetarProcessador
  } = useProcessadorExcel();

  // ✨ Define a filial de destino baseada na seleção do cabeçalho
  const filialDestino = estoqueAtual !== 'TODOS' ? estoqueAtual : (usuario?.filial_padrao_id || '');

  /**
   * 1. FUNÇÃO DE TRADUÇÃO ULTRA-TURBO
   * Apaga todos os espaços e símbolos para criar blocos de texto únicos.
   */
  const obterValor = (itemExcel, palavrasChave) => {
    if (!itemExcel || typeof itemExcel !== 'object') return '';
    const chavesReais = Object.keys(itemExcel);
    
    const limparTexto = (texto) => {
      if (!texto) return '';
      return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ""); 
    };

    for (const palavra of palavrasChave) {
      const palavraLimpa = limparTexto(palavra);
      if (!palavraLimpa) continue;
      
      let chaveEncontrada = chavesReais.find(k => limparTexto(k) === palavraLimpa);

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
   */
  const formatarDataExcel = (valor) => {
    if (!valor || valor === '-' || String(valor).trim() === '') return '';

    if (valor instanceof Date) {
      if (isNaN(valor.getTime())) return '';
      return valor.toISOString().split('T')[0];
    }

    let stringValor = String(valor).trim().split(' ')[0];

    if (/^\d{4,5}$/.test(stringValor)) {
      const numeroDias = parseInt(stringValor, 10);
      const dataBaseExcel = new Date(Date.UTC(1899, 11, 30));
      const dataConvertida = new Date(dataBaseExcel.getTime() + numeroDias * 86400000);
      return dataConvertida.toISOString().split('T')[0];
    }

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

  const normalizarUnidade = (u) => {
    if (!u) return 'Unid';
    const limpo = String(u).trim().toUpperCase();
    if (limpo.startsWith('UN') || limpo === 'PC' || limpo === 'PECA' || limpo === 'PÇ' || limpo === 'N/A' || limpo === 'ND') return 'Unid';
    if (limpo.startsWith('M') || limpo.includes('METRO')) return 'Metro';
    if (limpo.startsWith('KG') || limpo.includes('QUILO')) return 'Kg';
    if (limpo.startsWith('CX') || limpo.includes('CAIXA')) return 'Caixa';
    if (limpo.startsWith('L') || limpo.includes('LITRO')) return 'Litro';
    if (limpo === 'NR') return 'NR';
    return 'Unid';
  };

  /**
   * 3. FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
   */
  const handleImportar = async (arquivo) => {
    const itensPlanilha = await iniciarProcessamento(arquivo);
    
    if (itensPlanilha && itensPlanilha.length > 0) {
      
      const novosItensFormatados = itensPlanilha.map((item, index) => {
        let pedidoVal = item.docCompras;
        if (!pedidoVal || pedidoVal === '-') {
          pedidoVal = obterValor(item, ['DOC COMPRAS', 'DOCCOMPRAS', 'Nº PEDIDO DE COMPRA / CPV', 'PEDIDO DE COMPRA', 'CPV', 'COMPRAS']);
        }
        if (pedidoVal === '-') pedidoVal = '';

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
          
          fabricante: item.fabricante || obterValor(item, ['FABRICANTE', 'MARCA', 'FABR']),
          numPecaFabricante: item.numPecaFabricante || obterValor(item, ['Nº PEÇA', 'PEÇA', 'PART NUMBER', 'PN', 'REF FABRICANTE']),
          
          qtdFornecida: item.qtdFornecida || obterValor(item, ['QTDE ENTRADA', 'QUANTIDADE', 'QTD']) || 1,
          referencia: item.referencia || obterValor(item, ['REFERÊNCIA', 'REFERENCIA']),
          unidadeMedida: normalizarUnidade(item.unidadeMedida || obterValor(item, ['UNID. MEDIDA', 'UNIDADE MEDIDA', 'UNIDADE'])),
          nfEntrada: item.nfEntrada || obterValor(item, ['NUM DA NOTA FISCAL', 'NUMERO DA NOTA FISCAL', 'NOTA FISCAL DE ENTRADA']),
          fornecedor: item.fornecedor || obterValor(item, ['FORNECEDOR / REGISTRO', 'FORNECEDOR']),
          wbsElement: String(item.wbs || obterValor(item, ['CENTRO DE CUSTO - WBS', 'CENTRO DE CUSTO WBS', 'WBS']) || '').trim(),
          nomeProjeto: item.nomeProjeto || obterValor(item, ['NOME CENTRO DE CUSTO / PROJETO', 'NOME CENTRO DE CUSTO', 'PROJETO']),
          
          emissaoNF: formatarDataExcel(item.emissaoNF || obterValor(item, ['EMISSÃO NF', 'EMISSAO NF'])),
          recebNF: formatarDataExcel(item.recebNF || obterValor(item, ['RECEB. NF', 'RECEB NF'])),
          
          docCompras: pedidoVal ? String(pedidoVal).trim() : '',
          poNetPrice: precoVal || '',
          
          // ✨ AQUI: Substituído o 'BR04' fixo pela filial dinâmica
          centro: item.centro || obterValor(item, ['FILIAL']) || filialDestino,
          deposito: item.deposito || obterValor(item, ['DEPÓSITO', 'DEPOSITO']) || '20',
          alocacao: item.alocacao || obterValor(item, ['ALOCAÇÃO', 'ALOCACAO'])
        };
      });

      const itensValidos = novosItensFormatados.filter(
        item => item.vendorDescription !== '' || item.numPecaFabricante !== '' || item.desenhoSAP !== '' || item.fabricante !== ''
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
      id: Date.now().toString(), desenhoSAP: '', vendorDescription: '', fabricante: '', numPecaFabricante: '',
      qtdFornecida: 1, referencia: '', unidadeMedida: 'Unid', nfEntrada: '', fornecedor: '',
      wbsElement: '', nomeProjeto: '', emissaoNF: '', recebNF: '', docCompras: '',
      poNetPrice: '', 
      centro: filialDestino, // ✨ AQUI: Substituído o 'BR04' fixo pela filial dinâmica
      deposito: '20', alocacao: ''
    };
    setItens([novaLinha, ...itens]);
  };

  /**
   * GRAVAÇÃO FINAL NO BANCO DE DADOS
   */
  const handleGravarNoBanco = async () => {
    // ✨ TRAVA DE SEGURANÇA: Obriga a escolher uma filial antes de gravar
    if (!estoqueAtual || estoqueAtual === 'TODOS') {
      return showAlert("Ação Bloqueada", "Por favor, selecione uma filial específica no cabeçalho antes de importar o estoque base.", "warning");
    }

    if (itens.length === 0) return showAlert("Aviso", "A tabela está vazia.", "warning");

    const confirm = await showConfirm(
      "Salvar no Banco?", 
      `Deseja registrar definitivamente estes ${itens.length} itens no estoque oficial da filial ${filialDestino}?`, 
      "warning", "Sim, Gravar"
    );
    if (!confirm) return;

    showLoading("Gravando...", "A inserir os dados no banco de dados. Este processo pode demorar alguns segundos.");
    setSalvando(true);

    try {
      const itensFormatadosParaBanco = itens.map(item => ({
        desenho_sap: item.desenhoSAP || '-',
        part_number: item.numPecaFabricante || '-',
        fabricante: item.fabricante || null, 
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
        centro: item.centro || filialDestino, // ✨ AQUI: Substituído o 'BR04' fixo pela filial dinâmica
        deposito: item.deposito || '20',
        alocacao: item.alocacao || null
      }));

      const dadosEnvio = {
        solicitante: {
          nome: usuario?.nome_completo || 'Sistema de Importação',
          filial_id: filialDestino, // ✨ AQUI: Substituído o 'BR04' fixo pela filial dinâmica
          wbs: '-',
          observacoes: `Carga Base Inicial (Importação Excel) - Filial ${filialDestino}`,
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

      showAlert("Sucesso!", `A carga base foi importada e salva no estoque da filial ${filialDestino} com sucesso!`, "success");
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
            Utilize esta ferramenta apenas para carregar o estoque físico inicial a partir de uma planilha Excel padronizada. Os dados irão para a filial <strong>{filialDestino || 'selecionada no cabeçalho'}</strong>.
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
                <li>Selecione a filial correta no menu do topo antes de carregar o ficheiro.</li>
                <li>A planilha deve seguir rigorosamente os cabeçalhos.</li>
                <li>Saldos vazios serão considerados como "0" (Zero).</li>
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
            limiteLinhas={999999} 
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
