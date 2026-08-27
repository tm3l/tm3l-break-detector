import React from 'react';
import { SplitSquareHorizontal, FileJson, Terminal, Upload, AlignLeft, Trash2, Play } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import { BreakingChange } from '../types';

interface InteractiveSandboxProps {
  sandboxMode: 'OPENAPI' | 'PYTHON';
  setSandboxMode: (mode: 'OPENAPI' | 'PYTHON') => void;
  sandboxBase: string;
  setSandboxBase: React.Dispatch<React.SetStateAction<string>>;
  sandboxTarget: string;
  setSandboxTarget: React.Dispatch<React.SetStateAction<string>>;
  pythonCode: string;
  setPythonCode: React.Dispatch<React.SetStateAction<string>>;
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
  pythonCode,
  setPythonCode,
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
    } else if (code.trim() && (code.includes('import') || code.includes('print'))) {
      format = 'Python';
    }
    
    return { format, valid, words, lines };
  };

  const baseStats = getFormatAndValidation(sandboxBase);
  const targetStats = getFormatAndValidation(sandboxTarget);
  const pyStats = getFormatAndValidation(pythonCode);

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

  const pythonDiff = sandboxMode === 'PYTHON' ? breakingChanges.find(c => c.oldCode && c.newCode && c.path === 'main.py') : null;

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
              onChange={(e) => setSandboxMode(e.target.value as 'OPENAPI' | 'PYTHON')}
              className="bg-[#090c10] border border-cyan-500/30 text-cyan-400 text-xs px-3 py-1.5 rounded focus:outline-none uppercase font-bold tracking-widest"
            >
              <option value="OPENAPI">OpenAPI Contract Diff</option>
              <option value="PYTHON">Python 2 -{'>'} 3 Code Breaker</option>
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
              <option value="Python 2 -> Python 3: Legacy EVE-style Code Migration">Python 2 -{'>'} Python 3: Legacy EVE-style Code Migration</option>
            </select>
            <button onClick={() => {
              setSandboxBase(''); setSandboxTarget(''); setPythonCode('');
            }} className="text-[10px] text-slate-400 hover:text-rose-400 uppercase font-bold flex items-center gap-1 border border-slate-700 px-3 py-2 rounded"><Trash2 size={12}/> Clear</button>
            <button onClick={executeSandboxDiff} disabled={isSubmitting} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-6 py-2.5 text-xs font-bold uppercase transition-all disabled:opacity-50 rounded">
              <Play size={14} /> {isSubmitting ? 'Running...' : sandboxMode === 'OPENAPI' ? 'Run Semantic Diff' : 'Audit Python Deprecations'}
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
          <div>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, setPythonCode)}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><Terminal size={12}/> Source Code (Python)</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400">{pyStats.format}</span>
                  <label className="text-[9px] cursor-pointer text-slate-400 hover:text-cyan-300 p-1 border border-slate-700 rounded"><Upload size={12}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, setPythonCode)} /></label>
                </div>
              </div>
              {pythonDiff ? (
                <div className="w-full h-[400px] border border-cyan-500/50 rounded overflow-hidden">
                  <DiffEditor
                    height="100%"
                    language="python"
                    original={pythonDiff.oldCode}
                    modified={pythonDiff.newCode}
                    theme="vs-dark"
                    options={{ readOnly: true, minimap: { enabled: false } }}
                  />
                </div>
              ) : (
                <textarea 
                  value={pythonCode} onChange={e => setPythonCode(e.target.value)}
                  className="w-full h-[400px] bg-[#090c10] border border-slate-700 rounded p-4 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                  spellCheck={false}
                />
              )}
              <div className="text-[9px] text-slate-500 mt-1 flex justify-end gap-3 uppercase font-bold tracking-widest">
                <span>{pyStats.lines} Lines</span>
                <span>{pyStats.words} Words</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
