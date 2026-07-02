import React, { useState } from 'react';
import { User, MapPin, Calendar, Zap, Search, Package, Send, FileSpreadsheet, Trash2 } from 'lucide-react';
import CarregarArquivo from '../../components/CarregarArquivo/CarregarArquivo';
import { lerExcelParaItens } from '../../utils/excelUtils';

// DADOS DO ESTOQUE ATUALIZADOS PARA O PADRÃO COMPLETO
const estoqueDisponivel = [
  { desenhoSAP: 'TEXXX-0000022629', materialDescription: 'REPARTIDORES LÓGICOS 4 X M12 FÊMEA', numPecaFabricante: 'PROLOGANT4RP', fornecedor: 'SENSTRONIC', qtdFornecida: '199', referencia: '9095', unidadeMedida: 'NR', vendorDescription: 'SENSTRONIC DO BRASIL', wbs: 'BRBCBBB29-...', emissaoNF: '23/06/2026', recebNF: '30/06/2026', docCompras: '34026', poNetPrice: 'R$ 1.697,39', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
  { desenhoSAP: 'TAL-S378006', materialDescription: 'CONECTOR IE FC 180 4X2', numPecaFabricante: '6GK1901-1BB11-2AA0', fornecedor: 'SIEMENS', qtdFornecida: '4', referencia: 'AR-366866', unidadeMedida: 'NR', vendorDescription: 'SIEMENS INFRAESTRUTURA', wbs: 'BRBRRCY21-...', emissaoNF: '23/06/2026', recebNF: '30/06/2026', docCompras: '34246', poNetPrice: 'R$ 161,77', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
  { desenhoSAP: 'TCXXX9999902639', materialDescription: 'CILINDRO COMPACTO DE DUPLA ACAO D50', numPecaFabricante: 'ADVU-50-25-P-A', fornecedor: 'FESTO', qtdFornecida: '17', referencia: '2762733', unidadeMedida: 'NR', vendorDescription: 'FESTO BRASIL LTDA', wbs: 'BRBCBBB41-...', emissaoNF: '26/06/2026', recebNF: '30/06/2026', docCompras: '34258', poNetPrice: 'R$ 1.454,26', centro: 'BR06', deposito: '0020', alocacao: '002-B-004' },
];

export default function MaterialEstoque() {
  const [itensSelecionados, setItensSelecionados] = useState([]);

  const removerItem = (idParaRemover) => {
    setItensSelecionados(prev => prev.filter(item => item.id !== idParaRemover));
  };

  const adicionarManualmente = (item, index) => {
    setItensSelecionados(prev => [...prev, {
      id: `manual-${Date.now()}-${index}`,
      desenhoSAP: item.desenhoSAP,
      materialDescription: item.materialDescription,
      numPecaFabricante: item.numPecaFabricante,
      fornecedor: item.fornecedor,
      qtdSelecionada: 1,
      referencia: item.referencia,
      unidadeMedida: item.unidadeMedida,
      vendorDescription: item.vendorDescription,
      wbs: item.wbs,
      emissaoNF: item.emissaoNF,
      recebNF: item.recebNF,
      docCompras: item.docCompras,
      poNetPrice: item.poNetPrice,
      centro: item.centro,
      deposito: item.deposito,
      alocacao: item.alocacao
    }]);
  };

  return (
    <>
      {/* --- FORMULÁRIO DO SOLICITANTE --- */}
      <div className="form-cartao">
        <div className="form-header">
          <div className="form-header-esquerda">
            <div className="form-header-icone"><User size={18} /></div>
            <h2>Dados do Solicitante</h2>
          </div>
        </div>
        
        <div className="form-grid">
          <div className="input-grupo">
            <label>NOME DO SOLICITANTE *</label>
            <input type="text" className="input-campo" placeholder="Seu nome completo" />
          </div>
          <div className="input-grupo">
            <label>WBS / CENTRO DE CUSTO *</label>
            <input type="text" className="input-campo" placeholder="Ex: WBS-PRJ-2024-001" />
          </div>
          <div className="input-grupo">
            <label><MapPin size={14} /> FILIAL DE ORIGEM</label>
            <div className="input-wrapper-fixo">
              <MapPin size={16} className="icone-dentro-input" />
              <input type="text" className="input-campo" value="BR04 — Goiana, PE" readOnly />
              <span className="badge-fixo">Fixo</span>
            </div>
          </div>
          <div className="input-grupo row-span-2">
            <label><MapPin size={14} /> DESTINO *</label>
            <textarea className="input-campo" placeholder="Local de destino do material"></textarea>
          </div>
          <div className="input-grupo">
            <label><Calendar size={14} /> DATA DE NECESSIDADE *</label>
            <input type="date" className="input-campo" />
          </div>
          <div className="input-grupo span-2">
            <label>OBSERVAÇÕES</label>
            <textarea className="input-campo" placeholder="Informações adicionais..." rows="2"></textarea>
          </div>
        </div>
      </div>

      {/* --- GRIDS DE SELEÇÃO EM FORMATO PLANILHA --- */}
      <div className="selecao-itens-grid">
        
        {/* COLUNA ESQUERDA: Estoque Disponível */}
        <div className="painel-lista">
          <div className="painel-lista-header">
            <h3>Estoque Disponível</h3>
            <span className="badge-contagem">{estoqueDisponivel.length} itens</span>
          </div>
          <div className="pesquisa-estoque">
            <Search size={18} className="icone-pesquisa-estoque" />
            <input type="text" placeholder="Buscar por SAP, PN, Descrição..." />
          </div>
          <div className="lista-rolavel">
            {estoqueDisponivel.map((item, index) => (
              <div key={index} className="item-estoque-card" onClick={() => adicionarManualmente(item, index)}>
                <strong className="item-pn">{item.numPecaFabricante}</strong>
                <p className="item-desc">{item.materialDescription}</p>
                <div className="item-rodape">
                  <span className="item-saldo">Saldo: <strong>{item.qtdFornecida} {item.unidadeMedida}</strong></span>
                  <span className="item-alocacao">{item.alocacao}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: NOVA TABELA ESTILO PLANILHA REAL */}
        <div className="painel-lista">
          <div className="painel-lista-header">
            <div className="titulo-com-icone">
              <Package size={18} /> Itens Selecionados
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CarregarArquivo 
                variante="botao"
                accept=".xlsx, .xls"
                label="Importar Excel"
                icone={<FileSpreadsheet size={16} color="#10b981" />}
                onFileSelect={(arquivo) => {
                  lerExcelParaItens(arquivo)
                    .then(novosItens => setItensSelecionados(prev => [...prev, ...novosItens]))
                    .catch(erro => alert(erro));
                }}
              />
              <span className="badge-contagem bg-branco">{itensSelecionados.length}/25</span>
            </div>
          </div>

          {itensSelecionados.length === 0 ? (
            <div className="estado-vazio-selecao">
              <Package size={48} strokeWidth={1} />
              <p>Clique nos itens à esquerda ou importe um Excel do SAP</p>
            </div>
          ) : (
            <div className="scroll-tabela-solicitacao">
              <table className="tabela-solicitacao-dados">
                <thead>
                  <tr>
                    <th>AÇÕES</th>
                    <th>MATERIAL DESCRIPTION</th>
                    <th>Nº PEÇA FABRICANTE</th>
                    <th>QTD. SOLICITADA</th>
                    <th>DESENHO SAP</th>
                    <th>FORNECEDOR</th>
                    <th>REFERÊNCIA</th>
                    <th>UNIDADE DE MEDIDA</th>
                    <th>VENDOR DESCRIPTION</th>
                    <th>WBS</th>
                    <th>EMISSÃO NF</th>
                    <th>RECEB. NF</th>
                    <th>DOCUMENTO DE COMPRAS</th>
                    <th>PO NET PRICE</th>
                    <th>CENTRO</th>
                    <th>DEPÓSITO</th>
                    <th>ALOCAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {itensSelecionados.map((item) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => removerItem(item.id)} className="btn-deletar-linha">
                          <Trash2 size={16} />
                        </button>
                      </td>
                      <td className="texto-preto" style={{ minWidth: '220px' }}>{item.materialDescription}</td>
                      <td><span className="badge-partnumber">{item.numPecaFabricante}</span></td>
                      <td className="qtd-solicitada-destaque">{item.qtdSelecionada}</td>
                      <td className="texto-cinza-claro">{item.desenhoSAP}</td>
                      <td className="texto-cinza-escuro">{item.fornecedor}</td>
                      <td className="texto-cinza">{item.referencia}</td>
                      <td className="texto-cinza">{item.unidadeMedida}</td>
                      <td className="texto-cinza-claro" style={{ minWidth: '180px' }}>{item.vendorDescription}</td>
                      <td><span className="link-azul-fake">{item.wbs}</span></td>
                      <td className="texto-cinza">{item.emissaoNF}</td>
                      <td className="texto-cinza">{item.recebNF}</td>
                      <td className="texto-cinza-escuro">{item.docCompras}</td>
                      <td className="texto-preto">{item.poNetPrice}</td>
                      <td className="texto-cinza">{item.centro}</td>
                      <td className="texto-cinza">{item.deposito}</td>
                      <td><span className="link-azul-fake">{item.alocacao}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* BOTÃO FINAL DE ENVIO */}
      <div className="form-acoes-final mt-4">
        <button className="btn-enviar-azul">
          <Send size={16} /> Enviar Solicitação
        </button>
      </div>
    </>
  );
}