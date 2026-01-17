import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';

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

  // --- NOVA FUNÇÃO: RECUPERAÇÃO DE SENHA ---
  const handleRecovery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/profile', // Redireciona para o Perfil para trocar a senha
        });

        if (error) throw error;

        setSuccessMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada (e spam).");
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
      
      <div className="center mb-4" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        
        {/* --- LOGO DO APP --- */}
        <img 
            src="/logo.png" 
            alt="Logo Tryly" 
            style={{
                width: '100px',
                height: 'auto', 
                marginBottom: '15px',
                borderRadius: '12px'
            }} 
        />

        <p style={{fontSize: '1rem', color: '#1e293b', fontWeight: '600', marginBottom: 5}}>
          {isRecovery ? 'Recuperar Acesso' : 'Um passo real por dia.'}
        </p>
        
        {isRecovery && (
            <p style={{fontSize: '0.85rem', color: '#64748B', maxWidth: '300px'}}>
                Digite seu e-mail para receber um link de definição de nova senha.
            </p>
        )}
      </div>

      {/* --- FORMULÁRIO (Alterna entre Login e Recovery) --- */}
      <form onSubmit={isRecovery ? handleRecovery : handleAuth} style={{marginTop: 20}}>
        
        {/* CARD DE ERRO */}
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

        {/* CARD DE SUCESSO (Recuperação) */}
        {successMsg && (
            <div style={{
                background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', 
                padding: '12px', borderRadius: 8, marginBottom: 15, fontSize: '0.9rem',
                textAlign: 'left'
            }}>
                <span>{successMsg}</span>
            </div>
        )}

        {isSignUp && !isRecovery && (
          <input 
            type="text" placeholder="Seu Nome" required
            value={fullName} onChange={e => setFullName(e.target.value)}
          />
        )}
        
        <input 
          type="email" placeholder="Email" required
          value={email} onChange={e => setEmail(e.target.value)}
        />
        
        {!isRecovery && (
            <input 
            type="password" placeholder="Senha" required
            value={password} onChange={e => setPassword(e.target.value)}
            />
        )}

        <button type="submit" disabled={loading} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
          {loading ? 'Processando...' : (
              isRecovery ? <><Mail size={18}/> Enviar Link</> : 
              (isSignUp ? 'Aceitar o Desafio' : 'Entrar na Conta')
          )}
        </button>
      </form>

      {/* --- BOTÕES AUXILIARES --- */}
      
      {/* Botão Voltar (Aparece só na recuperação) */}
      {isRecovery ? (
          <div className="center mt-4">
            <button 
                className="outline" 
                style={{border: 'none', color: '#64748B', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5}} 
                onClick={() => {setIsRecovery(false); setErrorMsg(null); setSuccessMsg(null);}}
            >
                <ArrowLeft size={16} /> Voltar para Login
            </button>
          </div>
      ) : (
          /* Links de Login Normal */
          <>
            <div className="center mt-3">
                <button 
                    className="outline" 
                    style={{border: 'none', color: '#64748B', fontSize: '0.85rem', textDecoration: 'underline'}} 
                    onClick={() => {setIsRecovery(true); setErrorMsg(null); setEmail('');}}
                >
                    Esqueci minha senha
                </button>
            </div>

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
            </div>

            <div className="center mt-4">
                <button className="outline" style={{border: 'none', color: '#64748B', fontSize: '0.9rem'}} onClick={() => {setIsSignUp(!isSignUp); setErrorMsg(null);}}>
                {isSignUp ? 'Já tem conta? Entrar' : 'Criar nova conta'}
                </button>
            </div>
          </>
      )}

      {/* --- SEO FOOTER (Para o Google indexar o conteúdo) --- */}
      <footer style={{marginTop: 50, padding: 20, borderTop: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.8rem', maxWidth: 600}}>
        <h3 style={{fontSize: '1rem', color: '#334155', marginBottom: 10}}>O que é o Tryly?</h3>
        <p style={{marginBottom: 10}}>
          O Tryly é a primeira plataforma de <strong>desenvolvimento pessoal gamificado</strong> focada 100% em ação. 
          Ao contrário de cursos tradicionais, aqui você ganha <strong>XP (Experiência)</strong> completando missões na vida real.
        </p>
        <p style={{marginBottom: 10}}>
          Supere a procrastinação, suba no <strong>ranking entre amigos</strong> e conquiste selos de habilidade. 
          Junte-se a uma comunidade de fundadores e protagonistas que buscam evolução constante.
        </p>
        <p style={{marginTop: 20, opacity: 0.8}}>
          © 2026 Tryly App. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}