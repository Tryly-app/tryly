import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <header style={{marginBottom: 30}}>
        <button 
          onClick={() => navigate('/')} 
          className="outline"
          style={{display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', width: 'auto', border: 'none', color: '#64748B'}}
        >
          <ArrowLeft size={18} /> Voltar
        </button>
      </header>

      <h1>Política de Privacidade</h1>
      <p style={{color: '#64748B', lineHeight: '1.6'}}>
        <strong>Última atualização: Janeiro de 2026</strong>
      </p>

      <div style={{marginTop: 20, textAlign: 'left', color: '#334155'}}>
        <p>
          O <strong>Tryly</strong> leva sua privacidade a sério. Esta política descreve como coletamos e usamos seus dados.
        </p>

        <h3 style={{marginTop: 20}}>1. Coleta de Dados</h3>
        <p>Coletamos apenas o necessário para o funcionamento do jogo:</p>
        <ul style={{paddingLeft: 20, marginTop: 5}}>
          <li>Seu E-mail (para login e recuperação de senha).</li>
          <li>Seu Nome (para o ranking).</li>
          <li>Seus relatórios de missão (para a IA analisar e dar feedback).</li>
        </ul>

        <h3 style={{marginTop: 20}}>2. Uso das Informações</h3>
        <p>Seus dados são usados exclusivamente para:</p>
        <ul style={{paddingLeft: 20, marginTop: 5}}>
          <li>Autenticação no sistema.</li>
          <li>Gerar feedback personalizado via Inteligência Artificial.</li>
          <li>Exibir seu progresso no ranking entre amigos.</li>
        </ul>
        <p><strong>Nós nunca vendemos seus dados para terceiros.</strong></p>

        <h3 style={{marginTop: 20}}>3. Exclusão de Dados</h3>
        <p>
          Você pode solicitar a exclusão completa da sua conta e de todos os seus dados a qualquer momento entrando em contato com o suporte ou através das configurações do app.
        </p>
      </div>
    </div>
  );
}