import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Adicionei o parâmetro "badgeName" na função
export async function processReflection(text, missionAttribute, badgeName) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn("Sem chave API. Usando modo offline.");
      return fallbackResponse(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prompt atualizado para incluir o Selo Oficial
    const prompt = `
      Você é o mentor do app "Tryly". Persona: Estoico, direto, motivador.
      
      O usuário completou a missão de atributo: "${missionAttribute}".
      Ao completar, ele ganhou o selo oficial: "${badgeName || 'Guerreiro'}".
      
      Relato do usuário: "${text}"
      
      Sua tarefa:
      1. Analise o relato.
      2. Dê um feedback curto e poderoso (máximo 2 frases).
      3. Se o relato for positivo, confirme que ele é digno do selo "${badgeName}".
      4. Termine SEMPRE com: "Go Try."
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
  if (lower.includes('não') || lower.includes('dificil') || lower.includes('medo')) {
    return "O erro é apenas um dado. O importante é que você não ficou parado. Amanhã tentamos de novo. Go Try.";
  }
  return "Excelente execução. A consistência vence o talento. Continue acumulando pequenas vitórias. Go Try.";
}