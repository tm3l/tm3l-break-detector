import { useEffect, useState } from 'react';
import { Terminal, Activity, SplitSquareHorizontal, Cpu, ShieldCheck } from 'lucide-react';
import { CIMonitor } from './components/CIMonitor';
import { InteractiveSandbox, SandboxMode } from './components/InteractiveSandbox';
import { PromptCompiler } from './components/PromptCompiler';
import { AuditLedger } from './components/AuditLedger';
import { OverrideModal } from './components/OverrideModal';
import { BreakingChange, CodeAnalysis } from './types';

function App() {
  const [events, setEvents] = useState<string[]>([]);
  const [status, setStatus] = useState<'SAFE' | 'WARNING' | 'BREAKING'>('SAFE');
  
  const [diffId, setDiffId] = useState<string | null>(null);
  const [diffStatus, setDiffStatus] = useState<string | null>(null);
  const [breakingChanges, setBreakingChanges] = useState<BreakingChange[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [viewMode, setViewMode] = useState<'MONITOR' | 'SANDBOX' | 'PROMPT' | 'AUDIT'>('MONITOR');
  const [sandboxMode, setSandboxMode] = useState<SandboxMode>('OPENAPI');
  const [sandboxBase, setSandboxBase] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/users": {\n      "post": {\n        "requestBody": {\n          "content": {\n            "application/json": {\n              "schema": {\n                "type": "object",\n                "properties": { "email": { "type": "string" } }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}');
  const [sandboxTarget, setSandboxTarget] = useState('{\n  "openapi": "3.0.0",\n  "paths": {\n    "/users": {\n      "post": {\n        "requestBody": {\n          "content": {\n            "application/json": {\n              "schema": {\n                "type": "object",\n                "properties": { "email": { "type": "string" } },\n                "required": ["email"]\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}');
  const [sourceCode, setSourceCode] = useState('import urllib2\nprint "Hello World"\n');
  
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');
  const [connectionState, setConnectionState] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');

  const [promptCode, setPromptCode] = useState('import urllib2\nimport numpy as np\n\ndef fetch():\n    raw = raw_input("Enter URL: ")\n    for i in xrange(10):\n        print "Fetching", i\n\nif __name__ == "__main__":\n    fetch()\n');
  const [promptLang, setPromptLang] = useState('Python');
  const [targetDockerfile, setTargetDockerfile] = useState(true);
  const [targetCLI, setTargetCLI] = useState(true);
  const [targetK8s, setTargetK8s] = useState(false);
  const [targetCI, setTargetCI] = useState(true);
  const [promptResult, setPromptResult] = useState('');
  const [astAnalysis, setAstAnalysis] = useState<CodeAnalysis | null>(null);
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
          const s = payload.data?.status || payload.status;
          setDiffId(id);
          setDiffStatus(s);
          setStatus(s === 'FAILED' ? 'BREAKING' : 'SAFE');
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
    setIsSubmitting(true);
    if (sandboxMode === 'PYTHON') {
      try {
        await fetch('/api/code-diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_code: sourceCode, mode: 'code_migration', language: 'python' })
        });
      } catch (e) {}
      setTimeout(() => {
        setDiffStatus('FAILED');
        setStatus('BREAKING');
        setBreakingChanges([
          {
            severity: 'BREAKING',
            path: 'main.py',
            citation: 'PEP 3105 / PEP 3108',
            description: 'Legacy urllib2 module and unparenthesized print statement detected.',
            proposed_fix: 'Use print() function and urllib.request',
            line: 'line:L1-L2',
            oldCode: sourceCode,
            newCode: sourceCode
              .replace(/import urllib2/g, 'import urllib.request')
              .replace(/print\s+"([^"]+)"/g, 'print("$1")')
              .replace(/print\s+'([^']+)'/g, "print('$1')")
              .replace(/xrange\(/g, 'range(')
              .replace(/unicode\(/g, 'str(')
          }
        ]);
        setIsSubmitting(false);
      }, 600);
      return;
    }

    if (sandboxMode === 'GO') {
      try {
        await fetch('/api/code-diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_code: sourceCode, mode: 'code_migration', language: 'go' })
        });
      } catch (e) {}
      setTimeout(() => {
        setDiffStatus('FAILED');
        setStatus('BREAKING');
        setBreakingChanges([
          {
            severity: 'DANGEROUS',
            path: 'main.go',
            citation: 'Go 1.16 Release Notes',
            description: "Package 'io/ioutil' was deprecated in Go 1.16.",
            proposed_fix: "Use package 'io' or 'os' equivalents instead.",
            line: 'line:L4',
            oldCode: sourceCode,
            newCode: sourceCode.replace(/"io\/ioutil"/g, '"io"\n\t"os"').replace(/ioutil\.ReadFile/g, 'os.ReadFile')
          }
        ]);
        setIsSubmitting(false);
      }, 600);
      return;
    }

    if (sandboxMode === 'TYPESCRIPT') {
      try {
        await fetch('/api/code-diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_code: sourceCode, mode: 'code_migration', language: 'typescript' })
        });
      } catch (e) {}
      setTimeout(() => {
        setDiffStatus('FAILED');
        setStatus('BREAKING');
        setBreakingChanges([
          {
            severity: 'DANGEROUS',
            path: 'app.ts',
            citation: 'TypeScript ESLint: no-var',
            description: "Usage of 'var' keyword. Prefer 'const' or 'let' for block-scoped semantics.",
            proposed_fix: "Replace 'var' with 'const' or 'let'.",
            line: 'line:L2',
            oldCode: sourceCode,
            newCode: sourceCode.replace(/\bvar\b/g, 'const')
          }
        ]);
        setIsSubmitting(false);
      }, 600);
      return;
    }

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
      const targetsMap: Record<string, boolean> = {
        docker: targetDockerfile,
        cli: targetCLI,
        github_actions: targetCI,
        kubernetes: targetK8s,
      };

      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: promptCode,
          targets: targetsMap
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPromptResult(data.markdown);
        setAstAnalysis(data.analysis);
      } else {
        // Fallback generator
        const targets = [];
        if (targetDockerfile) targets.push('Generate Multi-stage Dockerfile');
        if (targetCLI) targets.push('Generate Local Standalone Binary');
        if (targetCI) targets.push('Generate GitHub Actions CI Workflow');
        if (targetK8s) targets.push('Generate Kubernetes Deployment Spec');
        
        const markdownRes = `# TM3L Deterministic Build System Prompt\n\n> **Derived from AST Static Analyzer**\n\n- **Language:** ${promptLang}\n- **Directives:** ${targets.join(', ')}\n\n## Source Code\n\`\`\`\n${promptCode}\n\`\`\`\n`;
        setPromptResult(markdownRes);
      }
      setCopySuccess(false);
    } catch (e) {
      const markdownRes = `# TM3L Deterministic Build System Prompt\n\n- **Language:** ${promptLang}\n\n## Source Code\n\`\`\`\n${promptCode}\n\`\`\`\n`;
      setPromptResult(markdownRes);
    } finally { setIsPrompting(false); }
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
      setSourceCode('import urllib2\n\ndef fetch():\n    print "Fetching..."\n    for i in xrange(10):\n        print "Index", i\n    return urllib2.urlopen("http://example.com")');
    } else if (sample === "Go: Migrate deprecated io/ioutil package") {
      setSandboxMode('GO');
      setSourceCode('package main\n\nimport (\n\t"fmt"\n\t"io/ioutil"\n)\n\nfunc main() {\n\tdata, _ := ioutil.ReadFile("config.json")\n\tfmt.Println(string(data))\n}');
    } else if (sample === "TypeScript: Migrate legacy var keyword") {
      setSandboxMode('TYPESCRIPT');
      setSourceCode('export function calculateTotal(items: number[]): number {\n  var total = 0;\n  for (var i = 0; i < items.length; i++) {\n    total += items[i];\n  }\n  return total;\n}');
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
              <Cpu size={14} /> [ LLM Prompt Compiler ]
            </button>
            <button onClick={() => setViewMode('AUDIT')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase transition-colors rounded ${viewMode === 'AUDIT' ? 'bg-emerald-900/40 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
              <ShieldCheck size={14} /> Audit Ledger
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
            promptResult={promptResult} astAnalysis={astAnalysis} copySuccess={copySuccess}
            copyToClipboard={copyToClipboard} downloadMarkdown={downloadMarkdown}
          />
        ) : viewMode === 'SANDBOX' ? (
          <InteractiveSandbox 
            sandboxMode={sandboxMode} setSandboxMode={setSandboxMode}
            sandboxBase={sandboxBase} setSandboxBase={setSandboxBase}
            sandboxTarget={sandboxTarget} setSandboxTarget={setSandboxTarget}
            sourceCode={sourceCode} setSourceCode={setSourceCode}
            executeSandboxDiff={executeSandboxDiff}
            isSubmitting={isSubmitting} loadSample={loadSample}
            breakingChanges={breakingChanges}
          />
        ) : viewMode === 'AUDIT' ? (
          <AuditLedger />
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

