package analyzer

import (
	"fmt"
	"strings"
)

// DetectedLanguage holds language and version info
type DetectedLanguage struct {
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
	Runtime string `json:"runtime,omitempty"` // e.g. "CPython", "PyPy", "GraalVM"
}

// Dependency holds a detected import/package
type Dependency struct {
	Name       string `json:"name"`
	IsCExt     bool   `json:"is_c_extension,omitempty"` // e.g. pandas, numpy, torch
	IsNative   bool   `json:"is_native,omitempty"`      // native C bindings
	PackageHint string `json:"package_hint,omitempty"`  // e.g. "pip install pandas"
}

// Entrypoint represents detected main/entry points
type Entrypoint struct {
	Kind string `json:"kind"` // "python_main", "go_main", "js_default_export", etc.
	Line string `json:"line,omitempty"`
}

// PackagingCaveat is a specific warning about packaging this code
type PackagingCaveat struct {
	Severity string `json:"severity"` // "WARNING", "INFO"
	Message  string `json:"message"`
}

// CodeAnalysis is the structured output from static analysis
type CodeAnalysis struct {
	Language      DetectedLanguage  `json:"language"`
	Dependencies  []Dependency      `json:"dependencies"`
	Entrypoints   []Entrypoint      `json:"entrypoints"`
	Caveats       []PackagingCaveat `json:"caveats"`
	FunctionCount int               `json:"function_count"`
	ClassCount    int               `json:"class_count"`
	LineCount     int               `json:"line_count"`
}

// C extensions that require special PyInstaller/packaging handling
var pythonCExtensions = map[string]bool{
	"numpy": true, "pandas": true, "scipy": true, "torch": true,
	"tensorflow": true, "cv2": true, "PIL": true, "Pillow": true,
	"sklearn": true, "matplotlib": true, "lxml": true, "psycopg2": true,
	"cryptography": true, "cffi": true, "pydantic": true,
}

// Python 2 indicators
var python2Indicators = []string{
	"print ", "xrange(", "raw_input(", "unicode(", "basestring",
	"iteritems()", "itervalues()", "iterkeys()", "has_key(",
}

// AnalyzeCode performs language-agnostic static analysis
func AnalyzeCode(sourceCode string) CodeAnalysis {
	lines := strings.Split(sourceCode, "\n")
	analysis := CodeAnalysis{LineCount: len(lines)}

	lang := detectLanguage(sourceCode, lines)
	analysis.Language = lang

	switch lang.Name {
	case "Python":
		analysis = analyzePython(sourceCode, lines, analysis)
	case "Go":
		analysis = analyzeGo(sourceCode, lines, analysis)
	case "JavaScript", "TypeScript":
		analysis = analyzeJS(sourceCode, lines, analysis)
	case "Shell":
		analysis = analyzeShell(sourceCode, lines, analysis)
	}

	return analysis
}

func detectLanguage(code string, lines []string) DetectedLanguage {
	// Go detection
	if strings.Contains(code, "package main") || strings.Contains(code, "func main()") {
		return DetectedLanguage{Name: "Go", Version: "1.x"}
	}
	// TypeScript
	if strings.Contains(code, ": string") || strings.Contains(code, "interface ") ||
		strings.Contains(code, ": number") || strings.Contains(code, "export type ") {
		return DetectedLanguage{Name: "TypeScript", Runtime: "Node.js"}
	}
	// JavaScript ES Modules
	if strings.Contains(code, "import ") && strings.Contains(code, "from '") {
		return DetectedLanguage{Name: "JavaScript", Runtime: "Node.js ESModules"}
	}
	// CommonJS
	if strings.Contains(code, "require(") && strings.Contains(code, "module.exports") {
		return DetectedLanguage{Name: "JavaScript", Runtime: "Node.js CommonJS"}
	}
	// Shell
	if len(lines) > 0 && (strings.HasPrefix(lines[0], "#!/bin/bash") ||
		strings.HasPrefix(lines[0], "#!/bin/sh") ||
		strings.HasPrefix(lines[0], "#!/usr/bin/env bash")) {
		return DetectedLanguage{Name: "Shell", Runtime: "bash"}
	}
	// Python - check for Python 2 vs 3 clues
	if strings.Contains(code, "import ") || strings.Contains(code, "def ") ||
		strings.Contains(code, "class ") || strings.Contains(code, "print(") {
		version := "3.x"
		for _, indicator := range python2Indicators {
			if strings.Contains(code, indicator) {
				version = "2.x (Legacy - Migration Required)"
				break
			}
		}
		return DetectedLanguage{Name: "Python", Version: version, Runtime: "CPython"}
	}
	return DetectedLanguage{Name: "Unknown"}
}

