import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Shield, Play, Terminal, GitCommit, FileJson, AlertOctagon, CheckSquare, SplitSquareHorizontal, Activity, Cpu, Copy, Check, Upload, Trash2, Download, AlignLeft } from 'lucide-react';

interface BreakingChange {
  path?: string;
  citation?: string;
  proposed_fix?: string;
  line?: string;
  oldCode?: string;
  newCode?: string;
}

const syntaxHighlight = (json: any) => {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match: string) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
};

function App() {
  const [events, setEvents] = useState<string[]>([]);
  const [status, setStatus] = useState<'SAFE' | 'WARNING' | 'BREAKING'>('SAFE');
  
  const [diffId, setDiffId] = useState<string | null>(null);
  const [diffStatus, setDiffStatus] = useState<string | null>(null);
  const [breakingChanges, setBreakingChanges] = useState<BreakingChange[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [expandedJson, setExpandedJson] = useState<Record<number, boolean>>({});
  
  // New Interactive Sandbox & Prompt Compiler State
  const [viewMode, setViewMode] = useState<'MONITOR' | 'SANDBOX' | 'PROMPT'>('MONITOR');
  const [sandboxMode, setSandboxMode] = useState<'OPENAPI' | 'PYTHON'>('OPENAPI');
  const [sandboxBase, setSandboxBase] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/users": {\n      "post": {\n        "requestBody": {\n          "content": {\n            "application/json": {\n              "schema": {\n                "type": "object",\n                "properties": { "email": { "type": "string" } }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}');
  const [sandboxTarget, setSandboxTarget] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/users": {\n      "post": {\n        "requestBody": {\n          "content": {\n            "application/json": {\n              "schema": {\n                "type": "object",\n                "properties": { "email": { "type": "string" } },\n                "required": ["email"]\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}');
  const [pythonCode, setPythonCode] = useState('import urllib2\nprint "Hello World"\n');
  
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');

  // Prompt Compiler State
  const [promptCode, setPromptCode] = useState('');
  const [promptLang, setPromptLang] = useState('Python');
  const [targetDockerfile, setTargetDockerfile] = useState(false);
  const [targetCLI, setTargetCLI] = useState(false);
  const [targetK8s, setTargetK8s] = useState(false);
  const [targetCI, setTargetCI] = useState(false);
  const [promptResult, setPromptResult] = useState('');
  const [isPrompting, setIsPrompting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!currentProjectId) return;
    setConnectionState('CONNECTING');
    const eventSource = new EventSource('/api/events?project_id=' + currentProjectId);
    eventSource.onopen = () => setConnectionState('CONNECTED');
    eventSource.onerror = () => setConnectionState('DISCONNECTED');
    eventSource.onmessage = (event) => {
      setEvents((prev) => [`> Received: ${event.data}`, ...prev].slice(0, 50));
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'diff_overridden') {
          setStatus('WARNING');
          setDiffStatus('OVERRIDDEN');
        } else if (payload.type === 'project_created') {
          setStatus('SAFE');
        } else if (payload.type === 'diff_completed') {
          const id = payload.data?.id || payload.diff_id || payload.id;
          const status = payload.data?.status || payload.status;
          setDiffId(id);
          setDiffStatus(status);
          setStatus(status === 'FAILED' ? 'BREAKING' : 'SAFE');
          setBreakingChanges(payload.data?.raw_diff_payload?.changes || []);
          if (viewMode === 'SANDBOX') setViewMode('MONITOR');
        }
      } catch (e) {}
    };
    return () => eventSource.close();
  }, [viewMode, currentProjectId]);

  const handleOverride = async () => {
    if (!diffId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/diffs/${diffId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: overrideNote })
      });
      if (res.ok) {
        setShowModal(false);
        setOverrideNote('');
        setStatus('WARNING');
        setDiffStatus('OVERRIDDEN');
      }
    } catch (e) {} finally { setIsSubmitting(false); }
  };

  const executeSandboxDiff = async () => {
    if (sandboxMode === 'PYTHON') {
      setIsSubmitting(true);
      setTimeout(() => {
        setDiffStatus('FAILED');
        setStatus('BREAKING');
        setBreakingChanges([{
          path: 'main.py',
          citation: 'PEP 3105 / PEP 3108',
          proposed_fix: 'Use print() function and urllib.request',
          line: 'line:L1-L2',
          oldCode: 'import urllib2\nprint "Hello"',
          newCode: 'import urllib.request\nprint("Hello")'
        }]);
        setViewMode('MONITOR');
        setIsSubmitting(false);
      }, 1000);
      return;
    }
    setIsSubmitting(true);
    try {
      const pRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Interactive Sandbox Session" })
      });
      const pData = await pRes.json();
      setCurrentProjectId(pData.id);
      
      const formData = new FormData();
      formData.append('project_id', pData.id);
      formData.append('commit_sha', 'manual-sandbox-run');
      formData.append('base_spec', new Blob([sandboxBase], { type: 'application/json' }), 'base.json');
      formData.append('target_spec', new Blob([sandboxTarget], { type: 'application/json' }), 'target.json');

      await fetch('/api/diffs', { method: 'POST', body: formData, headers: { 'Authorization': 'Bearer secret-ci-token' } });
    } catch (e) {} finally { setIsSubmitting(false); }
  };

  const executePrompt = async () => {
    setIsPrompting(true);
    try {
      const targets = [];
      if (targetDockerfile) targets.push('Generate Multi-stage Dockerfile');
      if (targetCLI) targets.push('Generate Local Standalone Binary');
      if (targetCI) targets.push('Generate GitHub Actions CI Workflow');
      if (targetK8s) targets.push('Generate Kubernetes Deployment Spec');
      
      const markdownRes = `# Generated Prompt\n\n**Language**: ${promptLang}\n**Targets**: ${targets.join(', ')}\n\n## Source\n\`\`\`\n${promptCode}\n\`\`\`\n`;
      setPromptResult(markdownRes);
      setCopySuccess(false);
    } catch (e) {} finally { setIsPrompting(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promptResult);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  const downloadMarkdown = () => {
    const blob = new Blob([promptResult], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleJson = (idx: number) => setExpandedJson(prev => ({ ...prev, [idx]: !prev[idx] }));

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

  const loadSample = (sample: string) => {
    if (sample === "OpenAPI: Breaking Required Field") {
      setSandboxMode('OPENAPI');
      setSandboxBase('{"openapi":"3.0.0","paths":{"/users":{"post":{"requestBody":{"content":{"application/json":{"schema":{"type":"object","properties":{"email":{"type":"string"}}}}}}}}}}}');
      setSandboxTarget('{"openapi":"3.0.0","paths":{"/users":{"post":{"requestBody":{"content":{"application/json":{"schema":{"type":"object","properties":{"email":{"type":"string"}},"required":["email"]}}}}}}}}}');
    } else if (sample === "OpenAPI: Breaking Enum Removal") {
      setSandboxMode('OPENAPI');
      setSandboxBase('{"openapi":"3.0.0","paths":{"/users":{"get":{"parameters":[{"name":"role","in":"query","schema":{"type":"string","enum":["admin","user","guest"]}}]}}}}');
      setSandboxTarget('{"openapi":"3.0.0","paths":{"/users":{"get":{"parameters":[{"name":"role","in":"query","schema":{"type":"string","enum":["admin","user"]}}]}}}}');
    } else if (sample === "OpenAPI: Removed Endpoint") {
      setSandboxMode('OPENAPI');
      setSandboxBase('{"openapi":"3.0.0","paths":{"/users":{},"/admin":{}}}');
      setSandboxTarget('{"openapi":"3.0.0","paths":{"/users":{}}}');
    } else if (sample === "Python 2 -> Python 3: Legacy EVE-style Code Migration") {
      setSandboxMode('PYTHON');
      setPythonCode('import urllib2\n\ndef fetch():\n    print "Fetching..."\n    return urllib2.urlopen("http://example.com")');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-emerald-400 p-8 font-mono overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="border border-slate-700/80 p-5 flex flex-col md:flex-row justify-between items-center bg-[#121820] rounded shadow-lg shadow-black/50">
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-cyan-400 flex items-center gap-3">
              <Terminal size={28} className="text-emerald-500" />
              TM3L_BREAK_DETECTOR.exe
            </h1>
            <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              Semantic Governance Engine
            </p>
          </div>
          <div className="flex bg-[#090c10] border border-slate-700 rounded overflow-hidden mt-4 md:mt-0 p-1 flex-wrap justify-center">
            <button onClick={() => setViewMode('MONITOR')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-colors rounded ${viewMode === 'MONITOR' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
              <Activity size={14} /> CI/CD Monitor
            </button>
            <button onClick={() => setViewMode('SANDBOX')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-colors rounded ${viewMode === 'SANDBOX' ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
              <SplitSquareHorizontal size={14} /> Sandbox
            </button>
            <button onClick={() => setViewMode('PROMPT')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-colors rounded ${viewMode === 'PROMPT' ? 'bg-indigo-900/40 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
              <Cpu size={14} /> Prompt Compiler
            </button>
          </div>
        </header>

        {viewMode === 'PROMPT' ? (
          /* LLM PROMPT COMPILER MODE */
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
        ) : viewMode === 'SANDBOX' ? (
          /* INTERACTIVE SANDBOX MODE */
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
                  {/* BASE SPEC */}
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
                  {/* TARGET SPEC */}
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
                    <textarea 
                      value={pythonCode} onChange={e => setPythonCode(e.target.value)}
                      className="w-full h-[400px] bg-[#090c10] border border-slate-700 rounded p-4 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 resize-none"
                      spellCheck={false}
                    />
                    <div className="text-[9px] text-slate-500 mt-1 flex justify-end gap-3 uppercase font-bold tracking-widest">
                      <span>{pyStats.lines} Lines</span>
                      <span>{pyStats.words} Words</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CI/CD MONITOR MODE */
          <div className="animate-fade-in-up space-y-6">
            <div className="border border-amber-500/20 p-1 bg-amber-500/5 rounded flex items-center">
              <AlertOctagon size={14} className="text-amber-500/80 ml-2 mr-2 flex-shrink-0" />
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/80 overflow-hidden whitespace-nowrap overflow-ellipsis">
                NOTICE: All CI/CD manual overrides are permanently recorded to the immutable Postgres audit ledger. Maintain protocol at all times.
              </div>
            </div>

            <main className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="col-span-1 border border-slate-700/80 bg-[#121820] p-6 flex flex-col items-center justify-center space-y-6 rounded shadow-lg shadow-black/50">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-700/50 pb-2 w-full text-center">System Status</h2>
                {status === 'SAFE' && <ShieldCheck size={80} className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]" />}
                {status === 'WARNING' && <Shield size={80} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]" />}
                {status === 'BREAKING' && <ShieldAlert size={80} className="text-rose-400 animate-pulse drop-shadow-[0_0_20px_rgba(251,113,133,0.4)]" />}
                <div className="border border-slate-700/80 px-6 py-2 bg-[#090c10] rounded shadow-inner">
                  <span className="text-lg font-bold tracking-[0.2em] uppercase text-slate-200">{status}</span>
                </div>
              </div>

              <div className="col-span-1 md:col-span-3 border border-slate-700/80 bg-[#121820] p-6 flex flex-col rounded shadow-lg shadow-black/50">
                <h2 className="text-xs font-bold mb-4 flex flex-wrap justify-between items-center gap-2 uppercase tracking-widest text-slate-400 border-b border-slate-700/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${connectionState === 'CONNECTED' ? 'bg-emerald-400' : connectionState === 'CONNECTING' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                    Live Event Socket ({currentProjectId})
                  </div>
                  <span className={`text-[9px] px-2 py-1 rounded border ${connectionState === 'CONNECTED' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : connectionState === 'CONNECTING' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
                    {connectionState}
                  </span>
                </h2>
                <div className="flex-1 bg-[#090c10] p-4 border border-slate-800 font-mono text-[11px] space-y-2 h-48 overflow-y-auto overflow-x-hidden rounded shadow-inner text-emerald-400/70 leading-relaxed">
                  {events.length === 0 ? (
                    <p className="text-slate-500 italic flex items-center h-full justify-center">Listening on port 8080... Waiting for CI dispatch.</p>
                  ) : (
                    events.map((e, i) => (
                      <div key={i} className="border-b border-slate-800/80 pb-2 break-all hover:text-emerald-300 transition-colors animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                        <span className="text-slate-600 mr-2">{new Date().toLocaleTimeString()}</span> {e}
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {diffStatus === 'FAILED' && (
                <div className="col-span-1 md:col-span-4 border border-rose-500/50 p-6 bg-[#160f11] shadow-[0_4px_30px_rgba(225,29,72,0.1)] rounded mt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-rose-500/20 pb-4 gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-rose-400 uppercase tracking-wide flex items-center gap-3">
                        <ShieldAlert size={24} className="text-rose-500" /> Pipeline Blocked
                      </h2>
                      <p className="text-sm text-slate-300 mt-2 flex items-center gap-2">
                        <GitCommit size={14} className="text-slate-400"/> Diff Engine detected violations
                      </p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/50 px-6 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors rounded">
                      Init Override Protocol
                    </button>
                  </div>
                  
                  {breakingChanges.length > 0 ? (
                    <div className="space-y-4">
                      {breakingChanges.map((change, idx) => (
                        <div key={idx} className="bg-[#121820] p-5 border border-slate-700/80 rounded animate-fade-in-up">
                          <div className="font-bold text-sm mb-4 flex flex-wrap justify-between items-center gap-2 border-b border-slate-700/80 pb-3">
                            <div className="flex items-center gap-3">
                              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 uppercase rounded text-[10px] tracking-widest flex items-center gap-1">
                                <FileJson size={10} /> {change.line ? change.line : 'TARGET_PATH'}
                              </span> 
                              <span className="text-cyan-300 font-mono text-sm">{change.path || 'N/A'}</span>
                            </div>
                            <button onClick={() => toggleJson(idx)} className="text-[10px] tracking-widest bg-[#0d1117] hover:bg-slate-800 text-slate-300 border border-slate-600 px-3 py-1.5 font-bold uppercase rounded transition-colors flex items-center gap-2">
                              {expandedJson[idx] ? '[-] HIDE RAW' : '[+] VIEW RAW'}
                            </button>
                          </div>
                          <div className="text-xs mb-3 font-medium text-slate-300 border-l-2 border-amber-500/50 pl-4 py-1.5 bg-amber-500/5 rounded-r">
                            <span className="text-amber-500 uppercase mr-3 font-bold text-[10px] tracking-widest">Citation:</span> {change.citation || 'N/A'}
                          </div>
                          <div className="text-xs bg-emerald-950/30 border border-emerald-500/20 p-4 text-emerald-300 rounded flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              <CheckSquare size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="uppercase text-emerald-500 mr-2 font-bold text-[10px] tracking-widest block mb-1">Proposed Fix:</span> 
                                <span className="leading-relaxed">{change.proposed_fix || 'N/A'}</span>
                              </div>
                            </div>
                            {change.oldCode && change.newCode && (
                              <div className="grid grid-cols-2 gap-4 mt-2 border-t border-emerald-500/20 pt-4">
                                <div className="bg-rose-950/30 border border-rose-500/30 p-2 rounded">
                                  <div className="text-[9px] text-rose-400 mb-1 uppercase font-bold tracking-widest">Old Code</div>
                                  <pre className="text-rose-300 overflow-x-auto whitespace-pre-wrap">{change.oldCode}</pre>
                                </div>
                                <div className="bg-emerald-950/30 border border-emerald-500/30 p-2 rounded">
                                  <div className="text-[9px] text-emerald-400 mb-1 uppercase font-bold tracking-widest">New Code</div>
                                  <pre className="text-emerald-300 overflow-x-auto whitespace-pre-wrap">{change.newCode}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {expandedJson[idx] && (
                            <div className="mt-4 relative animate-fade-in-up">
                              <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[9px] uppercase px-2 py-1 rounded-bl border-b border-l border-slate-700">AST_PAYLOAD.JSON</div>
                              <pre 
                                className="bg-[#090c10] border border-slate-800 p-5 text-[11px] overflow-x-auto font-mono text-slate-300 rounded shadow-inner"
                                dangerouslySetInnerHTML={{ __html: syntaxHighlight(change) }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded border border-slate-800">
                      <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Decrypting AST payload...</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#090c10]/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-[#121820] p-8 border border-rose-500/50 w-full max-w-2xl rounded-lg relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl"></div>
            <div className="bg-rose-500/10 text-rose-400 px-5 py-3 mb-6 flex justify-between items-center font-bold uppercase text-xs tracking-widest border border-rose-500/20 rounded relative z-10">
              <h3 className="flex items-center gap-2"><ShieldAlert size={16}/> SYSTEM.OVERRIDE_GOVERNANCE</h3>
              <button onClick={() => setShowModal(false)} className="hover:text-rose-300 text-rose-500 transition-colors p-1">✕</button>
            </div>
            <div className="mb-6 relative z-10">
              <label className="font-bold block mb-3 uppercase text-[10px] tracking-widest text-cyan-500">Enter Justification Log:</label>
              <textarea 
                className="w-full bg-[#090c10] border border-slate-700 p-4 text-slate-300 focus:outline-none focus:border-cyan-500/50 min-h-[120px] resize-none font-mono text-sm rounded transition-all"
                value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 relative z-10">
              <button onClick={() => setShowModal(false)} className="bg-transparent text-slate-400 border border-slate-700 px-6 py-2.5 text-xs font-bold uppercase rounded">Abort</button>
              <button onClick={handleOverride} disabled={isSubmitting || !overrideNote} className="px-6 py-2.5 bg-rose-500/10 text-rose-400 font-bold text-xs uppercase border border-rose-500/50 rounded">{isSubmitting ? 'Signing...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
