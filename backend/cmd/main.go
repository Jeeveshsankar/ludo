package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
)

// --- CONFIG & CONSTANTS ---
const (
	JWTSecret       = "heysakhi_ludo_super_secret_jwt_key_2025"
	BoardTrackLength = 52
	HomePathLength   = 6
)

var (
	// Safe tile indices on the shared 0..51 track
	// Standard Ludo: Starting spots (0, 13, 26, 39) + Star spots (8, 21, 34, 47)
	SafeTiles = map[int]bool{
		0: true, 8: true, 13: true, 21: true, 26: true, 34: true, 39: true, 47: true,
	}

	// Starting tile index on track for each player color
	ColorStartTrackIndex = map[string]int{
		"red":    0,
		"green":  13,
		"yellow": 26,
		"blue":   39,
	}
)

// --- MODELS ---

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Avatar       string    `json:"avatar"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserStats struct {
	UserID        string `json:"user_id"`
	GamesPlayed   int    `json:"games_played"`
	GamesWon      int    `json:"games_won"`
	GamesLost     int    `json:"games_lost"`
	TotalCaptures int    `json:"total_captures"`
	WinPercentage float64 `json:"win_percentage"`
}

type MatchHistory struct {
	ID        string    `json:"id"`
	RoomCode  string    `json:"room_code"`
	WinnerID  string    `json:"winner_id"`
	Mode      string    `json:"mode"`
	Duration  int       `json:"duration_sec"`
	CreatedAt time.Time `json:"created_at"`
}

type TokenState struct {
	ID       int    `json:"id"`       // 0..3
	Position int    `json:"position"` // -1: base, 0..51: main track, 100..105: home stretch, 999: finished
	Color    string `json:"color"`
	Steps    int    `json:"steps"`    // Total steps taken from start (0 to 57)
}

type PlayerState struct {
	UserID    string       `json:"user_id"`
	Username  string       `json:"username"`
	Color     string       `json:"color"` // "red", "green", "yellow", "blue"
	Seat      int          `json:"seat"`
	Tokens    []TokenState `json:"tokens"`
	IsReady   bool         `json:"is_ready"`
	IsOnline  bool         `json:"is_online"`
	Finished  bool         `json:"finished"`
	Rank      int          `json:"rank"`
}

type GameRoom struct {
	Code            string                 `json:"code"`
	HostID          string                 `json:"host_id"`
	Capacity        int                    `json:"capacity"`
	Status          string                 `json:"status"` // "lobby", "in_game", "finished"
	Players         map[string]*PlayerState `json:"players"` // keyed by userID
	TurnOrder       []string               `json:"turn_order"`
	CurrentTurnIdx  int                    `json:"current_turn_index"`
	DiceValue       int                    `json:"dice_value"`
	DiceRolled      bool                   `json:"dice_rolled"`
	ConsecutiveSixes int                   `json:"consecutive_sixes"`
	LegalTokens     []int                  `json:"legal_tokens"`
	WinnerID        string                 `json:"winner_id"`
	Version         int64                  `json:"version"`
	CreatedAt       time.Time              `json:"created_at"`
	mu              sync.RWMutex
}

// Global Memory Stores
var (
	usersLock sync.RWMutex
	usersDB   = make(map[string]*User)      // keyed by email
	usersByID = make(map[string]*User)      // keyed by id
	statsDB   = make(map[string]*UserStats) // keyed by id
	historyDB = make([]MatchHistory, 0)

	roomsLock sync.RWMutex
	roomsDB   = make(map[string]*GameRoom)
)

func init() {
	// Seed demo accounts
	hash, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	demoUser := &User{
		ID:           "usr_demo_1",
		Username:     "SakhiMaster",
		Email:        "player@heysakhi.com",
		PasswordHash: string(hash),
		Avatar:       "avatar_1",
		CreatedAt:    time.Now(),
	}
	usersDB[demoUser.Email] = demoUser
	usersByID[demoUser.ID] = demoUser
	statsDB[demoUser.ID] = &UserStats{
		UserID:        demoUser.ID,
		GamesPlayed:   12,
		GamesWon:      9,
		GamesLost:     3,
		TotalCaptures: 24,
		WinPercentage: 75.0,
	}
}

// Generate Secure Random Room Code
func generateRoomCode() string {
	b := make([]byte, 3)
	rand.Read(b)
	return strings.ToUpper(hex.EncodeToString(b))
}

func secureRandomDice() int {
	n, _ := rand.Int(rand.Reader, big.NewInt(6))
	return int(n.Int64()) + 1
}

// --- JWT HELPER ---
func generateJWT(user *User) (string, error) {
	claims := jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(JWTSecret))
}

func parseJWT(tokenStr string) (*jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("cannot read claims")
	}
	return &claims, nil
}

// Auth Middleware
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: missing bearer token"})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := parseJWT(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: " + err.Error()})
			return
		}
		c.Set("userID", (*claims)["sub"].(string))
		c.Next()
	}
}

// --- LUDO GAME RULES ENGINE ---

// Can a token move with given dice roll?
// Total steps from base to finish = 57
// Base = -1 (requires 6 to land on start tile, steps = 0)
// Step 0..50: 51 steps on shared track
// Step 51..55: 5 steps on home column
// Step 56: Exact finish (requires reaching exactly 56)
func calculateLegalMoves(player *PlayerState, dice int) []int {
	legal := make([]int, 0)
	for _, tok := range player.Tokens {
		if tok.Position == 999 {
			continue // Already finished
		}
		if tok.Position == -1 {
			// In Base: only roll of 6 allows exit
			if dice == 6 {
				legal = append(legal, tok.ID)
			}
			continue
		}
		// On track or home path
		if tok.Steps+dice <= 56 {
			legal = append(legal, tok.ID)
		}
	}
	return legal
}

func executeMove(room *GameRoom, player *PlayerState, tokenID int, dice int) (captured bool, capturedPlayerID string, finishedNow bool) {
	tok := &player.Tokens[tokenID]
	if tok.Position == -1 {
		// Exit base to starting cell
		startTrack := ColorStartTrackIndex[player.Color]
		tok.Position = startTrack
		tok.Steps = 0
		return false, "", false
	}

	tok.Steps += dice
	if tok.Steps == 56 {
		// Reached Home Finish!
		tok.Position = 999
		finishedNow = true

		// Check if player won
		allDone := true
		for _, t := range player.Tokens {
			if t.Position != 999 {
				allDone = false
				break
			}
		}
		if allDone {
			player.Finished = true
		}
		return false, "", true
	}

	if tok.Steps > 50 {
		// Entering home stretch: 100 + (steps - 51)
		tok.Position = 100 + (tok.Steps - 51)
		return false, "", false
	}

	// Normal movement along track (0..51)
	startTrack := ColorStartTrackIndex[player.Color]
	tok.Position = (startTrack + tok.Steps) % BoardTrackLength

	// Check for capture on non-safe tiles
	if !SafeTiles[tok.Position] {
		for otherUID, otherPl := range room.Players {
			if otherUID == player.UserID {
				continue
			}
			for i := range otherPl.Tokens {
				otherTok := &otherPl.Tokens[i]
				if otherTok.Position == tok.Position {
					// Capture opponent's token!
					otherTok.Position = -1
					otherTok.Steps = 0
					captured = true
					capturedPlayerID = otherUID

					// Update stats
					usersLock.Lock()
					if s, ok := statsDB[player.UserID]; ok {
						s.TotalCaptures++
					}
					usersLock.Unlock()
					break
				}
			}
		}
	}

	return captured, capturedPlayerID, false
}

// WebSocket connection hub
type ClientConn struct {
	UserID string
	RoomCode string
	Conn *websocket.Conn
	Send chan []byte
}

type WsHub struct {
	clients map[*ClientConn]bool
	broadcast chan []byte
	register chan *ClientConn
	unregister chan *ClientConn
	mu sync.RWMutex
}

var hub = WsHub{
	clients:    make(map[*ClientConn]bool),
	broadcast:  make(chan []byte),
	register:   make(chan *ClientConn),
	unregister: make(chan *ClientConn),
}

func (h *WsHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- msg:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func broadcastToRoom(roomCode string, event string, payload interface{}) {
	data, _ := json.Marshal(gin.H{
		"event":   event,
		"payload": payload,
		"time":    time.Now().UnixMilli(),
	})
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	for client := range hub.clients {
		if client.RoomCode == roomCode {
			select {
			case client.Send <- data:
			default:
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for mobile clients
	},
}

// --- MAIN FUNCTION ---
func main() {
	go hub.Run()

	r := gin.Default()

	// CORS Setup
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "heysakhi-ludo-engine", "time": time.Now()})
	})
	r.GET("/ready", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ready": true})
	})

	// Public Auth Endpoints
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", func(c *gin.Context) {
			var req struct {
				Username string `json:"username" binding:"required"`
				Email    string `json:"email" binding:"required"`
				Password string `json:"password" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid registration data"})
				return
			}
			usersLock.Lock()
			defer usersLock.Unlock()

			if _, exists := usersDB[req.Email]; exists {
				c.JSON(http.StatusConflict, gin.H{"error": "Email is already registered"})
				return
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
				return
			}
			uid := fmt.Sprintf("usr_%d", time.Now().UnixNano())
			newUser := &User{
				ID:           uid,
				Username:     req.Username,
				Email:        req.Email,
				PasswordHash: string(hash),
				Avatar:       "avatar_1",
				CreatedAt:    time.Now(),
			}
			usersDB[req.Email] = newUser
			usersByID[uid] = newUser
			statsDB[uid] = &UserStats{
				UserID: uid,
			}

			token, _ := generateJWT(newUser)
			c.JSON(http.StatusCreated, gin.H{
				"token": token,
				"user":  newUser,
			})
		})

		authGroup.POST("/login", func(c *gin.Context) {
			var req struct {
				Email    string `json:"email" binding:"required"`
				Password string `json:"password" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
				return
			}
			usersLock.RLock()
			user, exists := usersDB[req.Email]
			usersLock.RUnlock()

			if !exists || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
				return
			}

			token, _ := generateJWT(user)
			c.JSON(http.StatusOK, gin.H{
				"token": token,
				"user":  user,
			})
		})
	}

	// Protected User & Game APIs
	api := r.Group("/api", AuthMiddleware())
	{
		api.GET("/users/me", func(c *gin.Context) {
			uid := c.GetString("userID")
			usersLock.RLock()
			user := usersByID[uid]
			usersLock.RUnlock()
			if user == nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
				return
			}
			c.JSON(http.StatusOK, user)
		})

		api.GET("/users/me/stats", func(c *gin.Context) {
			uid := c.GetString("userID")
			usersLock.RLock()
			s, exists := statsDB[uid]
			usersLock.RUnlock()
			if !exists {
				s = &UserStats{UserID: uid}
			}
			c.JSON(http.StatusOK, s)
		})

		api.GET("/users/me/history", func(c *gin.Context) {
			c.JSON(http.StatusOK, historyDB)
		})

		// Create Room
		api.POST("/rooms", func(c *gin.Context) {
			uid := c.GetString("userID")
			var req struct {
				Capacity int `json:"capacity"`
			}
			c.ShouldBindJSON(&req)
			if req.Capacity < 2 || req.Capacity > 4 {
				req.Capacity = 4
			}

			code := generateRoomCode()
			usersLock.RLock()
			u := usersByID[uid]
			usersLock.RUnlock()

			room := &GameRoom{
				Code:        code,
				HostID:      uid,
				Capacity:    req.Capacity,
				Status:      "lobby",
				Players:     make(map[string]*PlayerState),
				TurnOrder:   []string{uid},
				CreatedAt:   time.Now(),
				LegalTokens: []int{},
				Version:     1,
			}

			// Add Host
			tokens := make([]TokenState, 4)
			for i := 0; i < 4; i++ {
				tokens[i] = TokenState{ID: i, Position: -1, Color: "red", Steps: 0}
			}
			room.Players[uid] = &PlayerState{
				UserID:   uid,
				Username: u.Username,
				Color:    "red",
				Seat:     0,
				Tokens:   tokens,
				IsReady:  true,
				IsOnline: true,
			}

			roomsLock.Lock()
			roomsDB[code] = room
			roomsLock.Unlock()

			c.JSON(http.StatusCreated, room)
		})

		// Get Room Info
		api.GET("/rooms/:code", func(c *gin.Context) {
			code := strings.ToUpper(c.Param("code"))
			roomsLock.RLock()
			room, exists := roomsDB[code]
			roomsLock.RUnlock()
			if !exists {
				c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
				return
			}
			c.JSON(http.StatusOK, room)
		})

		// Join Room
		api.POST("/rooms/:code/join", func(c *gin.Context) {
			code := strings.ToUpper(c.Param("code"))
			uid := c.GetString("userID")

			roomsLock.Lock()
			room, exists := roomsDB[code]
			roomsLock.Unlock()

			if !exists {
				c.JSON(http.StatusNotFound, gin.H{"error": "Room does not exist"})
				return
			}

			room.mu.Lock()
			defer room.mu.Unlock()

			if _, already := room.Players[uid]; !already {
				if len(room.Players) >= room.Capacity {
					c.JSON(http.StatusForbidden, gin.H{"error": "Room is full"})
					return
				}
				if room.Status != "lobby" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Game already in progress"})
					return
				}

				colors := []string{"red", "green", "yellow", "blue"}
				usedColors := make(map[string]bool)
				for _, p := range room.Players {
					usedColors[p.Color] = true
				}
				assignedColor := "blue"
				for _, col := range colors {
					if !usedColors[col] {
						assignedColor = col
						break
					}
				}

				usersLock.RLock()
				u := usersByID[uid]
				usersLock.RUnlock()

				tokens := make([]TokenState, 4)
				for i := 0; i < 4; i++ {
					tokens[i] = TokenState{ID: i, Position: -1, Color: assignedColor, Steps: 0}
				}
				room.Players[uid] = &PlayerState{
					UserID:   uid,
					Username: u.Username,
					Color:    assignedColor,
					Seat:     len(room.Players),
					Tokens:   tokens,
					IsReady:  false,
					IsOnline: true,
				}
				room.TurnOrder = append(room.TurnOrder, uid)
				room.Version++
			}

			broadcastToRoom(code, "room.player_joined", room)
			c.JSON(http.StatusOK, room)
		})
	}

	// Real-Time WebSocket endpoint
	r.GET("/ws", func(c *gin.Context) {
		tokenStr := c.Query("token")
		claims, err := parseJWT(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized WebSocket connection"})
			return
		}
		uid := (*claims)["sub"].(string)
		roomCode := strings.ToUpper(c.Query("room"))

		ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("WS upgrade error:", err)
			return
		}

		client := &ClientConn{
			UserID:   uid,
			RoomCode: roomCode,
			Conn:     ws,
			Send:     make(chan []byte, 256),
		}
		hub.register <- client

		// Writer pump
		go func() {
			defer ws.Close()
			for msg := range client.Send {
				ws.WriteMessage(websocket.TextMessage, msg)
			}
		}()

		// Reader pump & Event Router
		defer func() {
			hub.unregister <- client
			ws.Close()
		}()

		for {
			_, msg, err := ws.ReadMessage()
			if err != nil {
				break
			}
			var ev struct {
				Event   string          `json:"event"`
				Payload json.RawMessage `json:"payload"`
			}
			if err := json.Unmarshal(msg, &ev); err != nil {
				continue
			}

			roomsLock.RLock()
			room := roomsDB[roomCode]
			roomsLock.RUnlock()

			if room == nil {
				continue
			}

			room.mu.Lock()
			switch ev.Event {
			case "room.ready":
				if p, ok := room.Players[uid]; ok {
					p.IsReady = !p.IsReady
					broadcastToRoom(roomCode, "room.updated", room)
				}

			case "game.start":
				if room.HostID == uid && room.Status == "lobby" && len(room.Players) >= 2 {
					room.Status = "in_game"
					room.CurrentTurnIdx = 0
					room.DiceRolled = false
					room.Version++
					broadcastToRoom(roomCode, "game.started", room)
				}

			case "game.roll_dice":
				currentUID := room.TurnOrder[room.CurrentTurnIdx]
				if currentUID == uid && !room.DiceRolled && room.Status == "in_game" {
					val := secureRandomDice()
					room.DiceValue = val
					room.DiceRolled = true

					if val == 6 {
						room.ConsecutiveSixes++
					} else {
						room.ConsecutiveSixes = 0
					}

					p := room.Players[uid]
					if room.ConsecutiveSixes == 3 {
						// 3 consecutive sixes penalty: turn forfeited!
						room.ConsecutiveSixes = 0
						room.DiceRolled = false
						room.LegalTokens = []int{}
						room.CurrentTurnIdx = (room.CurrentTurnIdx + 1) % len(room.TurnOrder)
						broadcastToRoom(roomCode, "game.turn_changed", room)
					} else {
						legal := calculateLegalMoves(p, val)
						room.LegalTokens = legal
						broadcastToRoom(roomCode, "game.dice_result", gin.H{
							"dice":         val,
							"legal_tokens": legal,
							"player_id":    uid,
							"room":         room,
						})

						// Auto pass if no moves possible
						if len(legal) == 0 {
							go func(r *GameRoom) {
								time.Sleep(1200 * time.Millisecond)
								r.mu.Lock()
								r.DiceRolled = false
								r.LegalTokens = []int{}
								r.CurrentTurnIdx = (r.CurrentTurnIdx + 1) % len(r.TurnOrder)
								broadcastToRoom(r.Code, "game.turn_changed", r)
								r.mu.Unlock()
							}(room)
						}
					}
				}

			case "game.move_token":
				var moveReq struct {
					TokenID int `json:"token_id"`
				}
				json.Unmarshal(ev.Payload, &moveReq)
				currentUID := room.TurnOrder[room.CurrentTurnIdx]
				if currentUID == uid && room.DiceRolled && room.Status == "in_game" {
					// Verify token is legal
					isLegal := false
					for _, tokID := range room.LegalTokens {
						if tokID == moveReq.TokenID {
							isLegal = true
							break
						}
					}

					if isLegal {
						p := room.Players[uid]
						cap, capUID, finishedNow := executeMove(room, p, moveReq.TokenID, room.DiceValue)
						room.Version++

						broadcastToRoom(roomCode, "game.token_moved", gin.H{
							"token_id":            moveReq.TokenID,
							"player_id":           uid,
							"captured":            cap,
							"captured_player_id":  capUID,
							"finished":            finishedNow,
							"room":                room,
						})

						if p.Finished {
							room.WinnerID = uid
							room.Status = "finished"
							broadcastToRoom(roomCode, "game.player_won", gin.H{
								"winner_id": uid,
								"room":      room,
							})
							// Record history
							historyDB = append(historyDB, MatchHistory{
								ID:        fmt.Sprintf("hist_%d", time.Now().Unix()),
								RoomCode:  roomCode,
								WinnerID:  uid,
								Mode:      "online",
								Duration:  300,
								CreatedAt: time.Now(),
							})
						} else {
							// Check for extra turn (rolled 6 or made capture)
							grantExtraTurn := (room.DiceValue == 6 || cap)
							room.DiceRolled = false
							room.LegalTokens = []int{}

							if !grantExtraTurn {
								room.CurrentTurnIdx = (room.CurrentTurnIdx + 1) % len(room.TurnOrder)
							}
							broadcastToRoom(roomCode, "game.turn_changed", room)
						}
					}
				}
			}
			room.mu.Unlock()
		}
	})

	port := ":8080"
	fmt.Println("🚀 HeySakhi Ludo Engine listening on port", port)
	r.Run(port)
}

