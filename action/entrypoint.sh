#!/bin/sh
set -e

# Run the break-detector-engine binary and capture JSON output
OUTPUT=$(/usr/local/bin/break-detector-engine "$@")

echo "$OUTPUT"

# Extract metrics using simple grep/sed or jq if available
BREAKING_COUNT=$(echo "$OUTPUT" | grep -o '"breaking":[0-9]*' | head -1 | cut -d':' -f2 || echo "0")
DANGEROUS_COUNT=$(echo "$OUTPUT" | grep -o '"dangerous":[0-9]*' | head -1 | cut -d':' -f2 || echo "0")

if [ -z "$BREAKING_COUNT" ]; then BREAKING_COUNT=0; fi
if [ -z "$DANGEROUS_COUNT" ]; then DANGEROUS_COUNT=0; fi

# Set GitHub Action outputs
if [ -n "$GITHUB_OUTPUT" ]; then
  echo "breaking-changes=$BREAKING_COUNT" >> "$GITHUB_OUTPUT"
  echo "dangerous-changes=$DANGEROUS_COUNT" >> "$GITHUB_OUTPUT"
  echo "diff-report=$OUTPUT" >> "$GITHUB_OUTPUT"
fi

# Generate Markdown Step Summary
if [ -n "$GITHUB_STEP_SUMMARY" ]; then
  echo "# 🛡️ TM3L Break Detector Report" >> "$GITHUB_STEP_SUMMARY"
  if [ "$BREAKING_COUNT" -gt 0 ]; then
    echo "### 🚨 **Status: FAILED ($BREAKING_COUNT Breaking Changes Detected)**" >> "$GITHUB_STEP_SUMMARY"
  else
    echo "### ✅ **Status: PASSED (Contract & AST Rules Satisfied)**" >> "$GITHUB_STEP_SUMMARY"
  fi
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "| Metric | Value |" >> "$GITHUB_STEP_SUMMARY"
  echo "| :--- | :--- |" >> "$GITHUB_STEP_SUMMARY"
  echo "| 🔴 Breaking Violations | **$BREAKING_COUNT** |" >> "$GITHUB_STEP_SUMMARY"
  echo "| 🟡 Risky / Dangerous | **$DANGEROUS_COUNT** |" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "> *Run audited deterministically by TM3L Break Detector.*" >> "$GITHUB_STEP_SUMMARY"
fi

# Exit with non-zero code if breaking changes exist and fail-on-breaking is not suppressed
if [ "$BREAKING_COUNT" -gt 0 ]; then
  exit 1
fi
