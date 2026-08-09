import React, { useState, useEffect, useContext } from 'react';
import './Traceabilly.css'; 
import { 
  Archive, 
  Search, 
  User, 
  Calendar, 
  Box, 
  ArrowRight,
  RotateCcw,
  Loader
} from 'lucide-react';

import { useAlert } from '../../../contexts/AlertContext'; 
import { AuthContext } from '../../../contexts/AuthContext'; 

import { apiFetch } from '../../../services/api';

export default function Traceabilly({ perfil = 'logistica' }) {
  const { estoqueAtual } = useContext(AuthContext); 
  const [dadosRastreabilidade, setDadosRastreabilidade] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  
  const { mostrarAlerta } = useAlert();

  useEffect(() => {
    buscarHistorico();
  }, [estoqueAtual]); 

  const buscarHistorico = async () => {
    try {
      setCarregando(true);

      const filtroFilial = !estoqueAtual || estoqueAtual === 'TODOS' ? '' : estoqueAtual;
      const url = `/solicitacoes/listar?limit=500&filial=${filtroFilial}`;

      const json = await apiFetch(url);

      if (json.sucesso) {
        let itensExtraidos = [];

        json.dados.forEach(solicitacao => {
          const estaAprovado = solicitacao.status === 'Em Separação' || solicitacao.status === 'Concluído';
          const naoEEntrada = solicitacao.tipo !== 'Entrada';

          if (estaAprovado && naoEEntrada) {
            
            solicitacao.itens.forEach(item => {
              itensExtraidos.push({
                id: item.id,
                // ✨ 1. CAPTURAMOS O TIPO AQUI!
                tipo: solicitacao.tipo,
                partNumber: item.part_number_manual || item.part_number || '-',
                descricao: item.descricao_manual || item.descricao || '-',
                fornecedor: item.fornecedor || '-',
                nfEntrada: item.nf_entrada || 'N/A',
                bsSaida: solicitacao.pl || solicitacao.bs || '-', 
                solicitacao: solicitacao.id,
                solicitanteInicial: solicitacao.solicitante ? solicitacao.solicitante.charAt(0).toUpperCase() : 'U',
                solicitanteNome: solicitacao.solicitante || 'Não identificado',
                alocacao: item.alocacao || 'Padrão',
                qtd: `${item.quantidade_solicitada} ${item.unidade_medida_manual || 'Unid'}`,
                valor: item.valor_unitario_manual ? `R$ ${item.valor_unitario_manual}` : '-',
                wbs: solicitacao.wbs || '-',
                data: solicitacao.dataSolicitacao
              });
            });
          }
        });

        setDadosRastreabilidade(itensExtraidos);
      }
    } catch (error) {
      console.error("Erro ao buscar rastreabilidade:", error.message);
      if (mostrarAlerta) mostrarAlerta('Erro ao carregar o histórico de rastreabilidade.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  const handleReverterItem = async (item) => {
    const confirmar = window.confirm(`Deseja devolver o item ${item.partNumber} ao estoque e removê-lo do histórico de saídas?`);
    if (!confirmar) return; 

    try {
      setCarregando(true);
      
      const json = await apiFetch('/solicitacoes/reverter', {
        method: 'POST',
        body: JSON.stringify({
          id_item: item.id
        })
      });

      if (json.sucesso) {
        if (mostrarAlerta) mostrarAlerta(`O item ${item.partNumber} retornou ao estoque principal!`, 'success');
        
        setDadosRastreabilidade(dadosAtuais => 
          dadosAtuais.filter(dado => dado.id !== item.id)
        );
      } else {
        if (mostrarAlerta) mostrarAlerta(`Falha ao reverter: ${json.erro}`, 'error');
      }
    } catch (error) {
      console.error("Erro na reversão:", error.message);
      if (mostrarAlerta) mostrarAlerta('Falha de conexão com o servidor.', 'error');
    } finally {
      setCarregando(false);
    }
  };

  const dadosFiltrados = dadosRastreabilidade.filter(item => 
    item.partNumber.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    item.descricao.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    item.solicitanteNome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    item.solicitacao.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
    // Permite pesquisar digitando "transferencia"
    item.tipo.toLowerCase().includes(termoPesquisa.toLowerCase()) 
  );

  return (
    <div className="traceabilly-wrapper">
      
      <header className="pagina-cabecalho">
        <h1>Rastreabilidade</h1>
        <p>Banco de dados histórico — rastreador completo de saída de itens</p>
      </header>

      <div className="traceabilly-cartao">
        
        <div className="cartao-topo">
          <div className="titulo-grupo">
            <Archive className="icone-azul" size={20} />
            <h2>Histórico de Movimentações</h2>
            <span className="badge-contador">{dadosFiltrados.length}</span>
          </div>
          
          <div className="pesquisa-grupo">
            <Search className="icone-pesquisa" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por PN, NF, PL, WBS, Solicitante..." 
              className="input-pesquisa"
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)} 
            />
          </div>
        </div>

        <div className="filtros-linha">
          <button className="btn-filtro">
            <User size={16} /> Quem solicitou
          </button>
          <button className="btn-filtro">
            <Calendar size={16} /> Quando saiu
          </button>
          <button className="btn-filtro destaque">
            <Box size={16} /> Qual PL/Solicitação
          </button>
        </div>

        <div className="tabela-container">
          {carregando ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <Loader className="icone-girando" size={32} />
              <p>A carregar o histórico completo de saídas...</p>
            </div>
          ) : (
            <table className="tabela-rastreabilidade" style={{ minWidth: '1300px' }}>
              <thead>
                <tr>
                  <th>PART NUMBER</th>
                  <th>DESCRIÇÃO</th>
                  <th>FORNECEDOR</th>
                  <th>NF ENTRADA</th>
                  <th>PL DE SAÍDA</th>
                  <th>SOLICITAÇÃO</th>
                  <th>SOLICITANTE</th>
                  <th>ALOCAÇÃO</th>
                  <th>QTD</th>
                  <th>VALOR</th>
                  <th>WBS</th>
                  <th>DATA</th>
                  {perfil === 'logistica' && <th style={{ width: '40px' }}></th>}
                </tr>
              </thead>
              
              <tbody>
                {dadosFiltrados.length > 0 ? (
                  dadosFiltrados.map((linha, index) => {
                    // ✨ 2. VERIFICAMOS SE É TRANSFERÊNCIA PARA PINTAR DE AMARELO!
                    const isTransferencia = linha.tipo === 'Transferencia WBS';

                    return (
                      <tr 
                        key={`${linha.id}-${index}`}
                        style={{ backgroundColor: isTransferencia ? '#fefce8' : 'transparent' }}
                      >
                        <td className="fonte-forte">
                          {linha.partNumber}
                          {/* Pequeno aviso visual extra para ficar ainda mais claro */}
                          {isTransferencia && (
                            <div style={{ fontSize: '0.65rem', color: '#ca8a04', marginTop: '4px', fontWeight: 'bold' }}>
                              (TRANSFERÊNCIA)
                            </div>
                          )}
                        </td>
                        <td>{linha.descricao}</td>
                        <td className="texto-cinza">{linha.fornecedor}</td>
                        
                        <td><span className="badge-borda">{linha.nfEntrada}</span></td>
                        
                        <td>
                          <div className="celula-flex">
                            <ArrowRight size={14} className="icone-seta" />
                            <span className="badge-azul-claro">{linha.bsSaida}</span>
                          </div>
                        </td>
                        
                        <td><span className="badge-azul-suave">{linha.solicitacao}</span></td>
                        
                        <td>
                          <div className="celula-flex">
                            <span className="avatar-circulo">{linha.solicitanteInicial}</span>
                            <span className="fonte-forte">{linha.solicitanteNome}</span>
                          </div>
                        </td>
                        
                        <td><a href="#" className="link-alocacao">{linha.alocacao}</a></td>
                        
                        <td className="fonte-forte">{linha.qtd}</td>
                        <td className="texto-cinza">{linha.valor}</td>
                        <td><a href="#" className="link-alocacao">{linha.wbs}</a></td>
                        <td className="texto-cinza">{linha.data}</td>

                        {perfil === 'logistica' && (
                          <td>
                            <button 
                              className="btn-reverter" 
                              title="Devolver item ao estoque e apagar histórico"
                              onClick={() => handleReverterItem(linha)} 
                            >
                              <RotateCcw size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Nenhum registo histórico de saída ou transferência encontrado para esta filial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}