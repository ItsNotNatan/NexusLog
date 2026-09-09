import React from 'react';
import { Paperclip, X } from 'lucide-react';
import CarregarArquivo from '../CarregarArquivo/CarregarArquivo';

export default function GerenciadorAnexos({ anexos, setAnexos, titulo = "ANEXOS (OPCIONAL)" }) {
  
  // Função executada quando o CarregarArquivo nos entrega um novo documento
  const handleAnexar = (arquivo) => {
    // Pega em todos os anexos antigos (...anexos) e junta o novo arquivo no final
    setAnexos([...anexos, arquivo]);
  };

  // Função executada quando clicamos no 'X' de um ficheiro
  const removerAnexo = (indexRemover) => {
    // O filter vai criar uma nova lista, ignorando o ficheiro que tem a mesma posição (index) que queremos apagar
    setAnexos(anexos.filter((_, index) => index !== indexRemover));
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
          {titulo}
        </span>
      </div>

      {/* Componente responsável pelo botão de Upload real */}
      <CarregarArquivo 
        variante="botao"
        accept=".pdf, .jpg, .jpeg, .png, .xlsx, .csv"
        label="Adicionar Arquivo"
        icone={<Paperclip size={16} />}
        onFileSelect={handleAnexar} // Quando o ficheiro é escolhido, chama a nossa função
      />

      {/* Só mostra esta secção se a lista de anexos tiver 1 ou mais ficheiros */}
      {anexos.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Percorre cada arquivo na lista para criar a sua caixinha visual */}
          {anexos.map((arquivo, index) => (
            <div 
              key={index} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px', 
                border: '1px solid #e2e8f0', width: 'fit-content', minWidth: '300px', maxWidth: '100%' 
              }}
            >
              <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {arquivo.name} {/* Mostra o nome do ficheiro */}
              </span>
              
              {/* Botão de apagar ficheiro */}
              <button 
                onClick={() => removerAnexo(index)} 
                type="button" // type="button" evita que submeta formulários acidentalmente
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '12px' }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}