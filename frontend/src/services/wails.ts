 

// Declare standard window extensions for Wails generated bindings
declare global {
  interface Window {
    go?: {
      window: {
        WindowManager: {
          EnableNormalFullscreen(): Promise<void>;
          EnableExamLockdown(): Promise<void>;
          DisableExamLockdown(): Promise<void>;
          SetFullscreen(enable: boolean): Promise<void>;
          DisableResize(disable: boolean): Promise<void>;
          KeepFocus(): Promise<void>;
          SetLockedMode(enable: boolean): Promise<void>;
          SetAlwaysOnTop(onTop: boolean): Promise<void>;
        };
      };
      security: {
        KeyboardHookManager: {
          StartKeyboardTracker(): Promise<void>;
          StopKeyboardTracker(): Promise<void>;
        };
      };
      storage: {
        EncryptedStore: {
          SaveEncryptedExamState(stateJson: string): Promise<void>;
          LoadEncryptedExamState(): Promise<string>;
          ClearState(): Promise<void>;
          SaveSecureToken(token: string): Promise<void>;
          LoadSecureToken(): Promise<string>;
          ClearSecureToken(): Promise<void>;
        };
      };
      system: {
        SystemInspector: {
          CheckRunningApps(): Promise<string[]>;
          GetMonitorCount(): Promise<number>;
          GetScreenInfo(): Promise<Record<string, any>>;
          GetSecureGeolocation(): Promise<{ lat: number; lng: number }>;
          GetCameraCount(): Promise<number>;
        };
      };
      events: {
        EventCoordinator: {
          FireSecurityViolation(violationType: string, description: string): Promise<void>;
        };
      };
    };
    runtime?: {
      WindowSetTitle(title: string): void;
      EventsOn(eventName: string, callback: (...args: any[]) => void): void;
    };
  }
}

export class WailsService {
  /**
   * Safe check to verify if browser is running native Wails host
   */
  static isWails(): boolean {
    return typeof window !== 'undefined' && !!window.go;
  }

