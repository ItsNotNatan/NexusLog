import React, { useState, useRef } from 'react';
import './CarregarArquivo.css';
import { Upload, FilePlus } from 'lucide-react';

export default function CarregarArquivo({ 
  onFileSelect, 
  accept = "*", 
  label = "Clique ou arraste um arquivo", 
  variante = "area", 
  icone 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // --- EVENTOS DE DRAG & DROP ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file); 
    }
  };

  // --- EVENTOS DE CLIQUE E SELEÇÃO ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file); 
    }
    // Reseta o input para permitir selecionar o mesmo ficheiro duas vezes seguidas
    e.target.value = ''; 
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // ==========================================
  // RENDERIZAR A VERSÃO: BOTÃO
  // ==========================================
  if (variante === 'botao') {
    return (
      <button 
        className="upload-botao" 
        onClick={handleClick}
        type="button"
      >
        <input 
          type="file" 
          accept={accept}
          className="input-escondido"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        {icone ? icone : <FilePlus size={16} />}
        {label}
      </button>
    );
  }

  // ==========================================
  // RENDERIZAR A VERSÃO: ÁREA (Dropzone)
  // ==========================================
  return (
    <div 
      className={`upload-area ${isDragging ? 'arrastando' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input 
        type="file" 
        accept={accept}
        className="input-escondido"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {icone ? icone : <Upload size={24} className="icone" />}
      <span className="upload-texto">{label}</span>
    </div>
  );
}