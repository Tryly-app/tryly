import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addUser } from '../data/db';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if(!name || !email || !password) return alert("Preencha tudo!");

    const { user, error } = addUser(name, email, password);

    if (error) {
      alert(error);
    } else {
      alert("Conta criada com sucesso! Faça login.");
      navigate('/');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
      <h1>Crie sua conta 🚀</h1>
      <form onSubmit={handleRegister}>
        <input 
          type="text" placeholder="Seu Nome" 
          value={name} onChange={e => setName(e.target.value)}
        />
        <input 
          type="email" placeholder="Email" 
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input 
          type="password" placeholder="Senha" 
          value={password} onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" style={{width: '100%'}}>Cadastrar</button>
      </form>
      <p style={{marginTop: 20}}>
        Já tem conta? <Link to="/" style={{color: '#58cc02'}}>Entrar</Link>
      </p>
    </div>
  );
}   