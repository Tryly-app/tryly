import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function Admin({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // View: 'list' (lista de trilhas) ou 'detail' (lista de missões da trilha)
  const [view, setView] = useState('list'); 
  const [trails, setTrails] = useState([]);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [missions, setMissions] = useState([]);

  // Estados de Edição (Modais)
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Se null = Criando novo
  const [formData, setFormData] = useState({});

  useEffect(() => {
    checkAdminAndFetch();
  }, [session]);

  const checkAdminAndFetch = async () => {
    // 1. Segurança: Verifica se é admin mesmo
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile?.role !== 'admin') {
      alert("Você não tem permissão para estar aqui.");
      navigate('/app');
      return;
    }
    fetchTrails();
  };

  const fetchTrails = async () => {
    setLoading(true);
    const { data } = await supabase.from('trails').select('*').order('created_at');
    setTrails(data || []);
    setLoading(false);
  };

  const fetchMissions = async (trailId) => {
    setLoading(true);
    const { data } = await supabase
      .from('missions')
      .select('*')
      .eq('trail_id', trailId)
      .order('day_number', { ascending: true }); // Ordena pelo dia
    setMissions(data || []);
    setLoading(false);
  };

  // --- AÇÕES DE TRILHA ---
  const handleSaveTrail = async () => {
    if (!formData.title) return alert("Título obrigatório");
    
    if (editingItem) {
      await supabase.from('trails').update(formData).eq('id', editingItem.id);
    } else {
      await supabase.from('trails').insert(formData);
    }
    setShowTrailModal(false);
    fetchTrails();
  };

  const handleDeleteTrail = async (id) => {
    if (confirm("ATENÇÃO: Deletar a trilha apaga TODAS as missões dela. Continuar?")) {
      await supabase.from('trails').delete().eq('id', id);
      fetchTrails();
    }
  };

  // --- AÇÕES DE MISSÃO ---
  const handleSaveMission = async () => {
    if (!formData.title || !formData.day_number) return alert("Preencha título e dia");
    
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

  // --- COMPONENTE MODAL SIMPLES ---
  const Modal = ({ title, onClose, onSave, children }) => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="mission-card" style={{width: '90%', maxWidth: '500px', margin: 0, maxHeight: '90vh', overflowY: 'auto'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 20}}>
          <h3>{title}</h3>
          <button className="outline" style={{width: 'auto', padding: 5, border: 'none'}} onClick={onClose}><X size={20}/></button>
        </div>
        {children}
        <button onClick={onSave} style={{marginTop: 20}}>Salvar</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      {/* HEADER */}
      <header style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30}}>
        <button className="outline" style={{padding: 10, width: 'auto', borderRadius: '50%'}} 
          onClick={() => view === 'detail' ? setView('list') : navigate('/app')}>
          <ArrowLeft size={20}/>
        </button>
        <h2 style={{margin: 0, color: '#7C3AED'}}>
          {view === 'list' ? 'Gestão de Trilhas' : selectedTrail?.title}
        </h2>
      </header>

      {/* LISTA DE TRILHAS */}
      {view === 'list' && (
        <>
          <button style={{marginBottom: 20}} onClick={() => {
            setFormData({ title: '', description: '' });
            setEditingItem(null);
            setShowTrailModal(true);
          }}>
            <Plus size={18} style={{marginRight: 8}}/> Criar Nova Trilha
          </button>

          {trails.length === 0 && !loading && <p>Nenhuma trilha cadastrada.</p>}

          {trails.map(trail => (
            <div key={trail.id} className="mission-card" style={{marginTop: 15, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{textAlign: 'left', cursor: 'pointer', flex: 1}} onClick={() => {
                setSelectedTrail(trail);
                fetchMissions(trail.id);
                setView('detail');
              }}>
                <strong>{trail.title}</strong>
                <p style={{margin: 0, fontSize: '0.85rem'}}>{trail.description}</p>
              </div>
              <div style={{display: 'flex', gap: 8}}>
                <button className="outline" style={{width: 'auto', padding: 8}} onClick={() => {
                  setFormData(trail);
                  setEditingItem(trail);
                  setShowTrailModal(true);
                }}><Edit2 size={16}/></button>
                <button className="outline" style={{width: 'auto', padding: 8, color: 'red', borderColor: '#fee2e2'}} onClick={() => handleDeleteTrail(trail.id)}>
                  <Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* DETALHES DA TRILHA (MISSÕES) */}
      {view === 'detail' && (
        <>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <h3>Missões ({missions.length})</h3>
            <button style={{width: 'auto', fontSize: '0.8rem', padding: '8px 12px'}} onClick={() => {
              setFormData({ day_number: missions.length + 1, title: '', description: '', action_text: '', attribute: '' });
              setEditingItem(null);
              setShowMissionModal(true);
            }}>
              <Plus size={14} style={{marginRight: 5}}/> Adicionar
            </button>
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
                   <button className="outline" style={{width: 'auto', padding: 5}} onClick={() => {
                     setFormData(m);
                     setEditingItem(m);
                     setShowMissionModal(true);
                   }}><Edit2 size={14}/></button>
                   <button className="outline" style={{width: 'auto', padding: 5, color: 'red', borderColor: '#fee2e2'}} onClick={() => handleDeleteMission(m.id)}>
                     <Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL TRILHA */}
      {showTrailModal && (
        <Modal title={editingItem ? "Editar Trilha" : "Nova Trilha"} onClose={() => setShowTrailModal(false)} onSave={handleSaveTrail}>
          <label className="text-left block mb-1">Nome</label>
          <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <label className="text-left block mb-1">Descrição</label>
          <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </Modal>
      )}

      {/* MODAL MISSÃO */}
      {showMissionModal && (
        <Modal title={editingItem ? "Editar Missão" : "Nova Missão"} onClose={() => setShowMissionModal(false)} onSave={handleSaveMission}>
          <div style={{display: 'flex', gap: 10}}>
             <div style={{flex: 1}}>
                <label>Dia</label>
                <input type="number" value={formData.day_number} onChange={e => setFormData({...formData, day_number: e.target.value})} />
             </div>
             <div style={{flex: 2}}>
                <label>Atributo (XP)</label>
                <input value={formData.attribute} onChange={e => setFormData({...formData, attribute: e.target.value})} placeholder="Ex: Foco" />
             </div>
          </div>
          <label>Título</label>
          <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          <label>Descrição (Instrução)</label>
          <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <label>Texto do Botão</label>
          <input value={formData.action_text} onChange={e => setFormData({...formData, action_text: e.target.value})} placeholder="Ex: Feito!" />
        </Modal>
      )}
    </div>
  );
}