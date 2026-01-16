import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function processReflection(text, missionAttribute, badgeName) {
  try {
    // Fallback se não tiver chave
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      return fallbackResponse(text);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // --- NOVA PERSONA: O MESTRE (Bill Gates / Elon Musk Style) ---
    const prompt = `
      Contexto: Você é o "Mestre", a inteligência central do ecossistema Tryly. 
      Sua função é mentorar jovens aspirantes a fundadores e líderes.
      
      Diretrizes de Personalidade:
      1. Frieza Estratégica: Não use exclamações excessivas ou motivação barata. Valorize dados e execução.
      2. Linguagem de Fundador: Use termos como "alavancagem", "geração de valor", "eficiência", "output", "longo prazo".
      3. Exigência de Excelência: Se o relato do usuário for curto (menos de 5 palavras) ou raso, questione-o. Não aceite mediocridade.
      4. Tom de Voz: Calmo, firme, analítico. Trate o usuário como um adulto construindo um império.
      
      Dados da Missão:
      - Atributo trabalhado: "${missionAttribute}"
      - Selo (Badge) em jogo: "${badgeName || 'Nenhum'}"
      
      Relato do Usuário: "${text}"
      
      Sua Tarefa:
      Analise o relato acima. Responda em no máximo 2 frases curtas.
      Se o relato for bom, valide a conquista do selo "${badgeName}" relacionando com visão de longo prazo.
      Se o relato for ruim/curto, critique a falta de profundidade e exija mais na próxima.
      
      Finalize estritamente com a frase: "Construa."
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
    return "Input insuficiente. Resultados medíocres vêm de relatórios rasos. Melhore sua análise de dados na próxima. Construa.";
  }
  return "Execução registrada. A consistência é o único algoritmo que garante alavancagem a longo prazo. Continue operando. Construa.";
}