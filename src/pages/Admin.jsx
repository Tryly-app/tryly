import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Plus, Trash2, Edit2, X, GripVertical, BrainCircuit, Users, RefreshCcw, LayoutList, AlertTriangle } from 'lucide-react';

// --- COMPONENTE MODAL ATUALIZADO (Aceita cor e texto do botão) ---
const Modal = ({ title, onClose, onSave, children, saveLabel = "Salvar", saveColor = "#7C3AED", disableSave = false }) => (
  <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
    <div className="mission-card" style={{width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: 25, background: 'white', borderRadius: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <h3 style={{margin: 0, color: '#1E293B'}}>{title}</h3>
        <button className="outline" style={{width: 'auto', padding: 5, border: 'none', color: '#64748B'}} onClick={onClose}><X size={24}/></button>
      </div>
      
      {children}

      <div style={{display: 'flex', gap: 10, marginTop: 25}}>
        <button className="outline" onClick={onClose} style={{flex: 1, borderColor: '#E2E8F0', color: '#64748B'}}>
            Cancelar
        </button>
        <button 
            onClick={onSave} 
            disabled={disableSave}
            style={{
                flex: 1, 
                background: disableSave ? '#E2E8F0' : saveColor, 
                borderColor: disableSave ? '#E2E8F0' : saveColor,
                color: disableSave ? '#94A3B8' : 'white',
                cursor: disableSave ? 'not-allowed' : 'pointer'
            }}
        >
            {saveLabel}
        </button>
      </div>
    </div>
  </div>
);

export default function Admin({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); 
  
  // Trilhas
  const [trails, setTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [missions, setMissions] = useState([]);
  
  // Modais e Edição
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [tab, setTab] = useState('free');
  const [draggedItem, setDraggedItem] = useState(null);

  // --- NOVO: ESTADOS PARA O MODAL DE DELETAR ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

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
    if (error) console.error(error);
    setUsersList(data || []);
    setLoading(false);
  };

  // --- LÓGICA DE ARRASTAR (Drag & Drop) ---
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

  // --- CRUD TRILHAS ---
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
        alert("Erro: " + error.message);
    }
  };

  const handleDeleteTrail = async (id) => {
    if (confirm("Deletar trilha e suas missões?")) {
      await supabase.from('trails').delete().eq('id', id);
      fetchTrails();
    }
  };

  // --- CRUD MISSÕES ---
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
        alert("Erro: " + error.message);
    }
  };

  const handleDeleteMission = async (id) => {
    if (confirm("Apagar missão?")) {
      await supabase.from('missions').delete().eq('id', id);
      fetchMissions(selectedTrail.id);
    }
  };

  // --- LÓGICA DE DELETAR USUÁRIO (NOVA) ---
  
  // 1. Abre o Modal
  const openDeleteUserModal = (user) => {
    setUserToDelete(user);
    setDeleteConfirmationText('');
    setShowDeleteModal(true);
  };

  // 2. Executa a Deletion
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (deleteConfirmationText.toUpperCase() !== "DELETAR") return;

    try {
        setLoading(true);
        // Tenta apagar direto (agora que configuramos o CASCADE no banco)
        const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
        
        if (error) throw error;

        // Sucesso
        setShowDeleteModal(false);
        fetchUsers();
    } catch (error) {
        alert("Erro ao deletar: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleResetUser = async (userId, userName) => {
    if (window.confirm(`Zerar o progresso de ${userName}?`)) {
        try {
            setLoading(true);
            await supabase.from('user_progress').delete().eq('user_id', userId);
            await supabase.from('reflections').delete().eq('user_id', userId);
            await supabase.from('profiles').update({ xp: 0, level: 1, current_streak: 0 }).eq('id', userId);
            alert(`Progresso zerado.`);
            fetchUsers();
        } catch (error) {
            alert("Erro: " + error.message);
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
            <button onClick={() => { setView('list'); fetchTrails(); }} style={{flex: 1, background: view !== 'users' ? '#7C3AED' : 'transparent', color: view !== 'users' ? 'white' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
                <LayoutList size={18} /> Gestão de Trilhas
            </button>
            <button onClick={() => { setView('users'); fetchUsers(); }} style={{flex: 1, background: view === 'users' ? '#7C3AED' : 'transparent', color: view === 'users' ? 'white' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
                <Users size={18} /> Gestão de Usuários
            </button>
        </div>
      </header>

      {/* --- VISÃO: LISTA DE TRILHAS --- */}
      {view === 'list' && (
        <>
          <div style={{display: 'flex', marginBottom: 20, borderBottom: '1px solid #e2e8f0'}}>
             <button onClick={() => setTab('free')} style={{flex: 1, borderRadius: 0, background: tab === 'free' ? '#F3E8FF' : 'transparent', color: tab === 'free' ? '#7C3AED' : '#64748B', border: 'none', borderBottom: tab === 'free' ? '2px solid #7C3AED' : 'none', fontWeight: 'bold'}}>Trilhas Gratuitas</button>
             <button onClick={() => setTab('paid')} style={{flex: 1, borderRadius: 0, background: tab === 'paid' ? '#F3E8FF' : 'transparent', color: tab === 'paid' ? '#7C3AED' : '#64748B', border: 'none', borderBottom: tab === 'paid' ? '2px solid #7C3AED' : 'none', fontWeight: 'bold'}}>Trilhas PRO</button>
          </div>

          <button style={{marginBottom: 20}} onClick={() => { setFormData({ title: '', description: '', is_paid: tab === 'paid', ai_prompt: '' }); setEditingItem(null); setShowTrailModal(true); }}>
            <Plus size={18} style={{marginRight: 8}}/> Nova Trilha
          </button>

          <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
            {trails.filter(t => (tab === 'paid' ? t.is_paid : !t.is_paid)).map((trail, index) => (
               <div key={trail.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} className="mission-card" style={{padding: 20, display: 'flex', alignItems: 'center', gap: 15, cursor: 'grab', background: draggedItem === index ? '#f8fafc' : '#fff'}}>
                  <div style={{color: '#cbd5e1'}}><GripVertical size={20}/></div>
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
          </div>
        </>
      )}

      {/* --- VISÃO: DETALHES --- */}
      {view === 'detail' && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <button className="outline" style={{padding: 5, width: 'auto'}} onClick={() => setView('list')}><ArrowLeft size={16}/></button>
                <h3>{selectedTrail?.title}</h3>
            </div>
            <button style={{width: 'auto', fontSize: '0.8rem', padding: '8px 12px'}} onClick={() => { setFormData({ day_number: missions.length + 1 }); setEditingItem(null); setShowMissionModal(true); }}><Plus size={14} style={{marginRight: 5}}/> Adicionar</button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {missions.map(m => (
              <div key={m.id} style={{background: 'white', padding: 15, borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between'}}>
                <div style={{textAlign: 'left'}}>
                   <span className="status-badge" style={{padding: '2px 8px', fontSize: '0.65rem'}}>Dia {m.day_number}</span>
                   <strong style={{display: 'block', color: '#333'}}>{m.title}</strong>
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

      {/* --- VISÃO: GESTÃO DE USUÁRIOS --- */}
      {view === 'users' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
            {usersList.map(user => (
                <div key={user.id} className="mission-card" style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 15}}>
                    <div style={{textAlign: 'left'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                            <strong style={{fontSize: '1.1rem'}}>{user.full_name || 'Sem nome'}</strong>
                            <span style={{fontSize: '0.7rem', background: user.is_pro ? '#FEF3C7' : '#E2E8F0', color: user.is_pro ? '#D97706' : '#64748B', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold'}}>{user.is_pro ? 'PRO' : 'FREE'}</span>
                        </div>
                        <div style={{color: '#64748B', fontSize: '0.9rem', marginTop: 4}}>{user.email}</div>
                        <div style={{marginTop: 8, fontSize: '0.85rem'}}><strong>Lvl {user.level || 1}</strong> • {user.xp || 0} XP</div>
                    </div>
                    <div style={{display: 'flex', gap: 10, width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: 15}}>
                        <button className="outline" style={{flex: 1, fontSize: '0.9rem'}} onClick={() => handleResetUser(user.id, user.full_name)}>
                            <RefreshCcw size={16} style={{marginRight: 6}} /> Zerar
                        </button>
                        {/* BOTÃO QUE ABRE O MODAL NOVO */}
                        <button style={{flex: 1, fontSize: '0.9rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5'}} onClick={() => openDeleteUserModal(user)}>
                            <Trash2 size={16} style={{marginRight: 6}} /> Deletar
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* --- MODAIS DE TRILHA E MISSÃO (Mantidos) --- */}
      {showTrailModal && (
        <Modal title={editingItem ? "Editar Trilha" : "Nova Trilha"} onClose={() => setShowTrailModal(false)} onSave={handleSaveTrail}>
          <label>Nome</label><input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
          <label>Descrição</label><input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          <label>Prompt IA</label><textarea rows="3" value={formData.ai_prompt || ''} onChange={e => setFormData({...formData, ai_prompt: e.target.value})} />
          <div style={{display:'flex', gap:10, marginTop:10}}><input type="checkbox" checked={formData.is_paid || false} onChange={e => setFormData({...formData, is_paid: e.target.checked})}/><label>Trilha PRO?</label></div>
        </Modal>
      )}

      {showMissionModal && (
        <Modal title={editingItem ? "Editar Missão" : "Nova Missão"} onClose={() => setShowMissionModal(false)} onSave={handleSaveMission}>
          <div style={{display: 'flex', gap: 10}}>
             <div style={{flex: 1}}><label>Dia</label><input type="number" value={formData.day_number || ''} onChange={e => setFormData({...formData, day_number: e.target.value})} /></div>
             <div style={{flex: 2}}><label>XP</label><input type="number" value={formData.attribute || ''} onChange={e => setFormData({...formData, attribute: e.target.value})} /></div>
          </div>
          <label>Selo</label><input value={formData.badge_name || ''} onChange={e => setFormData({...formData, badge_name: e.target.value})} />
          <label>Título</label><input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
          <label>Descrição</label><textarea rows="3" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          <label>Botão</label><input value={formData.action_text || ''} onChange={e => setFormData({...formData, action_text: e.target.value})} />
        </Modal>
      )}

      {/* --- NOVO MODAL DE DELETAR (ESTILIZADO) --- */}
      {showDeleteModal && (
        <Modal 
            title="⚠️ Zona de Perigo" 
            onClose={() => setShowDeleteModal(false)} 
            onSave={confirmDeleteUser}
            saveLabel="Confirmar Exclusão"
            saveColor="#DC2626"
            disableSave={deleteConfirmationText.toUpperCase() !== "DELETAR"}
        >
           <div style={{textAlign: 'center'}}>
              <div style={{background: '#FEF2F2', padding: 20, borderRadius: 50, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                <AlertTriangle size={40} color="#DC2626" />
              </div>

              <p style={{color: '#475569', marginBottom: 20, lineHeight: 1.5}}>
                 Você está prestes a apagar <strong>PERMANENTEMENTE</strong> todos os dados de:<br/>
                 <span style={{color: '#7C3AED', fontWeight: 'bold', fontSize: '1.1rem', display: 'block', marginTop: 5}}>{userToDelete?.email}</span>
              </p>
              
              <div style={{background: '#FFF1F2', padding: 15, borderRadius: 8, border: '1px solid #FECDD3', marginBottom: 25}}>
                 <p style={{margin: 0, color: '#BE123C', fontSize: '0.85rem', fontWeight: 'bold'}}>Isso apagará perfil, histórico de missões e XP. Essa ação não pode ser desfeita.</p>
              </div>

              <label style={{display: 'block', textAlign: 'left', marginBottom: 8, fontSize: '0.9rem', color: '#334155', fontWeight: 'bold'}}>
                 Para confirmar, digite "DELETAR" abaixo:
              </label>
              <input 
                 value={deleteConfirmationText} 
                 onChange={(e) => setDeleteConfirmationText(e.target.value)}
                 placeholder="DELETAR"
                 style={{
                    width: '100%', 
                    padding: 12, 
                    border: deleteConfirmationText.toUpperCase() === 'DELETAR' ? '2px solid #22C55E' : '2px solid #E2E8F0', 
                    borderRadius: 8,
                    fontSize: '1rem',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    outline: 'none',
                    color: '#333'
                 }}
              />
           </div>
        </Modal>
      )}
    </div>
  );
}