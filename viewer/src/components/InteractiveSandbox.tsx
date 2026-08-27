import React from 'react';
import { SplitSquareHorizontal, FileJson, Terminal, Upload, AlignLeft, Trash2, Play, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import { BreakingChange } from '../types';

export type SandboxMode = 'OPENAPI' | 'PYTHON' | 'GO' | 'TYPESCRIPT';

interface InteractiveSandboxProps {
  sandboxMode: SandboxMode;
  setSandboxMode: (mode: SandboxMode) => void;
  sandboxBase: string;
  setSandboxBase: React.Dispatch<React.SetStateAction<string>>;
  sandboxTarget: string;
  setSandboxTarget: React.Dispatch<React.SetStateAction<string>>;
  sourceCode: string;
  setSourceCode: React.Dispatch<React.SetStateAction<string>>;
  executeSandboxDiff: () => void;
  isSubmitting: boolean;
  loadSample: (sample: string) => void;
  breakingChanges: BreakingChange[];
}

export function InteractiveSandbox({
  sandboxMode,
  setSandboxMode,
  sandboxBase,
  setSandboxBase,
  sandboxTarget,
  setSandboxTarget,
  sourceCode,
  setSourceCode,
  executeSandboxDiff,
  isSubmitting,
  loadSample,
  breakingChanges,
}: InteractiveSandboxProps) {
  const getFormatAndValidation = (code: string) => {
    const words = code.trim().split(/\s+/).filter(Boolean).length;
    const lines = code.split('\n').length;
    let format = 'Unknown';
    let valid = true;
    
    if (code.trim().startsWith('{') || code.trim().startsWith('[')) {
      format = 'JSON';
      try { JSON.parse(code); } catch { valid = false; }
    } else if (code.trim() && !code.includes('{') && code.includes(':')) {
      format = 'YAML';
      if (code.includes('\t')) valid = false; 
    } else if (sandboxMode === 'PYTHON') {
      format = 'Python';
    } else if (sandboxMode === 'GO') {
      format = 'Go';
    } else if (sandboxMode === 'TYPESCRIPT') {
      format = 'TypeScript';
    }
    
    return { format, valid, words, lines };
  };

  const baseStats = getFormatAndValidation(sandboxBase);
  const targetStats = getFormatAndValidation(sandboxTarget);
  const codeStats = getFormatAndValidation(sourceCode);

  const formatJSON = (setter: React.Dispatch<React.SetStateAction<string>>, code: string) => {
    try {
      const obj = JSON.parse(code);
      setter(JSON.stringify(obj, null, 2));
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target?.result as string);
      reader.readAsText(file);
    }
  };
  
  const handleDrop = (e: React.DragEvent, setter: React.Dispatch<React.SetStateAction<string>>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target?.result as string);
      reader.readAsText(file);
    }
  };

  const monacoLanguage = sandboxMode === 'PYTHON' ? 'python' : sandboxMode === 'GO' ? 'go' : sandboxMode === 'TYPESCRIPT' ? 'typescript' : 'json';

  const activeDiff = sandboxMode !== 'OPENAPI' && breakingChanges.length > 0 ? breakingChanges.find(c => c.oldCode && c.newCode) : null;

  const actionButtonText = () => {
    if (isSubmitting) return 'Running AST Inspection...';
    switch (sandboxMode) {
      case 'OPENAPI': return 'Run Semantic Diff';
      case 'PYTHON': return 'Audit Python Deprecations';
      case 'GO': return 'Audit Go Deprecations';
      case 'TYPESCRIPT': return 'Audit TypeScript Code';
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="border border-cyan-500/30 bg-[#121820] p-6 rounded shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
              <SplitSquareHorizontal size={16} /> Sandbox
            </h2>
            <select 
              value={sandboxMode}
              onChange={(e) => setSandboxMode(e.target.value as SandboxMode)}
              className="bg-[#090c10] border border-cyan-500/30 text-cyan-400 text-xs px-3 py-1.5 rounded focus:outline-none uppercase font-bold tracking-widest"
            >
              <option value="OPENAPI">OpenAPI Contract Diff</option>
              <option value="PYTHON">Python 2 -{'>'} 3 Migration</option>
              <option value="GO">Go Deprecation Audit</option>
              <option value="TYPESCRIPT">TypeScript Modernization</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <select 
              onChange={(e) => loadSample(e.target.value)}
              className="bg-[#090c10] border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Load Sample...</option>
              <option value="OpenAPI: Breaking Required Field">OpenAPI: Breaking Required Field</option>
              <option value="OpenAPI: Breaking Enum Removal">OpenAPI: Breaking Enum Removal</option>
              <option value="OpenAPI: Removed Endpoint">OpenAPI: Removed Endpoint</option>
              <option value="Python 2 -> Python 3: Legacy EVE-style Code Migration">Python 2 -{'>'} 3: Legacy urllib2 & print</option>
              <option value="Go: Migrate deprecated io/ioutil package">Go: Migrate deprecated io/ioutil</option>
              <option value="TypeScript: Migrate legacy var keyword">TypeScript: Modernize var to const/let</option>
            </select>
            <button onClick={() => {
              setSandboxBase(''); setSandboxTarget(''); setSourceCode('');
            }} className="text-[10px] text-slate-400 hover:text-rose-400 uppercase font-bold flex items-center gap-1 border border-slate-700 px-3 py-2 rounded"><Trash2 size={12}/> Clear</button>
            <button onClick={executeSandboxDiff} disabled={isSubmitting} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-6 py-2.5 text-xs font-bold uppercase transition-all disabled:opacity-50 rounded">
              <Play size={14} /> {actionButtonText()}
            </button>
          </div>
        </div>

        {sandboxMode === 'OPENAPI' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, setSandboxBase)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><FileJson size={12}/> Base Spec (v1)</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest ${baseStats.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{baseStats.valid ? 'VALID' : 'INVALID'} {baseStats.format}</span>
                  <button onClick={() => formatJSON(setSandboxBase, sandboxBase)} className="text-[9px] text-slate-400 hover:text-cyan-300 p-1 border border-slate-700 rounded"><AlignLeft size={12}/></button>
                  <label className="text-[9px] cursor-pointer text-slate-400 hover:text-cyan-300 p-1 border border-slate-700 rounded"><Upload size={12}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setSandboxBase)} /></label>
                </div>
              </div>
              <textarea 
                value={sandboxBase} onChange={e => setSandboxBase(e.target.value)}
                className={`w-full h-[350px] bg-[#090c10] border ${baseStats.valid ? 'border-slate-700' : 'border-rose-500/50'} rounded p-4 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none`}
                spellCheck={false}
              />
              <div className="text-[9px] text-slate-500 mt-1 flex justify-end gap-3 uppercase font-bold tracking-widest">
                <span>{baseStats.lines} Lines</span>
                <span>{baseStats.words} Words</span>
              </div>
            </div>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, setSandboxTarget)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><FileJson size={12}/> Target Spec (v2)</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest ${targetStats.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{targetStats.valid ? 'VALID' : 'INVALID'} {targetStats.format}</span>
                  <button onClick={() => formatJSON(setSandboxTarget, sandboxTarget)} className="text-[9px] text-slate-400 hover:text-cyan-300 p-1 border border-slate-700 rounded"><AlignLeft size={12}/></button>
                  <label className="text-[9px] cursor-pointer text-slate-400 hover:text-cyan-300 p-1 border border-slate-700 rounded"><Upload size={12}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setSandboxTarget)} /></label>
                </div>
              </div>
              <textarea 
                value={sandboxTarget} onChange={e => setSandboxTarget(e.target.value)}
                className={`w-full h-[350px] bg-[#090c10] border ${targetStats.valid ? 'border-slate-700' : 'border-rose-500/50'} rounded p-4 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none`}
                spellCheck={false}
              />
              <div className="text-[9px] text-slate-500 mt-1 flex justify-end gap-3 uppercase font-bold tracking-widest">
                <span>{targetStats.lines} Lines</span>
                <span>{targetStats.words} Words</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, setSourceCode)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={12}/> Source Code ({sandboxMode})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400">{codeStats.format}</span>
                  <label className="text-[9px] cursor-pointer text-slate-400 hover:text-cyan-300 p-1 border border-slate-700 rounded"><Upload size={12}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setSourceCode)} /></label>
                </div>
              </div>
              {activeDiff ? (
                <div className="w-full h-[400px] border border-cyan-500/50 rounded overflow-hidden shadow-inner">
                  <DiffEditor
                    height="100%"
                    language={monacoLanguage}
                    original={activeDiff.oldCode}
                    modified={activeDiff.newCode}
                    theme="vs-dark"
                    options={{ readOnly: true, minimap: { enabled: false } }}
                  />
                </div>
              ) : (
                <textarea 
                  value={sourceCode} onChange={e => setSourceCode(e.target.value)}
                  className="w-full h-[400px] bg-[#090c10] border border-slate-700 rounded p-4 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                  spellCheck={false}
                />
              )}
              <div className="text-[9px] text-slate-500 mt-1 flex justify-end gap-3 uppercase font-bold tracking-widest">
                <span>{codeStats.lines} Lines</span>
                <span>{codeStats.words} Words</span>
              </div>
            </div>

            {breakingChanges.length > 0 && (
              <div className="border border-slate-800 bg-[#0a0e14] p-4 rounded space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  AST Migration Findings ({breakingChanges.length})
                </h4>
                <div className="space-y-2">
                  {breakingChanges.map((change, idx) => (
                    <div key={idx} className="p-3 bg-[#121820] border border-slate-700 rounded text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                          change.severity === 'BREAKING' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}>
                          {change.severity || 'BREAKING'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">{change.line || change.path}</span>
                      </div>
                      <p className="text-slate-300 font-medium">{change.description}</p>
                      {change.citation && (
                        <p className="text-[10px] text-cyan-400/80 mt-1 font-mono">{change.citation}</p>
                      )}
                      {change.proposed_fix && (
                        <div className="mt-2 text-[11px] font-mono bg-[#090c10] p-2 rounded border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                          <span>Fix: {change.proposed_fix}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

