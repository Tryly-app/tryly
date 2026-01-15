import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin'; // <--- IMPORTANTE: Importando a página Admin

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuta mudanças no login (entrar/sair)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{display: 'flex', justifyContent: 'center', marginTop: '50px'}}>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz: Se não logado -> Login, Se logado -> App */}
        <Route path="/" element={!session ? <Login /> : <Navigate to="/app" />} />
        
        {/* Rota Principal */}
        <Route path="/app" element={session ? <Dashboard session={session} /> : <Navigate to="/" />} />
        
        {/* Rota de Perfil */}
        <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/" />} />

        {/* Rota de Admin (Nova) */}
        <Route path="/admin" element={session ? <Admin session={session} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;