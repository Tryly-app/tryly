import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, XCircle } from 'lucide-react'; // Ícones para o erro

// Ícones Oficiais (Mantidos)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
  </svg>
);

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  
  // NOVO: Estado para mensagem de erro
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null); // Limpa erro anterior

    try {
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
        // Traduzindo erros comuns do Supabase para português amigável
        if (result.error.message.includes("Invalid login")) {
          throw new Error("Email ou senha incorretos.");
        } else if (result.error.message.includes("User already registered")) {
          throw new Error("Este email já está cadastrado.");
        } else {
          throw new Error(result.error.message);
        }
      } 
      
      if (isSignUp && !result.error) {
        // Sucesso no cadastro (mas verifica se precisa confirmar email)
        if (result.data?.user?.identities?.length === 0) {
            throw new Error("Este email já existe.");
        }
        alert("Cadastro realizado! Faça login."); // Aqui pode ser alert simples pois é sucesso
        setIsSignUp(false);
      }

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
        setErrorMsg("Erro ao conectar com " + provider);
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{justifyContent: 'center', textAlign: 'center'}}>
      
      <div className="center mb-4">
        <h1 style={{letterSpacing: '-2px', fontSize: '3rem', marginBottom: 5}}>TRYLY</h1>
        <p style={{fontSize: '1rem', color: '#1e293b', fontWeight: '600', marginBottom: 5}}>
          Acelerador de Protagonismo
        </p>
        <p style={{fontSize: '0.85rem', color: '#64748B', maxWidth: '300px', margin: '0 auto'}}>
          Saia da fila da mediocridade. O foco é a tentativa, não a perfeição.
        </p>
      </div>

      <form onSubmit={handleAuth} style={{marginTop: 20}}>
        
        {/* CARD DE ERRO (Só aparece se houver erro) */}
        {errorMsg && (
            <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', 
                padding: '12px', borderRadius: 8, marginBottom: 15, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left'
            }}>
                <AlertCircle size={20} style={{minWidth: 20}} />
                <span>{errorMsg}</span>
            </div>
        )}

        {isSignUp && (
          <input 
            type="text" placeholder="Seu Nome de Herói" required
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
          {loading ? 'Processando...' : (isSignUp ? 'Aceitar o Desafio' : 'Entrar no Sistema')}
        </button>
      </form>

      <div style={{display: 'flex', alignItems: 'center', margin: '25px 0', color: '#94a3b8'}}>
        <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
        <span style={{padding: '0 10px', fontSize: '0.7rem', fontWeight: 'bold'}}>ACESSO RÁPIDO</span>
        <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
      </div>

      <div style={{display: 'flex', gap: '12px', flexDirection: 'column'}}>
        <button 
            type="button" 
            onClick={() => handleSocialLogin('google')}
            style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
                background: '#fff', color: '#333', border: '1px solid #E2E8F0',
                fontWeight: '600', padding: '12px'
            }}
        >
            <GoogleIcon /> Continuar com Google
        </button>
        
        <button 
            type="button" 
            onClick={() => handleSocialLogin('apple')}
            style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
                background: '#000', color: '#fff', border: '1px solid #000',
                fontWeight: '600', padding: '12px'
            }}
        >
            <AppleIcon /> Continuar com Apple
        </button>
      </div>

      <div className="center mt-4">
        <button className="outline" style={{border: 'none', color: '#64748B', fontSize: '0.9rem'}} onClick={() => {setIsSignUp(!isSignUp); setErrorMsg(null);}}>
          {isSignUp ? 'Já tem conta? Entrar' : 'Criar nova conta'}
        </button>
      </div>
    </div>
  );
}