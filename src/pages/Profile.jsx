import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, Save, History, Copy, Check, LogOut } from 'lucide-react';

export default function Profile({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false); // Novo estado para o botão de sair
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Estado para feedback visual de cópia
  const [copied, setCopied] = useState(false); 
  
  // Estados do Formulário
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    // 1. Busca dados do perfil
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`);
    }

    // 2. Busca histórico
    const { data: historyData } = await supabase.from('reflections').select('*, missions(title, attribute)').eq('user_id', session.user.id).order('created_at', { ascending: false });
    
    setHistory(historyData || []);
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      setMsg(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Selecione uma imagem para upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      setMsg({ type: 'success', text: 'Imagem carregada! Clique em Salvar para confirmar.' });

    } catch (error) {
      setMsg({ type: 'error', text: 'Erro no upload: ' + error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const updates = {
        id: session.user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      await supabase.auth.updateUser({ data: { full_name: fullName } });

      if (newPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
        setNewPassword('');
      }

      setMsg({ type: 'success', text: 'Perfil salvo com sucesso!' });
    } catch (error) {
      setMsg({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT BLINDADO (CORREÇÃO) ---
  const handleLogout = async () => {
    setLoggingOut(true); // Trava o botão e mostra "Saindo..."
    try {
        // Tenta avisar o servidor que saiu (pode falhar se a net cair, mas ok)
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Erro ao tentar deslogar no servidor:", error);
    } finally {
        // OBRIGATÓRIO: Limpa a memória do navegador na força bruta
        localStorage.clear(); // Limpa tokens persistentes
        sessionStorage.clear(); // Limpa sessão da aba
        
        // Redirecionamento forçado (Recarrega a página para limpar estados do React)
        window.location.href = '/'; 
    }
  };

  // Função para copiar o ID
  const copyUserId = () => {
    navigator.clipboard.writeText(session.user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container">
      {/* HEADER */}
      <header style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30}}>
        <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%'}} onClick={() => navigate('/app')}>
          <ArrowLeft size={20}/>
        </button>
        <h2 style={{margin: 0}}>Meu Perfil</h2>
      </header>

      {/* ÁREA DE ID PARA COMPARTILHAR */}
      <div style={{background: '#F1F5F9', padding: 15, borderRadius: 12, marginBottom: 20, border: '1px dashed #94A3B8'}}>
        <small style={{display: 'block', color: '#64748B', marginBottom: 5, fontWeight: 'bold'}}>SEU ID DE AMIGO</small>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
            <code style={{fontSize: '0.8rem', wordBreak: 'break-all', background: '#fff', padding: 5, borderRadius: 4, flex: 1, color: '#334155'}}>{session.user.id}</code>
            <button onClick={copyUserId} style={{width: 'auto', padding: 8, fontSize: '0.8rem', background: copied ? '#22c55e' : '#334155', color: '#fff', border: 'none', borderRadius: 6}}>
                {copied ? <Check size={16}/> : <Copy size={16}/>}
            </button>
        </div>
        <small style={{display: 'block', color: '#94a3b8', marginTop: 5, fontSize: '0.75rem'}}>Envie este código para seus amigos te adicionarem.</small>
      </div>

      {/* ÁREA DE EDIÇÃO */}
      <div className="mission-card" style={{marginTop: 0, padding: 24}}>
        <div className="center mb-4" style={{position: 'relative'}}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%', 
            background: '#E2E8F0', margin: '0 auto 15px', 
            overflow: 'hidden', border: '4px solid #fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>
             {avatarUrl ? (
               <img src={avatarUrl} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
             ) : (
               <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>
                 <Camera size={32} />
               </div>
             )}
          </div>
          
          <div style={{position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)'}}>
            <label htmlFor="single" style={{
              cursor: 'pointer',
              background: '#334155', color: 'white',
              padding: '6px 14px', borderRadius: 20,
              fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}>
              {uploading ? 'Enviando...' : <><Camera size={14}/> Alterar Foto</>}
            </label>
            <input
              style={{visibility: 'hidden', position: 'absolute'}}
              type="file"
              id="single"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
            />
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} style={{marginTop: 25}}>
          <label style={{display: 'block', textAlign: 'left', marginBottom: 5, fontSize: '0.9rem', color: '#64748B'}}>Seu Nome</label>
          <input 
            type="text" 
            value={fullName} 
            onChange={e => setFullName(e.target.value)} 
            placeholder="Como quer ser chamado?"
          />

          <label style={{display: 'block', textAlign: 'left', marginBottom: 5, fontSize: '0.9rem', color: '#64748B'}}>Nova Senha</label>
          <div style={{position: 'relative'}}>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Digite apenas se quiser mudar"
              style={{paddingRight: 40}}
            />
            <Lock size={16} style={{position: 'absolute', right: 12, top: 18, color: '#94a3b8'}}/>
          </div>

          {msg && (
            <div style={{
              padding: 12, borderRadius: 8, marginBottom: 15, fontSize: '0.9rem',
              background: msg.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: msg.type === 'success' ? '#166534' : '#991b1b',
              textAlign: 'center'
            }}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8}}>
            <Save size={18}/> {loading ? 'Salvando...' : 'Salvar Dados'}
          </button>
        </form>
      </div>

      {/* HISTÓRICO */}
      <h3 style={{marginTop: 30, display: 'flex', alignItems: 'center', gap: 8}}>
        <History size={20} color="#7C3AED"/> Sua Jornada
      </h3>
      
      <div style={{flex: 1, overflowY: 'auto', paddingBottom: 20}}>
        {history.length === 0 ? (
          <p className="center" style={{marginTop: 20, fontStyle: 'italic', color: '#94a3b8'}}>Nenhuma missão concluída ainda.</p>
        ) : (
          history.map(item => (
            <div key={item.id} style={{
              background: '#fff', padding: 16, borderRadius: 12, marginBottom: 12,
              border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}>
                <strong style={{color: '#7C3AED'}}>{item.missions?.title}</strong>
                <span className="status-badge" style={{margin: 0, fontSize: '0.65rem', padding: '2px 8px'}}>
                  {item.missions?.attribute}
                </span>
              </div>
              <p style={{margin: 0, fontSize: '0.85rem', color: '#4B5563'}}>"{item.ai_feedback}"</p>
              <small style={{display: 'block', marginTop: 8, color: '#94a3b8', fontSize: '0.7rem'}}>
                {new Date(item.created_at).toLocaleDateString('pt-BR')}
              </small>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={handleLogout} 
        disabled={loggingOut}
        className="outline" 
        style={{marginTop: 'auto', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}
      >
        <LogOut size={18} />
        {loggingOut ? 'Saindo...' : 'Sair da Conta'}
      </button>
    </div>
  );
}