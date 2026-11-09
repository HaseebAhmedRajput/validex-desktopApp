// /**
//  below this is window.go potion
//  */

// package window

// import (
// 	"context"
// 	"github.com/wailsapp/wails/v2/pkg/runtime"
// )

// type WindowManager struct {
// 	ctx          context.Context
// 	IsLockedMode bool
// }

// func NewWindowManager() *WindowManager {
// 	return &WindowManager{
// 		IsLockedMode: false,
// 	}
// }

// func (w *WindowManager) Startup(ctx context.Context) {
// 	w.ctx = ctx
// 	w.EnableNormalFullscreen()
// }

// // SetLockedMode registers screen status state inside Go kernel
// func (w *WindowManager) SetLockedMode(enable bool) {
// 	w.IsLockedMode = enable
// }

// // EnableNormalFullscreen maximises the app like a standard desktop window.
// // The taskbar and native title bar remain visible.
// func (w *WindowManager) EnableNormalFullscreen() {
// 	if w.ctx == nil {
// 		return
// 	}

// 	w.IsLockedMode = false


// 	// release size lock first
// 	runtime.WindowSetMinSize(w.ctx, 0, 0)
// 	runtime.WindowSetMaxSize(w.ctx, 0, 0)


// 	// remove always on top
// 	runtime.WindowSetAlwaysOnTop(w.ctx, false)


// 	// exit native fullscreen
// 	runtime.WindowUnfullscreen(w.ctx)


// 	// restore window
// 	runtime.WindowUnminimise(w.ctx)
// 	runtime.WindowShow(w.ctx)

// 	// maximize again
// 	runtime.WindowMaximise(w.ctx)
// }



// func (w *WindowManager) EnableExamLockdown() {

// 	if w.ctx == nil {
// 		return
// 	}


// 	w.IsLockedMode = true


// 	// bring foreground first
// 	runtime.WindowUnminimise(w.ctx)
// 	runtime.WindowShow(w.ctx)


// 	// keep focus
// 	runtime.WindowSetAlwaysOnTop(
// 		w.ctx,
// 		true,
// 	)


// 	// enter OS fullscreen
// 	runtime.WindowFullscreen(w.ctx)



// 	// disable resize after fullscreen
// 	width,height := runtime.WindowGetSize(w.ctx)


// 	if width <=0 {
// 		width = 1280
// 	}

// 	if height <=0 {
// 		height = 720
// 	}


// 	runtime.WindowSetMinSize(
// 		w.ctx,
// 		width,
// 		height,
// 	)

// 	runtime.WindowSetMaxSize(
// 		w.ctx,
// 		width,
// 		height,
// 	)

// }



// func (w *WindowManager) DisableExamLockdown(){

// 	if w.ctx == nil {
// 		return}
// 	w.IsLockedMode=false
// 	// unlock size
// 	runtime.WindowSetMinSize(w.ctx,0,0)
// 	runtime.WindowSetMaxSize(w.ctx,0,0)
// 	// remove top
// 	runtime.WindowSetAlwaysOnTop(
// 		w.ctx,
// 		false,
// 	)
// 	// exit fullscreen
// 	runtime.WindowUnfullscreen(w.ctx)
// 	runtime.WindowShow(w.ctx)
// 	runtime.WindowMaximise(w.ctx)

// }

// // SetFullscreen toggles the application native fullscreen boundaries
// func (w *WindowManager) SetFullscreen(enable bool) {
// 	if enable {
// 		runtime.WindowFullscreen(w.ctx)
// 	} else {
// 		runtime.WindowUnfullscreen(w.ctx)
// 		runtime.WindowMaximise(w.ctx)
// 	}
// }

// // DisableResize blocks the desktop environment resizing frame bounds
// func (w *WindowManager) DisableResize(disable bool) {
// 	// Wails runtime binds window resize toggles dynamically
// 	if disable {
// 		width, height := runtime.WindowGetSize(w.ctx)
// 		if width <= 0 {
// 			width = 1024
// 		}
// 		if height <= 0 {
// 			height = 768
// 		}
// 		runtime.WindowSetMinSize(w.ctx, width, height)
// 		runtime.WindowSetMaxSize(w.ctx, width, height)
// 	} else {
// 		runtime.WindowSetMinSize(w.ctx, 0, 0)
// 		runtime.WindowSetMaxSize(w.ctx, 0, 0)
// 	}
// }

// // KeepFocus enforces window restoration focus if blur occurs
// func (w *WindowManager) KeepFocus() {
// 	runtime.WindowShow(w.ctx)
// }

// // SetAlwaysOnTop sets the window always-on-top state
// func (w *WindowManager) SetAlwaysOnTop(onTop bool) {
// 	runtime.WindowSetAlwaysOnTop(w.ctx, onTop)
// }

// // MaximiseWindow expands the window to the full desktop area without chrome lock
// func (w *WindowManager) MaximiseWindow() {
// 	runtime.WindowMaximise(w.ctx)
// }














package window

import (
	"context"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)


type WindowManager struct {
	ctx context.Context
	IsLockedMode bool
}


func NewWindowManager()*WindowManager{
	return &WindowManager{
		IsLockedMode:false,
	}
}


func (w *WindowManager) Startup(ctx context.Context){

	w.ctx = ctx

	// normal startup
	w.EnableNormalFullscreen()

}



// NORMAL MODE
func (w *WindowManager) EnableNormalFullscreen(){

	if w.ctx == nil {
		return
	}


	w.IsLockedMode=false


	runtime.WindowSetAlwaysOnTop(
		w.ctx,
		false,
	)


	runtime.WindowUnfullscreen(
		w.ctx,
	)


	runtime.WindowShow(
		w.ctx,
	)


	runtime.WindowMaximise(
		w.ctx,
	)

}



// EXAM MODE
func (w *WindowManager) EnableExamLockdown(){

	if w.ctx == nil{
		return
	}


	w.IsLockedMode=true


	runtime.WindowShow(
		w.ctx,
	)


	runtime.WindowSetAlwaysOnTop(
		w.ctx,
		true,
	)


	time.Sleep(200*time.Millisecond)


	runtime.WindowFullscreen(
		w.ctx,
	)

}



// END EXAM
func (w *WindowManager) DisableExamLockdown(){

	if w.ctx == nil{
		return
	}


	w.IsLockedMode=false


	runtime.WindowSetAlwaysOnTop(
		w.ctx,
		false,
	)


	runtime.WindowUnfullscreen(
		w.ctx,
	)


	runtime.WindowShow(
		w.ctx,
	)


	runtime.WindowMaximise(
		w.ctx,
	)

}