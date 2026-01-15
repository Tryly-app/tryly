import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Plus, Trash2, Edit2, X, GripVertical } from 'lucide-react';

// --- CORREÇÃO: O componente Modal agora fica FORA da função principal ---
// Isso resolve o problema de perder o foco ao digitar
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
  
  // View: 'list' (trilhas) ou 'detail' (missões)
  const [view, setView] = useState('list'); 
  const [trails, setTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [missions, setMissions] = useState([]);

  // Estados de Edição
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [tab, setTab] = useState('free'); // 'free' ou 'paid'

  // Estado para Drag and Drop
  const [draggedItem, setDraggedItem] = useState(null);

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

  // --- DRAG & DROP ---
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

    // Atualiza posições no banco
    for (let i = 0; i < newList.length; i++) {
        await supabase.from('trails').update({ position: i }).eq('id', newList[i].id);
    }
    fetchTrails();
  };

  // --- CRUD TRILHAS ---
  const handleSaveTrail = async () => {
    if (!formData.title) return alert("Título obrigatório");
    
    // Força o booleano correto
    const isPaid = formData.is_paid === true; 
    
    try {
        if (editingItem) {
          await supabase.from('trails').update({ ...formData, is_paid: isPaid }).eq('id', editingItem.id);
        } else {
          const maxPos = trails.length > 0 ? Math.max(...trails.map(t => t.position || 0)) : 0;
          await supabase.from('trails').insert({ ...formData, is_paid: isPaid, position: maxPos + 1 });
        }
        setShowTrailModal(false);
        fetchTrails();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
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
    if (editingItem) {
      await supabase.from('missions').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('missions').insert(payload);
    }
    setShowMissionModal(false);
    fetchMissions(selectedTrail.id);
  };

  const handleDeleteMission = async (id) => {
    if (confirm("Apagar missão?")) {
      await supabase.from('missions').delete().eq('id', id);
      fetchMissions(selectedTrail.id);
    }
  };

  return (
    <div className="container">
      <header style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30}}>
        <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%'}} onClick={() => view === 'detail' ? setView('list') : navigate('/app')}><ArrowLeft size={20}/></button>
        <h2 style={{margin: 0, color: '#7C3AED'}}>{view === 'list' ? 'Gestão de Trilhas' : selectedTrail?.title}</h2>
      </header>

      {view === 'list' && (
        <>
          <div style={{display: 'flex', marginBottom: 20, borderBottom: '1px solid #e2e8f0'}}>
             <button onClick={() => setTab('free')} style={{flex: 1, borderRadius: 0, background: tab === 'free' ? '#F3E8FF' : 'transparent', color: tab === 'free' ? '#7C3AED' : '#64748B', border: 'none', borderBottom: tab === 'free' ? '2px solid #7C3AED' : 'none', fontWeight: 'bold'}}>Trilhas Gratuitas</button>
             <button onClick={() => setTab('paid')} style={{flex: 1, borderRadius: 0, background: tab === 'paid' ? '#F3E8FF' : 'transparent', color: tab === 'paid' ? '#7C3AED' : '#64748B', border: 'none', borderBottom: tab === 'paid' ? '2px solid #7C3AED' : 'none', fontWeight: 'bold'}}>Trilhas PRO</button>
          </div>

          <button style={{marginBottom: 20}} onClick={() => { 
              // Inicializa o formulário (IMPORTANTE: setar strings vazias para não quebrar o input)
              setFormData({ title: '', description: '', is_paid: tab === 'paid' }); 
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
          <p style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: 20}}>Arraste os itens para definir a ordem sequencial.</p>
        </>
      )}

      {view === 'detail' && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <h3>Missões ({missions.length})</h3>
            <button style={{width: 'auto', fontSize: '0.8rem', padding: '8px 12px'}} onClick={() => { setFormData({ day_number: missions.length + 1, title: '', description: '', action_text: '', attribute: '' }); setEditingItem(null); setShowMissionModal(true); }}><Plus size={14} style={{marginRight: 5}}/> Adicionar</button>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {missions.map(m => (
              <div key={m.id} style={{background: 'white', padding: 15, borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', textAlign: 'left'}}>
                <div>
                   <span className="status-badge" style={{padding: '2px 8px', fontSize: '0.65rem'}}>Dia {m.day_number}</span>
                   <strong style={{display: 'block', color: '#333'}}>{m.title}</strong>
                   <span style={{fontSize: '0.8rem', color: '#64748B'}}>{m.attribute}</span>
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

      {/* --- MODAIS DE FORMULÁRIO --- */}
      
      {showTrailModal && (
        <Modal title={editingItem ? "Editar Trilha" : "Nova Trilha"} onClose={() => setShowTrailModal(false)} onSave={handleSaveTrail}>
          <label style={{display:'block', textAlign:'left', marginBottom:5}}>Nome da Trilha</label>
          <input 
            value={formData.title || ''} // Proteção contra null
            onChange={e => setFormData({...formData, title: e.target.value})} 
            placeholder="Ex: Desbloqueio Social" 
          />
          
          <label style={{display:'block', textAlign:'left', marginBottom:5, marginTop:10}}>Descrição Curta</label>
          <input 
            value={formData.description || ''} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            placeholder="Ex: Perca a timidez em 7 dias" 
          />
          
          {/* CHECKBOX PRO CORRIGIDO */}
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, padding: 10, background: '#f8fafc', borderRadius: 8}}>
             <input 
                type="checkbox" 
                id="is_paid_check"
                checked={formData.is_paid || false} 
                onChange={e => setFormData({...formData, is_paid: e.target.checked})} 
                style={{width: '20px', height: '20px'}} 
             />
             <label htmlFor="is_paid_check" style={{margin: 0, cursor: 'pointer', fontWeight: 'bold', color: '#334155'}}>Esta trilha é exclusiva PRO?</label>
          </div>
        </Modal>
      )}

      {showMissionModal && (
        <Modal title={editingItem ? "Editar Missão" : "Nova Missão"} onClose={() => setShowMissionModal(false)} onSave={handleSaveMission}>
          <div style={{display: 'flex', gap: 10}}>
             <div style={{flex: 1}}><label>Dia</label><input type="number" value={formData.day_number || ''} onChange={e => setFormData({...formData, day_number: e.target.value})} /></div>
             <div style={{flex: 2}}><label>Atributo (XP)</label><input value={formData.attribute || ''} onChange={e => setFormData({...formData, attribute: e.target.value})} placeholder="Ex: Foco" /></div>
          </div>
          
          {/* --- NOVO CAMPO: NOME DO SELO --- */}
          <label style={{marginTop: 10, display: 'block'}}>Nome do Selo (Badge)</label>
          <input 
            value={formData.badge_name || ''} 
            onChange={e => setFormData({...formData, badge_name: e.target.value})} 
            placeholder="Ex: Mente Blindada" 
            style={{background: '#F3E8FF', borderColor: '#7C3AED', fontWeight: 'bold'}}
          />

          <label>Título da Missão</label><input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
          <label>Descrição</label><textarea rows="3" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
          <label>Ação (Botão)</label><input value={formData.action_text || ''} onChange={e => setFormData({...formData, action_text: e.target.value})} placeholder="Ex: Feito!" />
        </Modal>
      )}
    </div>
  );
}