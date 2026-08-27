import { Cpu, Play, Check, Copy, Download } from 'lucide-react';

interface PromptCompilerProps {
  promptLang: string;
  setPromptLang: (lang: string) => void;
  promptCode: string;
  setPromptCode: (code: string) => void;
  targetDockerfile: boolean;
  setTargetDockerfile: (val: boolean) => void;
  targetCLI: boolean;
  setTargetCLI: (val: boolean) => void;
  targetCI: boolean;
  setTargetCI: (val: boolean) => void;
  targetK8s: boolean;
  setTargetK8s: (val: boolean) => void;
  isPrompting: boolean;
  executePrompt: () => void;
  promptResult: string;
  copySuccess: boolean;
  copyToClipboard: () => void;
  downloadMarkdown: () => void;
}

export function PromptCompiler({
  promptLang,
  setPromptLang,
  promptCode,
  setPromptCode,
  targetDockerfile,
  setTargetDockerfile,
  targetCLI,
  setTargetCLI,
  targetCI,
  setTargetCI,
  targetK8s,
  setTargetK8s,
  isPrompting,
  executePrompt,
  promptResult,
  copySuccess,
  copyToClipboard,
  downloadMarkdown,
}: PromptCompilerProps) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border border-indigo-500/30 bg-[#121820] p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
            <Cpu size={16} /> LLM Prompt Compiler
          </h2>
          <div className="flex items-center gap-4">
            <select 
              value={promptLang}
              onChange={(e) => setPromptLang(e.target.value)}
              className="bg-[#090c10] border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded focus:outline-none"
            >
              <option>Python</option>
              <option>Go</option>
              <option>JavaScript/TypeScript</option>
              <option>Rust</option>
            </select>
            <button onClick={executePrompt} disabled={isPrompting || !promptCode.trim()} className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 px-6 py-2.5 text-xs font-bold uppercase transition-all disabled:opacity-50 rounded">
              <Play size={14} /> {isPrompting ? 'Synthesizing...' : 'Synthesize Prompt'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-widest flex items-center justify-between">
                Source Code
                <span className="text-[10px] text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">AST Engine Active</span>
              </h3>
              <textarea 
                value={promptCode}
                onChange={e => setPromptCode(e.target.value)}
                placeholder="Paste arbitrary Source Code..."
                className="w-full h-[250px] bg-[#090c10] border border-slate-700 rounded p-4 text-slate-300 font-mono text-xs focus:outline-none focus:border-indigo-500/50 resize-none"
                spellCheck={false}
              />
            </div>
            
            <div className="flex flex-wrap gap-4 bg-[#090c10] p-4 border border-slate-800 rounded">
              {[
                { label: "Multi-stage Dockerfile", state: targetDockerfile, set: setTargetDockerfile },
                { label: "Local Standalone Binary (PyInstaller/Go)", state: targetCLI, set: setTargetCLI },
                { label: "GitHub Actions CI Workflow", state: targetCI, set: setTargetCI },
                { label: "Kubernetes Deployment Spec", state: targetK8s, set: setTargetK8s }
              ].map((t, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={t.state} onChange={e => t.set(e.target.checked)} className="w-4 h-4 bg-[#121820] border border-slate-600 rounded-sm checked:bg-indigo-500 checked:border-indigo-500 appearance-none transition-colors" />
                  <span className="text-xs text-slate-400 uppercase tracking-widest group-hover:text-indigo-300">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-1 bg-[#090c10] border border-slate-700 rounded p-4">
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-widest border-b border-slate-700 pb-2">AST Insights</h3>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Detected Language</span>
                <span className="text-xs text-indigo-300">{promptLang}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Dependencies</span>
                <div className="flex gap-2 flex-wrap">
                  {promptCode.includes('import') || promptCode.includes('require') ? (
                    <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">Dynamic Resolution Active</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">None detected</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Code Complexity</span>
                <span className="text-xs text-indigo-300">{promptCode.length > 500 ? 'High' : promptCode.length > 100 ? 'Medium' : 'Low'}</span>
              </div>
            </div>
          </div>
        </div>

        {promptResult && (
          <div className="mt-6 border-t border-slate-700 pt-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Synthesized Output</h3>
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="flex items-center gap-2 text-[10px] uppercase font-bold px-3 py-1.5 border border-slate-600 text-slate-400 hover:text-indigo-300 rounded">
                  {copySuccess ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} Copy
                </button>
                <button onClick={downloadMarkdown} className="flex items-center gap-2 text-[10px] uppercase font-bold px-3 py-1.5 border border-slate-600 text-slate-400 hover:text-indigo-300 rounded">
                  <Download size={12} /> Download .md
                </button>
              </div>
            </div>
            <pre className="bg-[#090c10] border border-indigo-500/30 rounded p-4 overflow-x-auto shadow-inner text-indigo-300/80 font-mono text-xs whitespace-pre-wrap">
              <code>{promptResult}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
