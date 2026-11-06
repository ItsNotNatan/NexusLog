// =================================================================
// ARQUIVO: src/pages/Cliente/FazerSolicitacao/FazerSolicitacao.jsx
// DESCRIÇÃO: Menu de solicitações com as novas opções Robótica e General Stock
// =================================================================
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './FazerSolicitacao.css';

import { 
  Boxes, 
  ArrowLeftRight, 
  FileText, 
  PackagePlus, 
  Truck, 
  RefreshCcw, 
  XCircle,
  Cpu,      // ✨ NOVO ÍCONE: Para a secção de Robótica
  Archive   // ✨ NOVO ÍCONE: Para a secção de General Stock
} from 'lucide-react';

import MaterialEstoque from './MaterialEstoque'; 
import TransferenciaWBS from '../TransferenciaWBS/TransferenciaWBS';
import SolicitarNotaFiscal from '../SolicitarNotaFiscal/SolicitarNotaFiscal';
import EntradaMaterial from '../EntradaMaterial/EntradaMaterial';
import Crossdocking from '../Crossdocking/Crossdocking';
import ReintegracaoItens from '../ReintegracaoItens/ReintegracaoItens';
import CancelarPL from '../CancelarPL/CancelarPL';

// ✨ IMPORTAÇÃO DOS NOVOS MÓDULOS (Componentes que vamos criar a seguir)
import Robotica from '../Robotica/Robotica';
import GeneralStock from '../GeneralStock/GeneralStock';

import { AuthContext } from '../../../contexts/AuthContext';
import { useAlert } from '../../../contexts/AlertContext';

export default function FazerSolicitacao() {
  const [tipoAtivo, setTipoAtivo] = useState('material');
  const navigate = useNavigate();

  const { estoqueAtual, carregandoInicial } = useContext(AuthContext);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (!carregandoInicial) {
      if (estoqueAtual === 'TODOS') {
        showAlert(
          "Ação Restrita", 
          "Para realizar solicitações ou transferências, selecione uma filial específica no topo. Redirecionando...", 
          "warning"
        );
        navigate('/cliente/consulta-estoque');
      }
    }
  }, [estoqueAtual, navigate, showAlert, carregandoInicial]);

  // ✨ AQUI DEFINIMOS OS CARTÕES QUE APARECEM NO TOPO DA PÁGINA
  const tiposSolicitacao = [
    { id: 'material', titulo: 'Material de Estoque', desc: 'Retirada de itens do almoxarifado', icone: <Boxes size={20} /> },
    { id: 'transferencia', titulo: 'Transferência de WBS', desc: 'Mover material para outro projeto', icone: <ArrowLeftRight size={20} />, cor: 'amarelo' },
    { id: 'nf', titulo: 'Solicitar Nota Fiscal', desc: 'Emissão de nota fiscal', icone: <FileText size={20} />, cor: 'roxo' },
    { id: 'entrada', titulo: 'Entrada de Material', desc: 'Solicitar entrada no estoque', icone: <PackagePlus size={20} />, cor: 'verde' },
    { id: 'crossdocking', titulo: 'Crossdocking', desc: 'Saída via nota fiscal', icone: <Truck size={20} />, cor: 'ciano' },
    { id: 'reintegracao', titulo: 'Reintegração de Itens', desc: 'Devolver material ao estoque', icone: <RefreshCcw size={20} />, cor: 'laranja' },
    { id: 'cancelar', titulo: 'Cancelar PL', desc: 'Cancelar Packing List emitido', icone: <XCircle size={20} />, cor: 'vermelho' },
    
    // ✨ NOVOS CARTÕES ADICIONADOS
    { id: 'robotica', titulo: 'Robótica', desc: 'Solicitações de equipamentos de robótica', icone: <Cpu size={20} />, cor: 'rosa' },
    { id: 'general_stock', titulo: 'General Stock', desc: 'Solicitações de estoque geral', icone: <Archive size={20} />, cor: 'cinza' }
  ];

  if (carregandoInicial || estoqueAtual === 'TODOS') {
    return null; 
  }

  return (
    <div className="solicitacao-wrapper">
      <header className="solicitacao-cabecalho">
        <div className="cabecalho-topo">
          <div>
            <h1>Fazer Solicitação</h1>
            <p>Escolha o tipo de solicitação que deseja realizar</p>
          </div>
        </div>
      </header>

      <div className="tipos-container">
        {tiposSolicitacao.map((tipo) => {
          let classeCartao = 'tipo-cartao';
          
          if (tipoAtivo === tipo.id) {
            classeCartao += tipo.cor ? ` ativo-${tipo.cor}` : ' ativo';
          }

          return (
            <div 
              key={tipo.id} 
              className={classeCartao}
              onClick={() => setTipoAtivo(tipo.id)}
            >
              <div className="tipo-icone">{tipo.icone}</div>
              <div className="tipo-titulo">{tipo.titulo}</div>
              <div className="tipo-desc">{tipo.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="conteudo-dinamico">
        {/* A propriedade key={estoqueAtual} obriga o React a resetar o estado interno (carrinho) do componente sempre que a filial muda */}
        {tipoAtivo === 'material' && <MaterialEstoque key={`mat-${estoqueAtual}`} />}
        {tipoAtivo === 'transferencia' && <TransferenciaWBS key={`trans-${estoqueAtual}`} />}
        {tipoAtivo === 'nf' && <SolicitarNotaFiscal key={`nf-${estoqueAtual}`} />}
        {tipoAtivo === 'entrada' && <EntradaMaterial key={`ent-${estoqueAtual}`} />}
        {tipoAtivo === 'crossdocking' && <Crossdocking key={`cross-${estoqueAtual}`} />}
        {tipoAtivo === 'reintegracao' && <ReintegracaoItens key={`reint-${estoqueAtual}`} />}
        {tipoAtivo === 'cancelar' && <CancelarPL key={`canc-${estoqueAtual}`} />}
        
        {/* ✨ RENDERIZAÇÃO DOS NOVOS COMPONENTES */}
        {tipoAtivo === 'robotica' && <Robotica key={`robo-${estoqueAtual}`} />}
        {tipoAtivo === 'general_stock' && <GeneralStock key={`gen-${estoqueAtual}`} />}
      </div>
    </div>
  );
}
