import React, { useState, useEffect, useContext } from 'react';
import { Search, Loader2, Archive, Calendar, User, Box, ArrowRight, RotateCcw } from 'lucide-react';
import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';
import { apiFetch } from '../../../services/api';
import './Traceabilly.css';

export default function Traceabilly({ perfil }) {
  const { estoqueAtual, filiaisGlobais, usuario } = useContext(AuthContext);
  const { showAlert, showConfirm } = useAlert();

  const [itensArquivados, setItensArquivados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  // Gatilho para recarregar a tabela após uma reversão bem sucedida
  const [recarregar, setRecarregar] = useState(0);

  // ✨ VERIFICAÇÃO DE PERMISSÃO: Apenas ADM e LÍDER no perfil logística podem reverter
  const isAdminOuLider = perfil !== 'cliente' && (usuario?.cargo === 'ADM' || usuario?.cargo === 'LIDER');

  const formatarData = (dataISO) => {
    if (!dataISO) return '-';
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return '-';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const getIniciais = (nome) => {
    if (!nome) return '?';
    return nome.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const buscarHistorico = async () => {
      try {
        setCarregando(true);
        const urlParams = estoqueAtual === 'TODOS' ? '?limit=1000' : `?filial=${estoqueAtual}&limit=1000`;
        const resposta = await apiFetch(`/solicitacoes/listar${urlParams}`);
        
        if (resposta.sucesso) {
          const movimentos = resposta.dados.filter(sol => 
            sol.status === 'Em Separação' || sol.status === 'Concluído' || sol.status === 'Reintegrado' || sol.status === 'Cancelado'
          );

          const itemsList = [];
          movimentos.forEach(sol => {
            if (sol.itens && sol.itens.length > 0) {
              sol.itens.forEach(it => {
                itemsList.push({
                  idUnico: `${sol.id}-${it.id}`,
                  idItem: it.id, // ID real na tabela 'solicitacoes_itens' necessário para a API
                  tipoOriginal: sol.tipo, // Necessário para bloquear a reversão de "Entradas"
                  desenhoSAP: it.desenho_sap_manual || '-',
                  partNumber: it.part_number_manual || '-',
                  descricao: it.descricao_manual || 'Sem descrição',
                  fornecedor: it.fornecedor || '-',
                  nfEntrada: it.nf_entrada || '-',
                  bsSaida: sol.pl || '-', 
                  solicitacao: sol.ps || '-',
                  solicitante: sol.solicitante || '-',
                  alocacao: it.alocacao || sol.tipo || '-',
                  qtd: `${it.quantidade_solicitada} ${it.unidade_medida_manual || 'Unid'}`,
                  valorUnit: it.valor_unitario_manual,
                  wbs: sol.wbs || '-',
                  dataSaida: formatarData(sol.dataFinalizacaoISO || sol.dataCriacaoISO)
                });
              });
            }
          });

          setItensArquivados(itemsList);
        } else {
          showAlert("Erro", resposta.erro, "error");
        }
      } catch (error) {
        showAlert("Erro de Conexão", "Não foi possível carregar o histórico de movimentações.", "error");
      } finally {
        setCarregando(false);
      }
    };
    
    if (estoqueAtual) {
      buscarHistorico();
    }
  }, [estoqueAtual, showAlert, recarregar]);

  // ✨ LÓGICA DE REVERTER ITEM AO ESTOQUE
  const handleReverterItem = async (idItem) => {
    if (!idItem) {
      showAlert("Erro", "ID do item não encontrado.", "error");
      return;
    }

    const confirmar = await showConfirm(
      "Reverter Item",
      "Tem a certeza que deseja devolver este item ao estoque? A quantidade será reposta e o registo de saída apagado permanentemente.",
      "warning",
      "Sim, Reverter"
    );

    if (!confirmar) return;

    try {
      setCarregando(true);
      const resposta = await apiFetch('/solicitacoes/reverter', {
        method: 'POST',
        body: JSON.stringify({ id_item: idItem })
      });

      if (resposta.sucesso) {
        showAlert("Sucesso", "Item revertido para o estoque com sucesso!", "success");
        setRecarregar(prev => prev + 1); // Dispara a recarga da tabela
      } else {
        showAlert("Erro de Servidor", resposta.erro, "error");
      }
    } catch (error) {
      showAlert("Falha de Conexão", "Não foi possível comunicar com o servidor ao reverter o item.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const historicoFiltrado = itensArquivados.filter(item => 
    (item.partNumber && item.partNumber.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.nfEntrada && item.nfEntrada.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.bsSaida && item.bsSaida.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.wbs && item.wbs.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.solicitante && item.solicitante.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
    (item.solicitacao && item.solicitacao.toLowerCase().includes(termoPesquisa.toLowerCase()))
  );

  return (
    <div className="traceabilly-wrapper">
      <div className="traceabilly-card">
        
        <div className="traceabilly-header">
          <div className="header-esquerda">
            <Archive size={20} className="icone-azul" />
            <h2>Itens Arquivados</h2>
            <span className="badge-contador">{historicoFiltrado.length}</span>
          </div>
          <div className="header-direita">
            <Search size={16} className="icone-pesquisa" />
            <input 
              type="text" 
              placeholder="Buscar por PN, NF, BS, WBS, Solicitante..." 
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="input-pesquisa"
            />
          </div>
        </div>

        <div className="traceabilly-subheader">
          <div className="subheader-item">
            <User size={14} /> Quem solicitou
          </div>
          <div className="subheader-item">
            <Calendar size={14} /> Quando saiu
          </div>
          <div className="subheader-item">
            <Box size={14} /> Qual BS/Solicitação
          </div>
        </div>

        <div className="tabela-container">
          {carregando ? (
            <div className="estado-vazio"><Loader2 className="animate-spin" size={32} /> A carregar histórico...</div>
          ) : historicoFiltrado.length === 0 ? (
            <div className="estado-vazio"><Archive size={48} className="icone-vazio" /> Nenhum item arquivado encontrado.</div>
          ) : (
            <table className="tabela-rastreabilidade">
              <thead>
                <tr>
                  <th>DESENHO SAP</th>
                  <th>PART NUMBER</th>
                  <th>DESCRIÇÃO</th>
                  <th>FORNECEDOR</th>
                  <th>NF ENTRADA</th>
                  <th>BS SAÍDA</th>
                  <th>SOLICITAÇÃO</th>
                  <th>SOLICITANTE</th>
                  <th>ALOCAÇÃO</th>
                  <th>QTD ORIGINAL</th>
                  <th>VALOR UNIT.</th>
                  <th>WBS</th>
                  <th>DATA SAÍDA</th>
                  {/* ✨ COLUNA AÇÕES SÓ PARA LÍDER OU ADM */}
                  {isAdminOuLider && <th style={{ textAlign: 'center' }}>AÇÃO</th>}
                </tr>
              </thead>
              <tbody>
                {historicoFiltrado.map(item => (
                  <tr key={item.idUnico}>
                    <td className="texto-azul">{item.desenhoSAP}</td>
                    <td className="texto-negrito">{item.partNumber}</td>
                    <td className="texto-truncado" title={item.descricao}>{item.descricao}</td>
                    <td className="texto-cinza-uppercase" title={item.fornecedor}>{item.fornecedor}</td>
                    <td>
                      {item.nfEntrada !== '-' ? <span className="badge-nf">{item.nfEntrada}</span> : '-'}
                    </td>
                    <td>
                      <div className="flex-centro">
                        <ArrowRight size={14} className="icone-seta" />
                        <span className="badge-bs">{item.bsSaida !== '-' ? item.bsSaida : 'S/ PL'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-solicitacao">{item.solicitacao}</span>
                    </td>
                    <td>
                      <div className="flex-centro-gap" title={item.solicitante}>
                        <div className="avatar-solicitante">{getIniciais(item.solicitante)}</div>
                        <span className="texto-truncado-pequeno">{item.solicitante.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="texto-azul">{item.alocacao}</td>
                    <td style={{ color: '#1e293b', fontWeight: '500' }}>{item.qtd}</td>
                    <td className="texto-pequeno">
                       {item.valorUnit ? (
                         <>
                           R$<br/>
                           <strong style={{ color: '#1e293b' }}>{item.valorUnit.toFixed(2)}</strong>
                         </>
                       ) : '-'}
                    </td>
                    <td className="texto-azul" title={item.wbs}>{item.wbs}</td>
                    <td>{item.dataSaida}</td>
                    
                    {/* ✨ RENDERIZAÇÃO CONDICIONAL DO BOTÃO REVERTER */}
                    {isAdminOuLider && (
                      <td style={{ textAlign: 'center' }}>
                        {/* Bloqueamos a reversão de Entradas, Notas Fiscais e Cancelamentos para não corromper o estoque */}
                        {['Material', 'Transferencia WBS', 'Crossdocking'].includes(item.tipoOriginal) ? (
                          <button 
                            onClick={() => handleReverterItem(item.idItem)} 
                            className="btn-reverter"
                            title="Reverter item para o estoque"
                          >
                            <RotateCcw size={18} />
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}