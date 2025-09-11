import * as React from 'react';

type Status = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function useEnvPermissions() {
  const [motion, setMotion] = React.useState<Status>('unsupported');
  const [mic, setMic] = React.useState<Status>('unsupported');

  const hasNavigator = typeof navigator !== 'undefined';
  const detect = React.useCallback(async () => {
    if (!hasNavigator) return;

    // Motion (primarily iOS Safari)
    try {
      if (typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
        setMotion('prompt'); // will know only after request
      } else {
        setMotion('prompt'); // treat as available to request
      }
    } catch { 
      setMotion('unsupported'); 
    }

    // Microphone via Permissions API (if available)
    try {
      const pm = (navigator as any).permissions;
      if (pm?.query) {
        const res = await pm.query({ name: 'microphone' as any });
        setMic(res.state as Status);
        res.onchange = () => setMic((res.state as Status) ?? 'prompt');
      } else {
        setMic('prompt');
      }
    } catch {
      setMic('prompt');
    }
  }, [hasNavigator]);

  React.useEffect(() => { 
    detect(); 
  }, [detect]);

  const requestMotion = async (): Promise<boolean> => {
    try {
      if (typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
        const result = await (window as any).DeviceMotionEvent.requestPermission();
        const ok = result === 'granted';
        setMotion(ok ? 'granted' : 'denied');
        return ok;
      }
      setMotion('granted'); // other platforms = soft OK
      return true;
    } catch {
      setMotion('denied');
      return false;
    }
  };

  const requestMic = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMic('unsupported');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMic('granted');
      return true;
    } catch {
      setMic('denied');
      return false;
    }
  };

  const requestEnvPermissions = async () => {
    const [m, a] = await Promise.allSettled([requestMotion(), requestMic()]);
    const motionOk = m.status === 'fulfilled' ? m.value : false;
    const micOk = a.status === 'fulfilled' ? a.value : false;
    return { motionOk, micOk };
  };

  const envEnabled = (motion === 'granted') || (mic === 'granted');
  return { motion, mic, envEnabled, requestEnvPermissions };
}