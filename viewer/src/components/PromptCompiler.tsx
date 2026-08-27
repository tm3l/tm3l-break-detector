import { Cpu, Play, Check, Copy, Download, AlertTriangle, Info, Box } from 'lucide-react';
import { CodeAnalysis } from '../types';

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
  astAnalysis: CodeAnalysis | null;
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
  astAnalysis,
  copySuccess,
  copyToClipboard,
  downloadMarkdown,
}: PromptCompilerProps) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border border-indigo-500/30 bg-[#121820] p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4 flex-wrap gap-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
            <Cpu size={16} /> Deterministic Prompt Compiler
          </h2>
          <div className="flex items-center gap-4">
            <select 
              value={promptLang}
              onChange={(e) => setPromptLang(e.target.value)}
              className="bg-[#090c10] border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded focus:outline-none"
            >
              <option>Python</option>
              <option>Go</option>
              <option>TypeScript</option>
              <option>JavaScript</option>
              <option>Shell</option>
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
                <span className="text-[10px] text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded">Tree-sitter AST Active</span>
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

          <div className="col-span-1 bg-[#090c10] border border-slate-700 rounded p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center justify-between">
                <span>AST Facts</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Deterministic</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Language & Runtime</span>
                  <span className="text-xs text-indigo-300 font-mono">
                    {astAnalysis ? `${astAnalysis.language.name} ${astAnalysis.language.version || ''} (${astAnalysis.language.runtime || 'Standard'})` : promptLang}
                  </span>
                </div>
                {astAnalysis && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#121820] p-2 rounded border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block">Functions</span>
                      <span className="text-slate-200 font-mono font-bold">{astAnalysis.function_count}</span>
                    </div>
                    <div className="bg-[#121820] p-2 rounded border border-slate-800">
                      <span className="text-[9px] text-slate-500 uppercase block">Classes/Structs</span>
                      <span className="text-slate-200 font-mono font-bold">{astAnalysis.class_count}</span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">Detected Dependencies</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {astAnalysis && astAnalysis.dependencies.length > 0 ? (
                      astAnalysis.dependencies.map((dep, i) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded font-mono border flex items-center gap-1 ${
                          dep.is_c_extension ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          <Box size={10} />
                          {dep.name}
                          {dep.is_c_extension && <span className="text-[8px] text-amber-400">C-Ext</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">No external dependencies</span>
                    )}
                  </div>
                </div>

                {astAnalysis && astAnalysis.caveats.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase block">Packaging Caveats</span>
                    {astAnalysis.caveats.map((c, i) => (
                      <div key={i} className={`text-[10px] p-2 rounded border leading-tight ${
                        c.severity === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      }`}>
                        <div className="flex items-center gap-1 font-bold mb-0.5">
                          {c.severity === 'WARNING' ? <AlertTriangle size={10} /> : <Info size={10} />}
                          <span>{c.severity}</span>
                        </div>
                        {c.message}
                      </div>
                    ))}
                  </div>
                )}
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

