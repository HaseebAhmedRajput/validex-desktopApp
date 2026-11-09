
package security

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"syscall"
	"unsafe"
)

type KeyboardHookManager struct {
	ctx       context.Context
	isActive  bool
	hook      uintptr
	threadID  uint32
	callback  uintptr
	readyChan chan error
	doneChan  chan struct{}
	mu        sync.Mutex
}

func NewKeyboardHookManager() *KeyboardHookManager {
	return &KeyboardHookManager{
		isActive: false,
	}
}

func (k *KeyboardHookManager) Startup(ctx context.Context) {
	k.ctx = ctx
}

// StartKeyboardTracker installs low-level Windows keyboard blocking for exam mode.
func (k *KeyboardHookManager) StartKeyboardTracker() error {
	k.mu.Lock()
	if k.isActive {
		k.mu.Unlock()
		return nil
	}

	k.isActive = true
	k.readyChan = make(chan error, 1)
	k.doneChan = make(chan struct{})
	if k.callback == 0 {
		k.callback = syscall.NewCallback(k.lowLevelKeyboardProc)
	}
	k.mu.Unlock()

	go k.keyboardHookLoop()

	if err := <-k.readyChan; err != nil {
		k.mu.Lock()
		k.isActive = false
		k.mu.Unlock()
		return err
	}

	fmt.Println("[Native Security] Global OS keyboard bindings locked successfully.")
	return nil
}

// StopKeyboardTracker releases OS keyboard blocking.
func (k *KeyboardHookManager) StopKeyboardTracker() error {
	k.mu.Lock()
	if !k.isActive {
		k.mu.Unlock()
		return nil
	}

	k.isActive = false
	threadID := k.threadID
	doneChan := k.doneChan
	k.mu.Unlock()

	if threadID != 0 {
		procPostThreadMessageW.Call(uintptr(threadID), wmQuit, 0, 0)
	}

	if doneChan != nil {
		<-doneChan
	}

	fmt.Println("[Native Security] Global OS keyboard bindings released safely.")
	return nil
}

const (
	whKeyboardLL = 13
	hcAction     = 0

	wmKeydown    = 0x0100
	wmSysKeydown = 0x0104
	wmQuit       = 0x0012

	llkhfAltDown = 0x20

	vkBack    = 0x08
	vkTab     = 0x09
	vkEscape  = 0x1B
	vkControl = 0x11
	vkMenu    = 0x12
	vkLWin    = 0x5B
	vkRWin    = 0x5C
	vkApps    = 0x5D
	vkA       = 0x41
	vkC       = 0x43
	vkI       = 0x49
	vkJ       = 0x4A
	vkR       = 0x52
	vkU       = 0x55
	vkV       = 0x56
	vkX       = 0x58
	vkF4      = 0x73
	vkF5      = 0x74
	vkF11     = 0x7A
	vkF12     = 0x7B
)

var (
	user32                 = syscall.NewLazyDLL("user32.dll")
	kernel32               = syscall.NewLazyDLL("kernel32.dll")
	procSetWindowsHookExW  = user32.NewProc("SetWindowsHookExW")
	procCallNextHookEx     = user32.NewProc("CallNextHookEx")
	procUnhookWindowsHook  = user32.NewProc("UnhookWindowsHookEx")
	procGetMessageW        = user32.NewProc("GetMessageW")
	procPostThreadMessageW = user32.NewProc("PostThreadMessageW")
	procGetAsyncKeyState   = user32.NewProc("GetAsyncKeyState")
	procGetCurrentThreadID = kernel32.NewProc("GetCurrentThreadId")
)

type keyboardLLHookStruct struct {
	VkCode      uint32
	ScanCode    uint32
	Flags       uint32
	Time        uint32
	DwExtraInfo uintptr
}

type point struct {
	X int32
	Y int32
}

type msg struct {
	Hwnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      point
}

func (k *KeyboardHookManager) keyboardHookLoop() {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	threadID, _, _ := procGetCurrentThreadID.Call()
	hook, _, err := procSetWindowsHookExW.Call(whKeyboardLL, k.callback, 0, 0)
	if hook == 0 {
		k.readyChan <- fmt.Errorf("failed to install keyboard hook: %v", err)
		close(k.doneChan)
		return
	}

	k.mu.Lock()
	k.hook = hook
	k.threadID = uint32(threadID)
	k.mu.Unlock()
	k.readyChan <- nil

	var message msg
	for {
		ret, _, _ := procGetMessageW.Call(uintptr(unsafe.Pointer(&message)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
	}

	procUnhookWindowsHook.Call(hook)

	k.mu.Lock()
	k.hook = 0
	k.threadID = 0
	doneChan := k.doneChan
	k.mu.Unlock()

	if doneChan != nil {
		close(doneChan)
	}
}

func (k *KeyboardHookManager) lowLevelKeyboardProc(nCode int, wParam uintptr, lParam uintptr) uintptr {
	if nCode == hcAction && (wParam == wmKeydown || wParam == wmSysKeydown) {
		info := (*keyboardLLHookStruct)(unsafe.Pointer(lParam))

		k.mu.Lock()
		active := k.isActive
		hook := k.hook
		k.mu.Unlock()

		if active && k.shouldBlockKey(info) {
			return 1
		}

		ret, _, _ := procCallNextHookEx.Call(hook, uintptr(nCode), wParam, lParam)
		return ret
	}

	k.mu.Lock()
	hook := k.hook
	k.mu.Unlock()
	ret, _, _ := procCallNextHookEx.Call(hook, uintptr(nCode), wParam, lParam)
	return ret
}

func (k *KeyboardHookManager) shouldBlockKey(info *keyboardLLHookStruct) bool {
	vk := info.VkCode
	altDown := info.Flags&llkhfAltDown != 0 || isVirtualKeyDown(vkMenu)
	ctrlDown := isVirtualKeyDown(vkControl)

	if vk == vkMenu || vk == vkLWin || vk == vkRWin || vk == vkApps {
		return true
	}

	if altDown {
		return true
	}

	if ctrlDown {
		switch vk {
		case vkA, vkC, vkV, vkX, vkR, vkI, vkJ, vkU:
			return true
		}
	}

	switch vk {
	case vkEscape, vkF5, vkF11, vkF12:
		return true
	case vkF4, vkTab, vkBack:
		return altDown
	default:
		return false
	}
}

func isVirtualKeyDown(vk int) bool {
	state, _, _ := procGetAsyncKeyState.Call(uintptr(vk))
	return state&0x8000 != 0
}
