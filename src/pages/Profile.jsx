import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Lock, Save, History, Copy, Check, LogOut, Zap } from 'lucide-react';

export default function Profile({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  
  // Estado local para garantir que temos o usuário, mesmo se a 'session' falhar
  const [currentUser, setCurrentUser] = useState(session?.user || null);
  
  const [copied, setCopied] = useState(false); 
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    // Função de inicialização segura
    const initProfile = async () => {
        let userToUse = session?.user;

        // Se por algum motivo a sessão não veio nas props, tenta pegar do Supabase direto
        if (!userToUse) {
            const { data } = await supabase.auth.getUser();
            userToUse = data.user;
        }

        // Se ainda assim não tiver usuário, aí sim manda pro login
        if (!userToUse) {
            navigate('/');
            return;
        }

        setCurrentUser(userToUse);
        fetchProfileData(userToUse);
    };

    initProfile();
  }, [session, navigate]);

  const fetchProfileData = async (user) => {
    if (!user) return; // Trava de segurança

    try {
        // 1. Perfil
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        if (error && error.code !== 'PGRST116') {
            console.error("Erro ao buscar perfil:", error);
        }

        if (profile) {
          setFullName(profile.full_name || '');
          setAvatarUrl(profile.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`);
        }

        // 2. Histórico e Cálculo de XP
        const { data: historyData } = await supabase.from('reflections')
            .select('*, missions(title, attribute, badge_name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        setHistory(historyData || []);

        // Calcula XP Total
        const xp = historyData?.reduce((acc, curr) => {
            const val = parseInt(curr.missions?.attribute) || 0;
            return acc + val;
        }, 0);
        setTotalXp(xp || 0);

    } catch (err) {
        console.error("Erro geral no perfil:", err);
    }
  };

  const uploadAvatar = async (event) => {
    if (!currentUser) return;
    try {
      setUploading(true);
      setMsg(null);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Selecione uma imagem.');
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setMsg({ type: 'success', text: 'Imagem carregada! Clique em Salvar.' });
    } catch (error) {
      setMsg({ type: 'error', text: 'Erro: ' + error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setMsg(null);
    try {
      const updates = { id: currentUser.id, full_name: fullName, avatar_url: avatarUrl, updated_at: new Date() };
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

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await supabase.auth.signOut(); } catch (error) { console.error(error); } 
    finally { localStorage.clear(); sessionStorage.clear(); window.location.href = '/'; }
  };

  const copyUserId = () => {
    if (!currentUser) return;
    navigator.clipboard.writeText(currentUser.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentUser) return <div className="container center"><p>Carregando perfil...</p></div>;

  return (
    <div className="container">
      <header style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30}}>
        <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%'}} onClick={() => navigate('/app')}>
          <ArrowLeft size={20}/>
        </button>
        <h2 style={{margin: 0}}>Meu Perfil</h2>
      </header>

      {/* ÁREA DE ID */}
      <div style={{background: '#F1F5F9', padding: 15, borderRadius: 12, marginBottom: 20, border: '1px dashed #94A3B8'}}>
        <small style={{display: 'block', color: '#64748B', marginBottom: 5, fontWeight: 'bold'}}>SEU ID DE AMIGO</small>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
            <code style={{fontSize: '0.8rem', wordBreak: 'break-all', background: '#fff', padding: 5, borderRadius: 4, flex: 1, color: '#334155'}}>{currentUser.id}</code>
            <button onClick={copyUserId} style={{width: 'auto', padding: 8, fontSize: '0.8rem', background: copied ? '#22c55e' : '#334155', color: '#fff', border: 'none', borderRadius: 6}}>
                {copied ? <Check size={16}/> : <Copy size={16}/>}
            </button>
        </div>
      </div>

      {/* CARD DE XP TOTAL */}
      <div style={{background: 'linear-gradient(135deg, #7C3AED 0%, #C084FC 100%)', color: 'white', padding: 20, borderRadius: 16, marginBottom: 25, boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div>
            <span style={{fontSize: '0.85rem', opacity: 0.9, fontWeight: 'bold'}}>SEU SCORE TOTAL</span>
            <h1 style={{margin: 0, fontSize: '2.5rem', lineHeight: 1}}>{totalXp}</h1>
        </div>
        <div style={{background: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: '50%'}}>
            <Zap size={32} color="white" fill="white"/>
        </div>
      </div>

      {/* EDIÇÃO PERFIL */}
      <div className="mission-card" style={{marginTop: 0, padding: 24}}>
        <div className="center mb-4" style={{position: 'relative'}}>
          <div style={{width: 100, height: 100, borderRadius: '50%', background: '#E2E8F0', margin: '0 auto 15px', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
             {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}><Camera size={32} /></div>}
          </div>
          <div style={{position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)'}}>
            <label htmlFor="single" style={{cursor: 'pointer', background: '#334155', color: 'white', padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}}>
              {uploading ? '...' : <><Camera size={14}/> Alterar</>}
            </label>
            <input style={{visibility: 'hidden', position: 'absolute'}} type="file" id="single" accept="image/*" onChange={uploadAvatar} disabled={uploading}/>
          </div>
        </div>
        
        {msg && (
            <div style={{
                background: msg.type === 'success' ? '#DCFCE7' : '#FEF2F2', 
                color: msg.type === 'success' ? '#166534' : '#991B1B', 
                padding: '10px', borderRadius: 8, marginBottom: 15, fontSize: '0.85rem', textAlign: 'center'
            }}>
                {msg.text}
            </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{marginTop: 25}}>
          <label style={{display: 'block', textAlign: 'left', marginBottom: 5, fontSize: '0.9rem', color: '#64748B'}}>Seu Nome</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome"/>
          
          <label style={{display: 'block', textAlign: 'left', marginBottom: 5, marginTop: 15, fontSize: '0.9rem', color: '#64748B'}}>Nova Senha (Opcional)</label>
          <div style={{position: 'relative'}}>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" style={{paddingLeft: 35}}/>
            <Lock size={16} style={{position: 'absolute', left: 10, top: 12, color: '#94a3b8'}}/>
          </div>

          <button type="submit" disabled={loading} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20}}>
            {loading ? 'Salvando...' : <><Save size={18}/> Salvar Dados</>}
          </button>
        </form>
      </div>

      {/* HISTÓRICO */}
      <h3 style={{marginTop: 30, display: 'flex', alignItems: 'center', gap: 8}}><History size={20} color="#7C3AED"/> Histórico</h3>
      <div style={{flex: 1, overflowY: 'auto', paddingBottom: 20}}>
        {history.length === 0 ? <p className="center" style={{marginTop: 20, fontStyle: 'italic', color: '#94a3b8'}}>Vazio.</p> : history.map(item => (
            <div key={item.id} style={{background: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, border: '1px solid #E2E8F0'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}>
                <strong style={{color: '#7C3AED'}}>{item.missions?.title}</strong>
                <div style={{display: 'flex', gap: 5}}>
                    <span className="status-badge" style={{margin: 0, fontSize: '0.65rem', padding: '2px 8px'}}>+{item.missions?.attribute} XP</span>
                    {item.missions?.badge_name && <span className="status-badge" style={{margin: 0, fontSize: '0.65rem', padding: '2px 8px', background: '#FEF3C7', color: '#D97706'}}>🏅 {item.missions?.badge_name}</span>}
                </div>
              </div>
              <p style={{margin: 0, fontSize: '0.85rem', color: '#4B5563'}}>"{item.ai_feedback}"</p>
            </div>
          ))
        }
      </div>

      <button onClick={handleLogout} disabled={loggingOut} className="outline" style={{marginTop: 'auto', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}><LogOut size={18} /> Sair</button>
    </div>
  );
}