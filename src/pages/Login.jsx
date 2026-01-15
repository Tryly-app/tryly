import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Chrome, Apple } from 'lucide-react'; // Ícones para os botões

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (isSignUp) {
      result = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
      alert(result.error.message);
    } else if (isSignUp) {
      alert("Cadastro realizado! Verifique seu email para confirmar (se configurado) ou faça login.");
      setIsSignUp(false); // Volta para tela de login
    }
    setLoading(false);
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });
    if (error) alert("Erro ao conectar: " + error.message);
    setLoading(false);
  };

  return (
    <div className="container" style={{justifyContent: 'center'}}>
      <div className="center mb-4">
        <h1 style={{letterSpacing: '-1px'}}>TRYLY</h1>
        <p>Ação supera a teoria. Comece sua trilha.</p>
      </div>

      <form onSubmit={handleAuth}>
        {isSignUp && (
          <input 
            type="text" placeholder="Seu Nome" required
            value={fullName} onChange={e => setFullName(e.target.value)}
          />
        )}
        <input 
          type="email" placeholder="Email" required
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input 
          type="password" placeholder="Senha" required
          value={password} onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar com Email')}
        </button>
      </form>

      {/* DIVISOR */}
      <div style={{display: 'flex', alignItems: 'center', margin: '20px 0', color: '#94a3b8'}}>
        <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
        <span style={{padding: '0 10px', fontSize: '0.8rem'}}>OU CONTINUAR COM</span>
        <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
      </div>

      {/* BOTÕES SOCIAIS */}
      <div style={{display: 'flex', gap: '10px', flexDirection: 'column'}}>
        <button 
            type="button" 
            className="outline" 
            onClick={() => handleSocialLogin('google')}
            style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: '#333', borderColor: '#cbd5e1'}}
        >
            <Chrome size={18} /> Google
        </button>
        
        {/* Apple requer configuração complexa, geralmente deixamos oculto em dev ou visual apenas */}
        <button 
            type="button" 
            className="outline" 
            onClick={() => handleSocialLogin('apple')}
            style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: '#333', borderColor: '#cbd5e1'}}
        >
            <Apple size={18} /> Apple
        </button>
      </div>

      <div className="center mt-4">
        <button className="outline" style={{border: 'none', color: 'var(--primary)'}} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Já tenho conta? Entrar' : 'Não tem conta? Cadastre-se'}
        </button>
      </div>
    </div>
  );
}