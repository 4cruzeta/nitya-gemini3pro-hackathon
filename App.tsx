
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ComparisonResult } from './types';
import { SAMPLE_TRANSCRIPT } from './sampleData';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type Tab = 'search' | 'knowledge';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Knowledge Base State
  const [guruContext, setGuruContext] = useState<string>("");
  const [fileCount, setFileCount] = useState(0);
  const [isDemoLoaded, setIsDemoLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to clean SRT noise
  const cleanSRTContent = (text: string): string => {
    return text
      // Remove timestamps and sequence numbers (standard SRT format)
      // Regex matches: Number followed by newline, then timestamp --> timestamp
      .replace(/\d+\s+\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/g, '')
      // Remove loose timestamps if format varies
      .replace(/\d{2}:\d{2}:\d{2},\d{3}/g, '')
      // Remove extra whitespace/newlines left behind
      .replace(/^\s*[\r\n]/gm, '')
      .trim();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      let combinedText = guruContext; // Keep existing text
      let newCount = 0;

      for (const file of files) {
        try {
          const text = await file.text();
          const cleanedText = file.name.endsWith('.srt') ? cleanSRTContent(text) : text;
          
          combinedText += `\n--- FONTE: ${file.name} ---\n${cleanedText}\n`;
          newCount++;
        } catch (e) {
          console.error("Erro ao ler arquivo:", file.name, e);
        }
      }

      setGuruContext(combinedText);
      setFileCount(prev => prev + newCount);
      setIsDemoLoaded(false); // User uploaded real data, so not demo mode anymore
    }
  };

  const loadDemoData = () => {
    setGuruContext(SAMPLE_TRANSCRIPT);
    setFileCount(1);
    setIsDemoLoaded(true);
    setActiveTab('search'); // Switch to search to show it's ready
  };

  const handleSearch = async () => {
    if (!theme.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Define the response schema strictly
      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          theme: { type: Type.STRING },
          christian: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING, description: "Livro, capítulo e verso (ex: João 1:1)" },
              originalText: { type: Type.STRING, description: "O texto sagrado em si" },
              context: { type: Type.STRING, description: "Breve explicação do contexto teológico" },
            },
            required: ["source", "originalText", "context"],
          },
          vedic: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING, description: "Escritura, capítulo e verso (ex: Bhagavad Gita 2.20)" },
              originalText: { type: Type.STRING, description: "O texto em Sânscrito (transliterado ou Devanagari)" },
              sanskritTerm: { type: Type.STRING, description: "Termo chave em Sânscrito (ex: Atman, Dharma)" },
              context: { type: Type.STRING, description: "Explicação baseada na gramática e no Guru" },
            },
            required: ["source", "originalText", "context", "sanskritTerm"],
          },
          synthesis: {
            type: Type.STRING,
            description: "Uma síntese profunda conectando os dois pontos de vista, buscando a Philosophia Perennis."
          },
        },
        required: ["theme", "christian", "vedic", "synthesis"],
      };

      const systemPrompt = `
        Você é um erudito especialista em Vedanta (Advaita) e Teologia Cristã.
        Sua tarefa é encontrar paralelos profundos e coerentes entre o tema fornecido pelo usuário e as escrituras.
        
        REGRAS CRUCIAIS:
        1. Baseie sua resposta Védica ESTRITAMENTE no contexto fornecido abaixo (transcrições do Guru), se disponível. Se o contexto não mencionar o tema, use seu conhecimento geral mas mantendo a postura rigorosa de análise gramatical do Sânscrito.
        2. O marcador "[music]" no texto indica que o Guru cantou um verso (shloka). Use o contexto da explicação ao redor para identificar QUAL verso é, e forneça o texto Sânscrito correto no campo 'originalText'.
        3. Priorize a precisão etimológica (ex: raiz das palavras em Sânscrito e Grego/Hebraico).
        4. Evite superficialidades "New Age". Busque a teologia clássica e o Vedanta tradicional.
        
        CONTEXTO DO ACERVO (Transcrição do Guru):
        ${guruContext || "Nenhum acervo carregado. Use seu conhecimento geral de Vedanta rigoroso."}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: `Analise o tema: "${theme}"` }] }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.3, // Low temperature for precision
        },
      });

      const jsonText = response.text;
      if (jsonText) {
        const parsedResult = JSON.parse(jsonText) as ComparisonResult;
        setResult(parsedResult);
      } else {
        throw new Error("Resposta vazia da IA.");
      }

    } catch (err: any) {
      console.error(err);
      setError("Não foi possível encontrar uma correlação ou houve um erro na análise. Tente outro tema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-gold-200 selection:text-stone-900">
      
      {/* Header */}
      <header className="bg-stone-900 text-stone-50 py-8 px-4 shadow-md border-b-4 border-gold-600">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-wider">LUMEN</h1>
            <p className="text-stone-400 font-serif italic text-sm mt-1">A Coerência Sagrada: Vedanta & Revelação</p>
          </div>
          <div className="flex space-x-1">
             <button 
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-t-md transition-colors font-serif ${activeTab === 'search' ? 'bg-stone-50 text-stone-900' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Busca
            </button>
            <button 
              onClick={() => setActiveTab('knowledge')}
              className={`px-4 py-2 rounded-t-md transition-colors font-serif ${activeTab === 'knowledge' ? 'bg-stone-50 text-stone-900' : 'text-stone-400 hover:text-stone-200'}`}
            >
              Acervo {fileCount > 0 && <span className="ml-1 text-xs bg-gold-600 text-white px-1.5 py-0.5 rounded-full">{fileCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        
        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-stone-200">
              <h2 className="text-2xl font-display text-stone-800 mb-4">Base de Conhecimento do Guru</h2>
              <p className="text-stone-600 mb-6 font-serif">
                Para garantir a precisão da interpretação, carregue as transcrições das aulas (arquivos .txt ou .srt). 
                A IA analisará os textos carregados para encontrar as explicações exatas.
              </p>
              
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <label className="block w-full p-4 border-2 border-dashed border-stone-300 rounded-lg text-center hover:border-gold-500 cursor-pointer transition-colors bg-stone-50">
                    <input 
                      type="file" 
                      multiple 
                      accept=".txt,.srt" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      ref={fileInputRef}
                    />
                    <span className="text-stone-600 font-medium block">Clique para carregar arquivos (.txt, .srt)</span>
                    <span className="text-stone-400 text-sm block mt-1">Suporta múltiplos arquivos</span>
                  </label>
                </div>
                
                <div className="flex items-center justify-center w-full md:w-auto h-full py-4 md:py-0">
                  <span className="text-stone-400 font-serif italic">- OU -</span>
                </div>

                <div className="flex-1 w-full">
                  <button 
                    onClick={loadDemoData}
                    className="w-full p-4 bg-stone-800 text-stone-100 rounded-lg hover:bg-stone-700 transition-colors border-2 border-transparent font-medium"
                  >
                    Carregar Dados de Demonstração
                    <span className="block text-xs text-stone-400 font-normal mt-1">(Ideal para Hackathon/Jurados)</span>
                  </button>
                </div>
              </div>

              {guruContext && (
                <div className="mt-6 p-4 bg-stone-100 rounded border-l-4 border-gold-500">
                  <p className="text-stone-700 font-medium flex items-center">
                    <span className="text-green-600 mr-2">●</span> 
                    {fileCount} arquivo(s) processado(s) e injetado(s) na memória.
                    {isDemoLoaded && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Modo Demo Ativo</span>}
                  </p>
                  <p className="text-xs text-stone-500 mt-2 truncate max-w-full">
                    Preview: {guruContext.substring(0, 100)}...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-8 animate-fade-in">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Digite um tema (ex: Graça, O Verbo, Dever, Sofrimento)..."
                className="w-full p-5 text-xl font-serif border-b-2 border-stone-300 bg-transparent focus:border-gold-600 focus:outline-none placeholder-stone-400 text-stone-800"
              />
              <button 
                onClick={handleSearch}
                disabled={loading || !theme}
                className="absolute right-2 top-4 px-6 py-2 bg-stone-900 text-white rounded hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Analisando...' : 'Buscar Coerência'}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 text-red-800 border-l-4 border-red-500 rounded font-serif">
                {error}
              </div>
            )}

            {/* Results Display */}
            {result && !loading && (
              <div className="space-y-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-display text-stone-900 uppercase tracking-widest border-b border-stone-200 inline-block pb-4">
                    {result.theme}
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                  {/* Christian Card */}
                  <div className="bg-white p-8 shadow-sm border-t-4 border-stone-800 rounded-b-lg">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center">
                      <span className="w-2 h-2 bg-stone-800 rounded-full mr-2"></span>
                      Tradição Cristã
                    </h3>
                    <blockquote className="font-serif text-xl text-stone-800 mb-4 leading-relaxed italic">
                      "{result?.christian?.originalText}"
                    </blockquote>
                    <p className="text-right text-sm font-bold text-gold-600 mb-6 font-display">
                      — {result?.christian?.source}
                    </p>
                    <div className="text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">
                      {result?.christian?.context}
                    </div>
                  </div>

                  {/* Vedic Card */}
                  <div className="bg-white p-8 shadow-sm border-t-4 border-gold-500 rounded-b-lg">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center">
                      <span className="w-2 h-2 bg-gold-500 rounded-full mr-2"></span>
                      Tradição Védica
                    </h3>
                    <blockquote className="font-serif text-xl text-stone-800 mb-2 leading-relaxed italic">
                      "{result?.vedic?.originalText}"
                    </blockquote>
                    {result?.vedic?.sanskritTerm && (
                      <p className="text-sm text-stone-500 mb-4 font-mono bg-stone-50 inline-block px-2 py-1 rounded">
                        Termo chave: {result.vedic.sanskritTerm}
                      </p>
                    )}
                    <p className="text-right text-sm font-bold text-gold-600 mb-6 font-display">
                      — {result?.vedic?.source}
                    </p>
                    <div className="text-stone-600 text-sm leading-relaxed border-t border-stone-100 pt-4">
                      {result?.vedic?.context}
                    </div>
                  </div>
                </div>

                {/* Synthesis Section */}
                <div className="relative max-w-3xl mx-auto mt-12 text-center">
                  <span className="text-6xl text-gold-200 absolute -top-8 -left-8 font-serif">“</span>
                  <div className="bg-stone-50 p-8 md:p-12 rounded-lg border border-stone-100">
                    <h3 className="text-lg font-display text-stone-900 mb-6 border-b border-stone-200 pb-2 inline-block">
                      Philosophia Perennis
                    </h3>
                    <p className="text-lg md:text-xl font-serif text-stone-800 leading-loose">
                      {result.synthesis}
                    </p>
                  </div>
                  <span className="text-6xl text-gold-200 absolute -bottom-12 -right-4 font-serif transform rotate-180">“</span>
                </div>
                
                {guruContext && (
                   <p className="text-center text-xs text-stone-400 mt-8 italic">
                     * Análise baseada no contexto do acervo fornecido.
                   </p>
                )}
              </div>
            )}
            
             {/* Loading State skeleton */}
             {loading && (
              <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
                 <div className="h-8 bg-stone-200 w-1/3 mx-auto rounded"></div>
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="h-64 bg-stone-200 rounded"></div>
                    <div className="h-64 bg-stone-200 rounded"></div>
                 </div>
                 <div className="h-40 bg-stone-200 rounded"></div>
              </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
