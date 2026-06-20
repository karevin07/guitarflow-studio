import React, { useEffect, useRef, useState } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';

export interface AlphaTabViewerHandle {
  playPause: () => void;
  stop: () => void;
}

interface AlphaTabViewerProps {
  data: ArrayBuffer;
  onReady?: (api: AlphaTabApi) => void;
  onScoreLoaded?: (title: string) => void;
  onPlayerStateChange?: (playing: boolean) => void;
  onError?: (message: string) => void;
}

const AlphaTabViewer: React.FC<AlphaTabViewerProps> = ({
  data,
  onReady,
  onScoreLoaded,
  onPlayerStateChange,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    const init = async () => {
      setLoading(true);
      try {
        const alphaTab = await import('@coderline/alphatab');
        if (disposed) return;

        const api = new alphaTab.AlphaTabApi(container, {
          core: {
            fontDirectory: '/font/',
          },
          display: {
            scale: 1,
          },
          player: {
            enablePlayer: true,
            playerMode: alphaTab.PlayerMode.EnabledAutomatic,
            enableCursor: true,
            enableAnimatedBeatCursor: true,
            enableElementHighlighting: true,
            soundFont: '/soundfont/sonivox.sf2',
            scrollElement: container,
          },
        });

        apiRef.current = api;
        onReady?.(api);

        api.scoreLoaded.on(score => {
          const title = score.title?.trim() || score.album?.trim();
          if (title) onScoreLoaded?.(title);
        });

        api.playerStateChanged.on(args => {
          onPlayerStateChange?.(args.state === 1);
        });

        api.error.on(err => {
          onError?.(err.message || 'alphaTab failed to render this score.');
        });

        const loaded = api.load(data);
        if (!loaded) {
          onError?.('Unsupported score format.');
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to initialize alphaTab.');
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    init();

    return () => {
      disposed = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, [data, onError, onPlayerStateChange, onReady, onScoreLoaded]);

  return (
    <div className="relative min-h-[480px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-sm">
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 animate-pulse">
            Loading score…
          </p>
        </div>
      )}
      <div ref={containerRef} className="alphatab-viewer w-full min-h-[480px]" />
    </div>
  );
};

export default AlphaTabViewer;
