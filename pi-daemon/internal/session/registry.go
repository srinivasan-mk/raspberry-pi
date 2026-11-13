package session

import (
	"errors"
	"sync"
	"time"

	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/models"
)

var (
	ErrSessionAlreadyExists = errors.New("session already active")
	ErrSessionNotFound      = errors.New("session not found or expired")
)

type activeSession struct {
	responseChan chan models.InteractiveResponse
	timer        *time.Timer
}

type SessionRegistry struct {
	mu       sync.RWMutex
	sessions map[string]*activeSession
}

func NewSessionRegistry() *SessionRegistry {
	return &SessionRegistry{
		sessions: make(map[string]*activeSession),
	}
}

// Register creates an entry for an interactive prompt and returns a channel that will receive the user's response
func (r *SessionRegistry) Register(sessionID string, timeout time.Duration) (<-chan models.InteractiveResponse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sessions[sessionID]; exists {
		return nil, ErrSessionAlreadyExists
	}

	ch := make(chan models.InteractiveResponse, 1)
	sess := &activeSession{
		responseChan: ch,
		timer: time.AfterFunc(timeout, func() {
			r.Cancel(sessionID)
		}),
	}

	r.sessions[sessionID] = sess
	return ch, nil
}

// Resolve delivers the response to the registered session
func (r *SessionRegistry) Resolve(resp models.InteractiveResponse) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	sess, exists := r.sessions[resp.SessionId]
	if !exists {
		return false
	}

	sess.timer.Stop()
	select {
	case sess.responseChan <- resp:
	default:
	}

	delete(r.sessions, resp.SessionId)
	return true
}

// Cancel cleans up an active session
func (r *SessionRegistry) Cancel(sessionID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	sess, exists := r.sessions[sessionID]
	if !exists {
		return
	}

	sess.timer.Stop()
	close(sess.responseChan)
	delete(r.sessions, sessionID)
}

// HasActiveSessions returns true if there are pending interactive challenges
func (r *SessionRegistry) HasActiveSessions() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.sessions) > 0
}
