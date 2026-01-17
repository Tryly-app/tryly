import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Recebe agora o 'customPrompt' (texto do sócio)
export async function processReflection(text, missionAttribute, badgeName, customPrompt) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      return fallbackResponse(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. Define a PERSONALIDADE (Sócio vs Padrão)
    let personaInstruction = "";

    if (customPrompt && customPrompt.trim().length > 0) {
        // --- MODO PERSONALIZADO (DEFINIDO NO ADMIN) ---
        personaInstruction = `
        DIRETRIZES DE PERSONALIDADE (PRIORIDADE TOTAL):
        ${customPrompt}
        
        Importante: Siga o tom de voz solicitado acima rigorosamente.
        `;
    } else {
        // --- MODO PADRÃO (O MESTRE) ---
        personaInstruction = `
        Contexto: Você é o "Mestre", a inteligência central do Tryly.
        Sua função é mentorar jovens aspirantes a fundadores.
        
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
      Atributo (XP/Foco): "${missionAttribute}"
      Selo em jogo: "${badgeName || 'Nenhum'}"
      
      --- RELATO DO USUÁRIO ---
      "${text}"
      
      --- SUA TAREFA ---
      Analise o relato com base na sua personalidade definida acima.
      Responda em no máximo 2 ou 3 frases.
      Finalize SEMPRE com uma chamada para ação curta (ex: "Construa.", "Avance.", "Go Try.").
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
  const lower = text.toLowerCase();
  if (text.length < 15) {
    return "Input insuficiente. Melhore sua análise de dados na próxima. Construa.";
  }
  return "Execução registrada. A consistência gera alavancagem. Continue operando.";
}