import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, ArrowLeft } from 'lucide-react';

// Ícone do Google
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false); 
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null); 

  useEffect(() => {
    document.title = "Tryly | Treino comportamental para ação e decisão real.";
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

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
        if (result.error.message.includes("Invalid login")) {
          throw new Error("Email ou senha incorretos.");
        } else if (result.error.message.includes("User already registered")) {
          throw new Error("Este email já está cadastrado.");
        } else {
          throw new Error(result.error.message);
        }
      } 
      
      if (isSignUp && !result.error) {
        if (result.data?.user?.identities?.length === 0) {
            throw new Error("Este email já existe.");
        }
        alert("Cadastro realizado! Faça login.");
        setIsSignUp(false);
      }

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/profile',
        });

        if (error) throw error;
        setSuccessMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
        setEmail(''); 
    } catch (error) {
        setErrorMsg("Erro ao enviar e-mail: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: window.location.origin }
    });
    if (error) setErrorMsg("Erro ao conectar com " + provider);
    setLoading(false);
  };

  return (
    <div style={{display: 'flex', minHeight: '100vh', flexDirection: 'row', flexWrap: 'wrap'}}>
      
      {/* --- COLUNA ESQUERDA: CONCEITO --- */}
      <div style={{
          flex: '1 1 500px', 
          background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)', 
          padding: '60px 40px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          color: '#fff',
          position: 'relative'
      }}>
          <div style={{maxWidth: 600, margin: '0 auto'}}>
            
             {/* LOGO NO TOPO */}
             <div style={{marginBottom: 30}}>
                <img 
                  src="/logo.png" 
                  alt="Tryly" 
                  style={{width: 100, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.2)'}} 
                />
             </div>

             <h1 style={{fontSize: '2.8rem', lineHeight: '1.1', fontWeight: '800', marginBottom: 25}}>
                O Tryly é um sistema de treino comportamental.
             </h1>
             
             {/* TEXTO ATUALIZADO */}
             <p style={{fontSize: '1.2rem', color: '#E9D5FF', lineHeight: '1.6', marginBottom: 30}}>
                Aqui você age, lê a realidade e <strong>toma decisões</strong> que sustentam no dia a dia.
             </p>

             <div style={{borderLeft: '4px solid #fff', paddingLeft: 20}}>
                 <p style={{fontSize: '1.4rem', fontWeight: 'bold', margin: 0, opacity: 0.9}}>Não é motivação.</p>
                 <p style={{fontSize: '1.4rem', fontWeight: 'bold', color: '#fff', margin: 0}}>É prática.</p>
             </div>
          </div>
      </div>

      {/* --- COLUNA DIREITA: FORMULÁRIO (MANTIDO) --- */}
      <div style={{
          flex: '1 1 450px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '40px',
          background: '#F8FAFC'
      }}>
        <div style={{width: '100%', maxWidth: '400px'}}>
            
            <div style={{textAlign: 'center', marginBottom: 30}}>
                {/* Logo menor para mobile/formulário também, caso queira manter identidade visual */}
                <h2 style={{fontSize: '1.5rem', color: '#1e293b', marginBottom: 5}}>
                    {isRecovery ? 'Recuperar Acesso' : (isSignUp ? 'Crie sua conta' : 'Acesse a plataforma')}
                </h2>
                <p style={{color: '#64748B'}}>
                    {isRecovery ? 'Enviaremos um link para você.' : 'Continue sua evolução.'}
                </p>
            </div>

            <form onSubmit={isRecovery ? handleRecovery : handleAuth}>
                
                {errorMsg && (
                    <div style={{background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px', borderRadius: 8, marginBottom: 15, fontSize: '0.9rem', display: 'flex', gap: 10}}>
                        <AlertCircle size={20} /> <span>{errorMsg}</span>
                    </div>
                )}
                
                {successMsg && (
                    <div style={{background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '12px', borderRadius: 8, marginBottom: 15}}>
                        {successMsg}
                    </div>
                )}

                {isSignUp && !isRecovery && (
                <div style={{marginBottom: 15}}>
                    <input type="text" placeholder="Seu Nome" required value={fullName} onChange={e => setFullName(e.target.value)} style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1'}} />
                </div>
                )}
                
                <div style={{marginBottom: 15}}>
                    <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1'}} />
                </div>
                
                {!isRecovery && (
                    <div style={{marginBottom: 15}}>
                        <input type="password" placeholder="Senha" required value={password} onChange={e => setPassword(e.target.value)} style={{width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1'}} />
                    </div>
                )}

                <button type="submit" disabled={loading} style={{width: '100%', padding: 12, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1}}>
                {loading ? 'Processando...' : (isRecovery ? 'Enviar Link' : (isSignUp ? 'Cadastrar' : 'Entrar'))}
                </button>
            </form>

            {!isRecovery && (
                <>
                    <div style={{display: 'flex', alignItems: 'center', margin: '20px 0', color: '#94a3b8'}}>
                        <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
                        <span style={{padding: '0 10px', fontSize: '0.7rem'}}>OU</span>
                        <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
                    </div>

                    <button type="button" onClick={() => handleSocialLogin('google')} style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', background: '#fff', color: '#333', border: '1px solid #E2E8F0', fontWeight: '600', padding: '12px', borderRadius: 8, cursor: 'pointer'}}>
                        <GoogleIcon /> Google
                    </button>
                </>
            )}

            <div style={{marginTop: 20, textAlign: 'center', fontSize: '0.9rem'}}>
                {isRecovery ? (
                     <button onClick={() => {setIsRecovery(false); setErrorMsg(null);}} style={{background: 'transparent', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%', cursor: 'pointer'}}>
                        <ArrowLeft size={16} /> Voltar
                     </button>
                ) : (
                    <>
                        <button onClick={() => {setIsRecovery(true); setErrorMsg(null);}} style={{background: 'transparent', border: 'none', color: '#64748B', textDecoration: 'underline', cursor: 'pointer', marginBottom: 10}}>Esqueci a senha</button>
                        <br/>
                        <button onClick={() => {setIsSignUp(!isSignUp); setErrorMsg(null);}} style={{background: 'transparent', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer'}}>
                            {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se'}
                        </button>
                    </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}