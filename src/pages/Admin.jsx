import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Plus, Trash2, Edit2, X, GripVertical, BrainCircuit, Users, RefreshCcw, LayoutList } from 'lucide-react';

const Modal = ({ title, onClose, onSave, children }) => (
  <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
    <div className="mission-card" style={{width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: 25}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
        <h3>{title}</h3>
        <button className="outline" style={{width: 'auto', padding: 5, border: 'none'}} onClick={onClose}><X size={20}/></button>
      </div>
      {children}
      <button onClick={onSave} style={{marginTop: 20}}>Salvar</button>
    </div>
  </div>
);

export default function Admin({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); 
  
  // Trilhas
  const [trails, setTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [missions, setMissions] = useState([]);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [tab, setTab] = useState('free');
  const [draggedItem, setDraggedItem] = useState(null);

  // Usuários
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    checkAdminAndFetch();
  }, [session]);

  const checkAdminAndFetch = async () => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') {
      alert("Acesso negado.");
      navigate('/app');
      return;
    }
    fetchTrails();
  };

  const fetchTrails = async () => {
    setLoading(true);
    const { data } = await supabase.from('trails').select('*').order('position', { ascending: true });
    setTrails(data || []);
    setLoading(false);
  };

  const fetchMissions = async (trailId) => {
    setLoading(true);
    const { data } = await supabase.from('missions').select('*').eq('trail_id', trailId).order('day_number', { ascending: true });
    setMissions(data || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Erro ao buscar usuários:", error);
    } else {
        console.log("Usuários carregados:", data); // Olhe o Console (F12) para ver se o XP está vindo
    }
    setUsersList(data || []);
    setLoading(false);
  };

  const handleDragStart = (e, index) => setDraggedItem(index);
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, index) => {
    if (draggedItem === null || draggedItem === index) return;
    const currentTrails = trails.filter(t => (tab === 'paid' ? t.is_paid : !t.is_paid));
    const itemToMove = currentTrails[draggedItem];
    const newList = [...currentTrails];
    newList.splice(draggedItem, 1);
    newList.splice(index, 0, itemToMove);
    const otherTrails = trails.filter(t => (tab === 'paid' ? !t.is_paid : t.is_paid));
    const newFullList = [...otherTrails, ...newList];
    setTrails(newFullList); 
    setDraggedItem(null);
    for (let i = 0; i < newList.length; i++) {
        await supabase.from('trails').update({ position: i }).eq('id', newList[i].id);
    }
    fetchTrails();
  };

  const handleSaveTrail = async () => {
    if (!formData.title) return alert("Título obrigatório");
    const isPaid = formData.is_paid === true; 
    try {
        let error;
        if (editingItem) {
          const res = await supabase.from('trails').update({ ...formData, is_paid: isPaid }).eq('id', editingItem.id);
          error = res.error;
        } else {
          const maxPos = trails.length > 0 ? Math.max(...trails.map(t => t.position || 0)) : 0;
          const res = await supabase.from('trails').insert({ ...formData, is_paid: isPaid, position: maxPos + 1 });
          error = res.error;
        }
        if (error) throw error;
        setShowTrailModal(false);
        fetchTrails();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
  };

  const handleDeleteTrail = async (id) => {
    if (confirm("Deletar trilha e suas missões?")) {
      const { error } = await supabase.from('trails').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchTrails();
    }
  };

  const handleSaveMission = async () => {
    if (!formData.title || !formData.day_number) return alert("Dados incompletos");
    const payload = { ...formData, trail_id: selectedTrail.id };
    try {
        let error;
        if (editingItem) {
          const res = await supabase.from('missions').update(payload).eq('id', editingItem.id);
          error = res.error;
        } else {
          const res = await supabase.from('missions').insert(payload);
          error = res.error;
        }
        if (error) throw error;
        setShowMissionModal(false);
        fetchMissions(selectedTrail.id);
    } catch (error) {
        alert("Erro ao salvar missão: " + error.message);
    }
  };

  const handleDeleteMission = async (id) => {
    if (confirm("Apagar missão?")) {
      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchMissions(selectedTrail.id);
    }
  };

  // --- CORREÇÃO NA DELEÇÃO ---
  const handleDeleteUser = async (userId, userEmail) => {
    const confirmation = window.prompt(`ATENÇÃO: Isso apagará PERMANENTEMENTE todos os dados de ${userEmail}.\n\nPara confirmar, digite "DELETAR":`);
    
    // Verifica se digitou DELETAR (Maiúsculo ou Minúsculo)
    if (confirmation && confirmation.toUpperCase() === "DELETAR") {
        try {
            setLoading(true);
            // 1. Limpa tabelas relacionadas
            await supabase.from('user_progress').delete().eq('user_id', userId);
            await supabase.from('reflections').delete().eq('user_id', userId);
            await supabase.from('friendships').delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`);
            
            // 2. Apaga o Perfil
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            
            if (error) {
                // Se der erro de permissão (RLS), avisa o usuário
                if (error.code === '42501') {
                    throw new Error("Permissão negada. Você precisa configurar a política RLS no Supabase para permitir que Admins deletem usuários.");
                }
                throw error;
            }
            
            alert("Usuário deletado do banco de dados!");
            fetchUsers();
        } catch (error) {
            alert("ERRO: " + error.message);
        } finally {
            setLoading(false);
        }
    } else if (confirmation) {
        alert("Texto de confirmação incorreto. A ação foi cancelada.");
    }
  };

  const handleResetUser = async (userId, userName) => {
    if (window.confirm(`Tem certeza que deseja ZERAR o progresso de ${userName}?`)) {
        try {
            setLoading(true);
            await supabase.from('user_progress').delete().eq('user_id', userId);
            await supabase.from('reflections').delete().eq('user_id', userId);

            const { error } = await supabase.from('profiles').update({
                xp: 0,
                level: 1,
                current_streak: 0,
                longest_streak: 0
            }).eq('id', userId);

            if (error) throw error;
            alert(`Progresso zerado com sucesso.`);
            fetchUsers();
        } catch (error) {
            alert("Erro ao resetar: " + error.message);
        } finally {
            setLoading(false);
        }
    }
  };

  return (
    <div className="container">
      <header style={{marginBottom: 30}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20}}>
            <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%'}} onClick={() => navigate('/app')}><ArrowLeft size={20}/></button>
            <h2 style={{margin: 0, color: '#7C3AED'}}>Painel do Mestre</h2>
        </div>

        <div style={{display: 'flex', gap: 10, background: 'white', padding: 5, borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}>
            <button 
                onClick={() => { setView('list'); fetchTrails(); }} 
                style={{
                    flex: 1, 
                    background: view !== 'users' ? '#7C3AED' : 'transparent', 
                    color: view !== 'users' ? 'white' : '#64748B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
            >
                <LayoutList size={18} /> Gestão de Trilhas
            </button>
            <button 
                onClick={() => { setView('users'); fetchUsers(); }} 
                style={{
                    flex: 1, 
                    background: view === 'users' ? '#7C3AED' : 'transparent', 
                    color: view === 'users' ? 'white' : '#64748B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
            >
                <Users size={18} /> Gestão de Usuários
            </button>
        </div>
      </header>

      {view === 'list' && (
        <>
          <div style={{display: 'flex', marginBottom: 20, borderBottom: '1px solid #e2e8f0'}}>
             <button onClick={() => setTab('free')} style={{flex: 1, borderRadius: 0, background: tab === 'free' ? '#F3E8FF' : 'transparent', color: tab === 'free' ? '#7C3AED' : '#64748B', border: 'none', borderBottom: tab === 'free' ? '2px solid #7C3AED' : 'none', fontWeight: 'bold'}}>Trilhas Gratuitas</button>
             <button onClick={() => setTab('paid')} style={{flex: 1, borderRadius: 0, background: tab === 'paid' ? '#F3E8FF' : 'transparent', color: tab === 'paid' ? '#7C3AED' : '#64748B', border: 'none', borderBottom: tab === 'paid' ? '2px solid #7C3AED' : 'none', fontWeight: 'bold'}}>Trilhas PRO</button>
          </div>

          <button style={{marginBottom: 20}} onClick={() => { 
              setFormData({ title: '', description: '', is_paid: tab === 'paid', ai_prompt: '' }); 
              setEditingItem(null); 
              setShowTrailModal(true); 
          }}>
            <Plus size={18} style={{marginRight: 8}}/> Nova Trilha
          </button>

          <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
            {trails.filter(t => (tab === 'paid' ? t.is_paid : !t.is_paid)).map((trail, index) => (
               <div 
                 key={trail.id} 
                 draggable
                 onDragStart={(e) => handleDragStart(e, index)}
                 onDragOver={handleDragOver}
                 onDrop={(e) => handleDrop(e, index)}
                 className="mission-card" 
                 style={{padding: 20, display: 'flex', alignItems: 'center', gap: 15, cursor: 'grab', background: draggedItem === index ? '#f8fafc' : '#fff', transition: 'all 0.2s'}}
               >
                  <div style={{color: '#cbd5e1', cursor: 'grab'}}><GripVertical size={20}/></div>
                  <div style={{flex: 1, textAlign: 'left', cursor: 'pointer'}} onClick={() => { setSelectedTrail(trail); fetchMissions(trail.id); setView('detail'); }}>
                     <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <strong>{trail.title}</strong>
                        {trail.is_paid && <span style={{fontSize: '0.6rem', background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold'}}>PRO</span>}
                        {trail.ai_prompt && <BrainCircuit size={14} color="#7C3AED" />}
                     </div>
                     <p style={{margin: 0, fontSize: '0.85rem'}}>{trail.description}</p>
                  </div>
                  <div style={{display: 'flex', gap: 8}}>
                    <button className="outline" style={{width: 'auto', padding: 8}} onClick={() => { setFormData(trail); setEditingItem(trail); setShowTrailModal(true); }}><Edit2 size={16}/></button>
                    <button className="outline" style={{width: 'auto', padding: 8, color: 'red', borderColor: '#fee2e2'}} onClick={() => handleDeleteTrail(trail.id)}><Trash2 size={16}/></button>
                  </div>
               </div>
            ))}
            {trails.filter(t => (tab === 'paid' ? t.is_paid : !t.is_paid)).length === 0 && <p style={{textAlign: 'center', color: '#94a3b8'}}>Nenhuma trilha nesta categoria.</p>}
          </div>
        </>
      )}

      {view === 'detail' && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <button className="outline" style={{padding: 5, width: 'auto'}} onClick={() => setView('list')}><ArrowLeft size={16}/></button>
                <h3>Missões de: {selectedTrail?.title}</h3>
            </div>
            <button style={{width: 'auto', fontSize: '0.8rem', padding: '8px 12px'}} onClick={() => { setFormData({ day_number: missions.length + 1, title: '', description: '', action_text: '', attribute: '', badge_name: '' }); setEditingItem(null); setShowMissionModal(true); }}><Plus size={14} style={{marginRight: 5}}/> Adicionar</button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {missions.map(m => (
              <div key={m.id} style={{background: 'white', padding: 15, borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', textAlign: 'left'}}>
                <div>
                   <span className="status-badge" style={{padding: '2px 8px', fontSize: '0.65rem'}}>Dia {m.day_number}</span>
                   <strong style={{display: 'block', color: '#333'}}>{m.title}</strong>
                   <span style={{fontSize: '0.8rem', color: '#64748B'}}>{m.attribute} XP {m.badge_name && `• ${m.badge_name}`}</span>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
                   <button className="outline" style={{width: 'auto', padding: 5}} onClick={() => { setFormData(m); setEditingItem(m); setShowMissionModal(true); }}><Edit2 size={14}/></button>
                   <button className="outline" style={{width: 'auto', padding: 5, color: 'red', borderColor: '#fee2e2'}} onClick={() => handleDeleteMission(m.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'users' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
            <div style={{background: '#EFF6FF', padding: 15, borderRadius: 8, fontSize: '0.9rem', color: '#1E40AF', border: '1px solid #DBEAFE'}}>
                <strong>Nota:</strong> Se o XP estiver zero, verifique se seu app está salvando o XP total na tabela 'profiles'.
            </div>

            {usersList.map(user => (
                <div key={user.id} className="mission-card" style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'flex-start'}}>
                    <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{textAlign: 'left'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                                <strong style={{fontSize: '1.1rem'}}>{user.full_name || 'Sem nome'}</strong>
                                <span style={{fontSize: '0.7rem', background: user.is_pro ? '#FEF3C7' : '#E2E8F0', color: user.is_pro ? '#D97706' : '#64748B', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold'}}>
                                    {user.is_pro ? 'PRO' : 'FREE'}
                                </span>
                            </div>
                            <div style={{color: '#64748B', fontSize: '0.9rem', marginTop: 4}}>{user.email}</div>
                            <div style={{marginTop: 8, fontSize: '0.85rem'}}>
                                <strong>Nível {user.level || 1}</strong> • {user.xp || 0} XP • {user.current_streak || 0} dias de ofensiva
                            </div>
                        </div>
                    </div>

                    <div style={{display: 'flex', gap: 10, width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: 15}}>
                        <button 
                            className="outline" 
                            style={{flex: 1, fontSize: '0.9rem', borderColor: '#CBD5E1', color: '#475569'}}
                            onClick={() => handleResetUser(user.id, user.full_name || user.email)}
                        >
                            <RefreshCcw size={16} style={{marginRight: 6}} /> Zerar Progresso
                        </button>
                        
                        <button 
                            style={{flex: 1, fontSize: '0.9rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5'}}
                            onClick={() => handleDeleteUser(user.id, user.email)}
                        >
                            <Trash2 size={16} style={{marginRight: 6}} /> Deletar
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {showTrailModal && (
        <Modal title={editingItem ? "Editar Trilha" : "Nova Trilha"} onClose={() => setShowTrailModal(false)} onSave={handleSaveTrail}>
          <label style={{display:'block', textAlign:'left', marginBottom:5}}>Nome da Trilha</label>
          <input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Desbloqueio Social" />
          <label style={{display:'block', textAlign:'left', marginBottom:5, marginTop:10}}>Descrição Curta</label>
          <input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Perca a timidez em 7 dias" />
          <label style={{display:'block', textAlign:'left', marginBottom:5, marginTop:15, color: '#7C3AED', fontWeight: 'bold'}}>
            <BrainCircuit size={14} style={{marginRight: 5, display: 'inline'}} />
            Personalidade da IA
          </label>
          <textarea rows="4" value={formData.ai_prompt || ''} onChange={e => setFormData({...formData, ai_prompt: e.target.value})} placeholder="Ex: Seja agressivo e curto." style={{background: '#F3E8FF', borderColor: '#C084FC'}}/>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: 10, background: '#f8fafc', borderRadius: 8}}>
             <input type="checkbox" id="is_paid_check" checked={formData.is_paid || false} onChange={e => setFormData({...formData, is_paid: e.target.checked})} style={{width: '20px', height: '20px'}} />
             <label htmlFor="is_paid_check" style={{margin: 0, cursor: 'pointer', fontWeight: 'bold', color: '#334155'}}>Esta trilha é exclusiva PRO?</label>
          </div>
        </Modal>
      )}

      {showMissionModal && (
        <Modal title={editingItem ? "Editar Missão" : "Nova Missão"} onClose={() => setShowMissionModal(false)} onSave={handleSaveMission}>
          <div style={{display: 'flex', gap: 10}}>
             <div style={{flex: 1}}><label>Dia</label><input type="number" value={formData.day_number || ''} onChange={e => setFormData({...formData, day_number: e.target.value})} /></div>
             <div style={{flex: 2}}><label>XP</label><input type="number" value={formData.attribute || ''} onChange={e => setFormData({...formData, attribute: e.target.value})} /></div>
          </div>
          <label style={{marginTop: 10, display: 'block'}}>Nome do Selo</label><input value={formData.badge_name || ''} onChange={e => setFormData({...formData, badge_name: e.target.value})} />
          <label>Título</label><input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
          <label>Descrição</label><textarea rows="3" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          <label>Ação (Botão)</label><input value={formData.action_text || ''} onChange={e => setFormData({...formData, action_text: e.target.value})} />
        </Modal>
      )}
    </div>
  );
}