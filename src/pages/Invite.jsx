import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const INVITE_STORAGE_KEY = 'tryly_invite_id';

export function getStoredInviteId() {
  try {
    return localStorage.getItem(INVITE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredInviteId() {
  try {
    localStorage.removeItem(INVITE_STORAGE_KEY);
  } catch {}
}

export default function Invite() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    try {
      localStorage.setItem(INVITE_STORAGE_KEY, id);
    } catch {}
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app');
      else navigate('/');
    });
  }, [id, navigate]);

  return (
    <div className="container center" style={{ justifyContent: 'center', minHeight: '60vh' }}>
      <p>Redirecionando...</p>
    </div>
  );
}
