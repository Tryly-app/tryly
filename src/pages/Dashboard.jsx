import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { processReflection } from '../utils/aiCore';
import { User, Flame, Clock, Settings } from 'lucide-react'; // Adicionei Settings

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [activeTrail, setActiveTrail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Estado novo para o Admin
  
  const [view, setView] = useState('dashboard');
  const [reflectionText, setReflectionText] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const firstName = session.user.user_metadata.full_name?.split(' ')[0] || 'Viajante';

  useEffect(() => {
    fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Busca perfil COMPLETO (avatar e role)
    // CORREÇÃO: Antes estava .select('avatar_url'), agora pegamos tudo
    let { data: profile } = await supabase
        .from('profiles')
        .select('*') 
        .eq('id', session.user.id)
        .single();
        
    if (profile) {
        setAvatarUrl(profile.avatar_url);
        setIsAdmin(profile.role === 'admin'); // Verifica se é admin
        console.log("Perfil carregado:", profile.role); // Para debug no console (F12)
    }

    // 2. Busca progresso E A TRILHA ASSOCIADA
    let { data: prog } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    // Se usuário não tiver trilha no progresso, busca a primeira disponível (fallback)
    let trailId = prog?.trail_id;
    if (!trailId) {
        const { data: firstTrail } = await supabase.from('trails').select('id').limit(1).single();
        if (firstTrail) trailId = firstTrail.id;
    }

    // Busca Infos da Trilha Ativa
    if (trailId) {
        const { data: trail } = await supabase.from('trails').select('*').eq('id', trailId).single();
        setActiveTrail(trail);

        // Se o progresso não existir ou não tiver trail_id, cria ou atualiza
        if (!prog) {
             const { data: newProg } = await supabase.from('user_progress').insert({
                 user_id: session.user.id, current_day: 1, trail_id: trailId
             }).select().single();
             prog = newProg;
        } else if (!prog.trail_id) {
            await supabase.from('user_progress').update({ trail_id: trailId }).eq('user_id', session.user.id);
            prog.trail_id = trailId;
        }
    }

    // 3. Busca Missão do dia baseada na trilha
    if (prog && trailId) {
      let { data: mission } = await supabase
        .from('missions')
        .select('*')
        .eq('trail_id', trailId)
        .eq('day_number', prog.current_day)
        .maybeSingle(); 
      
      setProgress(prog);
      setCurrentMission(mission);
    }
    setLoading(false);
  };

  const isMissionLocked = () => {
    if (!progress || !progress.last_completed_at) return false;
    const today = new Date().toISOString().split('T')[0];
    return progress.last_completed_at === today && progress.status === 'completed';
  };

  const startMission = async () => {
    await supabase.from('user_progress').update({ status: 'in_progress' }).eq('user_id', session.user.id);
    setView('dashboard');
    fetchData();
  };

  const finishMission = () => setView('reflection');

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

  if (loading && !aiResponse) return <div className="container center"><p>Carregando...</p></div>;

  // VIEWS SECUNDÁRIAS
  if (view === 'reflection') {
    return (
      <div className="container">
        <h2>Check-in Diário</h2>
        <p style={{marginBottom: 20}}>Como foi realizar: <strong>"{currentMission.action_text}"</strong>?</p>
        <textarea rows="6" placeholder="Escreva aqui..." value={reflectionText} onChange={e => setReflectionText(e.target.value)} />
        <button onClick={submitReflection} disabled={loading}>{loading ? 'Analisando...' : 'Enviar Relato'}</button>
        <button className="outline mt-4" onClick={() => setView('dashboard')}>Cancelar</button>
      </div>
    );
  }

  if (view === 'feedback') {
    return (
      <div className="container center" style={{justifyContent: 'center'}}>
        <div style={{fontSize: '4rem', marginBottom: 10}}>✨</div>
        <h2 style={{color: '#7C3AED'}}>Missão Cumprida!</h2>
        <div className="mission-card" style={{border: 'none', background: '#F3E8FF', boxShadow: 'none'}}>
          <small style={{fontWeight: 'bold', letterSpacing: 1}}>FEEDBACK DO SISTEMA</small>
          <p style={{color: '#4B5563', fontStyle: 'italic', marginTop: 15, fontSize: '1.1rem'}}>"{aiResponse}"</p>
          <div className="status-badge" style={{marginTop: 20, background: '#fff'}}>+ {currentMission.attribute}</div>
        </div>
        <button onClick={backToHome} style={{marginTop: 30}}>Voltar ao Menu</button>
      </div>
    );
  }

  if (view === 'mission') {
    return (
      <div className="container">
        <div className="status-badge">Dia {currentMission.day_number}</div>
        <h1>{currentMission.title}</h1>
        <p style={{fontSize: '1.1rem', marginTop: 20}}>{currentMission.description}</p>
        <div className="mission-card">
          <h3 style={{color: '#7C3AED'}}>Sua Ação</h3>
          <p style={{fontWeight: '600', fontSize: '1.2rem'}}>{currentMission.action_text}</p>
        </div>
        <div style={{marginTop: 'auto'}}>
          <button onClick={startMission}>Aceitar Desafio</button>
          <button className="outline mt-4" onClick={() => setView('dashboard')}>Voltar</button>
        </div>
      </div>
    );
  }

  // DASHBOARD PRINCIPAL
  const locked = isMissionLocked();
  const percent = Math.min(100, Math.round(((progress?.current_day - 1) / 14) * 100));

  return (
    <div className="container">
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30}}>
        <div>
          <small style={{textTransform: 'uppercase', fontWeight: 'bold', color: '#94a3b8', fontSize: '0.7rem'}}>Bem-vindo de volta</small>
          <h2 style={{margin: 0}}>{firstName}</h2>
        </div>
        
        <div style={{display: 'flex', gap: 10}}>
            {/* CORREÇÃO: Botão de Admin só aparece se isAdmin for true */}
            {isAdmin && (
                 <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%', borderColor: '#7C3AED', color:'#7C3AED'}} 
                    onClick={() => navigate('/admin')}>
                    <Settings size={20}/>
                 </button>
             )}

            <div 
                onClick={() => navigate('/profile')}
                style={{
                    width: 45, height: 45, borderRadius: '50%', 
                    background: '#E2E8F0', overflow: 'hidden', 
                    border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
            {avatarUrl ? (
                <img src={avatarUrl} alt="Perfil" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            ) : (
                <User size={24} color="#64748B"/>
            )}
            </div>
        </div>
      </header>

      {/* WIDGET TRILHA */}
      <div style={{marginBottom: 40}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8}}>
          <div>
             <h3 style={{margin: 0, fontSize: '1.1rem'}}>{activeTrail?.title || 'Carregando trilha...'}</h3>
             <small style={{color: '#64748B'}}>{activeTrail?.description}</small>
          </div>
          <span style={{fontWeight: 'bold', color: '#7C3AED'}}>{percent}%</span>
        </div>
        <div className="progress-container">
          <div className="progress-fill" style={{width: `${percent}%`}}></div>
        </div>
      </div>

      {/* CARD PRINCIPAL (HERO) */}
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {!currentMission ? (
            <div className="mission-card">
                <h3>Trilha Finalizada!</h3>
                <p>Você completou todas as missões desta trilha.</p>
            </div>
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
                <div className="status-badge">
                    <Flame size={14} style={{marginRight: 5}}/> Dia {currentMission?.day_number}
                </div>
                <h2 style={{fontSize: '1.8rem', marginBottom: 10}}>{currentMission?.title}</h2>
                <p>{currentMission?.action_text}</p>
                
                {progress?.status === 'in_progress' ? (
                    <button onClick={finishMission} style={{marginTop: 30}}>
                    Concluir Missão
                    </button>
                ) : (
                    <button onClick={() => setView('mission')} style={{marginTop: 30}}>
                    Ver Detalhes
                    </button>
                )}
                </>
            )}
            </div>
        )}
      </div>
    </div>
  );
}