func analyzePython(code string, lines []string, analysis CodeAnalysis) CodeAnalysis {
	depsMap := map[string]bool{}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") {
			continue
		}
		// Count functions and classes
		if strings.HasPrefix(trimmed, "def ") {
			analysis.FunctionCount++
		}
		if strings.HasPrefix(trimmed, "class ") {
			analysis.ClassCount++
		}
		// Detect entrypoint
		if strings.Contains(trimmed, `if __name__ == "__main__"`) ||
			strings.Contains(trimmed, `if __name__ == '__main__'`) {
			analysis.Entrypoints = append(analysis.Entrypoints,
				Entrypoint{Kind: "python_main", Line: trimmed})
		}
		// Extract imports
		if strings.HasPrefix(trimmed, "import ") {
			parts := strings.Fields(trimmed)
			if len(parts) >= 2 {
				mod := strings.Split(parts[1], ".")[0]
				depsMap[mod] = true
			}
		}
		if strings.HasPrefix(trimmed, "from ") {
			parts := strings.Fields(trimmed)
			if len(parts) >= 2 {
				mod := strings.Split(parts[1], ".")[0]
				depsMap[mod] = true
			}
		}
	}

	hasCExt := false
	for mod := range depsMap {
		dep := Dependency{
			Name:        mod,
			IsCExt:      pythonCExtensions[mod],
			PackageHint: fmt.Sprintf("pip install %s", mod),
		}
		if dep.IsCExt {
			hasCExt = true
		}
		analysis.Dependencies = append(analysis.Dependencies, dep)
	}

	// Packaging caveats
	if hasCExt {
		analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
			Severity: "WARNING",
			Message:  "C-extension dependencies detected (e.g. pandas, numpy, torch). When using PyInstaller, you MUST add --hidden-import flags for each C-extension. Nuitka may require --include-package overrides.",
		})
	}
	if strings.Contains(analysis.Language.Version, "2.x") {
		analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
			Severity: "WARNING",
			Message:  "Python 2.x code detected. Python 2 reached End-of-Life on January 1, 2020. PyInstaller 3.6 is the last version supporting Python 2. Consider migrating to Python 3 first.",
		})
	}
	if analysis.FunctionCount == 0 && analysis.ClassCount == 0 {
		analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
			Severity: "INFO",
			Message:  "No functions or classes detected. This may be a script rather than a module. PyInstaller should work without a --spec file.",
		})
	}

	return analysis
}

func analyzeGo(code string, lines []string, analysis CodeAnalysis) CodeAnalysis {
	depsMap := map[string]bool{}
	inImportBlock := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") {
			continue
		}
		if strings.HasPrefix(trimmed, "func ") {
			analysis.FunctionCount++
		}
		if strings.HasPrefix(trimmed, "type ") && strings.Contains(trimmed, "struct") {
			analysis.ClassCount++ // structs as analogous
		}
		if trimmed == "func main() {" || trimmed == "func main(){" {
			analysis.Entrypoints = append(analysis.Entrypoints,
				Entrypoint{Kind: "go_main", Line: trimmed})
		}
		if strings.Contains(trimmed, "import (") {
			inImportBlock = true
			continue
		}
		if inImportBlock && trimmed == ")" {
			inImportBlock = false
			continue
		}
		if inImportBlock {
			cleaned := strings.Trim(trimmed, `"`)
			if cleaned != "" {
				depsMap[cleaned] = true
			}
		}
		if strings.HasPrefix(trimmed, `import "`) {
			pkg := strings.Trim(strings.TrimPrefix(trimmed, "import "), `"`)
			depsMap[pkg] = true
		}
	}

	for mod := range depsMap {
		analysis.Dependencies = append(analysis.Dependencies, Dependency{
			Name:        mod,
			PackageHint: fmt.Sprintf("go get %s", mod),
		})
	}

	// Check for CGO usage
	if strings.Contains(code, `import "C"`) || strings.Contains(code, "// #include") {
		analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
			Severity: "WARNING",
			Message:  "CGO detected (import \"C\"). You CANNOT use CGO_ENABLED=0 for fully static builds. The output binary will depend on system glibc. Consider using CGO_ENABLED=1 with a musl-based Alpine image for portable static compilation.",
		})
	} else {
		analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
			Severity: "INFO",
			Message:  "No CGO detected. You can build a fully static binary with: CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags \"-static\"' -o app ./cmd/...",
		})
	}

	return analysis
}

