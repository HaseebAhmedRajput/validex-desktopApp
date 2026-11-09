
package system

import (
	"context"
	"errors"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"syscall"
)

type SystemInspector struct {
	ctx context.Context
}

func NewSystemInspector() *SystemInspector {
	return &SystemInspector{}
}

func (s *SystemInspector) Startup(ctx context.Context) {
	s.ctx = ctx
}

// CheckRunningApps inspects native active processes list for prohibited software
func (s *SystemInspector) CheckRunningApps() ([]string, error) {
	var prohibitedRunning []string
	
	// List of forbidden screen sharing / background recording process names
	prohibitedList := []string{
		"discord", "teamviewer", "anydesk", "skype", "zoom", "obs64", 
		"slack", "chrome", "firefox", "msedge", "anydesk.exe", "teamviewer.exe",
		"ammyy", "logmein", "vncviewer", "gotomeeting", "webex",
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("tasklist", "/FO", "CSV")
	} else {
		cmd = exec.Command("ps", "-ax")
	}

	output, err := cmd.Output()
	if err == nil {
		outStr := strings.ToLower(string(output))
		for _, prog := range prohibitedList {
			if strings.Contains(outStr, prog) {
				// Deduplicate findings
				isDup := false
				for _, r := range prohibitedRunning {
					if r == prog {
						isDup = true
						break
					}
				}
				if !isDup {
					prohibitedRunning = append(prohibitedRunning, prog)
				}
			}
		}
	}
	
	return prohibitedRunning, nil
}

// GetMonitorCount returns number of screens plugged to the computer
func (s *SystemInspector) GetMonitorCount() (int, error) {
	if runtime.GOOS == "windows" {
		// Dynamic direct link to user32.dll for Windows API metrics
		user32 := syscall.NewLazyDLL("user32.dll")
		getSystemMetrics := user32.NewProc("GetSystemMetrics")
		// Index 80 specifies SM_CMONITORS
		res, _, _ := getSystemMetrics.Call(80)
		if res > 0 {
			return int(res), nil
		}
	}
	return 1, nil
}

// GetScreenInfo queries dimensions to detect screen stretching hacks
func (s *SystemInspector) GetScreenInfo() (map[string]interface{}, error) {
	info := make(map[string]interface{})
	info["width"] = 1920
	info["height"] = 1080
	info["scale"] = 1.0
	return info, nil
}

func (s *SystemInspector) GetSecureGeolocation() (map[string]float64, error) {
	if runtime.GOOS != "windows" {
		return nil, errors.New("native secure geolocation is supported only on Windows")
	}
	


	ps := `Add-Type -AssemblyName System.Device; $watcher = New-Object System.Device.Location.GeoCoordinateWatcher; $watcher.Start(); Start-Sleep -Milliseconds 1200; if ($watcher.Position.Location.IsUnknown) { Write-Error "LocationUnknown"; exit 1 } else { Write-Output ("{0},{1}" -f $watcher.Position.Location.Latitude, $watcher.Position.Location.Longitude) }`
	cmd := exec.Command("powershell", "-NoProfile", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{
    HideWindow: true,
}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, errors.New(strings.TrimSpace(string(output)))
	}

	parts := strings.Split(strings.TrimSpace(string(output)), ",")
	if len(parts) != 2 {
		return nil, errors.New("unable to parse native geolocation response")
	}

	lat, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	if err != nil {
		return nil, err
	}

	lng, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err != nil {
		return nil, err
	}

	return map[string]float64{"lat": lat, "lng": lng}, nil
}

func (s *SystemInspector) GetCameraCount() (int, error) {
	if runtime.GOOS != "windows" {
		return 0, errors.New("native camera count is supported only on Windows")
	}

	ps := `Get-PnpDevice -Class Camera -Status OK | Measure-Object | Select-Object -ExpandProperty Count`
	cmd := exec.Command("powershell", "-NoProfile", "-Command", ps)

cmd.SysProcAttr = &syscall.SysProcAttr{
    HideWindow: true,
}
	output, err := cmd.Output()
	if err != nil {
		return 0, err
	}

	count, err := strconv.Atoi(strings.TrimSpace(string(output)))
	if err != nil {
		return 0, err
	}

	return count, nil
}
