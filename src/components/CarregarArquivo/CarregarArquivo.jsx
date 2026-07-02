import React, { useState, useRef } from 'react';
import './CarregarArquivo.css';
import { Upload, FilePlus } from 'lucide-react';

export default function CarregarArquivo({ 
  onFileSelect, 
  accept = "*", 
  label = "Clique ou arraste um arquivo", 
  variante = "area", // Pode ser "area" ou "botao"
  icone // Ícone customizado opcional
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Previne o comportamento padrão do navegador que é abrir o ficheiro
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Quando o ficheiro é largado na área
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file); // Envia o ficheiro para o componente "Pai"
    }
  };

  // Quando o utilizador clica e seleciona o ficheiro
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file); // Envia o ficheiro para o componente "Pai"
    }
    // Limpa o input para permitir selecionar o mesmo ficheiro novamente, se necessário
    e.target.value = null;
  };

  // O Input nativo fica escondido e é usado em ambas as variantes
  const InputEscondido = () => (
    <input 
      type="file" 
      accept={accept}
      className="input-escondido"
      ref={fileInputRef}
      onChange={handleFileChange}
    />
  );

  // RENDERIZAR A VERSÃO BOTÃO
  if (variante === 'botao') {
    return (
      <button 
        className="upload-botao" 
        onClick={() => fileInputRef.current.click()}
        type="button"
      >
        <InputEscondido />
        {icone ? icone : <FilePlus size={16} />}
        {label}
      </button>
    );
  }

  // RENDERIZAR A VERSÃO ÁREA (Dropzone)
  return (
    <div 
      className={`upload-area ${isDragging ? 'arrastando' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current.click()}
    >
      <InputEscondido />
      {icone ? icone : <Upload size={24} className="icone" />}
      <span className="upload-texto">{label}</span>
    </div>
  );
}