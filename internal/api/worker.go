package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

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

	var cmd *exec.Cmd
	if job.Mode == "python_migration" || job.Mode == "code_migration" {
		lang := job.Language
		if lang == "" {
			lang = "python"
		}
		cmd = exec.Command("./break-detector-engine", "--mode", "code_migration", "--language", lang, "--target", job.TargetFile)
	} else {
		cmd = exec.Command("./break-detector-engine", "--base", job.BaseFile, "--target", job.TargetFile)
	}
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		fmt.Printf("Engine failed: %v. Stderr: %s\n", err, stderr.String())
		return
	}

	var ipcResponse models.IPCResponse
	if err := json.Unmarshal(stdout.Bytes(), &ipcResponse); err != nil {
		fmt.Printf("Failed to parse engine output: %v\n", err)
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
		RawDiffPayload: json.RawMessage(stdout.Bytes()),
	}

	if err := store.InsertDiffRun(run); err != nil {
		fmt.Printf("DB Error: %v\n", err)
		return
	}

	event, _ := json.Marshal(map[string]interface{}{"type": "diff_completed", "data": run})
	broker.Notifier <- BrokerEvent{ProjectID: run.ProjectID, Payload: event}
}
