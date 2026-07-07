import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginLogistica.css';
import { Hexagon, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient'; // Usa a sua conexão centralizada
import BotaoAcaoGlobal from '../../components/BotaoAcaoGlobal/BotaoAcaoGlobal';

export default function LoginLogistica() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      // 1. Faz a autenticação padrão do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      });

      if (authError) throw new Error('Email ou senha incorretos.');

      const user = authData.user;

      // 2. BUSCA O PERFIL DO USUÁRIO NA TABELA PARA VALIDAR O CARGO
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('cargo')
        .eq('id', user.id)
        .single();

      if (perfilError || !perfil) {
        await supabase.auth.signOut();
        throw new Error('Erro ao validar perfil de acesso.');
      }

      // Validação crucial: Verifica se é ADM ou OPERADOR (os cargos definidos no seu routes.jsx)
      if (perfil.cargo !== 'ADM' && perfil.cargo !== 'OPERADOR') {
        await supabase.auth.signOut(); // Desloga o penetra (ex: um 'CLIENTE')
        throw new Error('Acesso negado. Esta área é exclusiva para a equipe de Logística.');
      }

      // 3. Se passou em tudo, o seu AuthContext (que está no main.jsx) vai detectar a mudança de sessão sozinho!
      // Só precisamos redirecionar para o painel.
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
          <div className="login-logo-icone">
            <Hexagon size={32} />
          </div>
          <h2>NexusLog</h2>
          <p>Controle Operacional &bull; Back-Office</p>
        </div>

        {erro && (
          <div className="login-erro-banner">
            <AlertCircle size={18} />
            <span>{erro}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          
          <div className="input-grupo">
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>
              EMAIL CORPORATIVO
            </label>
            <div className="input-login-wrapper">
              <Mail className="input-login-icone" size={18} />
              <input 
                type="email" 
                className="input-login-campo" 
                placeholder="nome.sobrenome@comau.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-grupo">
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '8px', display: 'block' }}>
              SENHA DE ACESSO
            </label>
            <div className="input-login-wrapper">
              <Lock className="input-login-icone" size={18} />
              <input 
                type="password" 
                className="input-login-campo" 
                placeholder="••••••••"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <BotaoAcaoGlobal 
              texto="Acessar Logística" 
              icone={<ArrowRight size={18} />} 
              cor="azul" 
              onClick={handleLogin}
              carregando={carregando}
            />
          </div>

        </form>

      </div>
    </div>
  );
}