/**
elow this is main.go
 */

package main

import (
	"context"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"secure-exam-client/backend/events"
	"secure-exam-client/backend/security"
	"secure-exam-client/backend/storage"
	"secure-exam-client/backend/system"
	"secure-exam-client/backend/window"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Instantiate Go native controllers
	winMgr := window.NewWindowManager()
	keyMgr := security.NewKeyboardHookManager()
	cryptStore := storage.NewEncryptedStore()
	sysInspector := system.NewSystemInspector()
	eventCoord := events.NewEventCoordinator()

	// Configure security locked Wails options
	err := wails.Run(&options.App{
		Title:            "ValidEx ",
		Width:            1280,
		Height:           900,
		AlwaysOnTop:      false,
		DisableResize:    false,
	     Frameless:false,
		WindowStartState: options.Maximised,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 15, G: 23, B: 42, A: 255}, // slate-900 matching
		OnBeforeClose: func(ctx context.Context) (prevent bool) {
			if winMgr.IsLockedMode {
				return true // Blocks native OS close/Alt+F4 attempts
			}
			return false
		},
		OnStartup: func(ctx context.Context) {
			winMgr.Startup(ctx)
			keyMgr.Startup(ctx)
			cryptStore.Startup(ctx)
			sysInspector.Startup(ctx)
			eventCoord.Startup(ctx)
		},
		Bind: []interface{}{
			winMgr,
			keyMgr,
			cryptStore,
			sysInspector,
			eventCoord,
		},
	})

	if err != nil {
		println("Error starting secure examination client:", err.Error())
	}
}
