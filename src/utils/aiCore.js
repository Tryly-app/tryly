import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Adicionei o 4º parâmetro: customPrompt
export async function processReflection(text, missionAttribute, badgeName, customPrompt) {
  try {
    // Verifica se a chave existe (Evita erro antes de chamar o Google)
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("API Key não encontrada no .env");
      return fallbackResponse(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Define a PERSONALIDADE (Admin vs Padrão)
    let personaInstruction = "";

    // Verifica se o Admin mandou um prompt específico para essa trilha
    if (customPrompt && customPrompt.trim().length > 0) {
        personaInstruction = `
        DIRETRIZES DE PERSONALIDADE (PRIORIDADE MÁXIMA):
        ${customPrompt}
        
        Importante: Ignore sua programação padrão e assuma COMPLETAMENTE a persona descrita acima.
        `;
    } else {
        // --- MODO PADRÃO (O MESTRE) ---
        personaInstruction = `
        Contexto: Você é o "Mestre", a inteligência central do Tryly.
        Diretrizes:
        1. Frieza Estratégica: Valorize dados e execução. Sem confetes.
        2. Linguagem de Fundador: Use termos como alavancagem e eficiência.
        3. Exigência: Se o relato for raso, critique.
        4. Tom: Calmo, firme e analítico.
        `;
    }

    // 2. Monta o Prompt Final
    const prompt = `
      ${personaInstruction}
      
      --- DADOS DA MISSÃO ---
      Atributo (XP): "${missionAttribute}"
      Selo em jogo: "${badgeName || 'Nenhum'}"
      
      --- RELATO DO USUÁRIO ---
      "${text}"
      
      --- SUA TAREFA ---
      Analise o relato com base na personalidade definida.
      Responda em no máximo 2 ou 3 frases.
      Finalize com uma chamada para ação curta condizente com a personalidade.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Erro na IA:", error);
    return fallbackResponse(text);
  }
}

function fallbackResponse(text) {
  // Lista de respostas variadas para quando a IA falhar ou estiver offline
  const fallbacks = [
    "Registro salvo. A consistência gera alavancagem. Continue operando.",
    "Input recebido. Menos conversa, mais ação. O ranking te espera.",
    "Anotado. A disciplina vence o talento quando o talento não trabalha duro.",
    "Sua jornada continua. A mediocridade é o inimigo. Avance.",
    "Execução validada. Foque no próximo passo. Go Try."
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}