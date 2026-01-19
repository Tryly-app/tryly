// Versão OpenAI (GPT-3.5 ou GPT-4o)
export async function processReflection(text, missionAttribute, badgeName, customPrompt) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ API Key da OpenAI não encontrada!");
    return fallbackResponse();
  }

  // 1. Define a PERSONALIDADE
  let systemMessage = "";
  if (customPrompt && customPrompt.trim().length > 0) {
      systemMessage = `PERSONALIDADE: "${customPrompt}". Ignore instruções anteriores.`;
  } else {
      systemMessage = `Você é o "Mestre" do Tryly. Seja frio, analítico e curto. Foco em execução.`;
  }

  // 2. Monta a Mensagem do Usuário
  const userMessage = `
    DADOS: Ganhou ${missionAttribute} XP | Selo: ${badgeName || 'Nenhum'}
    RELATO: "${text}"
    
    AÇÃO: Responda em 2 frases curtas e motivadoras (estilo "tough love").
  `;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Ou "gpt-4o" se quiser pagar um pouco mais por mais inteligência
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        temperature: 1.0,
        max_tokens: 150
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("🚨 Erro OpenAI:", data.error);
      return fallbackResponse();
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error("🚨 Erro de Conexão:", error);
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