func analyzeJS(code string, lines []string, analysis CodeAnalysis) CodeAnalysis {
	depsMap := map[string]bool{}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") {
			continue
		}
		if strings.HasPrefix(trimmed, "function ") || strings.Contains(trimmed, "=> {") {
			analysis.FunctionCount++
		}
		if strings.HasPrefix(trimmed, "class ") {
			analysis.ClassCount++
		}
		// ES import
		if strings.HasPrefix(trimmed, "import ") && strings.Contains(trimmed, "from '") {
			start := strings.LastIndex(trimmed, "from '") + 6
			end := strings.LastIndex(trimmed, "'")
			if start > 5 && end > start {
				pkg := trimmed[start:end]
				if !strings.HasPrefix(pkg, ".") {
					depsMap[pkg] = true
				}
			}
		}
		// CommonJS require
		if strings.Contains(trimmed, "require('") {
			start := strings.Index(trimmed, "require('") + 9
			end := strings.Index(trimmed[start:], "'") + start
			if end > start {
				pkg := trimmed[start:end]
				if !strings.HasPrefix(pkg, ".") {
					depsMap[pkg] = true
				}
			}
		}
	}

	for mod := range depsMap {
		analysis.Dependencies = append(analysis.Dependencies, Dependency{
			Name:        mod,
			PackageHint: fmt.Sprintf("npm install %s", mod),
		})
	}

	analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
		Severity: "INFO",
		Message:  "For Node.js standalone binary packaging, consider using: pkg (Vercel), ncc (Vercel), or esbuild + pkg. Electron is recommended for GUI apps.",
	})

	return analysis
}

func analyzeShell(code string, lines []string, analysis CodeAnalysis) CodeAnalysis {
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") && !strings.HasPrefix(trimmed, "#!") {
			continue
		}
		if strings.HasSuffix(trimmed, "() {") || strings.Contains(trimmed, "function ") {
			analysis.FunctionCount++
		}
	}
	analysis.Caveats = append(analysis.Caveats, PackagingCaveat{
		Severity: "INFO",
		Message:  "Shell scripts are not directly compiled. Package as part of a Docker image or use shc (Shell Script Compiler) to create an obfuscated binary. Ensure all external dependencies (curl, jq, etc.) are available in the target environment.",
	})
	return analysis
}

// SynthesizePrompt builds a deterministic LLM system prompt from code analysis + user targets
func SynthesizePrompt(analysis CodeAnalysis, targets map[string]bool, rawCode string) string {
	var sb strings.Builder

	sb.WriteString("# TM3L Deterministic Build System Prompt\n\n")
	sb.WriteString("> **This prompt was deterministically generated by the TM3L AST Static Analyzer. Do NOT skip any instructions below — they are derived from deep code inspection.**\n\n")

	sb.WriteString("## Code Analysis Report\n\n")
	sb.WriteString(fmt.Sprintf("- **Language:** %s\n", analysis.Language.Name))
	if analysis.Language.Version != "" {
		sb.WriteString(fmt.Sprintf("- **Version:** %s\n", analysis.Language.Version))
	}
	if analysis.Language.Runtime != "" {
		sb.WriteString(fmt.Sprintf("- **Runtime:** %s\n", analysis.Language.Runtime))
	}
	sb.WriteString(fmt.Sprintf("- **Lines of Code:** %d\n", analysis.LineCount))
	sb.WriteString(fmt.Sprintf("- **Functions:** %d | **Classes/Structs:** %d\n", analysis.FunctionCount, analysis.ClassCount))

	if len(analysis.Entrypoints) > 0 {
		sb.WriteString("\n**Detected Entrypoints:**\n")
		for _, ep := range analysis.Entrypoints {
			sb.WriteString(fmt.Sprintf("- `%s` → `%s`\n", ep.Kind, ep.Line))
		}
	}

	if len(analysis.Dependencies) > 0 {
		sb.WriteString("\n**Detected Dependencies:**\n")
		for _, dep := range analysis.Dependencies {
			cext := ""
			if dep.IsCExt {
				cext = " ⚠️ **C-Extension**"
			}
			sb.WriteString(fmt.Sprintf("- `%s`%s\n", dep.Name, cext))
		}
	}

	if len(analysis.Caveats) > 0 {
		sb.WriteString("\n**Packaging Caveats & Warnings:**\n")
		for _, caveat := range analysis.Caveats {
			emoji := "ℹ️"
			if caveat.Severity == "WARNING" {
				emoji = "⚠️"
			}
			sb.WriteString(fmt.Sprintf("\n%s %s\n", emoji, caveat.Message))
		}
	}

	sb.WriteString("\n---\n\n## Your Directives\n\n")
	sb.WriteString("You are an Expert Build Engineer and DevOps Architect. Based on the analysis above, ")
	sb.WriteString("generate the exact build artifacts requested below. Follow every caveat listed above. ")
	sb.WriteString("Do not generate generic templates — tailor every command and configuration specifically to the dependencies and language version detected.\n\n")

	if targets["docker"] {
		sb.WriteString("### 1. Multi-Stage Production Dockerfile\n\n")
		sb.WriteString(dockerPromptForLang(analysis))
	}
	if targets["cli"] {
		sb.WriteString("### 2. Standalone Local Binary Build Script\n\n")
		sb.WriteString(cliPromptForLang(analysis))
	}
	if targets["github_actions"] {
		sb.WriteString("### 3. GitHub Actions CI/CD Pipeline\n\n")
		sb.WriteString("Generate a complete `.github/workflows/build.yml` that:\n")
		sb.WriteString("- Runs on `push` and `pull_request` to `main`\n")
		sb.WriteString("- Sets up the correct language environment (versions as detected)\n")
		sb.WriteString("- Installs all detected dependencies\n")
		sb.WriteString("- Runs linting and tests\n")
		sb.WriteString("- Builds the production artifact\n")
		sb.WriteString("- Uploads the artifact to GitHub Releases on tagged pushes\n\n")
	}
	if targets["kubernetes"] {
		sb.WriteString("### 4. Kubernetes Deployment Spec\n\n")
		sb.WriteString("Generate a complete `k8s/deployment.yaml` and `k8s/service.yaml` with:\n")
		sb.WriteString("- Appropriate resource requests and limits based on the dependency profile\n")
		sb.WriteString("- Liveness and readiness probes\n")
		sb.WriteString("- ConfigMap for environment variables\n")
		sb.WriteString("- HorizontalPodAutoscaler configuration\n\n")
	}

	sb.WriteString("\n---\n\n## Source Code to Compile\n\n```\n")
	sb.WriteString(rawCode)
	sb.WriteString("\n```\n")

	return sb.String()
}

