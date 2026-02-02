import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Privacy from './pages/Privacy';
import Invite from './pages/Invite'; 

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{display: 'flex', justifyContent: 'center', marginTop: '50px'}}>Carregando...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!session ? <Login /> : <Navigate to="/app" />} />
        
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/invite/:id" element={<Invite />} />

        <Route path="/app" element={session ? <Dashboard session={session} /> : <Navigate to="/" />} />
        <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/" />} />
        <Route path="/admin" element={session ? <Admin session={session} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;