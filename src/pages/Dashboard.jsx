import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { processReflection } from '../utils/aiCore';
import { User, Flame, Clock, Settings, X, Bell, Download, Share, UserPlus, Search, Check, Crown, Rocket } from 'lucide-react'; // Adicionei Rocket

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Dados Principais
  const [progress, setProgress] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [activeTrail, setActiveTrail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  
  // Popups (PWA, Lembrete, PRO)
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const [showInstallPopup, setShowInstallPopup] = useState(false); 
  const [showReminder, setShowReminder] = useState(false); 
  const [showProPopup, setShowProPopup] = useState(false); // NOVO: Popup "Em Breve"
  const [reminderMessage, setReminderMessage] = useState({ title: '', text: '', action: '' });
  const [isIOS, setIsIOS] = useState(false);

  // Amigos / Ranking
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendTab, setFriendTab] = useState('ranking');
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [friendMsg, setFriendMsg] = useState('');

  // Views
  const [view, setView] = useState('dashboard');
  const [reflectionText, setReflectionText] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const firstName = session.user.user_metadata.full_name?.split(' ')[0] || 'Viajante';

  useEffect(() => {
    // PWA Check
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); if (!isStandalone) setShowInstallPopup(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (ios && !isStandalone) setTimeout(() => setShowInstallPopup(true), 3000);

    fetchData();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Perfil + Status PRO
    let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) {
        setAvatarUrl(profile.avatar_url);
        setIsAdmin(profile.role === 'admin');
        setIsPro(profile.is_pro || false);
    }

    // 2. Progresso Atual
    let { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', session.user.id).single();
    
    // Se não tiver trilha, busca a PRIMEIRA trilha da fila
    let trailId = prog?.trail_id;
    if (!trailId) {
        const { data: firstTrail } = await supabase.from('trails').select('id').order('position', {ascending: true}).limit(1).single();
        if (firstTrail) trailId = firstTrail.id;
    }

    // 3. Carrega detalhes da trilha ativa
    if (trailId) {
        const { data: trail } = await supabase.from('trails').select('*').eq('id', trailId).single();
        setActiveTrail(trail);

        if (!prog) {
             const { data: newProg } = await supabase.from('user_progress').insert({ user_id: session.user.id, current_day: 1, trail_id: trailId, status: 'new' }).select().single();
             prog = newProg;
        } else if (!prog.trail_id) {
            await supabase.from('user_progress').update({ trail_id: trailId }).eq('user_id', session.user.id);
            prog.trail_id = trailId;
        }
    }

    // 4. Carrega Missão do Dia
    if (prog && trailId) {
      let { data: mission } = await supabase.from('missions').select('*').eq('trail_id', trailId).eq('day_number', prog.current_day).maybeSingle(); 
      setProgress(prog);
      setCurrentMission(mission);
      checkReminder(prog);
    }
    setLoading(false);
  };

  // --- ALTERADO: FUNÇÃO DO BOTÃO PRO ---
  const handleBuyPro = () => {
      setShowProPopup(true); // Apenas abre o popup de "Em Breve"
  };

  const advanceToNextTrail = async () => {
      // Busca TODAS as trilhas na ordem correta
      const { data: trails } = await supabase.from('trails').select('*').order('position', { ascending: true });
      const currentIndex = trails.findIndex(t => t.id === activeTrail.id);
      const nextTrail = trails[currentIndex + 1];

      if (nextTrail) {
          // Se for paga e o usuário não for PRO -> Bloqueia com o popup "Em breve"
          if (nextTrail.is_paid && !isPro) {
              // Poderia abrir o popup de compra aqui, mas como "Em breve" é genérico, vamos abrir ele
              setShowProPopup(true);
              return;
          }

          // Se liberado, atualiza o progresso
          await supabase.from('user_progress').update({ 
              trail_id: nextTrail.id, 
              current_day: 1, 
              status: 'new',
              last_completed_at: null 
          }).eq('user_id', session.user.id);

          alert(`Parabéns! Você iniciou a trilha: ${nextTrail.title}`);
          fetchData();
      } else {
          alert("Você zerou o jogo! Aguarde novas trilhas serem lançadas.");
      }
  };

  // Lógica de Amigos (Mantida)
  const fetchFriendsData = async () => {
      setFriendMsg('');
      const { data: friendships } = await supabase.from('friendships').select('*').eq('status', 'accepted').or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);
      const friendIds = friendships?.map(f => f.user_id === session.user.id ? f.friend_id : f.user_id) || [];
      if (friendIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds);
          const { data: badges } = await supabase.from('reflections').select('user_id, missions(attribute)').in('user_id', friendIds);
          const combined = profiles.map(p => {
              const userBadges = badges.filter(b => b.user_id === p.id && b.missions?.attribute).map(b => b.missions.attribute);
              return { ...p, badges: [...new Set(userBadges)] };
          });
          setFriendsList(combined);
      } else { setFriendsList([]); }
      const { data: requests } = await supabase.from('friendships').select('id, user_id').eq('friend_id', session.user.id).eq('status', 'pending');
      if (requests && requests.length > 0) {
          const senderIds = requests.map(r => r.user_id);
          const { data: senders } = await supabase.from('profiles').select('*').in('id', senderIds);
          setRequestsList(requests.map(r => ({ request_id: r.id, ...senders.find(s => s.id === r.user_id) })));
      } else { setRequestsList([]); }
  };

  const searchUser = async () => {
      if (!searchId || searchId === session.user.id) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', searchId).single();
      if (profile) { setSearchResult(profile); setFriendMsg(''); } else { setSearchResult(null); setFriendMsg("ID não encontrado."); }
  };

  const sendFriendRequest = async () => {
      if (!searchResult) return;
      const { data: existing } = await supabase.from('friendships').select('*').or(`and(user_id.eq.${session.user.id},friend_id.eq.${searchResult.id}),and(user_id.eq.${searchResult.id},friend_id.eq.${session.user.id})`).maybeSingle();
      if (existing) { setFriendMsg("Solicitação já existe."); return; }
      await supabase.from('friendships').insert({ user_id: session.user.id, friend_id: searchResult.id });
      setFriendMsg("Enviada!"); setSearchResult(null); setSearchId('');
  };

  const respondRequest = async (requestId, accept) => {
      accept ? await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId) : await supabase.from('friendships').delete().eq('id', requestId);
      fetchFriendsData();
  };

  // Lógica Missões
  const submitReflection = async () => {
    if (reflectionText.length < 10) return alert("Escreva um pouco mais.");
    setLoading(true);
const feedback = await processReflection(reflectionText, currentMission.attribute, currentMission.badge_name);    setAiResponse(feedback);
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('reflections').insert({ user_id: session.user.id, mission_id: currentMission.id, mission_day: currentMission.day_number, user_text: reflectionText, ai_feedback: feedback });
    await supabase.from('user_progress').update({ last_completed_at: today, status: 'completed', current_day: progress.current_day + 1 }).eq('user_id', session.user.id);
    
    const { data: nextMission } = await supabase.from('missions').select('id').eq('trail_id', activeTrail.id).eq('day_number', progress.current_day + 1).maybeSingle();
    setLoading(false);
    
    if (!nextMission) { setView('trail_finished'); } else { setView('feedback'); }
  };

  const checkReminder = (prog) => {
    if (prog.current_day === 1 && (prog.status === 'new' || !prog.status)) return;
    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = prog.last_completed_at === today && prog.status === 'completed';
    if (!isCompletedToday && prog.status !== 'in_progress') { setReminderMessage({ title: "O tempo está passando...", text: "A missão de hoje ainda não foi cumprida.", action: "Ver Missão Agora" }); setShowReminder(true); } 
    else if (prog.status === 'in_progress') { setReminderMessage({ title: "Não deixe pela metade", text: "Execução incompleta não gera resultado.", action: "Finalizar Missão" }); setShowReminder(true); }
  };

  const handleInstallClick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setShowInstallPopup(false); setDeferredPrompt(null); }};
  const handleCloseInstall = () => setShowInstallPopup(false);
  const isMissionLocked = () => { if (!progress || !progress.last_completed_at) return false; return progress.last_completed_at === new Date().toISOString().split('T')[0] && progress.status === 'completed'; };
  const startMission = async () => { await supabase.from('user_progress').update({ status: 'in_progress' }).eq('user_id', session.user.id); setView('dashboard'); setShowReminder(false); fetchData(); };
  const finishMission = () => { setShowReminder(false); setView('reflection'); };
  const backToHome = () => { setView('dashboard'); fetchData(); };
  const handlePopupAction = () => { setShowReminder(false); progress.status === 'in_progress' ? setView('reflection') : setView('dashboard'); };

  if (loading && !aiResponse) return <div className="container center"><p>Carregando...</p></div>;

  // VIEW: TRILHA FINALIZADA
  if (view === 'trail_finished') {
      return (
        <div className="container center" style={{justifyContent: 'center'}}>
           <div style={{fontSize: '4rem', marginBottom: 10}}>🏆</div>
           <h2>Trilha Finalizada!</h2>
           <p>Você completou: <strong>{activeTrail.title}</strong></p>
           <p style={{color: '#64748B', marginTop: 10}}>Prepare-se para o próximo nível.</p>
           <button onClick={advanceToNextTrail} style={{marginTop: 30}}>Iniciar Próxima Trilha</button>
        </div>
      );
  }

  // VIEWS (Reflection, Feedback, Mission)
  if (view === 'reflection') return ( <div className="container"><h2>Check-in Diário</h2><p className="mb-4">Como foi realizar: <strong>"{currentMission?.action_text}"</strong>?</p><textarea rows="6" placeholder="Escreva aqui..." value={reflectionText} onChange={e => setReflectionText(e.target.value)} /><button onClick={submitReflection} disabled={loading}>{loading ? 'Analisando...' : 'Enviar Relato'}</button><button className="outline mt-4" onClick={() => setView('dashboard')}>Cancelar</button></div> );
  if (view === 'feedback') return ( <div className="container center" style={{justifyContent:'center'}}><div style={{fontSize: '4rem', marginBottom: 10}}>✨</div><h2 style={{color: '#7C3AED'}}>Missão Cumprida!</h2><div className="mission-card" style={{border: 'none', background: '#F3E8FF', boxShadow: 'none'}}><small style={{fontWeight: 'bold'}}>FEEDBACK DO SISTEMA</small><p style={{color: '#4B5563', fontStyle: 'italic', marginTop: 15}}>"{aiResponse}"</p><div className="status-badge" style={{marginTop: 20, background: '#fff'}}>+ {currentMission?.attribute}</div></div><button onClick={backToHome} style={{marginTop: 30}}>Voltar ao Menu</button></div> );
  if (view === 'mission') return ( <div className="container"><div className="status-badge">Dia {currentMission?.day_number}</div><h1>{currentMission?.title}</h1><p style={{fontSize: '1.1rem', marginTop: 20}}>{currentMission?.description}</p><div className="mission-card"><h3 style={{color: '#7C3AED'}}>Sua Ação</h3><p style={{fontWeight: '600', fontSize: '1.2rem'}}>{currentMission?.action_text}</p></div><div style={{marginTop: 'auto'}}><button onClick={startMission}>Aceitar Desafio</button><button className="outline mt-4" onClick={() => setView('dashboard')}>Voltar</button></div></div> );

  const locked = isMissionLocked();
  const percent = Math.min(100, Math.round(((progress?.current_day - 1) / 14) * 100));

  return (
    <div className="container" style={{position: 'relative'}}>
      {/* HEADER */}
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <div><small style={{textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', fontSize: '0.7rem'}}>Bem-vindo de volta</small><h2 style={{margin: 0}}>{firstName}</h2></div>
        <div style={{display: 'flex', gap: 10}}>
            <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: '#7C3AED', color:'#7C3AED'}} onClick={() => { setShowFriendsModal(true); fetchFriendsData(); }}> <UserPlus size={20}/> </button>
            {isAdmin && (<button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: '#7C3AED', color:'#7C3AED'}} onClick={() => navigate('/admin')}><Settings size={20}/></button>)}
            <div onClick={() => navigate('/profile')} style={{width: 45, height: 45, borderRadius: '50%', background: '#E2E8F0', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{avatarUrl ? <img src={avatarUrl} alt="Perfil" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={24} color="#64748B"/>}</div>
        </div>
      </header>

      {/* BANNER PRO */}
      {!isPro && (
          <div onClick={handleBuyPro} style={{
              background: 'linear-gradient(90deg, #7C3AED 0%, #C084FC 100%)', color: '#fff', 
              padding: '12px 20px', borderRadius: 12, marginBottom: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)'
          }}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{background: 'rgba(255,255,255,0.2)', padding: 6, borderRadius: '50%'}}><Crown size={20} color="#fff"/></div>
                  <div>
                      <strong style={{display: 'block', fontSize: '0.95rem'}}>Desbloqueie o Modo PRO</strong>
                      <span style={{fontSize: '0.75rem', opacity: 0.9}}>Acesse todas as trilhas exclusivas.</span>
                  </div>
              </div>
              <span style={{fontWeight: 'bold', background: '#fff', color: '#7C3AED', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem'}}>ASSINAR</span>
          </div>
      )}

      {/* PROGRESSO E CARD PRINCIPAL */}
      <div style={{marginBottom: 40}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8}}><div><h3 style={{margin: 0, fontSize: '1.1rem'}}>{activeTrail?.title || 'Carregando...'}</h3><small style={{color: '#64748B'}}>{activeTrail?.description}</small></div><span style={{fontWeight: 'bold', color: '#7C3AED'}}>{percent}%</span></div>
        <div className="progress-container"><div className="progress-fill" style={{width: `${percent}%`}}></div></div>
      </div>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {!currentMission ? (<div className="mission-card"><h3>Trilha Finalizada!</h3><p>Você completou todas as missões.</p><button onClick={advanceToNextTrail} style={{marginTop: 15}}>Próxima Trilha</button></div>) : (
            <div className={`mission-card ${locked ? 'locked-card' : ''}`}>
            {locked ? (<> <Clock size={40} style={{color: '#94a3b8', marginBottom: 15}} /> <h3>Missão Concluída</h3> <p>Descanse.</p> <div style={{background: '#e2e8f0', padding: '8px', borderRadius: 8, display: 'inline-block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748B', marginTop: 10}}> Próxima missão: 00:00 </div> </>) : (
                <> <div className="status-badge"><Flame size={14} style={{marginRight: 5}}/> Dia {currentMission?.day_number}</div> <h2 style={{fontSize: '1.8rem', marginBottom: 10}}>{currentMission?.title}</h2> <p>{currentMission?.action_text}</p> {progress?.status === 'in_progress' ? <button onClick={finishMission} style={{marginTop: 30}}>Concluir Missão</button> : <button onClick={() => setView('mission')} style={{marginTop: 30}}>Ver Detalhes</button>} </>
            )}
            </div>
        )}
      </div>

      {/* --- POPUP NOVO: EM BREVE PRO --- */}
      {showProPopup && (
        <div className="popup-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div className="mission-card" style={{width: '90%', maxWidth: '350px', textAlign: 'center', padding: '30px 20px'}}>
                <div style={{background: '#F3E8FF', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                    <Rocket size={32} color="#7C3AED" />
                </div>
                <h3 style={{marginBottom: 10, color: '#1e293b'}}>Em Construção!</h3>
                <p style={{color: '#64748B', marginBottom: 25, lineHeight: '1.5'}}>
                    Estamos finalizando o <strong>Modo PRO</strong> com conteúdos exclusivos para acelerar sua evolução. Aguarde novidades em breve!
                </p>
                <button onClick={() => setShowProPopup(false)} style={{width: '100%'}}>Entendi, vou aguardar</button>
            </div>
        </div>
      )}

      {/* MODAL AMIGOS (MANTIDO) */}
      {showFriendsModal && (
          <div className="popup-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
              <div className="mission-card" style={{width: '90%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: 0, padding: 0, overflow: 'hidden'}}>
                  <div style={{padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><h3 style={{margin: 0}}>Comunidade</h3><button onClick={() => setShowFriendsModal(false)} style={{width: 'auto', padding: 5, background: 'transparent', color: '#64748B', border: 'none'}}><X size={20}/></button></div>
                  <div style={{display: 'flex', borderBottom: '1px solid #e2e8f0'}}>
                      <button onClick={() => setFriendTab('ranking')} style={{flex: 1, borderRadius: 0, background: friendTab === 'ranking' ? '#F3E8FF' : 'transparent', color: friendTab === 'ranking' ? '#7C3AED' : '#64748B', border: 'none', padding: 12, fontSize: '0.9rem'}}>Ranking</button>
                      <button onClick={() => setFriendTab('add')} style={{flex: 1, borderRadius: 0, background: friendTab === 'add' ? '#F3E8FF' : 'transparent', color: friendTab === 'add' ? '#7C3AED' : '#64748B', border: 'none', padding: 12, fontSize: '0.9rem'}}>Adicionar</button>
                      <button onClick={() => setFriendTab('requests')} style={{flex: 1, borderRadius: 0, background: friendTab === 'requests' ? '#F3E8FF' : 'transparent', color: friendTab === 'requests' ? '#7C3AED' : '#64748B', border: 'none', padding: 12, fontSize: '0.9rem', position: 'relative'}}>Solicitações {requestsList.length > 0 && <span style={{position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: 'red', borderRadius: '50%'}}></span>}</button>
                  </div>
                  <div style={{padding: 20, overflowY: 'auto', flex: 1}}>
                      {friendTab === 'ranking' && (<div style={{display: 'flex', flexDirection: 'column', gap: 15}}>{friendsList.length === 0 ? <p style={{textAlign: 'center', color: '#94a3b8'}}>Você ainda não tem amigos.</p> : friendsList.map(friend => (<div key={friend.id} style={{display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 10}}><div style={{width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden'}}><img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.full_name}&background=random`} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div><div style={{flex: 1}}><strong style={{fontSize: '0.95rem'}}>{friend.full_name}</strong><div style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4}}>{friend.badges && friend.badges.length > 0 ? friend.badges.map((b, idx) => (<span key={idx} style={{fontSize: '0.65rem', background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold'}}>{b}</span>)) : <span style={{fontSize: '0.7rem', color: '#cbd5e1'}}>Sem conquistas ainda</span>}</div></div></div>))}</div>)}
                      {friendTab === 'add' && (<div><p style={{fontSize: '0.9rem', color: '#64748B', marginBottom: 15}}>Insira o ID do seu amigo (ele encontra no Perfil).</p><div style={{display: 'flex', gap: 10, marginBottom: 15}}><input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Cole o ID aqui..." style={{flex: 1}} /><button onClick={searchUser} style={{width: 'auto', padding: '10px 15px'}}><Search size={20}/></button></div>{friendMsg && <p style={{fontSize: '0.85rem', color: friendMsg.includes('Solicitação') ? 'green' : 'red'}}>{friendMsg}</p>}{searchResult && (<div style={{background: '#f8fafc', padding: 15, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginTop: 10}}><div style={{width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden'}}><img src={searchResult.avatar_url || `https://ui-avatars.com/api/?name=${searchResult.full_name}&background=random`} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div><div style={{flex: 1}}><strong>{searchResult.full_name}</strong></div><button onClick={sendFriendRequest} style={{width: 'auto', padding: '6px 12px', fontSize: '0.8rem'}}><UserPlus size={16}/> Add</button></div>)}</div>)}
                      {friendTab === 'requests' && (<div>{requestsList.length === 0 ? <p style={{textAlign: 'center', color: '#94a3b8'}}>Nenhuma solicitação pendente.</p> : requestsList.map(req => (<div key={req.request_id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, background: '#fff', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8}}><div style={{display: 'flex', alignItems: 'center', gap: 10}}><div style={{width: 35, height: 35, borderRadius: '50%', overflow: 'hidden'}}><img src={req.avatar_url || `https://ui-avatars.com/api/?name=${req.full_name}`} style={{width: '100%'}}/></div><span style={{fontSize: '0.9rem', fontWeight: 'bold'}}>{req.full_name}</span></div><div style={{display: 'flex', gap: 5}}><button onClick={() => respondRequest(req.request_id, true)} style={{width: 'auto', padding: 6, background: '#dcfce7', color: '#166534', border: 'none'}}><Check size={16}/></button><button onClick={() => respondRequest(req.request_id, false)} style={{width: 'auto', padding: 6, background: '#fee2e2', color: '#991b1b', border: 'none'}}><X size={16}/></button></div></div>))}</div>)}
                  </div>
              </div>
          </div>
      )}

      {/* POPUPS ORIGINAIS (Instalação e Lembrete) */}
      {showInstallPopup && (<div className="popup-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}><div style={{background: '#7C3AED', color: '#fff', width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, animation: 'slideUp 0.4s ease-out'}}><div style={{display: 'flex', gap: 15, alignItems: 'center', marginBottom: 20}}><div style={{width: 50, height: 50, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span style={{color: '#7C3AED', fontSize: '1.8rem', fontWeight: 'bold'}}>T</span></div><div><h3 style={{margin: 0, fontSize: '1.2rem', color: '#fff'}}>Instale o App</h3><p style={{margin: 0, fontSize: '0.9rem', color: '#e9d5ff'}}>Foco total, sem distrações do navegador.</p></div></div>{isIOS ? (<div style={{background: 'rgba(0,0,0,0.25)', padding: 15, borderRadius: 10, fontSize: '0.9rem', marginBottom: 15, border: '1px solid rgba(255,255,255,0.1)'}}><p style={{margin: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: '500'}}>1. Toque em Compartilhar <Share size={16} color="#fff"/></p><p style={{margin: '5px 0 0 0', color: '#fff', fontWeight: '500'}}>2. Selecione "Adicionar à Tela de Início"</p></div>) : (<button onClick={handleInstallClick} style={{background: '#fff', color: '#7C3AED', width: '100%', fontWeight: 'bold', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}><Download size={18}/> Adicionar à Tela de Início</button>)}<button onClick={handleCloseInstall} style={{background: 'transparent', color: '#fff', width: '100%', border: 'none', fontSize: '0.9rem', opacity: 0.8}}>Agora não</button></div></div>)}
      {showReminder && !showInstallPopup && (<div style={{position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 100, background: '#1e293b', color: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', animation: 'slideUp 0.5s ease-out'}}><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}><div style={{display: 'flex', gap: 12}}><div style={{background: '#7C3AED', padding: 8, borderRadius: '50%', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Bell size={18} color="white" /></div><div><strong style={{fontSize: '1rem', display: 'block', marginBottom: 4}}>{reminderMessage.title}</strong><p style={{fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4}}>{reminderMessage.text}</p></div></div><button onClick={() => setShowReminder(false)} style={{background: 'transparent', border: 'none', padding: 0, color: '#64748B', width: 'auto'}}><X size={20} /></button></div><button onClick={handlePopupAction} style={{width: '100%', marginTop: 15, background: '#fff', color: '#0f172a', fontWeight: 'bold', border: 'none', padding: '10px'}}>{reminderMessage.action}</button></div>)}
      <style>{`@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}