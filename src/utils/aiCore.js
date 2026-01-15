// src/utils/aiCore.js

export async function processReflection(text, missionAttribute) {
  // Simula um tempo de "pensamento" da IA para dar credibilidade
  await new Promise(resolve => setTimeout(resolve, 1500));

  const lowerText = text.toLowerCase();

  // 1. ANÁLISE DE SENTIMENTO (BÁSICA)
  
  // Palavras que indicam SUCESSO / CONQUISTA
  const successKeywords = ['consegui', 'fiz', 'feito', 'fácil', 'legal', 'top', 'incrivel', 'incrível', 'boa', 'deu certo', 'venci', 'otimo', 'ótimo'];
  
  // Palavras que indicam DIFICULDADE / FALHA / MEDO
  const struggleKeywords = ['não consegui', 'nao consegui', 'difícil', 'dificil', 'medo', 'vergonha', 'travou', 'quase', 'ruim', 'chato', 'tentei mas'];

  // 2. SELEÇÃO DA RESPOSTA (PERSONA "GO TRY")

  // CENÁRIO A: Usuário indicou dificuldade ou falha
  if (struggleKeywords.some(word => lowerText.includes(word))) {
    return "Sem problemas. Errar é apenas coletar dados. Até os maiores gênios falharam antes de acertar. O importante é que você não ficou parado na fila. Amanhã a gente ajusta o plano. Go Try.";
  }

  // CENÁRIO B: Usuário indicou sucesso
  if (successKeywords.some(word => lowerText.includes(word))) {
    return "Eficiente. Você acaba de descobrir que o mundo é moldável por quem age. Saboreie essa vitória, mas não relaxe. O sistema é grande e a gente só começou. Go Try.";
  }

  // CENÁRIO C: Texto muito curto ou preguiçoso (Cobrança)
  if (text.length < 15) {
    return "O conforto é uma armadilha silenciosa. Tentar já te coloca na frente de 99% das pessoas. Você vai ser o cara que faz ou o que assiste? Acorda. Go Try.";
  }

  // CENÁRIO D: Resposta padrão inspiradora (Neutro/Positivo)
  return `Tentar já é vencer! Você acabou de ganhar +${missionAttribute}. A consistência é o segredo que ninguém te conta. Continue assim. Go Try.`;
}