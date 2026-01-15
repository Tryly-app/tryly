import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { processReflection } from '../utils/aiCore';
import { User, Flame, Clock, Settings, X, Bell, Download, Share } from 'lucide-react';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Estados de Dados
  const [progress, setProgress] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [activeTrail, setActiveTrail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados de Popups
  const [deferredPrompt, setDeferredPrompt] = useState(null); 
  const [showInstallPopup, setShowInstallPopup] = useState(false); 
  const [showReminder, setShowReminder] = useState(false); 
  const [reminderMessage, setReminderMessage] = useState({ title: '', text: '', action: '' });
  const [isIOS, setIsIOS] = useState(false);

  const [view, setView] = useState('dashboard');
  const [reflectionText, setReflectionText] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const firstName = session.user.user_metadata.full_name?.split(' ')[0] || 'Viajante';

  useEffect(() => {
    // 1. Detecta iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // 2. Verifica se já está instalado (Modo Standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // 3. Listener para Android/Chrome
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
         setShowInstallPopup(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Fallback para iOS
    if (ios && !isStandalone) {
       setTimeout(() => setShowInstallPopup(true), 3000);
    }

    fetchData();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Busca perfil
    let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) {
        setAvatarUrl(profile.avatar_url);
        setIsAdmin(profile.role === 'admin');
    }

    // 2. Busca progresso
    let { data: prog } = await supabase.from('user_progress').select('*').eq('user_id', session.user.id).single();

    let trailId = prog?.trail_id;
    if (!trailId) {
        const { data: firstTrail } = await supabase.from('trails').select('id').limit(1).single();
        if (firstTrail) trailId = firstTrail.id;
    }

    if (trailId) {
        const { data: trail } = await supabase.from('trails').select('*').eq('id', trailId).single();
        setActiveTrail(trail);

        if (!prog) {
             const { data: newProg } = await supabase.from('user_progress').insert({
                 user_id: session.user.id, current_day: 1, trail_id: trailId, status: 'new' 
             }).select().single();
             prog = newProg;
        } else if (!prog.trail_id) {
            await supabase.from('user_progress').update({ trail_id: trailId }).eq('user_id', session.user.id);
            prog.trail_id = trailId;
        }
    }

    if (prog && trailId) {
      let { data: mission } = await supabase
        .from('missions')
        .select('*')
        .eq('trail_id', trailId)
        .eq('day_number', prog.current_day)
        .maybeSingle(); 
      
      setProgress(prog);
      setCurrentMission(mission);

      checkReminder(prog);
    }
    setLoading(false);
  };

  const checkReminder = (prog) => {
    if (prog.current_day === 1 && (prog.status === 'new' || !prog.status)) {
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const isCompletedToday = prog.last_completed_at === today && prog.status === 'completed';

    if (!isCompletedToday && prog.status !== 'in_progress') {
        setReminderMessage({
            title: "O tempo está passando...",
            text: "A missão de hoje ainda não foi cumprida. A mediocridade adora quando você deixa para depois.",
            action: "Ver Missão Agora"
        });
        setShowReminder(true);
    }
    else if (prog.status === 'in_progress') {
        setReminderMessage({
            title: "Não deixe pela metade",
            text: "Você aceitou o desafio, mas não concluiu. Execução incompleta não gera resultado.",
            action: "Finalizar Missão"
        });
        setShowReminder(true);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPopup(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleCloseInstall = () => {
      setShowInstallPopup(false);
  };

  const isMissionLocked = () => {
    if (!progress || !progress.last_completed_at) return false;
    const today = new Date().toISOString().split('T')[0];
    return progress.last_completed_at === today && progress.status === 'completed';
  };

  const startMission = async () => {
    await supabase.from('user_progress').update({ status: 'in_progress' }).eq('user_id', session.user.id);
    setView('dashboard');
    setShowReminder(false); 
    fetchData();
  };

  const finishMission = () => {
      setShowReminder(false);
      setView('reflection');
  };

  const submitReflection = async () => {
    if (reflectionText.length < 10) return alert("Escreva um pouco mais sobre como foi.");
    setLoading(true);
    const feedback = await processReflection(reflectionText, currentMission.attribute);
    setAiResponse(feedback);

    const today = new Date().toISOString().split('T')[0];
    await supabase.from('reflections').insert({
      user_id: session.user.id,
      mission_day: currentMission.day_number,
      user_text: reflectionText,
      ai_feedback: feedback
    });

    await supabase.from('user_progress').update({
      last_completed_at: today,
      status: 'completed',
      current_day: progress.current_day + 1
    }).eq('user_id', session.user.id);

    setLoading(false);
    setView('feedback');
  };

  const backToHome = () => {
    setView('dashboard');
    fetchData();
  };

  const handlePopupAction = () => {
      setShowReminder(false);
      if (progress.status === 'in_progress') {
          setView('reflection'); 
      } else {
          setView('dashboard');
      }
  };

  if (loading && !aiResponse) return <div className="container center"><p>Carregando...</p></div>;

  // VIEWS
  if (view === 'reflection') return ( <div className="container"><h2>Check-in Diário</h2><p className="mb-4">Como foi realizar: <strong>"{currentMission?.action_text}"</strong>?</p><textarea rows="6" placeholder="Escreva aqui..." value={reflectionText} onChange={e => setReflectionText(e.target.value)} /><button onClick={submitReflection} disabled={loading}>{loading ? 'Analisando...' : 'Enviar Relato'}</button><button className="outline mt-4" onClick={() => setView('dashboard')}>Cancelar</button></div> );
  if (view === 'feedback') return ( <div className="container center" style={{justifyContent:'center'}}><div style={{fontSize: '4rem', marginBottom: 10}}>✨</div><h2 style={{color: '#7C3AED'}}>Missão Cumprida!</h2><div className="mission-card" style={{border: 'none', background: '#F3E8FF', boxShadow: 'none'}}><small style={{fontWeight: 'bold'}}>FEEDBACK DO SISTEMA</small><p style={{color: '#4B5563', fontStyle: 'italic', marginTop: 15}}>"{aiResponse}"</p><div className="status-badge" style={{marginTop: 20, background: '#fff'}}>+ {currentMission?.attribute}</div></div><button onClick={backToHome} style={{marginTop: 30}}>Voltar ao Menu</button></div> );
  if (view === 'mission') return ( <div className="container"><div className="status-badge">Dia {currentMission?.day_number}</div><h1>{currentMission?.title}</h1><p style={{fontSize: '1.1rem', marginTop: 20}}>{currentMission?.description}</p><div className="mission-card"><h3 style={{color: '#7C3AED'}}>Sua Ação</h3><p style={{fontWeight: '600', fontSize: '1.2rem'}}>{currentMission?.action_text}</p></div><div style={{marginTop: 'auto'}}><button onClick={startMission}>Aceitar Desafio</button><button className="outline mt-4" onClick={() => setView('dashboard')}>Voltar</button></div></div> );

  // DASHBOARD
  const locked = isMissionLocked();
  const percent = Math.min(100, Math.round(((progress?.current_day - 1) / 14) * 100));

  return (
    <div className="container" style={{position: 'relative'}}>
      {/* HEADER */}
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30}}>
        <div>
          <small style={{textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', fontSize: '0.7rem'}}>Bem-vindo de volta</small>
          <h2 style={{margin: 0}}>{firstName}</h2>
        </div>
        <div style={{display: 'flex', gap: 10}}>
            {isAdmin && (
                 <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: '#7C3AED', color:'#7C3AED'}} 
                    onClick={() => navigate('/admin')}>
                    <Settings size={20}/>
                 </button>
             )}
            <div onClick={() => navigate('/profile')} style={{width: 45, height: 45, borderRadius: '50%', background: '#E2E8F0', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {avatarUrl ? <img src={avatarUrl} alt="Perfil" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={24} color="#64748B"/>}
            </div>
        </div>
      </header>

      {/* PROGRESSO */}
      <div style={{marginBottom: 40}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8}}>
          <div>
             <h3 style={{margin: 0, fontSize: '1.1rem'}}>{activeTrail?.title || 'Carregando...'}</h3>
             <small style={{color: '#64748B'}}>{activeTrail?.description}</small>
          </div>
          <span style={{fontWeight: 'bold', color: '#7C3AED'}}>{percent}%</span>
        </div>
        <div className="progress-container"><div className="progress-fill" style={{width: `${percent}%`}}></div></div>
      </div>

      {/* CARD PRINCIPAL */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {!currentMission ? (
            <div className="mission-card"><h3>Trilha Finalizada!</h3><p>Você completou todas as missões.</p></div>
        ) : (
            <div className={`mission-card ${locked ? 'locked-card' : ''}`}>
            {locked ? (
                <>
                <Clock size={40} style={{color: '#94a3b8', marginBottom: 15}} />
                <h3>Missão Concluída</h3>
                <p>Descanse e assimile o aprendizado de hoje.</p>
                <div style={{background: '#e2e8f0', padding: '8px', borderRadius: 8, display: 'inline-block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748B', marginTop: 10}}>
                    Próxima missão: 00:00
                </div>
                </>
            ) : (
                <>
                <div className="status-badge"><Flame size={14} style={{marginRight: 5}}/> Dia {currentMission?.day_number}</div>
                <h2 style={{fontSize: '1.8rem', marginBottom: 10}}>{currentMission?.title}</h2>
                <p>{currentMission?.action_text}</p>
                {progress?.status === 'in_progress' ? 
                    <button onClick={finishMission} style={{marginTop: 30}}>Concluir Missão</button> : 
                    <button onClick={() => setView('mission')} style={{marginTop: 30}}>Ver Detalhes</button>
                }
                </>
            )}
            </div>
        )}
      </div>

      {/* --- POPUP 1: INSTALAÇÃO DO APP --- */}
      {showInstallPopup && (
        <div className="popup-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }}>
            <div style={{
                background: '#7C3AED', color: '#fff', width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25,
                animation: 'slideUp 0.4s ease-out'
            }}>
                <div style={{display: 'flex', gap: 15, alignItems: 'center', marginBottom: 20}}>
                     <div style={{width: 50, height: 50, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                         <span style={{color: '#7C3AED', fontSize: '1.8rem', fontWeight: 'bold'}}>T</span>
                     </div>
                     <div>
                         <h3 style={{margin: 0, fontSize: '1.2rem', color: '#fff'}}>Instale o App</h3>
                         <p style={{margin: 0, fontSize: '0.9rem', color: '#e9d5ff'}}>Foco total, sem distrações do navegador.</p>
                     </div>
                </div>

                {isIOS ? (
                    <div style={{
                        background: 'rgba(0,0,0,0.25)', // Fundo escuro transparente para contraste
                        padding: 15, 
                        borderRadius: 10, 
                        fontSize: '0.9rem', 
                        marginBottom: 15,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <p style={{margin: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#fff', fontWeight: '500'}}>
                            1. Toque em Compartilhar <Share size={16} color="#fff"/>
                        </p>
                        <p style={{margin: '5px 0 0 0', color: '#fff', fontWeight: '500'}}>
                            2. Selecione "Adicionar à Tela de Início"
                        </p>
                    </div>
                ) : (
                    <button 
                        onClick={handleInstallClick}
                        style={{background: '#fff', color: '#7C3AED', width: '100%', fontWeight: 'bold', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}
                    >
                        <Download size={18}/> Adicionar à Tela de Início
                    </button>
                )}

                <button onClick={handleCloseInstall} style={{background: 'transparent', color: '#fff', width: '100%', border: 'none', fontSize: '0.9rem', opacity: 0.8}}>
                    Agora não
                </button>
            </div>
        </div>
      )}

      {/* --- POPUP 2: LEMBRETE --- */}
      {showReminder && !showInstallPopup && (
        <div style={{
            position: 'fixed', bottom: 20, left: 20, right: 20, zIndex: 100,
            background: '#1e293b', color: '#fff', borderRadius: 16, padding: 20,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.5s ease-out'
        }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div style={{display: 'flex', gap: 12}}>
                    <div style={{background: '#7C3AED', padding: 8, borderRadius: '50%', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Bell size={18} color="white" />
                    </div>
                    <div>
                        <strong style={{fontSize: '1rem', display: 'block', marginBottom: 4}}>{reminderMessage.title}</strong>
                        <p style={{fontSize: '0.85rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4}}>{reminderMessage.text}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowReminder(false)} 
                    style={{background: 'transparent', border: 'none', padding: 0, color: '#64748B', width: 'auto'}}
                >
                    <X size={20} />
                </button>
            </div>
            
            <button 
                onClick={handlePopupAction}
                style={{
                    width: '100%', marginTop: 15, background: '#fff', color: '#0f172a', 
                    fontWeight: 'bold', border: 'none', padding: '10px'
                }}
            >
                {reminderMessage.action}
            </button>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}