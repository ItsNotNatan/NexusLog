import React from 'react';
import { Database, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useAlert } from '../../../../contexts/AlertContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useProcessadorExcel } from '../../../../hooks/useProcessadorExcel';
import { apiFetch } from '../../../../services/api';
import ModalProcessamento from '../../../../components/ModalProcessamento/ModalProcessamento';
import CarregarArquivo from '../../../../components/CarregarArquivo/CarregarArquivo';
import ExemploExcel from '../../../../components/ExemploExcel/ExemploExcel';

export default function ImportarEstoqueBase() {
  const { showAlert } = useAlert();
  const { usuario } = useAuth();

  const {
    estaProcessando, concluido, estadoProgresso, resultado, erroFatal,
    iniciarProcessamento, resetarProcessador
  } = useProcessadorExcel();

  const handleImportar = async (arquivo) => {
    const confirm = await showAlert(
      "Importar Base Completa?", 
      `Deseja processar e importar o ficheiro "${arquivo.name}" para a base de dados do estoque?`, 
      "warning", "Sim, Importar"
    );
    
    if (!confirm) return;

    try {
      const itensPlanilha = await iniciarProcessamento(arquivo);
      if (!itensPlanilha || itensPlanilha.length === 0) return;

      // Chama a API de Entrada para registrar os materiais em massa
      const dadosEnvio = {
        solicitante: {
          nome: usuario.nome_completo || 'Sistema de Importação',
          filial_id: usuario.filial_padrao_id || 'BR04',
          wbs: '-',
          observacoes: 'Carga Base (Importação Excel)'
        },
        itens: itensPlanilha,
        anexos: []
      };

      const res = await apiFetch('/solicitacoes/entrada', {
        method: 'POST',
        body: JSON.stringify(dadosEnvio)
      });

      if (!res.sucesso) {
        throw new Error(res.erro || "Falha ao gravar no banco.");
      }

    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="aba-conteudo" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      <ModalProcessamento 
        estaProcessando={estaProcessando} concluido={concluido}
        estadoProgresso={estadoProgresso} resultado={resultado}
        erroFatal={erroFatal} onClose={resetarProcessador}
      />

      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} color="#2563eb" /> Carga Inicial de Estoque
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
          Utilize esta ferramenta apenas para carregar o estoque físico inicial de uma filial inteira a partir de uma planilha Excel padronizada.
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
              <li>A importação é processada em blocos para não sobrecarregar o servidor. Não feche a janela durante o progresso.</li>
            </ul>
            <div style={{ marginTop: '12px' }}>
              <ExemploExcel />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
