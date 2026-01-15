import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMissions } from '../data/db'; // Agora usamos getMissions
import confetti from 'canvas-confetti';
import { LogOut, CheckCircle, Play } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]); // State para as missões
  const [meuProgresso, setMeuProgresso] = useState({});

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('tryly_user'));
    if (!savedUser) navigate('/');
    setUser(savedUser);

    // Carregar missões dinâmicas do nosso "banco"
    setMissions(getMissions());

    const savedProgress = JSON.parse(localStorage.getItem('tryly_progress')) || {};
    setMeuProgresso(savedProgress);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('tryly_user');
    navigate('/');
  };

  const handleMissionAction = (missionId, totalDays) => {
    const hoje = new Date().toISOString().split('T')[0];
    const progressoAtual = meuProgresso[missionId] || { current_day: 0, completed: false, started: false, last_completed_at: null };

    let novoProgresso;

    if (!progressoAtual.started) {
      alert("Missão Iniciada! O cronômetro começou.");
      novoProgresso = { ...progressoAtual, current_day: 0, started: true }; 
    } else {
      const novoDia = progressoAtual.current_day + 1;
      const terminou = novoDia >= totalDays;

      if (terminou) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#58cc02', '#ffffff', '#a855f7']
        });
        alert("PARABÉNS! Missão completa!");
      } else {
        const falta = totalDays - novoDia;
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
        alert(`Boa! Você concluiu o dia ${novoDia}. Faltam apenas ${falta} dias.`);
      }

      novoProgresso = { 
        current_day: novoDia, 
        completed: terminou, 
        last_completed_at: hoje,
        started: true
      };
    }

    const novoEstadoGeral = { ...meuProgresso, [missionId]: novoProgresso };
    setMeuProgresso(novoEstadoGeral);
    localStorage.setItem('tryly_progress', JSON.stringify(novoEstadoGeral));
  };

  if (!user) return null;

  return (
    <div>
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <img src={user.avatar} alt="Avatar" style={{width: 50, borderRadius: '50%'}} />
          <div style={{textAlign: 'left'}}>
            <h3 style={{margin: 0}}>{user.name}</h3>
            <small style={{color: '#888'}}>Nível {user.level} • {user.role === 'admin' ? 'Mestre' : 'Herói'}</small>
          </div>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
            {user.role === 'admin' && (
                <button onClick={() => navigate('/admin')} style={{padding: '8px 12px', fontSize: '0.8em'}}>Painel</button>
            )}
            <button onClick={handleLogout} style={{background: 'transparent', border: '1px solid #444', boxShadow: 'none'}}><LogOut size={16}/></button>
        </div>
      </header>

      <h2 style={{textAlign: 'left'}}>Suas Missões Diárias</h2>

      {missions.map(mission => {
        const progresso = meuProgresso[mission.id] || { current_day: 0, completed: false, started: false };
        const hoje = new Date().toISOString().split('T')[0];
        const jaFezHoje = progresso.last_completed_at === hoje;
        const percentual = (progresso.current_day / mission.total_days) * 100;

        return (
          <div key={mission.id} className="card">
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <h3>{mission.title}</h3>
              <span style={{color: '#00ff88', fontWeight: 'bold'}}>+{mission.xp_reward} XP</span>
            </div>
            <p style={{color: '#ccc'}}>{mission.description}</p>
            
            {progresso.started && (
              <>
                 <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8em'}}>
                    <span>Dia {progresso.current_day} de {mission.total_days}</span>
                    <span>{Math.round(percentual)}%</span>
                 </div>
                 <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${percentual}%`}}></div>
                 </div>
              </>
            )}

            <div style={{marginTop: '15px'}}>
               {progresso.completed ? (
                 <button disabled style={{background: '#2ecc71', color: '#fff', width: '100%'}}>
                    <CheckCircle size={16} style={{verticalAlign: 'middle'}}/> Missão Concluída!
                 </button>
               ) : !progresso.started ? (
                 <button className="btn-secondary" onClick={() => handleMissionAction(mission.id, mission.total_days)} style={{width: '100%'}}>
                    <Play size={16} style={{verticalAlign: 'middle'}}/> Iniciar Desafio
                 </button>
               ) : (
                 <button 
                    onClick={() => handleMissionAction(mission.id, mission.total_days)} 
                    disabled={jaFezHoje}
                    style={{width: '100%', opacity: jaFezHoje ? 0.5 : 1}}
                 >
                    {jaFezHoje ? "Volte amanhã" : "Concluir Dia"}
                 </button>
               )}
            </div>
          </div>
        )
      })}
    </div>
  );
}