func dockerPromptForLang(analysis CodeAnalysis) string {
	switch analysis.Language.Name {
	case "Python":
		cextFlags := ""
		for _, dep := range analysis.Dependencies {
			if dep.IsCExt {
				cextFlags += fmt.Sprintf(" \\\n      --hidden-import=%s", dep.Name)
			}
		}
		return fmt.Sprintf(`Generate a multi-stage Dockerfile for this Python application:
- **Stage 1 (builder):** Use python:3.11-slim. Install all dependencies via pip. If packaging to a single binary, use PyInstaller with these hidden imports:%s
- **Stage 2 (runtime):** Use python:3.11-alpine or distroless/python3. Copy only the compiled artifact.
- Add a non-root USER for security.
- Set PYTHONDONTWRITEBYTECODE=1 and PYTHONUNBUFFERED=1.

`, cextFlags)
	case "Go":
		return `Generate a multi-stage Dockerfile for this Go application:
- **Stage 1 (builder):** Use golang:1.23-alpine. Run: CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o /app/server ./cmd/...
- **Stage 2 (runtime):** Use scratch or alpine:latest. Copy only the compiled binary from Stage 1.
- Add a non-root USER via addgroup/adduser in Alpine stage.

`
	case "JavaScript", "TypeScript":
		return `Generate a multi-stage Dockerfile for this Node.js application:
- **Stage 1 (deps):** Use node:20-alpine. Run npm ci --only=production.
- **Stage 2 (builder):** Run npm run build (for TypeScript compilation or bundling).
- **Stage 3 (runtime):** Use node:20-alpine. Copy only node_modules and dist/. Run as non-root.

`
	default:
		return "Generate an appropriate multi-stage Dockerfile for the detected language.\n\n"
	}
}

func cliPromptForLang(analysis CodeAnalysis) string {
	switch analysis.Language.Name {
	case "Python":
		hiddenImports := ""
		for _, dep := range analysis.Dependencies {
			if dep.IsCExt {
				hiddenImports += fmt.Sprintf(" --hidden-import=%s", dep.Name)
			}
		}
		return fmt.Sprintf(`Generate a shell script that:
1. Creates and activates a virtualenv
2. Installs dependencies: pip install -r requirements.txt
3. Runs PyInstaller with the correct flags:
   pyinstaller --onefile%s main.py
4. Alternatively, provide the Nuitka command for higher-performance compilation.

`, hiddenImports)
	case "Go":
		return `Generate a Makefile and build script that runs:
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -trimpath -ldflags '-w -s -extldflags "-static"' -o ./bin/app ./cmd/...

Also provide cross-compilation commands for darwin/arm64 and windows/amd64.

`
	case "JavaScript", "TypeScript":
		return `Generate an npm script and pkg command to produce a standalone binary:
1. npm run build (compile TypeScript if needed)
2. npx pkg . --targets node18-linux-x64,node18-macos-arm64,node18-win-x64 --output ./bin/app

`
	default:
		return "Generate an appropriate local build command for the detected language.\n\n"
	}
}
