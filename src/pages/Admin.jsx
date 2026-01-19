import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Plus, Trash2, Edit2, X, GripVertical, BrainCircuit, Users, RefreshCcw, LayoutList, AlertTriangle, AlertCircle } from 'lucide-react';

// --- COMPONENTE MODAL FLEXÍVEL (Aceita cor, ícone e validação) ---
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
                cursor: disableSave ? 'not-allowed' : 'pointer',
                opacity: disableSave ? 0.7 : 1
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
  
  // Dados
  const [trails, setTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [missions, setMissions] = useState([]);
  const [usersList, setUsersList] = useState([]);
  
  // Estados de Edição e Drag&Drop
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [tab, setTab] = useState('free');
  const [draggedItem, setDraggedItem] = useState(null);

  // --- ESTADOS PARA OS MODAIS DE AÇÃO (DELETAR E ZERAR) ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

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

  // --- DRAG AND DROP ---
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

  // --- CRUD TRILHAS E MISSÕES (Mantido igual) ---
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

  // --- FUNÇÕES DE USUÁRIO (NOVAS) ---
  
  // 1. ABRIR MODAIS
  const openDeleteUserModal = (user) => {
    setUserToDelete(user);
    setDeleteConfirmationText('');
    setShowDeleteModal(true);
  };

  const openResetUserModal = (user) => {
    setUserToReset(user);
    setResetConfirmationText('');
    setShowResetModal(true);
  };

  // 2. EXECUTAR AÇÕES
  const confirmDeleteUser = async () => {
    if (!userToDelete || deleteConfirmationText.toUpperCase() !== "DELETAR") return;

    try {
        setLoading(true);
        // Graças ao CASCADE no banco, apagar o profile apaga tudo.
        const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
        if (error) throw error;
        setShowDeleteModal(false);
        fetchUsers();
    } catch (error) {
        alert("Erro ao deletar: " + error.message);
    } finally {
        setLoading(false);
    }
  };

 const confirmResetUser = async () => {
    if (!userToReset || resetConfirmationText.toUpperCase() !== "ZERAR") return;
    
    try {
        setLoading(true);

        // 1. Apaga APENAS o histórico de textos/reflexões (O passado é apagado)
        await supabase.from('reflections').delete().eq('user_id', userToReset.id);
        
        // 2. REINICIA o progresso para o Dia 1 (Mantém a trilha que ele escolheu, mas volta pro início)
        // Se usar .delete() aqui, ele perde a escolha da trilha. O .update() é melhor.
        const { error: progressError } = await supabase.from('user_progress').update({
            current_day: 1,
            status: 'new',       // Volta status para "novo"
            last_completed_at: null
        }).eq('user_id', userToReset.id);

        // Caso o usuário não tenha progresso ainda (edge case), tentamos deletar só pra garantir limpeza
        if (progressError) {
             console.log("Usuário sem progresso ativo ou erro, tentando limpeza total...");
             await supabase.from('user_progress').delete().eq('user_id', userToReset.id);
        }

        // 3. Reseta os atributos do Perfil (XP, Nível, Ofensiva)
        await supabase.from('profiles').update({ 
            xp: 0, 
            level: 1, 
            current_streak: 0,
            longest_streak: 0 
        }).eq('id', userToReset.id);

        setShowResetModal(false);
        fetchUsers();
        alert(`O usuário ${userToReset.email} foi reiniciado para o Dia 1.`);

    } catch (error) {
        alert("Erro ao resetar: " + error.message);
    } finally {
        setLoading(false);
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

      {/* --- VISÃO LISTA --- */}
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

      {/* --- VISÃO DETALHE --- */}
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

      {/* --- VISÃO USUÁRIOS --- */}
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
                        <button className="outline" style={{flex: 1, fontSize: '0.9rem'}} onClick={() => openResetUserModal(user)}>
                            <RefreshCcw size={16} style={{marginRight: 6}} /> Zerar Progresso
                        </button>
                        <button style={{flex: 1, fontSize: '0.9rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5'}} onClick={() => openDeleteUserModal(user)}>
                            <Trash2 size={16} style={{marginRight: 6}} /> Deletar
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* --- MODAIS DE TRILHA E MISSÃO --- */}
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

      {/* --- MODAL DE DELETAR (VERMELHO) --- */}
      {showDeleteModal && (
        <Modal 
            title="⚠️ Exclusão Permanente" 
            onClose={() => setShowDeleteModal(false)} 
            onSave={confirmDeleteUser}
            saveLabel="DELETAR CONTA"
            saveColor="#DC2626"
            disableSave={deleteConfirmationText.toUpperCase() !== "DELETAR"}
        >
           <div style={{textAlign: 'center'}}>
              <div style={{background: '#FEF2F2', padding: 20, borderRadius: 50, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                <AlertTriangle size={40} color="#DC2626" />
              </div>
              <p style={{color: '#475569', marginBottom: 20}}>
                 Você vai apagar <strong>TUDO</strong> de:<br/><span style={{color: '#7C3AED', fontWeight: 'bold'}}>{userToDelete?.email}</span>
              </p>
              <label style={{display: 'block', textAlign: 'left', marginBottom: 8, fontSize: '0.8rem', fontWeight: 'bold', color: '#64748B'}}>DIGITE "DELETAR" PARA CONFIRMAR:</label>
              <input 
                 value={deleteConfirmationText} 
                 onChange={(e) => setDeleteConfirmationText(e.target.value)}
                 placeholder="DELETAR"
                 style={{width: '100%', padding: 12, border: deleteConfirmationText.toUpperCase() === 'DELETAR' ? '2px solid #DC2626' : '1px solid #CBD5E1', textAlign: 'center', fontWeight: 'bold'}}
              />
           </div>
        </Modal>
      )}

      {/* --- MODAL DE RESET (LARANJA) --- */}
      {showResetModal && (
        <Modal 
            title="🔄 Zerar Progresso" 
            onClose={() => setShowResetModal(false)} 
            onSave={confirmResetUser}
            saveLabel="ZERAR TUDO"
            saveColor="#D97706" // Laranja
            disableSave={resetConfirmationText.toUpperCase() !== "ZERAR"}
        >
           <div style={{textAlign: 'center'}}>
              <div style={{background: '#FFFBEB', padding: 20, borderRadius: 50, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
                <AlertCircle size={40} color="#D97706" />
              </div>
              <p style={{color: '#475569', marginBottom: 20}}>
                 Isso vai voltar o Nível para 1 e XP para 0 de:<br/><span style={{color: '#7C3AED', fontWeight: 'bold'}}>{userToReset?.email}</span>
              </p>
              <div style={{background: '#FFF7ED', padding: 10, borderRadius: 8, border: '1px solid #FFEDD5', marginBottom: 20, fontSize: '0.85rem', color: '#C2410C'}}>
                <strong>Atenção:</strong> As conquistas e o histórico de missões serão perdidos para sempre. A conta continuará existindo.
              </div>
              <label style={{display: 'block', textAlign: 'left', marginBottom: 8, fontSize: '0.8rem', fontWeight: 'bold', color: '#64748B'}}>DIGITE "ZERAR" PARA CONFIRMAR:</label>
              <input 
                 value={resetConfirmationText} 
                 onChange={(e) => setResetConfirmationText(e.target.value)}
                 placeholder="ZERAR"
                 style={{width: '100%', padding: 12, border: resetConfirmationText.toUpperCase() === 'ZERAR' ? '2px solid #D97706' : '1px solid #CBD5E1', textAlign: 'center', fontWeight: 'bold'}}
              />
           </div>
        </Modal>
      )}
    </div>
  );
}