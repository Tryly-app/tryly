// Simula a IA Core processando o feedback
// No futuro, isso seria uma Edge Function chamando OpenAI/Gemini
export async function processReflection(text, missionAttribute) {
  // Simula tempo de processamento
  await new Promise(resolve => setTimeout(resolve, 1500));

  const feedbacks = [
    `Excelente iniciativa. A ${missionAttribute} é construída na prática, não na teoria. Continue.`,
    `Interessante relato. Percebe-se que você hesitou, mas fez. Isso é ${missionAttribute}.`,
    `Ação sólida. O desconforto que você sentiu é o sinal de crescimento em ${missionAttribute}.`,
    `Validado. Pequenos passos como este acumulam uma enorme reserva de ${missionAttribute}.`
  ];

  // Retorna um feedback aleatório
  return feedbacks[Math.floor(Math.random() * feedbacks.length)];
}