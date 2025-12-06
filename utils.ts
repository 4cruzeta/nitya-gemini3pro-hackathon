
/**
 * Limpa o conteúdo de um arquivo SRT, removendo timestamps e numeração.
 */
export const cleanSRTContent = (content: string): string => {
  // Remove linhas de tempo (ex: 00:00:01,000 --> 00:00:04,000)
  let cleaned = content.replace(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, '');
  // Remove números de sequência isolados
  cleaned = cleaned.replace(/^\d+$/gm, '');
  // Remove linhas vazias excessivas e junta o texto
  cleaned = cleaned.replace(/\n\s*\n/g, '\n');
  return cleaned.trim();
};

/**
 * Gera o código TypeScript para o arquivo corpus.ts a partir do texto completo.
 */
export const generateCorpusCode = (fullText: string): string => {
  // Escapa crases para não quebrar a template string do JS
  const escapedText = fullText.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  return `
// ARQUIVO GERADO AUTOMATICAMENTE PELO MODO DESENVOLVEDOR DO APP
// Data: ${new Date().toISOString()}

export const STATIC_CORPUS = \`
${escapedText}
\`;
`;
};