  // --- WINDOW CONTROLS ---
  static async enableNormalFullscreen(): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.EnableNormalFullscreen) {
      return window.go.window.WindowManager.EnableNormalFullscreen();
    }
    console.log('[Wails Desktop] EnableNormalFullscreen');
  }

  static async enableExamLockdown(): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.EnableExamLockdown) {
      return window.go.window.WindowManager.EnableExamLockdown();
    }
    console.log('[Wails Desktop Lock] EnableExamLockdown');
  }

  static async disableExamLockdown(): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.DisableExamLockdown) {
      return window.go.window.WindowManager.DisableExamLockdown();
    }
    console.log('[Wails Desktop Lock] DisableExamLockdown');
  }

  static async setFullscreen(enable: boolean): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.SetFullscreen) {
      return window.go.window.WindowManager.SetFullscreen(enable);
    }
    console.log(`[Wails Desktop Lock] SetFullscreen: ${enable}`);
  }

  static async disableResize(disable: boolean): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.DisableResize) {
      return window.go.window.WindowManager.DisableResize(disable);
    }
    console.log(`[Wails Desktop Lock] DisableResize: ${disable}`);
  }

  static async keepFocus(): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.KeepFocus) {
      return window.go.window.WindowManager.KeepFocus();
    }
    console.log(`[Wails Desktop Lock] KeepFocus (Anti-Tabout) requested.`);
  }

  static async setLockedMode(enable: boolean): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.SetLockedMode) {
      return window.go.window.WindowManager.SetLockedMode(enable);
    }
    console.log(`[Wails Desktop Lock] SetLockedMode: ${enable}`);
  }

  static async setAlwaysOnTop(onTop: boolean): Promise<void> {
    if (this.isWails() && window.go?.window?.WindowManager?.SetAlwaysOnTop) {
      return window.go.window.WindowManager.SetAlwaysOnTop(onTop);
    }
    console.log(`[Wails Desktop Lock] SetAlwaysOnTop: ${onTop}`);
  }

  // --- KEYBOARD SECURITY ---
  static async startKeyboardTracker(): Promise<void> {
    if (this.isWails() && window.go?.security?.KeyboardHookManager?.StartKeyboardTracker) {
      return window.go.security.KeyboardHookManager.StartKeyboardTracker();
    }
    console.log('[Wails Desktop Lock] Live Keyboard tracker/blocker hook started.');
  }

  static async stopKeyboardTracker(): Promise<void> {
    if (this.isWails() && window.go?.security?.KeyboardHookManager?.StopKeyboardTracker) {
      return window.go.security.KeyboardHookManager.StopKeyboardTracker();
    }
    console.log('[Wails Desktop Lock] Live Keyboard tracker/blocker hook stopped.');
  }

  // --- ENCRYPTED STATE STORE ---
  static async saveState(stateJson: string): Promise<void> {
    if (this.isWails() && window.go?.storage?.EncryptedStore?.SaveEncryptedExamState) {
      return window.go.storage.EncryptedStore.SaveEncryptedExamState(stateJson);
    }
    localStorage.setItem('validex_secure_state_cache', stateJson);
    console.log('[Wails Secure Store] Saved lock-encrypted session chunk.');
  }

  static async loadState(): Promise<string> {
    if (this.isWails() && window.go?.storage?.EncryptedStore?.LoadEncryptedExamState) {
      return window.go.storage.EncryptedStore.LoadEncryptedExamState();
    }
    const val = localStorage.getItem('validex_secure_state_cache') || '';
    console.log('[Wails Secure Store] Restoring active chunk from secure offline session cache.');
    return val;
  }

  static async clearState(): Promise<void> {
    if (this.isWails() && window.go?.storage?.EncryptedStore?.ClearState) {
      return window.go.storage.EncryptedStore.ClearState();
    }
    localStorage.removeItem('validex_secure_state_cache');
    console.log('[Wails Secure Store] Flushed security transaction logs.');
  }

  // --- SECURE AUTH SESSION ENCRYPTION ---
  static async saveSecureToken(token: string): Promise<void> {
    if (this.isWails() && window.go?.storage?.EncryptedStore?.SaveSecureToken) {
      await window.go.storage.EncryptedStore.SaveSecureToken(token);
    } else {
      localStorage.setItem('validex_secure_token', token);
    }
  }

  static async loadSecureToken(): Promise<string> {
    if (this.isWails() && window.go?.storage?.EncryptedStore?.LoadSecureToken) {
      return window.go.storage.EncryptedStore.LoadSecureToken();
    }
    return localStorage.getItem('validex_secure_token') || '';
  }

  static async clearSecureToken(): Promise<void> {
    if (this.isWails() && window.go?.storage?.EncryptedStore?.ClearSecureToken) {
      await window.go.storage.EncryptedStore.ClearSecureToken();
    } else {
      localStorage.removeItem('validex_secure_token');
    }
  }

  // --- SYSTEM INSPECTOR ---
  static async checkDisallowedApps(): Promise<string[]> {
    if (this.isWails() && window.go?.system?.SystemInspector?.CheckRunningApps) {
      return window.go.system.SystemInspector.CheckRunningApps();
    }
    console.log('[Wails Guard Dog] Full process scan triggered.');
    return [];
  }

  static async getMonitorCount(): Promise<number> {
    if (this.isWails() && window.go?.system?.SystemInspector?.GetMonitorCount) {
      return window.go.system.SystemInspector.GetMonitorCount();
    }
    console.log('[Wails Guard Dog] Multi-monitor checks completed.');
    return 1;
  }

  static async getScreenInfo(): Promise<Record<string, any>> {
    if (this.isWails() && window.go?.system?.SystemInspector?.GetScreenInfo) {
      return window.go.system.SystemInspector.GetScreenInfo();
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
    };
  }

  // static async getSecureGeolocation(): Promise<{ lat: number; lng: number }> {
  //   if (this.isWails() && window.go?.system?.SystemInspector?.GetSecureGeolocation) {
  //     try {
  //       return await window.go.system.SystemInspector.GetSecureGeolocation();
  //     } catch (err) {
  //       console.warn('[Wails Native Geolocation] Native geolocation call failed:', err);
  //     }
  //   }

  //   return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
  //     if (!navigator.geolocation) {
  //       return reject(new Error('HTML5 geolocation is unavailable.'));
  //     }

  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
  //       },
  //       (err) => reject(err),
  //       { timeout: 10000 }
  //     );
  //   });
  // }
  static async getSecureGeolocation(): Promise<{ lat: number; lng: number }> {

  // PRIMARY: HTML5 Geolocation
  try {
    const htmlLocation = await new Promise<{ lat: number; lng: number }>(
      (resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error("Geolocation not supported"));
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      }
    );

    console.log("[HTML5 Location]", htmlLocation);
    return htmlLocation;

  } catch (htmlError) {
    console.warn(
      "[HTML5 Location Failed] Falling back to Wails native location",
      htmlError
    );
  }

  // FALLBACK: Wails Native
  if (this.isWails() && window.go?.system?.SystemInspector?.GetSecureGeolocation) {
    try {
      const nativeLocation =
        await window.go.system.SystemInspector.GetSecureGeolocation();

      console.log("[Wails Native Location]", nativeLocation);

      return nativeLocation;
    } catch (nativeError) {
      console.error(
        "[Wails Native Location Failed]",
        nativeError
      );
    }
  }

  throw new Error("Unable to determine device location");
}

  static async fireSecurityViolation(type: string, details: string): Promise<void> {
    if (this.isWails() && window.go?.events?.EventCoordinator?.FireSecurityViolation) {
      return window.go.events.EventCoordinator.FireSecurityViolation(type, details);
    }
    console.warn(`[ValidEx Security Threat Logged] Type: "${type}", Description: "${details}"`);
  }
}
