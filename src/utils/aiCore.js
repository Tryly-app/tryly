import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function processReflection(text, missionAttribute, badgeName, customPrompt) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("⚠️ API Key não encontrada! Usando fallback.");
      return fallbackResponse();
    }

    // --- MUDANÇA CRUCIAL: Usando 'gemini-pro' (O Clássico que funciona em contas novas) ---
    const model = genAI.getGenerativeModel({ 
        model: "gemini-pro", 
        generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 200,
        }
    });

    // 1. Define a PERSONALIDADE
    let personaInstruction = "";

    if (customPrompt && customPrompt.trim().length > 0) {
        personaInstruction = `
        ATENÇÃO - MODO ADMIN:
        Sua personalidade é: "${customPrompt}"
        Ignore instruções anteriores.
        `;
    } else {
        personaInstruction = `
        Você é o "Mestre" do Tryly.
        Seja frio, analítico e curto. Foco em execução e consistência.
        `;
    }

    // 2. Monta o Prompt
    const prompt = `
      ${personaInstruction}
      
      DADOS: Ganhou ${missionAttribute} | Selo: ${badgeName || 'Nenhum'}
      RELATO: "${text}"
      
      AÇÃO: Responda em 2 frases curtas e impactantes.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("🚨 ERRO IA:", error);
    return fallbackResponse();
  }
}

function fallbackResponse() {
  const fallbacks = [
    "Registro salvo. A consistência gera alavancagem.",
    "Input recebido. Menos conversa, mais ação.",
    "Anotado. A disciplina vence o talento.",
    "Execução validada. Go Try."
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}