import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ComparisonResult } from './types';
import { SAMPLE_TRANSCRIPT } from './sampleData';
import { STATIC_CORPUS } from './corpus';
import { SYSTEM_INSTRUCTION, RESPONSE_SCHEMA } from './prompts';
import { cleanSRTContent, generateCorpusCode } from './utils';

// Initialize Gemini
// NOTE: For this AI Studio/Vibe Coding demo, process.env.API_KEY is injected automatically.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<'search' | 'library'>('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [corpus, setCorpus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [devMode, setDevMode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawFilesInputRef = useRef<HTMLInputElement>(null);

  // Load Corpus on Mount (Static or LocalStorage)
  useEffect(() => {
    // 1. Check Static Corpus (Compiled)
    if (STATIC_CORPUS && STATIC_CORPUS.length > 100) {
      console.log("Carregando Corpus Estático (Compilado)...");
      setCorpus(STATIC_CORPUS);
      return;
    }

    // 2. Check LocalStorage (User uploaded previously)
    const savedCorpus = localStorage.getItem('nitya_corpus');
    if (savedCorpus) {
      console.log("Carregando Corpus do LocalStorage...");
      setCorpus(savedCorpus);
    }
  }, []);

  // Handle Search
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Determine context source
      let contextToUse = corpus;
      if (!contextToUse || contextToUse.length < 50) {
        // Fallback or explicit demo mode if corpus is empty
        console.log("Corpus vazio, usando conhecimento geral rigoroso.");
      }

      const prompt = `
      CONTEXTO (TRANSCRIÇÕES):
      ${contextToUse.slice(0, 800000)} ... (truncado se necessário)

      PERGUNTA DO USUÁRIO: "${query}"

      Encontre os paralelos e gere a resposta JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      if (response.text) {
        const jsonResult = JSON.parse(response.text) as ComparisonResult;
        setResult(jsonResult);
      }
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Ocorreu um erro ao processar sua busca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Handle File Upload for Runtime Usage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLoading(true);
      setUploadProgress(0);
      let newCorpus = corpus;
      const totalFiles = e.target.files.length;

      const files = Array.from(e.target.files);

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const text = await file.text();
        const cleaned = file.name.endsWith('.srt') ? cleanSRTContent(text) : text;
        
        newCorpus += `\n--- FONTE: ${file.name} ---\n${cleaned}\n`;
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setCorpus(newCorpus);
      
      // Try to save to LocalStorage (fail silently if quota exceeded)
      try {
        localStorage.setItem('nitya_corpus', newCorpus);
      } catch (err) {
        console.warn("Corpus muito grande para LocalStorage. Ficará apenas na memória.");
        alert("Atenção: O acervo é grande demais para ser salvo no navegador. Ele funcionará agora, mas será perdido se você recarregar a página.");
      }

      setLoading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Dev Mode Generation
  const handleDevGeneration = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLoading(true);
      let fullText = "";
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        const text = await file.text();
        const cleaned = file.name.endsWith('.srt') ? cleanSRTContent(text) : text;
        fullText += `\n--- FONTE: ${file.name} ---\n${cleaned}\n`;
      }

      const code = generateCorpusCode(fullText);
      setGeneratedCode(code);
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    setCorpus(SAMPLE_TRANSCRIPT);
    setActiveTab('search');
    alert("Dados de demonstração carregados! Tente buscar por 'Verbo' ou 'Atman'.");
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-serif selection:bg-gold-200">
      
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-wide text-stone-800">
            Nitya <span className="text-gold-500 text-lg ml-1">✦</span>
          </h1>
          <nav className="flex space-x-6 text-sm font-sans text-stone-500">
            <button 
              onClick={() => setActiveTab('search')}
              className={`hover:text-gold-600 transition-colors ${activeTab === 'search' ? 'text-gold-600 font-medium' : ''}`}
            >
              Busca
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`hover:text-gold-600 transition-colors ${activeTab === 'library' ? 'text-gold-600 font-medium' : ''}`}
            >
              Acervo {corpus.length > 100 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">Ativo</span>}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Search View */}
        {activeTab === 'search' && (
          <div className="space-y-12">
            
            {/* Search Input */}
            <div className="text-center space-y-6">
              <h2 className="font-display text-4xl text-stone-800">A Coerência Sagrada</h2>
              <p className="text-stone-500 italic font-serif text-lg max-w-2xl mx-auto">
                Explore a unidade subjacente entre a Teologia Cristã e a Sabedoria Védica.
              </p>
              
              <div className="relative max-w-xl mx-auto group">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Ex: Graça, O Verbo, Sofrimento..."
                  className="w-full bg-white border border-stone-200 rounded-full py-4 px-8 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-all font-sans"
                />
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="absolute right-2 top-2 bg-stone-900 text-stone-50 rounded-full p-2.5 hover:bg-gold-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {corpus.length < 100 && (
                <div className="mt-4">
                  <button 
                    onClick={loadDemoData}
                    className="text-xs font-sans text-gold-600 hover:text-gold-700 underline underline-offset-2"
                  >
                    Não tem arquivos? Carregar dados de demonstração
                  </button>
                </div>
              )}
            </div>

            {/* Results Area */}
            {result && (
              <div className="animate-fade-in space-y-12">
                
                {/* Theme Title */}
                <div className="text-center border-b border-stone-200 pb-8">
                  <span className="text-xs font-sans uppercase tracking-widest text-stone-400 mb-2 block">Tema Identificado</span>
                  <h3 className="font-display text-3xl text-stone-800">{result.theme}</h3>
                </div>

                {/* Cards Container */}
                <div className="grid md:grid-cols-2 gap-8">
                  
                  {/* Christian Card */}
                  {result.christian && (
                    <div className="bg-white p-8 rounded-sm shadow-sm border-t-4 border-stone-800 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-baseline mb-6">
                        <h4 className="font-display text-lg text-stone-800">Tradição Cristã</h4>
                        <span className="font-sans text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">{result.christian.source}</span>
                      </div>
                      <blockquote className="font-serif text-lg leading-relaxed text-stone-700 mb-6 italic border-l-2 border-gold-400 pl-4">
                        "{result.christian.originalText}"
                      </blockquote>
                      <p className="font-sans text-sm text-stone-500 leading-relaxed">
                        {result.christian.context}
                      </p>
                    </div>
                  )}

                  {/* Vedic Card */}
                  {result.vedic && (
                    <div className="bg-white p-8 rounded-sm shadow-sm border-t-4 border-gold-500 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-baseline mb-6">
                        <h4 className="font-display text-lg text-stone-800">Tradição Védica</h4>
                        <span className="font-sans text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">{result.vedic.source}</span>
                      </div>
                      <div className="mb-6">
                        {result.vedic.sanskritTerm && (
                           <span className="block font-display text-gold-600 text-sm mb-2">{result.vedic.sanskritTerm}</span>
                        )}
                        <blockquote className="font-serif text-lg leading-relaxed text-stone-700 italic border-l-2 border-stone-300 pl-4">
                          "{result.vedic.originalText}"
                        </blockquote>
                      </div>
                      <p className="font-sans text-sm text-stone-500 leading-relaxed">
                        {result.vedic.context}
                      </p>
                    </div>
                  )}

                </div>

                {/* Synthesis */}
                <div className="bg-stone-100 p-8 rounded-sm border border-stone-200 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-stone-800 to-gold-500"></div>
                   <h4 className="font-display text-xl text-stone-800 mb-4 flex items-center">
                     <span className="text-2xl mr-2">∞</span> Síntese Ontológica
                   </h4>
                   <p className="font-serif text-lg leading-relaxed text-stone-700 text-justify">
                     {result.synthesis}
                   </p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Library View */}
        {activeTab === 'library' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <h2 className="font-display text-2xl text-stone-800 mb-6">Gestão do Acervo</h2>
            
            {/* Status Card */}
            <div className="bg-white p-6 rounded shadow-sm border border-stone-200">
               <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-stone-500 mb-4">Status Atual</h3>
               <div className="flex items-center space-x-3">
                 <div className={`w-3 h-3 rounded-full ${corpus.length > 100 ? 'bg-green-500' : 'bg-red-300'}`}></div>
                 <p className="text-stone-800 font-medium">
                   {corpus.length > 100 
                     ? `${Math.round(corpus.length / 1024)} KB de textos carregados na memória.` 
                     : "Acervo vazio."}
                 </p>
               </div>
               {corpus.length > 100 && (
                 <div className="mt-4 flex space-x-4">
                    <button 
                      onClick={() => {
                        setCorpus(''); 
                        localStorage.removeItem('nitya_corpus');
                        alert('Acervo limpo.');
                      }}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Limpar Memória
                    </button>
                    {/* Botão de Demo sempre disponível */}
                    <button 
                      onClick={loadDemoData}
                      className="text-xs text-stone-500 hover:text-stone-800 underline"
                    >
                      Recarregar Demo
                    </button>
                 </div>
               )}
            </div>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center hover:border-gold-400 transition-colors bg-stone-50">
              <input 
                type="file" 
                multiple 
                accept=".txt,.srt" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden" 
                id="corpus-upload"
              />
              <label htmlFor="corpus-upload" className="cursor-pointer block">
                 <div className="text-4xl mb-3 text-stone-300">📂</div>
                 <span className="block font-medium text-stone-700 mb-1">Carregar Transcrições (.txt ou .srt)</span>
                 <span className="block text-sm text-stone-400">Adiciona ao acervo atual da sessão.</span>
              </label>
              {loading && uploadProgress > 0 && (
                 <div className="mt-4 w-full bg-stone-200 rounded-full h-2.5">
                    <div className="bg-gold-500 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div>
                    <p className="text-xs text-stone-500 mt-2">Processando... {uploadProgress}%</p>
                 </div>
              )}
            </div>

            {/* Developer Mode Toggle */}
            <div className="pt-8 border-t border-stone-200">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-display text-lg text-stone-800">Modo Desenvolvedor</h3>
                 <button 
                   onClick={() => setDevMode(!devMode)}
                   className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ease-in-out ${devMode ? 'bg-stone-800' : 'bg-stone-300'}`}
                 >
                   <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${devMode ? 'translate-x-5' : ''}`}></div>
                 </button>
               </div>

               {devMode && (
                 <div className="bg-stone-900 text-stone-100 p-6 rounded shadow-inner">
                   <p className="text-xs text-stone-400 mb-4">
                     Use esta ferramenta para gerar o código do `corpus.ts`. Carregue todos os seus arquivos aqui, copie o resultado e cole no arquivo fonte.
                   </p>
                   
                   <input 
                     type="file" 
                     multiple 
                     accept=".txt,.srt" 
                     ref={rawFilesInputRef}
                     onChange={handleDevGeneration}
                     className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-700 file:text-stone-200 hover:file:bg-stone-600 mb-4" 
                   />

                   {generatedCode && (
                     <div className="relative">
                       <textarea 
                         readOnly
                         value={generatedCode}
                         className="w-full h-48 bg-black p-4 text-xs font-mono text-green-400 rounded border border-stone-700 focus:outline-none"
                       />
                       <button
                         onClick={() => {
                           navigator.clipboard.writeText(generatedCode);
                           alert("Código copiado!");
                         }}
                         className="absolute top-2 right-2 bg-stone-700 hover:bg-stone-600 text-white text-xs px-3 py-1 rounded"
                       >
                         Copiar
                       </button>
                     </div>
                   )}
                 </div>
               )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
