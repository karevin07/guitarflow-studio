import { useState, useEffect, useCallback, useRef } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';
import { PlayerBarBindings } from '../types/playback';

export const useAlphaTabPlayback = (api: AlphaTabApi | null): PlayerBarBindings => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [totalCols, setTotalCols] = useState(1);
  const [playbackVolume, setPlaybackVolumeState] = useState(1);
  const [isLooping, setIsLoopingState] = useState(false);
  const [isMetronomeOn, setIsMetronomeOnState] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(100);
  const [abLoop, setAbLoop] = useState<{
    enabled: boolean;
    start: number | null;
    end: number | null;
  }>({ enabled: false, start: null, end: null });

  const tickRef = useRef({ currentTick: 0, endTick: 1 });

  const applyPlaybackRange = useCallback(
    (startMs: number | null, endMs: number | null, enabled: boolean) => {
      if (!api) return;
      if (!enabled || startMs === null || endMs === null) {
        api.playbackRange = null;
        return;
      }
      const { endTick } = tickRef.current;
      const endMsTotal = Math.max(1, totalCols);
      const toTick = (ms: number) => Math.round((ms / endMsTotal) * endTick);
      const a = toTick(Math.min(startMs, endMs));
      const b = toTick(Math.max(startMs, endMs));
      api.playbackRange = { startTick: a, endTick: b };
    },
    [api, totalCols]
  );

  useEffect(() => {
    if (!api) return;

    const onPosition = (args: { currentTime: number; endTime: number; currentTick: number; endTick: number }) => {
      tickRef.current = { currentTick: args.currentTick, endTick: Math.max(1, args.endTick) };
      const end = Math.max(1, Math.round(args.endTime));
      setPlayIndex(Math.round(args.currentTime));
      setTotalCols(end);
    };

    const onState = (args: { state: number; stopped: boolean }) => {
      setIsPlaying(args.state === 1);
      setIsPaused(args.state === 0 && !args.stopped);
    };

    api.playerPositionChanged.on(onPosition);
    api.playerStateChanged.on(onState);

    if (api.endTime > 0) setTotalCols(Math.round(api.endTime));
    if (api.endTick > 0) tickRef.current.endTick = api.endTick;
    setPlaybackVolumeState(api.masterVolume ?? 1);
    setIsLoopingState(api.isLooping ?? false);
    setIsMetronomeOnState((api.metronomeVolume ?? 0) > 0);
    setPlaybackSpeedState(Math.round((api.playbackSpeed ?? 1) * 100));

    return () => {
      api.playerPositionChanged.off(onPosition);
      api.playerStateChanged.off(onState);
    };
  }, [api]);

  useEffect(() => {
    applyPlaybackRange(abLoop.start, abLoop.end, abLoop.enabled);
  }, [abLoop, applyPlaybackRange]);

  const togglePlayPause = useCallback(() => {
    api?.playPause();
  }, [api]);

  const stop = useCallback(() => {
    api?.stop();
  }, [api]);

  const seek = useCallback(
    (index: number) => {
      if (!api) return;
      api.timePosition = Math.max(0, Math.min(index, api.endTime || index));
    },
    [api]
  );

  const onVolumeChange = useCallback(
    (volume: number) => {
      setPlaybackVolumeState(volume);
      if (api) api.masterVolume = volume;
    },
    [api]
  );

  const onToggleLoop = useCallback(() => {
    setIsLoopingState(prev => {
      const next = !prev;
      if (api) api.isLooping = next;
      return next;
    });
  }, [api]);

  const onToggleMetronome = useCallback(() => {
    setIsMetronomeOnState(prev => {
      const next = !prev;
      if (api) api.metronomeVolume = next ? 0.5 : 0;
      return next;
    });
  }, [api]);

  const onBpmChange = useCallback(
    (pct: number) => {
      const clamped = Math.max(50, Math.min(150, pct));
      setPlaybackSpeedState(clamped);
      if (api) api.playbackSpeed = clamped / 100;
    },
    [api]
  );

  const setLoopA = useCallback(() => {
    setAbLoop(prev => ({ ...prev, start: playIndex }));
  }, [playIndex]);

  const setLoopB = useCallback(() => {
    setAbLoop(prev => ({ ...prev, end: playIndex }));
  }, [playIndex]);

  const toggleAbLoop = useCallback(() => {
    setAbLoop(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const clearAbLoop = useCallback(() => {
    setAbLoop({ enabled: false, start: null, end: null });
    if (api) api.playbackRange = null;
  }, [api]);

  return {
    mode: 'alphatab',
    isPlaying,
    isPaused,
    onTogglePlayPause: togglePlayPause,
    onStop: stop,
    playIndex,
    totalCols,
    onSeek: seek,
    abLoop,
    onSetLoopA: setLoopA,
    onSetLoopB: setLoopB,
    onToggleAbLoop: toggleAbLoop,
    onClearAbLoop: clearAbLoop,
    playBpm: playbackSpeed,
    onBpmChange,
    isLooping,
    onToggleLoop,
    isMetronomeOn,
    onToggleMetronome,
    playbackVolume,
    onVolumeChange,
  };
};
