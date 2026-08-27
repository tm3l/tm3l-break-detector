import { useEffect, useState } from 'react';
import { Terminal, Activity, SplitSquareHorizontal, Cpu } from 'lucide-react';
import { CIMonitor } from './components/CIMonitor';
import { InteractiveSandbox } from './components/InteractiveSandbox';
import { PromptCompiler } from './components/PromptCompiler';
import { OverrideModal } from './components/OverrideModal';
import { BreakingChange } from './types';

function App() {
  const [events, setEvents] = useState<string[]>([]);
  const [status, setStatus] = useState<'SAFE' | 'WARNING' | 'BREAKING'>('SAFE');
  
  const [diffId, setDiffId] = useState<string | null>(null);
  const [diffStatus, setDiffStatus] = useState<string | null>(null);
  const [breakingChanges, setBreakingChanges] = useState<BreakingChange[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [viewMode, setViewMode] = useState<'MONITOR' | 'SANDBOX' | 'PROMPT'>('MONITOR');
  const [sandboxMode, setSandboxMode] = useState<'OPENAPI' | 'PYTHON'>('OPENAPI');
  const [sandboxBase, setSandboxBase] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/users": {\n      "post": {\n        "requestBody": {\n          "content": {\n            "application/json": {\n              "schema": {\n                "type": "object",\n                "properties": { "email": { "type": "string" } }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}');
  const [sandboxTarget, setSandboxTarget] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/users": {\n      "post": {\n        "requestBody": {\n          "content": {\n            "application/json": {\n              "schema": {\n                "type": "object",\n                "properties": { "email": { "type": "string" } },\n                "required": ["email"]\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}');
  const [pythonCode, setPythonCode] = useState('import urllib2\nprint "Hello World"\n');
  
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');

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
        // Do not switch viewMode, stay in sandbox to show Monaco Diff Editor
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
          <PromptCompiler 
            promptLang={promptLang} setPromptLang={setPromptLang}
            promptCode={promptCode} setPromptCode={setPromptCode}
            targetDockerfile={targetDockerfile} setTargetDockerfile={setTargetDockerfile}
            targetCLI={targetCLI} setTargetCLI={setTargetCLI}
            targetCI={targetCI} setTargetCI={setTargetCI}
            targetK8s={targetK8s} setTargetK8s={setTargetK8s}
            isPrompting={isPrompting} executePrompt={executePrompt}
            promptResult={promptResult} copySuccess={copySuccess}
            copyToClipboard={copyToClipboard} downloadMarkdown={downloadMarkdown}
          />
        ) : viewMode === 'SANDBOX' ? (
          <InteractiveSandbox 
            sandboxMode={sandboxMode} setSandboxMode={setSandboxMode}
            sandboxBase={sandboxBase} setSandboxBase={setSandboxBase}
            sandboxTarget={sandboxTarget} setSandboxTarget={setSandboxTarget}
            pythonCode={pythonCode} setPythonCode={setPythonCode}
            executeSandboxDiff={executeSandboxDiff}
            isSubmitting={isSubmitting} loadSample={loadSample}
            breakingChanges={breakingChanges}
          />
        ) : (
          <CIMonitor 
            status={status} connectionState={connectionState}
            currentProjectId={currentProjectId} events={events}
            diffStatus={diffStatus} breakingChanges={breakingChanges}
            setShowModal={setShowModal}
          />
        )}
      </div>

      {showModal && (
        <OverrideModal 
          setShowModal={setShowModal}
          overrideNote={overrideNote} setOverrideNote={setOverrideNote}
          handleOverride={handleOverride} isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

export default App;
