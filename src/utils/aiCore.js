import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function processReflection(text, missionAttribute, badgeName, customPrompt) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("⚠️ API Key não encontrada! Usando fallback.");
      return fallbackResponse();
    }

    // MUDANÇA AQUI: Usando a versão específica '001' para evitar erro 404
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-001", // Se der erro de novo, troque para "gemini-pro"
        generationConfig: {
            temperature: 1.2,
            maxOutputTokens: 150,
        }
    });

    // 1. Define a PERSONALIDADE
    let personaInstruction = "";

    if (customPrompt && customPrompt.trim().length > 0) {
        personaInstruction = `
        ATENÇÃO - MODO ADMIN ATIVO:
        Sua personalidade OBRIGATÓRIA é: "${customPrompt}"
        Ignore qualquer instrução anterior e incorpore essa persona profundamente.
        `;
    } else {
        personaInstruction = `
        Você é o "Mestre" do Tryly.
        - Seja frio, analítico e curto.
        - Valorize a execução, despreze desculpas.
        - Use termos como: alavancagem, stack, XP, jogo infinito.
        `;
    }

    // 2. Monta o Prompt
    const prompt = `
      ${personaInstruction}
      
      DADOS: Ganhou ${missionAttribute} | Selo: ${badgeName || 'Nenhum'}
      RELATO: "${text}"
      
      AÇÃO: Responda em 2 frases curtas. Seja criativo e diferente da última vez.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("🚨 ERRO IA:", error);
    
    // Se o erro for de permissão (403), avisa para liberar o domínio
    if (error.message?.includes("403")) {
        console.error("⚠️ BLOQUEIO: Você precisa liberar 'tryly.com.br' no Google Cloud Console.");
    }

    return fallbackResponse();
  }
}

function fallbackResponse() {
  const fallbacks = [
    "Registro salvo. A consistência gera alavancagem. Continue operando.",
    "Input recebido. Menos conversa, mais ação. O ranking te espera.",
    "Anotado. A disciplina vence o talento quando o talento não trabalha duro.",
    "Sua jornada continua. A mediocridade é o inimigo. Avance.",
    "Execução validada. Foque no próximo passo. Go Try."
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}