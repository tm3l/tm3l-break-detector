package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/tm3l/tm3l-break-detector/internal/analyzer/pb"
	"github.com/tm3l/tm3l-break-detector/internal/db"
	"github.com/tm3l/tm3l-break-detector/internal/models"
)

type DiffJob struct {
	ProjectID  string
	CommitSHA  string
	BaseFile   string
	TargetFile string
	Mode       string // "openapi" | "python_migration" | "code_migration"
	Language   string // "python", "go", "typescript"
}

var JobQueue = make(chan DiffJob, 100)

func StartWorkerPool(store db.Store, broker *Broker, numWorkers int) {
	for i := 0; i < numWorkers; i++ {
		go func() {
			for job := range JobQueue {
				processJob(store, broker, job)
			}
		}()
	}
}

func processJob(store db.Store, broker *Broker, job DiffJob) {
	defer os.Remove(job.BaseFile)
	defer os.Remove(job.TargetFile)

	rawOutput, err := runAnalysisJob(job)
	if err != nil {
		slog.Error("Analysis job execution failed", "err", err, "project_id", job.ProjectID)
		return
	}

	var ipcResponse models.IPCResponse
	if err := json.Unmarshal(rawOutput, &ipcResponse); err != nil {
		slog.Error("Failed to parse analysis output", "err", err)
		return
	}

	status := "PASSED"
	if ipcResponse.Summary.Breaking > 0 {
		status = "FAILED"
	}

	run := &models.DiffRun{
		ProjectID:      job.ProjectID,
		CommitSHA:      &job.CommitSHA,
		Status:         status,
		BreakingCount:  ipcResponse.Summary.Breaking,
		DangerousCount: ipcResponse.Summary.Dangerous,
		RawDiffPayload: json.RawMessage(rawOutput),
	}

	if err := store.InsertDiffRun(run); err != nil {
		slog.Error("Database insertion error", "err", err)
		return
	}

	event, _ := json.Marshal(map[string]interface{}{"type": "diff_completed", "data": run})
	broker.Notifier <- BrokerEvent{ProjectID: run.ProjectID, Payload: event}
}

func runAnalysisJob(job DiffJob) ([]byte, error) {
	address := os.Getenv("ANALYZER_URL")
	if address == "" {
		address = "localhost:50051"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err == nil {
		defer conn.Close()
		client := pb.NewAnalyzerServiceClient(conn)

		if job.Mode == "python_migration" || job.Mode == "code_migration" {
			targetBytes, fErr := os.ReadFile(job.TargetFile)
			if fErr == nil {
				lang := job.Language
				if lang == "" {
					lang = "python"
				}
				req := &pb.AnalyzeRequest{
					SourceCode: string(targetBytes),
					Language:   lang,
					Mode:       "code_migration",
				}
				resp, rpcErr := client.AnalyzeCode(ctx, req)
				if rpcErr == nil {
					return []byte(resp.JsonResult), nil
				}
			}
		} else {
			// OpenAPI comparison
			baseBytes, bErr := os.ReadFile(job.BaseFile)
			targetBytes, tErr := os.ReadFile(job.TargetFile)
			if bErr == nil && tErr == nil {
				var baseObj, targetObj json.RawMessage
				if json.Unmarshal(baseBytes, &baseObj) == nil && json.Unmarshal(targetBytes, &targetObj) == nil {
					payload, mErr := json.Marshal(map[string]json.RawMessage{
						"base":   baseObj,
						"target": targetObj,
					})
					if mErr == nil {
						req := &pb.AnalyzeRequest{
							SourceCode: string(payload),
							Mode:       "openapi",
						}
						resp, rpcErr := client.AnalyzeCode(ctx, req)
						if rpcErr == nil {
							return []byte(resp.JsonResult), nil
						}
					}
				}
			}
		}
	}

	// Fallback to local CLI binary if gRPC microservice is offline
	return runAnalysisViaCLI(job)
}

func runAnalysisViaCLI(job DiffJob) ([]byte, error) {
	bin := os.Getenv("ANALYZER_BIN")
	if bin == "" {
		bin = "./break-detector-engine"
	}

	var cmd *exec.Cmd
	if job.Mode == "python_migration" || job.Mode == "code_migration" {
		lang := job.Language
		if lang == "" {
			lang = "python"
		}
		cmd = exec.Command(bin, "--mode", "code_migration", "--language", lang, "--target", job.TargetFile)
	} else {
		cmd = exec.Command(bin, "--base", job.BaseFile, "--target", job.TargetFile)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("engine CLI failed: %w, stderr: %s", err, stderr.String())
	}

	return stdout.Bytes(), nil
}
