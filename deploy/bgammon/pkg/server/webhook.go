package server

// FIBA Oyunları yaması: maç bittiğinde (puana ulaşıldığında) turnuva portalına
// HTTP POST atar. BGAMMON_RESULT_WEBHOOK ve BGAMMON_WEBHOOK_SECRET env
// değişkenleri boşsa hiçbir şey yapmaz.

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

type resultWebhookPayload struct {
	Secret  string `json:"secret"`
	Game    string `json:"game"`
	Player1 string `json:"player1"`
	Player2 string `json:"player2"`
	Winner  string `json:"winner"`
	Points  int8   `json:"points"`
}

func postResultWebhook(g *serverGame, winnerName string) {
	url := os.Getenv("BGAMMON_RESULT_WEBHOOK")
	if url == "" {
		return
	}
	payload := resultWebhookPayload{
		Secret:  os.Getenv("BGAMMON_WEBHOOK_SECRET"),
		Game:    string(g.name),
		Player1: g.Player1.Name,
		Player2: g.Player2.Name,
		Winner:  winnerName,
		Points:  g.Points,
	}
	go func() {
		body, err := json.Marshal(payload)
		if err != nil {
			log.Printf("result webhook marshal error: %s", err)
			return
		}
		client := &http.Client{Timeout: 10 * time.Second}
		for attempt := 0; attempt < 3; attempt++ {
			resp, err := client.Post(url, "application/json", bytes.NewReader(body))
			if err == nil {
				resp.Body.Close()
				if resp.StatusCode < 300 {
					return
				}
			}
			time.Sleep(5 * time.Second)
		}
		log.Printf("result webhook failed after retries: game=%s", g.name)
	}()
}
