// src/utils/aiCore.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa a IA com a chave que está no arquivo .env
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function processReflection(text, missionAttribute) {
  try {
    // Se não tiver chave configurada, usa o modo offline (fallback)
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("Sem chave API. Usando modo offline.");
      return fallbackResponse(text);
    }

    // Configura o modelo (Gemini 1.5 Flash é rápido e barato/grátis)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // O Prompt define a "Personalidade" do seu App
    const prompt = `
      Você é o mentor do app "Tryly". Sua persona é: Estoico, direto, motivador, focado na ação e no progresso, não na perfeição.
      O usuário acabou de completar uma missão focada no atributo: "${missionAttribute}".
      
      Relato do usuário: "${text}"
      
      Sua tarefa:
      1. Analise o relato.
      2. Dê um feedback curto (máximo 2 frases).
      3. Se ele falhou, incentive a tentar de novo (o erro é dado).
      4. Se ele conseguiu, parabenize pela audácia, não pelo talento.
      5. Termine SEMPRE com a frase exata: "Go Try."
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("Erro na IA:", error);
    // Se a IA falhar (internet, cota, etc), usa a resposta programada para não travar o app
    return fallbackResponse(text);
  }
}

// --- RESPOSTA DE EMERGÊNCIA (Caso a IA falhe) ---
function fallbackResponse(text) {
  const lower = text.toLowerCase();
  if (lower.includes('não') || lower.includes('dificil') || lower.includes('medo')) {
    return "O erro é apenas um dado. O importante é que você não ficou parado. Amanhã tentamos de novo. Go Try.";
  }
  return "Excelente execução. A consistência vence o talento. Continue acumulando pequenas vitórias. Go Try.";
}