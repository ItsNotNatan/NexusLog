import React, { useState } from 'react';
import { Database, AlertCircle, FileSpreadsheet, Save } from 'lucide-react';

// Importação dos contextos globais para alertas e utilizador
import { useAlert } from '../../../../contexts/AlertContext';
import { useAuth } from '../../../../contexts/AuthContext';

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
  // Extração das funções de alerta do contexto
  const { showAlert, showConfirm, showLoading, closeAlert } = useAlert();
  // Obtenção dos dados do utilizador logado
  const { usuario } = useAuth();
  
  // Estado para armazenar as linhas que aparecem na tabela antes de guardar
  const [itens, setItens] = useState([]);
  // Estado para controlar se o botão de guardar está a carregar
  const [salvando, setSalvando] = useState(false);

  // Hook do processador de Excel que gere o progresso e o estado da leitura
  const {
    estaProcessando, concluido, estadoProgresso, resultado, erroFatal,
    iniciarProcessamento, resetarProcessador
  } = useProcessadorExcel();

  /**
   * FUNÇÃO DE FORMATAÇÃO DE DATA
   * Garante que se o Excel enviar um objeto de data nativo (em vez de texto),
   * nós convertemos de volta para uma string legível (DD/MM/AAAA).
   */
  const formatarDataExcel = (valorData) => {
    if (!valorData) return '';
    
    // Se a biblioteca converteu para um objeto Date real do JavaScript
    if (valorData instanceof Date) {
      const dia = String(valorData.getDate()).padStart(2, '0');
      const mes = String(valorData.getMonth() + 1).padStart(2, '0');
      const ano = valorData.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    
    // Se já for um texto (string) ou número, apenas converte para string de forma segura
    return String(valorData).trim();
  };

  /**
   * FUNÇÃO DE TRADUÇÃO TURBO
   * Remove acentos, caracteres especiais e espaços extra das chaves (cabeçalhos) 
   * do Excel, tornando a procura à prova de falhas de digitação.
   */
  const obterValor = (itemExcel, palavrasChave) => {
    const chavesReais = Object.keys(itemExcel);
    
    // Função auxiliar para normalizar o texto
    const limparTexto = (texto) => {
      if (!texto) return '';
      return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos (ç -> c, ã -> a)
        .replace(/[-|/.]/g, " ") // Troca traços, barras verticais e pontos por espaço
        .replace(/\s+/g, " ") // Remove espaços múltiplos
        .trim()
        .toUpperCase();
    };

    // Percorre o dicionário de palavras que queremos procurar
    for (const palavra of palavrasChave) {
      const palavraLimpa = limparTexto(palavra);
      
      // Procura nas chaves do Excel alguma que contenha a palavra limpa
      const chaveEncontrada = chavesReais.find(k => {
        const kLimpo = limparTexto(k);
        return kLimpo.includes(palavraLimpa);
      });

      // Se encontrou e tem valor válido, devolve esse valor
      if (chaveEncontrada && itemExcel[chaveEncontrada] !== undefined && itemExcel[chaveEncontrada] !== null) {
        return itemExcel[chaveEncontrada];
      }
    }
    return '';
  };

  /**
   * FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
   * Recebe o ficheiro, manda processar e mapeia os dados para a tabela.
   */
  const handleImportar = async (arquivo) => {
    const itensPlanilha = await iniciarProcessamento(arquivo);
    
    if (itensPlanilha && itensPlanilha.length > 0) {
      
      // Mapeamento robusto com várias palavras-chave como margem de segurança
      const novosItensFormatados = itensPlanilha.map((item, index) => ({
        id: `excel-${Date.now()}-${index}`, // Cria um ID único para a interface
        desenhoSAP: obterValor(item, ['NUM SAP', 'DESENHO']),
        vendorDescription: obterValor(item, ['DESCRICAO', 'DESC', 'DENOMINACAO', 'TEXTO BREVE', 'MATERIAL DESCRIPTION']),
        numPecaFabricante: obterValor(item, ['FABRICANTE', 'PART NUMBER', 'PN']),
        qtdFornecida: obterValor(item, ['QTDE ENTRADA', 'QTD', 'QUANTIDADE']) || 1,
        referencia: obterValor(item, ['REFERENCIA', 'REF']),
        unidadeMedida: obterValor(item, ['UNID MEDIDA', 'UNIDADE', 'UM']) || 'Unid',
        nfEntrada: obterValor(item, ['NUM DA NOTA FISCAL', 'NF', 'NOTA FISCAL']),
        fornecedor: obterValor(item, ['FORNECEDOR', 'REGISTRO']),
        wbsElement: String(obterValor(item, ['CENTRO DE CUSTO WBS', 'WBS', 'CENTRO DE CUSTO'])).trim(),
        nomeProjeto: obterValor(item, ['NOME CENTRO DE CUSTO', 'PROJETO']),
        
        // Passamos o valor bruto pelo nosso conversor de datas para garantir que fica legível
        emissaoNF: formatarDataExcel(obterValor(item, ['EMISSAO NF', 'DATA EMISSAO', 'DT EMISSAO', 'EMISSAO'])),
        recebNF: formatarDataExcel(obterValor(item, ['RECEB NF', 'RECEBIMENTO NF', 'DATA RECEBIMENTO', 'DT RECEB', 'RECEBIMENTO'])),
        
        docCompras: obterValor(item, ['PEDIDO DE COMPRA', 'CPV', 'PO']),
        poNetPrice: obterValor(item, ['VLR UNITARIO NOTA FISCAL', 'VLR UNITARIO', 'VALOR']),
        centro: obterValor(item, ['FILIAL', 'CENTRO']) || 'BR04',
        deposito: obterValor(item, ['DEPOSITO']) || '20',
        alocacao: obterValor(item, ['ALOCACAO'])
      }));

      // Filtra as linhas vazias (evita criar linhas mortas se o Excel tiver lixo no final)
      const itensValidos = novosItensFormatados.filter(
        item => item.vendorDescription !== '' || item.numPecaFabricante !== '' || item.desenhoSAP !== ''
      );

      setItens(itensValidos); // Coloca os itens validados no estado para desenhar a tabela
    }
  };

  /**
   * ATUALIZAÇÃO MANUAL
   * Permite editar uma célula específica na tabela antes de gravar no sistema.
   */
  const handleAtualizarCampo = (id, campo, valor) => {
    setItens(prev => prev.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  // Remove uma linha específica da tabela
  const handleRemoverItem = (id) => {
    setItens(prev => prev.filter(item => item.id !== id));
  };

  // Adiciona uma linha totalmente em branco à tabela
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
   * GRAVAÇÃO FINAL
   * Pega nos itens da tabela, formata-os para a Base de Dados e envia via API.
   */
  const handleGravarNoBanco = async () => {
    if (itens.length === 0) return showAlert("Aviso", "A tabela está vazia.", "warning");

    // Confirmação dupla de segurança
    const confirm = await showConfirm(
      "Salvar no Banco?", 
      `Deseja registrar definitivamente estes ${itens.length} itens no estoque oficial?`, 
      "warning", "Sim, Gravar"
    );
    if (!confirm) return;

    showLoading("Gravando...", "A inserir os dados no banco de dados. Este processo pode demorar alguns segundos.");
    setSalvando(true);

    try {
      // Mapeamento dos campos do frontend (tabela) para as colunas reais da Base de Dados
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

      // Objeto com a estrutura que o Backend espera receber
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

      // Envia os dados para a rota de entrada do backend
      const res = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(dadosEnvio)
      });

      closeAlert(); // Fecha o modal de carregamento

      // Tratamento de falhas do servidor
      if (!res.sucesso && !res.ps && !res.ps_id) {
        throw new Error(res.erro || "Falha ao gravar no banco.");
      }

      // Conclusão com sucesso
      showAlert("Sucesso!", "A carga base foi importada e salva no estoque com sucesso!", "success");
      setItens([]); // Limpa a tabela
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
      
      {/* Modal que surge durante a leitura da planilha */}
      <ModalProcessamento 
        estaProcessando={estaProcessando} concluido={concluido}
        estadoProgresso={estadoProgresso} resultado={resultado}
        erroFatal={erroFatal} onClose={resetarProcessador}
      />

      {/* TELA INICIAL: Mostra a área de upload se não houver itens nem leitura ativa */}
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

          {/* Dicas e Download do Modelo de Planilha */}
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

      {/* TELA DA TABELA: Mostra a tabela de edição assim que o ficheiro for lido com sucesso */}
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
