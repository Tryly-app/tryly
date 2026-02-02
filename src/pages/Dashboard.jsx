import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { supabase } from '../supabaseClient';
import { processReflection } from '../utils/aiCore';
import { getStoredInviteId, clearStoredInviteId } from './Invite';
import { User, Flame, Clock, Settings, X, Bell, Download, Share, Share2, UserPlus, Search, Check, Crown, Rocket, Zap, Lock, ChevronRight, Calendar } from 'lucide-react';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Dados Principais
  const [progress, setProgress] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [activeTrail, setActiveTrail] = useState(null);
  const [allTrails, setAllTrails] = useState([]);
  const [totalMissionsInTrail, setTotalMissionsInTrail] = useState(14); 
  const [nextMission, setNextMission] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyData, setWeeklyData] = useState({ daysCompleted: 0, xp: 0 });
  const confettiFired = useRef(false);
  
  // Popups
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const [showInstallPopup, setShowInstallPopup] = useState(false); 
  const [showReminder, setShowReminder] = useState(false); 
  const [showProPopup, setShowProPopup] = useState(false);
  const [reminderMessage, setReminderMessage] = useState({ title: '', text: '', action: '' });
  const [isIOS, setIsIOS] = useState(false);

  // Amigos
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
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); if (!isStandalone) setShowInstallPopup(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (ios && !isStandalone) setTimeout(() => setShowInstallPopup(true), 3000);

    fetchData();

    const inviteId = getStoredInviteId();
    if (inviteId && inviteId !== session?.user?.id) {
      clearStoredInviteId();
      setSearchId(inviteId);
      setShowFriendsModal(true);
      setFriendTab('add');
      supabase.from('profiles').select('*').eq('id', inviteId).single().then(({ data: profile }) => {
        if (profile) { setSearchResult(profile); setFriendMsg(''); }
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
            setAvatarUrl(profile.avatar_url);
            setIsAdmin(profile.role === 'admin');
            setIsPro(profile.is_pro || false);
            setCurrentStreak(profile.current_streak ?? 0);
            setLongestStreak(profile.longest_streak ?? 0);
        }

        let { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', session.user.id).maybeSingle();
        
        const { data: trailsData } = await supabase.from('trails').select('*').order('position', { ascending: true });
        setAllTrails(trailsData || []);

        let trailId = prog?.trail_id;
        
        if (!trailId && trailsData?.length > 0) {
            trailId = trailsData[0].id;
        }

        if (trailId) {
            const { data: trail } = await supabase.from('trails').select('*').eq('id', trailId).single();
            setActiveTrail(trail);
            const { count } = await supabase.from('missions').select('*', { count: 'exact', head: true }).eq('trail_id', trailId);
            setTotalMissionsInTrail(count ?? 14);

            if (!prog) {
                 const { data: newProg } = await supabase.from('user_progress').insert({ user_id: session.user.id, current_day: 1, trail_id: trailId, status: 'new' }).select().single();
                 prog = newProg;
            } else if (!prog.trail_id) {
                await supabase.from('user_progress').update({ trail_id: trailId }).eq('user_id', session.user.id);
                prog.trail_id = trailId;
            }
        }

        if (prog && trailId) {
          let { data: mission } = await supabase.from('missions').select('*').eq('trail_id', trailId).eq('day_number', prog.current_day).maybeSingle(); 
          const { data: next } = await supabase.from('missions').select('*').eq('trail_id', trailId).eq('day_number', prog.current_day + 1).maybeSingle();
          setProgress(prog);
          setCurrentMission(mission);
          setNextMission(next ?? null);
          checkReminder(prog);
        }
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    } finally {
        setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('mercadopago', {
            body: { 
                user_id: session.user.id,
                email: session.user.email 
            }
        });

        if (error) throw error;
        
        if (data?.init_point) {
            window.location.href = data.init_point;
        } else {
            alert("Erro ao gerar link de pagamento. Tente novamente.");
        }
    } catch (error) {
        console.error("Erro Pagamento:", error);
        alert("Erro ao conectar com o sistema de pagamento.");
    } finally {
        setPaymentLoading(false);
    }
  };

  const openProModal = () => { setShowProPopup(true); };

  const advanceToNextTrail = async () => {
      const { data: trails } = await supabase.from('trails').select('*').order('position', { ascending: true });
      const currentIndex = trails.findIndex(t => t.id === activeTrail.id);
      const nextTrail = trails[currentIndex + 1];

      if (nextTrail) {
          if (nextTrail.is_paid && !isPro) { setShowProPopup(true); return; }
          await supabase.from('user_progress').update({ trail_id: nextTrail.id, current_day: 1, status: 'new', last_completed_at: null }).eq('user_id', session.user.id);
          alert(`Parabéns! Você iniciou a trilha: ${nextTrail.title}`);
          fetchData();
      } else {
          alert("Você zerou o jogo! Aguarde novas trilhas serem lançadas.");
      }
  };

  const fetchFriendsData = async () => {
      setFriendMsg('');
      const { data: friendships } = await supabase.from('friendships').select('*').eq('status', 'accepted').or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);
      let allIds = friendships?.map(f => f.user_id === session.user.id ? f.friend_id : f.user_id) || [];
      if (!allIds.includes(session.user.id)) allIds.push(session.user.id);
      
      if (allIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', allIds);
          const { data: xpData } = await supabase.from('reflections').select('user_id, missions(attribute)').in('user_id', allIds);
          const ranking = profiles.map(p => {
              const userReflections = xpData.filter(r => r.user_id === p.id && r.missions);
              const totalXp = userReflections.reduce((acc, curr) => {
                  const xpValue = parseInt(curr.missions.attribute) || 0;
                  return acc + xpValue;
              }, 0);
              return { ...p, totalXp };
          });
          ranking.sort((a, b) => b.totalXp - a.totalXp);
          setFriendsList(ranking);
      } else { setFriendsList([]); }
      
      const { data: requests } = await supabase.from('friendships').select('id, user_id').eq('friend_id', session.user.id).eq('status', 'pending');
      if (requests && requests.length > 0) {
          const senderIds = requests.map(r => r.user_id);
          const { data: senders } = await supabase.from('profiles').select('*').in('id', senderIds);
          setRequestsList(requests.map(r => ({ request_id: r.id, ...senders.find(s => s.id === r.user_id) })));
      } else { setRequestsList([]); }
  };

  const searchUser = async (idOverride) => {
      const id = idOverride ?? searchId;
      if (!id || id === session.user.id) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (profile) { setSearchResult(profile); setFriendMsg(''); setSearchId(id); } else { setSearchResult(null); setFriendMsg("ID não encontrado."); }
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

  const submitReflection = async () => {
    if (reflectionText.length < 10) return alert("Escreva um pouco mais.");
    setLoading(true);
    
    const feedback = await processReflection(
        reflectionText, 
        `${currentMission.attribute} XP`, 
        currentMission.badge_name,
        activeTrail?.ai_prompt 
    );
    
    setAiResponse(feedback);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const prevCompleted = progress?.last_completed_at;
    const newStreak = (prevCompleted === yesterdayStr) ? (currentStreak + 1) : 1;
    const newLongest = Math.max(longestStreak, newStreak);

    await supabase.from('reflections').insert({ user_id: session.user.id, mission_id: currentMission.id, mission_day: currentMission.day_number, user_text: reflectionText, ai_feedback: feedback });
    await supabase.from('user_progress').update({ last_completed_at: today, status: 'completed', current_day: progress.current_day + 1 }).eq('user_id', session.user.id);
    await supabase.from('profiles').update({ current_streak: newStreak, longest_streak: newLongest }).eq('id', session.user.id);

    setCurrentStreak(newStreak);
    setLongestStreak(newLongest);
    const { data: nextMissionData } = await supabase.from('missions').select('id').eq('trail_id', activeTrail.id).eq('day_number', progress.current_day + 1).maybeSingle();
    setLoading(false);
    
    if (!nextMissionData) { setView('trail_finished'); } else { setView('feedback'); }
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

  function DashboardSkeleton() {
    return (
      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><div className="skeleton" style={{ height: 12, width: 100, marginBottom: 8 }} /><div className="skeleton" style={{ height: 24, width: 120 }} /></div>
          <div className="skeleton" style={{ width: 45, height: 45, borderRadius: '50%' }} />
        </header>
        <div style={{ marginBottom: 30 }}><div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 8, borderRadius: 10, width: '100%' }} /></div>
        <div className="mission-card" style={{ padding: 24 }}>
          <div className="skeleton" style={{ height: 28, width: 80, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 24, width: '90%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: '60%' }} />
        </div>
      </div>
    );
  }
  if (loading && !aiResponse) return <DashboardSkeleton />;

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

  if (view === 'reflection') return ( <div className="container"><h2>Check-in Diário</h2><p className="mb-4">Como foi realizar: <strong>"{currentMission?.action_text}"</strong>?</p><textarea rows="6" placeholder="Escreva aqui..." value={reflectionText} onChange={e => setReflectionText(e.target.value)} /><button onClick={submitReflection} disabled={loading}>{loading ? 'Analisando...' : 'Enviar Relato'}</button><button className="outline mt-4" onClick={() => setView('dashboard')}>Cancelar</button></div> );
  if (view === 'feedback') {
    if (!confettiFired.current) {
      confettiFired.current = true;
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
    }
    const handleShare = async () => {
      const text = `Completei o dia ${currentMission?.day_number} da trilha no Tryly! +${currentMission?.attribute} XP`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Tryly', text, url: window.location.origin });
        } catch (e) { if (e.name !== 'AbortError') navigator.clipboard?.writeText(text); }
      } else {
        navigator.clipboard?.writeText(text);
      }
    };
    return (
      <div className="container center" style={{ justifyContent: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 10 }}>✨</div>
        <h2 style={{ color: 'var(--primary)' }}>Missão Cumprida!</h2>
        <div className="mission-card" style={{ border: 'none', background: 'var(--primary-light)', boxShadow: 'none' }}>
          <small style={{ fontWeight: 'bold' }}>FEEDBACK DO SISTEMA</small>
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 15 }}>"{aiResponse}"</p>
          <div className="status-badge" style={{ marginTop: 20, background: 'var(--surface)' }}>+ {currentMission?.attribute} XP</div>
        </div>
        <button type="button" className="outline" onClick={handleShare} style={{ marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Share2 size={18} /> Compartilhar conquista
        </button>
        <button onClick={() => { confettiFired.current = false; backToHome(); }} style={{ marginTop: 15 }}>Voltar ao Menu</button>
      </div>
    );
  }
  if (view === 'mission') return ( <div className="container"><div className="status-badge">Dia {currentMission?.day_number}</div><h1>{currentMission?.title}</h1><p style={{fontSize: '1.1rem', marginTop: 20}}>{currentMission?.description}</p><div className="mission-card"><h3 style={{color: '#7C3AED'}}>Sua Ação</h3><p style={{fontWeight: '600', fontSize: '1.2rem'}}>{currentMission?.action_text}</p></div><div style={{marginTop: 'auto'}}><button onClick={startMission}>Aceitar Desafio</button><button className="outline mt-4" onClick={() => setView('dashboard')}>Voltar</button></div></div> );

  const locked = isMissionLocked();
  const totalDays = Math.max(1, totalMissionsInTrail);
  const percent = progress ? Math.min(100, Math.round(((progress.current_day - 1) / totalDays) * 100)) : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const lastCompleted = progress?.last_completed_at;
  const daysSinceCompleted = lastCompleted ? Math.floor((new Date(todayStr) - new Date(lastCompleted)) / (1000 * 60 * 60 * 24)) : 0;
  const isPaused = !locked && progress && lastCompleted && daysSinceCompleted > 1;

  const fetchWeeklyData = async () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const startWeek = monday.toISOString().split('T')[0];
    const { data: weekReflections } = await supabase.from('reflections').select('*, missions(attribute)').eq('user_id', session.user.id).gte('created_at', startWeek);
    const uniqueDays = new Set(weekReflections?.map(r => r.created_at?.split('T')[0]) || []);
    const xp = weekReflections?.reduce((acc, r) => acc + (parseInt(r.missions?.attribute) || 0), 0) ?? 0;
    setWeeklyData({ daysCompleted: uniqueDays.size, xp });
  };

  return (
    <div className="container" style={{position: 'relative'}}>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <div>
          <small style={{textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.7rem'}}>Bem-vindo de volta</small>
          <h2 style={{margin: 0}}>{firstName}</h2>
          {currentStreak > 0 && <span style={{fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4}}><Flame size={12} /> {currentStreak} dia{currentStreak !== 1 ? 's' : ''} seguidos</span>}
        </div>
        <div style={{display: 'flex', gap: 10}}>
            <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: 'var(--primary)', color: 'var(--primary)'}} onClick={() => { setShowWeeklyModal(true); fetchWeeklyData(); }} title="Sua semana"><Calendar size={20}/></button>
            <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: 'var(--primary)', color: 'var(--primary)'}} onClick={() => { setShowFriendsModal(true); fetchFriendsData(); }}> <UserPlus size={20}/> </button>
            {isAdmin && (<button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: 'var(--primary)', color: 'var(--primary)'}} onClick={() => navigate('/admin')}><Settings size={20}/></button>)}
            <div onClick={() => navigate('/profile')} style={{width: 45, height: 45, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--primary-light)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{avatarUrl ? <img src={avatarUrl} alt="Perfil" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={24} color="var(--text-muted)"/>}</div>
        </div>
      </header>

      {/* BANNER PRO */}
{!isPro && activeTrail && (
              <div onClick={openProModal} style={{
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

      <div style={{marginBottom: 40}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8}}><div><h3 style={{margin: 0, fontSize: '1.1rem'}}>{activeTrail?.title || 'Carregando...'}</h3><small style={{color: '#64748B'}}>{activeTrail?.description}</small></div><span style={{fontWeight: 'bold', color: '#7C3AED'}}>{percent}%</span></div>
        <div className="progress-container"><div className="progress-fill" style={{width: `${percent}%`}}></div></div>
      </div>
      {isPaused && (
        <div style={{background: 'linear-gradient(90deg, #FEF3C7 0%, #FDE68A 100%)', border: '1px solid #F59E0B', color: '#92400E', padding: '12px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10}}>
          <Clock size={20} />
          <span style={{fontWeight: '600', fontSize: '0.9rem'}}>Retome de onde parou — sua missão está esperando.</span>
        </div>
      )}
      <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {!currentMission ? (<div className="mission-card"><h3>Trilha Finalizada!</h3><p>Você completou todas as missões.</p><button onClick={advanceToNextTrail} style={{marginTop: 15}}>Próxima Trilha</button></div>) : (
            <div className={`mission-card ${locked ? 'locked-card' : ''}`}>
            {locked ? (<> <Clock size={40} style={{color: 'var(--text-muted)', marginBottom: 15}} /> <h3>Missão Concluída</h3> <p>Descanse.</p> <div style={{background: 'var(--skeleton-bg)', padding: '8px', borderRadius: 8, display: 'inline-block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginTop: 10}}> Próxima missão: 00:00 </div> </>) : (
                <> <div className="status-badge"><Flame size={14} style={{marginRight: 5}}/> Dia {currentMission?.day_number}</div> <h2 style={{fontSize: '1.8rem', marginBottom: 10}}>{currentMission?.title}</h2> <p>{currentMission?.action_text}</p> {progress?.status === 'in_progress' ? <button onClick={finishMission} style={{marginTop: 30}}>Concluir Missão</button> : <button onClick={() => setView('mission')} style={{marginTop: 30}}>Ver Detalhes</button>} </>
            )}
            </div>
        )}
      </div>
      {nextMission && !locked && (
        <div style={{marginTop: 20, padding: 16, borderRadius: 12, border: '1px dashed var(--primary)', background: 'var(--primary-light)', opacity: 0.9}}>
          <small style={{fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.7rem'}}>Amanhã</small>
          <p style={{margin: '6px 0 0', fontWeight: '600', color: 'var(--text-main)'}}>{nextMission.title}</p>
        </div>
      )}

      <div style={{marginTop: 40}}>
          <h3 style={{fontSize: '1rem', color: '#64748B', marginBottom: 15, paddingLeft: 5}}>Sua Jornada</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 30}}>
            {allTrails.map((trail) => {
               const isActive = activeTrail?.id === trail.id;
               const isCompleted = trail.position < (activeTrail?.position || 0);
               const isLocked = trail.position > (activeTrail?.position || 0);

               return (
                 <div key={trail.id} style={{
                     opacity: isLocked ? 0.6 : 1,
                     background: isActive ? '#F3E8FF' : '#fff',
                     border: isActive ? '1px solid #7C3AED' : '1px solid #E2E8F0',
                     padding: '16px 15px', borderRadius: 12,
                     display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                     boxShadow: isActive ? '0 4px 12px rgba(124, 58, 237, 0.15)' : 'none',
                     transform: isActive ? 'scale(1.02)' : 'scale(1)',
                     transition: 'all 0.2s'
                 }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                       {isCompleted ? (
                           <div style={{background: '#22c55e', borderRadius: '50%', padding: 4, display:'flex'}}><Check size={14} color="white"/></div>
                       ) : isLocked ? (
                           <div style={{background: '#e2e8f0', borderRadius: '50%', padding: 5, display:'flex'}}><Lock size={14} color="#64748B"/></div>
                       ) : (
                           <div style={{background: '#7C3AED', borderRadius: '50%', padding: 6, display:'flex', boxShadow: '0 0 10px rgba(124, 58, 237, 0.5)'}}><div style={{width: 8, height: 8, background: 'white', borderRadius: '50%'}}></div></div>
                       )}
                       <div>
                          <strong style={{display: 'block', color: isActive ? '#7C3AED' : '#1e293b', fontSize: '0.95rem'}}>{trail.title}</strong>
                          <span style={{fontSize: '0.75rem', color: '#64748B', fontWeight: '500'}}>
                            {isLocked ? 'Bloqueado' : isCompleted ? 'Concluído' : 'Em andamento'}
                          </span>
                       </div>
                    </div>
                    {trail.is_paid && <Crown size={16} color="#D97706" style={{opacity: isLocked ? 0.5 : 1}} />}
                    {isActive && <ChevronRight size={18} color="#7C3AED" />}
                 </div>
               );
            })}
          </div>
      </div>

      {/* MODAL PRO / PAGAMENTO */}
      {showProPopup && (
        <div className="popup-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div className="mission-card" style={{width: '90%', maxWidth: '350px', textAlign: 'center', padding: '30px 20px'}}>
                <div style={{background: '#F3E8FF', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                    <Rocket size={32} color="#7C3AED" />
                </div>
                <h3 style={{marginBottom: 10, color: '#1e293b'}}>Desbloqueie o Potencial</h3>
                <p style={{color: '#64748B', marginBottom: 25, lineHeight: '1.5'}}>
                    Tenha acesso ilimitado a todas as trilhas, mentoria avançada da IA e suporte prioritário.
                </p>
                <button 
                    onClick={handlePayment} 
                    disabled={paymentLoading}
                    style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10}}
                >
                    {paymentLoading ? 'Gerando Link...' : 'Assinar por R$ 9,90/mês'}
                </button>
                <button className="outline" onClick={() => setShowProPopup(false)} style={{width: '100%', marginTop: 10, border: 'none', color: '#64748B'}}>
                    Talvez depois
                </button>
            </div>
        </div>
      )}

      {/* MODAL SUA SEMANA */}
      {showWeeklyModal && (
        <div className="popup-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <div className="mission-card" style={{width: '90%', maxWidth: '340px', textAlign: 'center', padding: '28px 20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center', gap: 8}}><Calendar size={22} color="var(--primary)" /> Sua semana</h3>
              <button onClick={() => setShowWeeklyModal(false)} style={{width: 'auto', padding: 5, background: 'transparent', color: 'var(--text-muted)', border: 'none'}}><X size={20}/></button>
            </div>
            <div style={{display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 20}}>
              <div style={{background: 'var(--primary-light)', padding: 16, borderRadius: 12, flex: 1}}>
                <div style={{fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)'}}>{weeklyData.daysCompleted}</div>
                <small style={{color: 'var(--text-muted)', fontWeight: '600'}}>dias completos</small>
              </div>
              <div style={{background: 'var(--primary-light)', padding: 16, borderRadius: 12, flex: 1}}>
                <div style={{fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)'}}>{weeklyData.xp}</div>
                <small style={{color: 'var(--text-muted)', fontWeight: '600'}}>XP da semana</small>
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6}}>
              <Flame size={18} color="var(--primary)" />
              <span style={{fontWeight: 'bold', color: 'var(--primary)'}}>{currentStreak} dia{currentStreak !== 1 ? 's' : ''} seguidos</span>
            </div>
            <button className="outline" onClick={() => setShowWeeklyModal(false)} style={{marginTop: 20}}>Fechar</button>
          </div>
        </div>
      )}

      {/* MODAL DE AMIGOS */}
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
                      {friendTab === 'ranking' && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                            {friendsList.length === 0 ? <p style={{textAlign: 'center', color: '#94a3b8'}}>Nenhum dado.</p> : friendsList.map((friend, idx) => (
                                <div key={friend.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 10,
                                    background: friend.id === session.user.id ? '#f8fafc' : 'transparent', 
                                    borderRadius: 8, padding: 8
                                }}>
                                    <div style={{fontWeight: 'bold', color: '#94a3b8', width: 20}}>{idx + 1}</div>
                                    <div style={{width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden'}}><img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.full_name}&background=random`} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div>
                                    <div style={{flex: 1}}>
                                        <strong style={{fontSize: '0.95rem'}}>{friend.id === session.user.id ? 'Você' : friend.full_name}</strong>
                                        <div style={{display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4}}>
                                            <span style={{fontSize: '0.75rem', background: '#F3E8FF', color: '#7C3AED', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold'}}>
                                                <Zap size={10} style={{marginRight: 2, display: 'inline'}}/> {friend.totalXp} XP
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                      )}
                      {friendTab === 'add' && (<div><p style={{fontSize: '0.9rem', color: '#64748B', marginBottom: 15}}>Insira o ID do seu amigo (ele encontra no Perfil).</p><div style={{display: 'flex', gap: 10, marginBottom: 15}}><input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Cole o ID aqui..." style={{flex: 1}} /><button onClick={searchUser} style={{width: 'auto', padding: '10px 15px'}}><Search size={20}/></button></div>{friendMsg && <p style={{fontSize: '0.85rem', color: friendMsg.includes('Solicitação') ? 'green' : 'red'}}>{friendMsg}</p>}{searchResult && (<div style={{background: '#f8fafc', padding: 15, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, marginTop: 10}}><div style={{width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden'}}><img src={searchResult.avatar_url || `https://ui-avatars.com/api/?name=${searchResult.full_name}&background=random`} style={{width: '100%', height: '100%', objectFit: 'cover'}} /></div><div style={{flex: 1}}><strong>{searchResult.full_name}</strong></div><button onClick={sendFriendRequest} style={{width: 'auto', padding: '6px 12px', fontSize: '0.8rem'}}><UserPlus size={16}/> Add</button></div>)}</div>)}
                      {friendTab === 'requests' && (<div>{requestsList.length === 0 ? <p style={{textAlign: 'center', color: '#94a3b8'}}>Nenhuma solicitação pendente.</p> : requestsList.map(req => (<div key={req.request_id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, background: '#fff', border: '1px solid #e2e8f0', padding: 10, borderRadius: 8}}><div style={{display: 'flex', alignItems: 'center', gap: 10}}><div style={{width: 35, height: 35, borderRadius: '50%', overflow: 'hidden'}}><img src={req.avatar_url || `https://ui-avatars.com/api/?name=${req.full_name}`} style={{width: '100%'}}/></div><span style={{fontSize: '0.9rem', fontWeight: 'bold'}}>{req.full_name}</span></div><div style={{display: 'flex', gap: 5}}><button onClick={() => respondRequest(req.request_id, true)} style={{width: 'auto', padding: 6, background: '#dcfce7', color: '#166534', border: 'none'}}><Check size={16}/></button><button onClick={() => respondRequest(req.request_id, false)} style={{width: 'auto', padding: 6, background: '#fee2e2', color: '#991b1b', border: 'none'}}><X size={16}/></button></div></div>))}</div>)}
                  </div>
              </div>
          </div>
      )}

      {showInstallPopup && (<div className="popup-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}><div style={{background: '#7C3AED', color: '#fff', width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, animation: 'slideUp 0.4s ease-out'}}><div style={{display: 'flex', gap: 15, alignItems: 'center', marginBottom: 20}}><div style={{width: 50, height: 50, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span style={{color: '#7C3AED', fontSize: '1.8rem', fontWeight: 'bold'}}>T</span></div><div><h3 style={{margin: 0, fontSize: '1.2rem', color: '#fff'}}>Instale o App</h3><p style={{margin: 0, fontSize: '0.9rem', color: '#e9d5ff'}}>Foco total, sem distrações do navegador.</p></div></div>{isIOS ? (<div style={{background: 'rgba(0,0,0,0.25)', padding: 15, borderRadius: 10, fontSize: '0.9rem', marginBottom: 15, border: '1px solid rgba(255,255,255,0.1)'}}><p style={{margin: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: '500'}}>1. Toque em Compartilhar <Share size={16} color="#fff"/></p><p style={{margin: '5px 0 0 0', color: '#fff', fontWeight: '500'}}>2. Selecione "Adicionar à Tela de Início"</p></div>) : (<button onClick={handleInstallClick} style={{background: '#fff', color: '#7C3AED', width: '100%', fontWeight: 'bold', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}><Download size={18}/> Adicionar à Tela de Início</button>)}<button onClick={handleCloseInstall} style={{background: 'transparent', color: '#fff', width: '100%', border: 'none', fontSize: '0.9rem', opacity: 0.8}}>Agora não</button></div></div>)}
      {showReminder && !showInstallPopup && (<div style={{position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 100, background: '#1e293b', color: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', animation: 'slideUp 0.5s ease-out'}}><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}><div style={{display: 'flex', gap: 12}}><div style={{background: '#7C3AED', padding: 8, borderRadius: '50%', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Bell size={18} color="white" /></div><div><strong style={{fontSize: '1rem', display: 'block', marginBottom: 4}}>{reminderMessage.title}</strong><p style={{fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4}}>{reminderMessage.text}</p></div></div><button onClick={() => setShowReminder(false)} style={{background: 'transparent', border: 'none', padding: 0, color: '#64748B', width: 'auto'}}><X size={20} /></button></div><button onClick={handlePopupAction} style={{width: '100%', marginTop: 15, background: '#fff', color: '#0f172a', fontWeight: 'bold', border: 'none', padding: '10px'}}>{reminderMessage.action}</button></div>)}
      <style>{`@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}