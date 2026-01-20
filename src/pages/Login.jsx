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
    <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: "'Inter', sans-serif"}}>
      
      {/* --- PARTE SUPERIOR (ROXA) --- */}
      <div style={{
          background: '#6d28d9',
          padding: '40px 30px 60px 30px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
      }}>
          
          {/* HEADER LOGO BRANCO */}
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30}}>
              <div style={{
                  background: 'rgba(255,255,255,0.15)', 
                  width: 40, height: 40, 
                  borderRadius: 10, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                  {/* FILTRO PARA DEIXAR BRANCO */}
                  <img src="/logo.png" alt="Logo" style={{width: 24, height: 24, objectFit: 'contain', filter: 'brightness(0) invert(1)'}} />
              </div>
              <span style={{color: '#fff', fontWeight: 'bold', fontSize: '1.2rem'}}>Tryly</span>
          </div>

          <h1 style={{
              fontSize: '2.5rem', 
              lineHeight: '1.1', 
              fontWeight: '900', 
              marginBottom: 20, 
              color: '#1a1a1a' 
          }}>
             O Tryly é um sistema de treino comportamental.
          </h1>
          
          <p style={{fontSize: '1.1rem', color: '#f3f4f6', lineHeight: '1.5', marginBottom: 35, maxWidth: '90%'}}>
             Aqui você age, lê a realidade e <strong>toma decisões</strong> que sustentam no dia a dia.
          </p>

          {/* BARRA LATERAL */}
          <div style={{
             display: 'flex',
             flexDirection: 'column',
             borderLeft: '4px solid #fff',
             paddingLeft: 15
          }}>
             {/* VOLTANDO PARA CINZA */}
             <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#9ca3af'}}>Não é motivação.</span>
             <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#fff'}}>É prática.</span>
          </div>
      </div>

      {/* --- PARTE INFERIOR (BRANCA - FORMULÁRIO) --- */}
      <div style={{
          flex: 1, 
          background: '#fff', 
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
      }}>
          
          {/* LOGO ACIMA DO TÍTULO */}
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 20}}>
              <img src="/logo.png" alt="Logo" style={{width: 100, height: 100, objectFit: 'contain'}} />
          </div>

          <h2 style={{fontSize: '1.5rem', color: '#1e293b', marginBottom: 5, fontWeight: '800'}}>
              {isRecovery ? 'Recuperar Acesso' : 'Acesse a plataforma'}
          </h2>
          <p style={{color: '#64748B', fontSize: '0.95rem', marginBottom: 30}}>
              {isRecovery ? 'Enviaremos um código.' : 'Continue sua evolução.'}
          </p>

          <div style={{width: '100%', maxWidth: 400}}>
              <form onSubmit={isRecovery ? handleRecovery : handleAuth} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                  
                  {errorMsg && (
                      <div style={{background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px', borderRadius: 8, fontSize: '0.9rem', display: 'flex', gap: 10}}>
                          <AlertCircle size={20} /> <span>{errorMsg}</span>
                      </div>
                  )}
                  
                  {successMsg && (
                      <div style={{background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '12px', borderRadius: 8}}>
                          {successMsg}
                      </div>
                  )}

                  {isSignUp && !isRecovery && (
                      <div>
                          <input type="text" placeholder="Nome" required value={fullName} onChange={e => setFullName(e.target.value)} style={{width: '100%', padding: '16px', borderRadius: 12, border: '1px solid #E2E8F0', outline: 'none', fontSize: '1rem'}} />
                      </div>
                  )}
                  
                  <div>
                      <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={{width: '100%', padding: '16px', borderRadius: 12, border: '1px solid #E2E8F0', outline: 'none', fontSize: '1rem'}} />
                  </div>
                  
                  {!isRecovery && (
                      <div>
                          <input type="password" placeholder="Senha" required value={password} onChange={e => setPassword(e.target.value)} style={{width: '100%', padding: '16px', borderRadius: 12, border: '1px solid #E2E8F0', outline: 'none', fontSize: '1rem'}} />
                      </div>
                  )}

                  {!isRecovery && (
                      <div style={{textAlign: 'center', marginTop: 10}}>
                         <button type="button" onClick={() => {setIsRecovery(true); setErrorMsg(null);}} style={{background: 'transparent', border: 'none', color: '#64748B', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer'}}>
                            Esqueceu sua senha?
                         </button>
                      </div>
                  )}

                  <button type="submit" disabled={loading} style={{marginTop: 10, width: '100%', padding: '16px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1}}>
                  {loading ? 'Carregando...' : (isRecovery ? 'Enviar Link' : (isSignUp ? 'Cadastrar' : 'Entrar'))}
                  </button>
              </form>

              {!isRecovery && (
                  <>
                      <div style={{display: 'flex', alignItems: 'center', margin: '25px 0', color: '#94a3b8'}}>
                          <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
                          <span style={{padding: '0 10px', fontSize: '0.75rem', textTransform: 'uppercase'}}>OU</span>
                          <div style={{flex: 1, height: 1, background: '#e2e8f0'}}></div>
                      </div>

                      <button type="button" onClick={() => handleSocialLogin('google')} style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', background: '#fff', color: '#333', border: '1px solid #E2E8F0', fontWeight: 'bold', padding: '16px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}>
                          <GoogleIcon /> Google
                      </button>

                      <div style={{marginTop: 30, textAlign: 'center'}}>
                          <button onClick={() => {setIsSignUp(!isSignUp); setErrorMsg(null);}} style={{background: 'transparent', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem'}}>
                              {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastre-se'}
                          </button>
                      </div>
                  </>
              )}
              
              {isRecovery && (
                  <div style={{marginTop: 20, textAlign: 'center'}}>
                       <button onClick={() => {setIsRecovery(false); setErrorMsg(null);}} style={{background: 'transparent', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', margin: '0 auto'}}>
                          <ArrowLeft size={18} /> Voltar
                       </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}