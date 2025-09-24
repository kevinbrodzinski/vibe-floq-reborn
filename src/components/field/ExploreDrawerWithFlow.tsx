import * as React from 'react';
import type { TileVenue } from './ExploreDrawer';
import { ExploreDrawer } from './ExploreDrawer';
import { useFlowRecorder } from '@/hooks/useFlowRecorder';

/**
 * Minimal controller that binds ExploreDrawer to the flow recorder.
 * - Manages open/close state (uncontrolled by default, can be controlled via props)
 * - For UX: toggles a body class while open so you can hide the FAB
 */
type Props = {
  venues: TileVenue[];
  onJoin: (pid: string) => void;
  onSave: (pid: string) => void;
  onPlan: (pid: string) => void;
  onChangeVenue: (pid: string) => void;
  changeBtnRef?: React.RefObject<HTMLButtonElement>;

  // Optional controlled state
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  className?: string;
};

export function ExploreDrawerWithFlow({
  venues,
  onJoin,
  onSave,
  onPlan,
  onChangeVenue,
  changeBtnRef,
  isOpen,
  onOpenChange,
  className,
}: Props) {
  const recorder = useFlowRecorder();

  // Uncontrolled fallback state if parent doesn't control isOpen
  const [localOpen, setLocalOpen] = React.useState(false);
  const open = typeof isOpen === 'boolean' ? isOpen : localOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange ? onOpenChange(next) : setLocalOpen(next);
    },
    [onOpenChange]
  );

  // Body class to hide FAB/UI when drawer is open (opt-in CSS)
  React.useEffect(() => {
    const cls = 'floq-explore-open';
    if (open) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open]);

  // Recorder state → presentational props
  const recState = recorder.state; // 'idle' | 'recording' | 'paused' | 'ended'

  const onStartFlow = React.useCallback(() => {
    try { recorder.start?.(); } catch {}
  }, [recorder]);

  const onPauseFlow = React.useCallback(() => {
    try { recorder.pause?.(); } catch {}
  }, [recorder]);

  const onResumeFlow = React.useCallback(() => {
    try { recorder.resume?.(); } catch {}
  }, [recorder]);

  const onStopFlow = React.useCallback(() => {
    try { recorder.stop?.(); } catch {}
  }, [recorder]);

  return (
    <ExploreDrawer
      venues={venues}
      onJoin={onJoin}
      onSave={onSave}
      onPlan={onPlan}
      onChangeVenue={onChangeVenue}
      changeBtnRef={changeBtnRef}
      recState={recState}
      onStartFlow={onStartFlow}
      onPauseFlow={onPauseFlow}
      onResumeFlow={onResumeFlow}
      onStopFlow={onStopFlow}
      isOpen={open}
      onOpenChange={setOpen}
    />
  );
}