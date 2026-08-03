package server

// FIBA Oyunları yaması 2: oyuncu giriş yaptığında turnuva portalına sorulur —
// bu kullanıcı adına atanmış canlı bir maç varsa oda otomatik kurulur (p1)
// veya rakibin odasına otomatik katılınır (p2). Oyuncu hiçbir oda işlemi yapmaz.
// BGAMMON_PORTAL_URL boşsa devre dışıdır.

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

type expectedMatch struct {
	Found    bool   `json:"found"`
	Action   string `json:"action"` // create | join
	Room     string `json:"room"`
	Password string `json:"password"`
	Points   int    `json:"points"`
	Opponent string `json:"opponent"` // join için: odayı kuran oyuncunun sunucudaki adı
}

func autoJoinFromPortal(s *server, c *serverClient) {
	portal := os.Getenv("BGAMMON_PORTAL_URL")
	if portal == "" {
		return
	}
	go func() {
		defer func() { recover() }() // bağlantı kapandıysa sessizce çık

		httpClient := &http.Client{Timeout: 5 * time.Second}
		reqURL := fmt.Sprintf("%s/api/bgammon/expected?username=%s&secret=%s",
			portal, url.QueryEscape(string(c.name)), url.QueryEscape(os.Getenv("BGAMMON_WEBHOOK_SECRET")))

		var em expectedMatch
		for attempt := 0; attempt < 3; attempt++ {
			resp, err := httpClient.Get(reqURL)
			if err == nil {
				decErr := json.NewDecoder(resp.Body).Decode(&em)
				resp.Body.Close()
				if decErr == nil {
					break
				}
			}
			time.Sleep(2 * time.Second)
		}
		if !em.Found {
			return
		}

		// Kim önce gelirse odayı o kurar; sonra gelen numarasıyla katılır.
		// (em.Action yalnızca eşzamanlı geliş yarışında öncelik belirler.)
		findRoom := func() int {
			s.gamesLock.RLock()
			defer s.gamesLock.RUnlock()
			for _, g := range s.games {
				if string(g.name) == em.Room && g.Winner == 0 {
					return g.id
				}
			}
			return 0
		}

		preferCreate := em.Action == "create"
		for attempt := 0; attempt < 60; attempt++ {
			if c.terminating {
				return
			}
			if s.gameByClient(c) != nil {
				log.Printf("fiba: %s odada (%s)", c.name, em.Room)
				return
			}
			if id := findRoom(); id > 0 {
				c.commands <- []byte(fmt.Sprintf("join %d %s", id, em.Password))
			} else if preferCreate || attempt >= 2 {
				log.Printf("fiba auto-create: %s -> %s", c.name, em.Room)
				c.commands <- []byte(fmt.Sprintf("create private %s %d 0 %s", em.Password, em.Points, em.Room))
			}
			time.Sleep(3 * time.Second)
		}
	}()
}
