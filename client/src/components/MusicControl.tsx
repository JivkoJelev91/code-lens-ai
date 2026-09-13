import { useEffect, useState } from 'react';
import { Howl } from 'howler';
import '@/components/MusicControl.scss';

const sound = new Howl({ src: ['/matrix.mp3'], loop: true, volume: 0.8 });

const playAudio = () => {
  sound.play();
};

const toggleAudio = () => {
  if (sound.playing()) {
    sound.pause();
  } else {
    sound.play();
  }
};

let interactionEnabled = false;

const startAudioOnInteraction = () => {
  if (interactionEnabled) return;
  interactionEnabled = true;
  const handler = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.music-control__button')) return;
    cleanup();
    playAudio();
  };
  const cleanup = () => {
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
};

const MusicControl = () => {
  const [playing, setPlaying] = useState(() => sound.playing());
  const sync = () => setPlaying(sound.playing());

  useEffect(() => {
    sound.on('play', sync);
    sound.on('pause', sync);
    sound.on('stop', sync);
    sound.on('end', sync);
    playAudio();
    startAudioOnInteraction();
    return () => {
      sound.off('play', sync);
      sound.off('pause', sync);
      sound.off('stop', sync);
      sound.off('end', sync);
    };
  }, []);

  return (
    <div className="music-control">
      <button
        type="button"
        className="music-control__button"
        onClick={toggleAudio}
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

export default MusicControl;