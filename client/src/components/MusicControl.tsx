import { useEffect, useState } from 'react';
import { Howl } from 'howler';
import styles from '@/components/MusicControl.module.scss';

const sound = new Howl({
  src: ['/matrix.mp3'],
  loop: true,
  volume: 0.8,
  preload: false,
});

const toggleAudio = () => {
  if (sound.playing()) {
    sound.pause();
  } else {
    if (sound.state() === 'unloaded') {
      sound.load();
    }
    void sound.play();
  }
};

const MusicControl = () => {
  const [playing, setPlaying] = useState(() => sound.playing());

  useEffect(() => {
    const sync = () => setPlaying(sound.playing());

    const onFirstInteraction = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-music-control]')) return;
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
      if (sound.state() === 'unloaded') {
        sound.load();
      }
      void sound.play();
    };

    sound.on('play', sync);
    sound.on('pause', sync);
    sound.on('stop', sync);
    sound.on('end', sync);
    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);

    return () => {
      sound.off('play', sync);
      sound.off('pause', sync);
      sound.off('stop', sync);
      sound.off('end', sync);
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
      sound.unload();
    };
  }, []);

  return (
    <div className={styles.musicControl}>
      <span className={styles.musicControlStatus} aria-live="polite">
        {playing ? "Matrix.mp3 running" : "Matrix.mp3 paused"}
      </span>
      <button
        type="button"
        className={styles.musicControlButton}
        data-music-control
        onClick={toggleAudio}
        aria-label={playing ? "Pause music" : "Play music"}
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