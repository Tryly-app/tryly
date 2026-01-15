// DADOS PADRÃO (Seed)
const defaultUsers = [
  {
    id: 1,
    name: "Jovem Padawan",
    email: "teste@tryly.com",
    password: "123",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    level: 1,
    xp: 0,
    role: 'user' // 'admin' ou 'user'
  },
  {
    id: 99,
    name: "Mestre Admin",
    email: "admin@tryly.com",
    password: "admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    level: 99,
    xp: 99999,
    role: 'admin'
  }
];

const defaultMissions = [
  {
    id: 1,
    title: "O Caminho do Guerreiro",
    description: "Caminhe ou trote 1km hoje.",
    total_days: 14,
    xp_reward: 50
  },
  {
    id: 2,
    title: "Força Bruta",
    description: "Faça 10 flexões agora.",
    total_days: 1,
    xp_reward: 20
  }
];

// --- FUNÇÕES SIMULANDO O BACKEND ---

// USUÁRIOS
export const getUsers = () => {
  const stored = localStorage.getItem('tryly_db_users');
  if (!stored) {
    localStorage.setItem('tryly_db_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(stored);
};

export const addUser = (name, email, password) => {
  const users = getUsers();
  // Simula verificação de email duplicado
  if (users.find(u => u.email === email)) return { error: "Email já cadastrado!" };

  const newUser = {
    id: Date.now(), // ID único baseado no tempo
    name,
    email,
    password,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    level: 1,
    xp: 0,
    role: 'user'
  };

  users.push(newUser);
  localStorage.setItem('tryly_db_users', JSON.stringify(users));
  return { user: newUser };
};

export const loginUser = (email, password) => {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  return user ? { user } : { error: "Credenciais inválidas" };
};

// MISSÕES
export const getMissions = () => {
  const stored = localStorage.getItem('tryly_db_missions');
  if (!stored) {
    localStorage.setItem('tryly_db_missions', JSON.stringify(defaultMissions));
    return defaultMissions;
  }
  return JSON.parse(stored);
};

export const addMission = (missionData) => {
  const missions = getMissions();
  const newMission = {
    id: Date.now(),
    ...missionData
  };
  missions.push(newMission);
  localStorage.setItem('tryly_db_missions', JSON.stringify(missions));
  return newMission;
};