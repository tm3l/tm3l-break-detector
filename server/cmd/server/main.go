package main

import (
	"log"
	"net/http"
	"os"

	"github.com/tm3l/tm3l-break-detector/internal/api"
	"github.com/tm3l/tm3l-break-detector/internal/db"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://tm3l_user:tm3l_password@postgres:5432/tm3l_break_detector?sslmode=disable"
	}

	log.Println("Connecting to database...")
	store, err := db.NewPostgresStore(dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Initializing SSE Broker...")
	broker := api.NewBroker()

	log.Println("Starting API Server on :8080")
	server := api.NewServer(store, broker)

	if err := http.ListenAndServe(":8080", server.Router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
