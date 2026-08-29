package main

import (
	"fmt"
	"github.com/tm3l/tm3l-break-detector/internal/analyzer"
)

func main() {
	analysis := analyzer.AnalyzeCode("def fetch_data():\n  pass")
	fmt.Printf("%+v\n", analysis)
}
