
import { useEffect, useCallback, useRef } from 'react';
import { WailsService } from '../services/wails';
import { ProctorViolation } from '../services/proctor';

interface UseExamSecurityProps {
  isSecurePhase: boolean;
  isGuideActive: boolean;
  isCalibrating: boolean;
  onViolation: (v: ProctorViolation) => void;
  onForceExit: (type: string, description: string) => void;
}
export function useExamSecurity({
  isSecurePhase,
  isGuideActive,
  isCalibrating,
  onViolation,
  onForceExit
}: UseExamSecurityProps): void {
  const securityActive =
    isSecurePhase &&
    !isGuideActive &&
    !isCalibrating;
  const securityReadyRef = useRef(false)
  const fullscreenTransitionRef = useRef(true);
  // Delay security activation after entering exam fullscreen
  useEffect(() => {
    if (!securityActive) {
      securityReadyRef.current = false;
      return;
    }
    fullscreenTransitionRef.current = true;
    const transitionTimer = setTimeout(()=>{
      fullscreenTransitionRef.current = false;
      console.log(
        "Fullscreen transition completed"
      );
    },10000);

    const securityTimer = setTimeout(()=>{
      securityReadyRef.current = true;
      console.log(
        "Exam security monitoring activated"
      );
    },12000);
    return ()=>{
      clearTimeout(transitionTimer);
      clearTimeout(securityTimer);
    }
  },[securityActive]);


  const recordViolation = useCallback(
    (type:string,
      desc:string,
      severity:'low'|'medium'|'high'='high'
    )=>{
      if(!securityReadyRef.current){
        return;      }
   console.error(
    "[VIOLATION][ExamSecurity]",
    type,
    desc
);

      onViolation({
        type,
        timestamp:new Date().toISOString(),
        confidence:1,
        description:desc,
        severity
      });
      WailsService
      .fireSecurityViolation(type,desc)
      .catch(err=>console.warn(err));
    },
    [  onViolation]
  );
  // Keyboard blocking
  useEffect(()=>{
    const handleKeyDown=(e:KeyboardEvent)=>{
      if(
        !securityActive ||
        !securityReadyRef.current
      ){
        return;
      }
      let blocked=false;
      let combo="";
      if(e.altKey){
        blocked=true;
        combo=`ALT + ${e.key}`;
      }
      if(
        e.metaKey ||
        e.key==="Meta" ||
        e.key==="OS"
      ){
        blocked=true;
        combo="WINDOWS KEY";
      }
      const blockedCtrl=[
        "c",
        "v",
        "x",
        "a",
        "r",
        "i",
        "j",
        "u"      ];

      if(
        e.ctrlKey &&
        blockedCtrl.includes(
          e.key.toLowerCase()
        )
      ){
        blocked=true;
        combo=`CTRL + ${e.key}`;
      }
      const forbidden=[
        "F11",
        "F12",
        "F5",
        "Escape"
      ];

      if(
        forbidden.includes(e.key)
      ){
        blocked=true;
        combo=e.key;
      }
      if(blocked){
        e.preventDefault();
        e.stopImmediatePropagation();
        recordViolation(
          "KEYBOARD_ATTEMPT",
          `Blocked keyboard action: ${combo}`,
          "high"
        );
      }
    };
    window.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );
    return ()=>{
      window.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    }
  },[
    securityActive,
    recordViolation
  ]);
  // Window focus / app switch detection
  useEffect(()=>{
    const handleBlur=()=>{
      if(
        !securityReadyRef.current ||
        fullscreenTransitionRef.current
      ){
        console.log(
          "Ignoring fullscreen startup blur"
        );
        return;
      }
      setTimeout(()=>{
        if(document.hasFocus()){
          console.log(
            "False blur ignored"
          );
          return;
        }
        onForceExit(
          "FOCUS_LOST",
          "Test automatically submitted because you switched away from the examination window."
        );
        WailsService.keepFocus()
        .catch(console.warn);
      },1500);
    };
    const handleVisibilityChange=()=>{
      if(
        !securityReadyRef.current ||
        !document.hidden
      ){
        return;
      };

      onForceExit(
        "APPLICATION_SWITCH_ATTEMPT",
        "Test automatically submitted because the exam window was no longer visible."
      );
    };
    const handleFullscreenChange=()=>{
      if(
        !securityReadyRef.current ||
        fullscreenTransitionRef.current      ){
        return;
      }
      setTimeout(()=>{

        if(document.fullscreenElement){
          return;
        };
        onForceExit(
          "FULLSCREEN_EXIT",  "Test automatically submitted because fullscreen was exited.");
      },2000);

    };
    const handleContextMenu=(e:MouseEvent)=>{
      if(
        !securityReadyRef.current
      ){ return;
      }
      e.preventDefault();
    };


    window.addEventListener(
      "blur",
      handleBlur
    );


    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );


    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );


    window.addEventListener(
      "contextmenu",
      handleContextMenu
    );

    return ()=>{

      window.removeEventListener(
        "blur",
        handleBlur
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
      window.removeEventListener(
        "contextmenu",
        handleContextMenu
      );
    };

  },[
    recordViolation,
    onForceExit
  ]);


  // Restore normal window after exam
  useEffect(()=>{


    const unlock=async()=>{


      try{


        await WailsService.stopKeyboardTracker();

        await WailsService.disableExamLockdown();

        await WailsService.enableNormalFullscreen();



      }
      catch(err){

        console.warn(
          "Unlock error",
          err
        );

      }
      try{


        if(
          document.fullscreenElement &&
          document.exitFullscreen
        ){
          await document.exitFullscreen();
        }}
      catch{}
    };

    if(!isSecurePhase){
      unlock();
    }
    return ()=>{
 if(!isSecurePhase){     unlock();}
    };
  },[isSecurePhase]);
}