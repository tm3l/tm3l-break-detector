package analyzer

import (
	"strings"
	"testing"
)

func TestAnalyzePython2Legacy(t *testing.T) {
	code := `
import urllib2
import numpy as np

def fetch_data():
    raw = raw_input("Enter URL: ")
    for i in xrange(10):
        print "Fetching", i

if __name__ == "__main__":
    fetch_data()
`
	analysis := AnalyzeCode(code)
	if analysis.Language.Name != "Python" {
		t.Fatalf("Expected Python language, got %s", analysis.Language.Name)
	}
	if !strings.Contains(analysis.Language.Version, "2.x") {
		t.Fatalf("Expected 2.x version detected, got %s", analysis.Language.Version)
	}
	if analysis.FunctionCount != 1 {
		t.Fatalf("Expected 1 function, got %d", analysis.FunctionCount)
	}
	if len(analysis.Entrypoints) != 1 {
		t.Fatalf("Expected 1 entrypoint, got %d", len(analysis.Entrypoints))
	}
	if len(analysis.Dependencies) == 0 {
		t.Fatalf("Expected dependencies detected")
	}

	targets := map[string]bool{"docker": true, "cli": true}
	prompt := SynthesizePrompt(analysis, targets, code)
	if !strings.Contains(prompt, "TM3L Deterministic Build System Prompt") {
		t.Fatalf("Expected header in synthesized prompt")
	}
	if !strings.Contains(prompt, "Dockerfile") {
		t.Fatalf("Expected Dockerfile section in synthesized prompt")
	}
}

func TestAnalyzeGo(t *testing.T) {
	code := `
package main

import (
	"fmt"
	"net/http"
)

type Server struct {
	port int
}

func main() {
	fmt.Println("Server running")
}
`
	analysis := AnalyzeCode(code)
	if analysis.Language.Name != "Go" {
		t.Fatalf("Expected Go language, got %s", analysis.Language.Name)
	}
	if analysis.FunctionCount != 1 {
		t.Fatalf("Expected 1 function, got %d", analysis.FunctionCount)
	}
	if analysis.ClassCount != 1 {
		t.Fatalf("Expected 1 struct (class count), got %d", analysis.ClassCount)
	}

	targets := map[string]bool{"docker": true, "github_actions": true, "kubernetes": true}
	prompt := SynthesizePrompt(analysis, targets, code)
	if !strings.Contains(prompt, "golang:1.23-alpine") {
		t.Fatalf("Expected Go Dockerfile template in prompt")
	}
}

func TestAnalyzeTypeScript(t *testing.T) {
	code := `
import express from 'express';

interface Config {
	port: number;
}

export function start(): void {
	const app = express();
}
`
	analysis := AnalyzeCode(code)
	if analysis.Language.Name != "TypeScript" {
		t.Fatalf("Expected TypeScript language, got %s", analysis.Language.Name)
	}
	if len(analysis.Dependencies) == 0 {
		t.Fatalf("Expected dependencies detected")
	}
}
