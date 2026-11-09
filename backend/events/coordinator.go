 

package events

import (
	"context"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type EventCoordinator struct {
	ctx context.Context
}

func NewEventCoordinator() *EventCoordinator {
	return &EventCoordinator{}
}

func (e *EventCoordinator) Startup(ctx context.Context) {
	e.ctx = ctx
}

// FireSecurityViolation reports native violations upstream to the React layer
func (e *EventCoordinator) FireSecurityViolation(violationType string, description string) {
	runtime.EventsEmit(e.ctx, "security_violation", map[string]string{
		"type":        violationType,
		"description": description,
	})
}
