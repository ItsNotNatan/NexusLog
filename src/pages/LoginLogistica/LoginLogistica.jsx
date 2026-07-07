import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginLogistica.css';
import { Hexagon, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';
import { useAuth } from '../../contexts/AuthContext'; // Importamos o novo hook!

export default function LoginLogistica() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  
  const navigate = useNavigate();
  const { loginManual } = useAuth(); // Puxa a função de login

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      // 1. Busca direto na sua tabela 'usuarios'
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', senha)
        .single();

      if (error || !data) {
        throw new Error('Email ou senha incorretos.');
      }

      // 2. Verifica se o cargo é da Logística
      if (data.cargo !== 'ADM' && data.cargo !== 'OPERADOR') {
        throw new Error('Acesso negado. Área exclusiva para Logística.');
      }

      // 3. Salva no nosso contexto novo e entra no sistema!
      loginManual(data);
      navigate('/logistica/painel');

    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        
        <div className="login-logo-seccao">
          <div className="login-logo-icone"><Hexagon size={32} /></div>
          <h2>NexusLog</h2>
          <p>Controle Operacional &bull; Back-Office</p>
        </div>

        {erro && (
          <div className="login-erro-banner">
            <AlertCircle size={18} /><span>{erro}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-grupo">
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>EMAIL CORPORATIVO</label>
            <div className="input-login-wrapper">
              <Mail className="input-login-icone" size={18} />
              <input type="email" className="input-login-campo" placeholder="nome.sobrenome@comau.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="input-grupo">
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>SENHA DE ACESSO</label>
            <div className="input-login-wrapper">
              <Lock className="input-login-icone" size={18} />
              <input type="password" className="input-login-campo" placeholder="••••••••" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <BotaoAcaoGlobal texto="Acessar Logística" icone={<ArrowRight size={18} />} cor="azul" onClick={handleLogin} carregando={carregando} />
          </div>
        </form>

      </div>
    </div>
  );
}