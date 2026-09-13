import { useEffect, useRef, useState } from 'react';
import '@/components/MusicToggle.scss';

const AUDIO_SRC = '/matrix.mp3';

const MusicToggle = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.8;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => {
      audio.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <div className="music-toggle">
      <audio ref={audioRef} src={AUDIO_SRC} loop autoPlay preload="auto" />
      <button
        type="button"
        className="music-toggle__button"
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default MusicToggle;