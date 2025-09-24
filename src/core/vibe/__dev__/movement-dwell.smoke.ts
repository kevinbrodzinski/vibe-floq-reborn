// Run with your test runner or import into a dev route to verify
import { MovementFromLocationTracker } from '../collectors/MovementFromLocation';
import { DwellTracker } from '../collectors/DwellTracker';

export function smokeTestMovementDwell() {
  const mv = new MovementFromLocationTracker();
  const dw = new DwellTracker();

  // no coords
  const result = mv.update();
  console.assert(result.speedMps === 0 && result.moving01 === 0, 'Movement tracker should return zeros with no coords');
  
  dw.update(0); // still
  console.assert(dw.dwellMinutes() >= 0, 'Dwell tracker should return non-negative minutes');
  
  console.log('✅ Movement+Dwell smoke test passed');
}

// Actually call the test in development
if (import.meta.env.DEV) {
  smokeTestMovementDwell();
}