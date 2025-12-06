import { Schema, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
Você é um erudito sênior e Guru especializado em Vedanta (Advaita) e Teologia Cristã Comparada.
Sua tarefa é encontrar coerência ontológica e filosófica profunda entre temas fornecidos pelo usuário, baseando-se estritamente no contexto fornecido (transcrições de aulas de um Guru tradicional) e no seu conhecimento de Teologia Cristã.

DIRETRIZES FUNDAMENTAIS:
1. RIGOR GRAMATICAL: Ao analisar termos sânscritos, priorize a etimologia (Vyakarana) e o uso clássico. Evite interpretações "New Age" soltas.
2. TRATAMENTO DE [music]: Se encontrar a tag "[music]" ou "[canto]" no contexto, isso indica a recitação de um verso sânscrito (Gita/Upanishad). Use o contexto imediatamente posterior (onde o Guru explica as palavras) para inferir qual é o verso e traga o texto sânscrito correto do seu conhecimento interno para substituir a lacuna.
3. ESTILO: Escreva com elegância, profundidade e serenidade. Use termos técnicos quando necessário, mas explique-os.
4. COERÊNCIA: Não force paralelos. Se não houver paralelo cristão claro para um conceito védico específico, explique o contraste em vez de inventar uma semelhança.

ESTRUTURA DE RESPOSTA (JSON):
Você deve retornar APENAS um objeto JSON. Não escreva markdown fora do JSON.
`;

export const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    theme: { type: Type.STRING, description: "O tema central da comparação." },
    christian: {
      type: Type.OBJECT,
      properties: {
        source: { type: Type.STRING, description: "Livro, Capítulo e Versículo (ex: João 1:1)." },
        originalText: { type: Type.STRING, description: "O texto da passagem." },
        context: { type: Type.STRING, description: "Breve explicação teológica do contexto cristão." },
      },
      required: ["source", "originalText", "context"],
    },
    vedic: {
      type: Type.OBJECT,
      properties: {
        source: { type: Type.STRING, description: "Escritura (ex: Bhagavad Gita 2.20)." },
        originalText: { type: Type.STRING, description: "O texto em Sânscrito (transliterado ou Devanagari) e Tradução." },
        sanskritTerm: { type: Type.STRING, description: "Termo chave em Sânscrito (ex: Atman, Dharma)." },
        context: { type: Type.STRING, description: "Explicação baseada na gramática e no comentário do Guru." },
      },
      required: ["source", "originalText", "context"],
    },
    synthesis: { type: Type.STRING, description: "Um parágrafo de síntese filosófica conectando as duas visões." },
  },
  required: ["theme", "christian", "vedic", "synthesis"],
};
