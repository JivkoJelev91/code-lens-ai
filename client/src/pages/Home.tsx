import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import MatrixRain from '@/components/MatrixRain';
import MusicControl from '@/components/MusicControl';
import ReviewView, { type Review } from '@/components/ReviewView';
import styles from '@/pages/Home.module.scss';

const CODE_STORAGE_KEY = 'code-lens:code';

const Home = () => {
  const [code, setCode] = useState(
    () => localStorage.getItem(CODE_STORAGE_KEY) ?? ''
  );
  const [review, setReview] = useState<Review | null>(null);
  const [reviewedCode, setReviewedCode] = useState('');
  const [reviewSeq, setReviewSeq] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reviewed = review !== null && code === reviewedCode;

  const handleCodeChange = (value: string) => {
    setCode(value);
    localStorage.setItem(CODE_STORAGE_KEY, value);
  };

  const handleReview = async () => {
    if (!code.trim() || reviewed) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed, try again!');
      setReview(data);
      setReviewedCode(code);
      setReviewSeq((seq) => seq + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.');
      setReview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNewReview = () => {
    setReview(null);
    setReviewedCode('');
    setError('');
  };

  return (
    <main className={styles.home}>
      <MatrixRain />

      <section className={styles.homeWindow}>
        <header className={styles.homeBar}>
          <span className={styles.homeDot} />
          <span className={styles.homeDot} />
          <span className={styles.homeDot} />
          <h1 className={styles.homeTitle}>CodeLens AI</h1>
          <div className={styles.homeBarActions}>
            {review && !loading && (
              <button
                type="button"
                className={styles.homeNewReview}
                onClick={handleNewReview}
              >
                new review
              </button>
            )}
            <MusicControl />
          </div>
        </header>

        <div className={styles.homeSplit}>
          <section className={styles.homePane}>
            <label className={styles.homeLabel}>
              code
            </label>
            <CodeEditor value={code} onChange={handleCodeChange} />
          </section>

          <section
            className={`${styles.homePane} ${styles.homePaneAside}`}
          >
            <span className={styles.homeLabel}>review</span>
            {loading ? (
              <p className={styles.homeTyping}>
                CodeLens Typing
                <span className={styles.homeTypingCursor} />
              </p>
            ) : error ? (
              <p className={styles.homeStatus}>{error}</p>
            ) : review ? (
              <ReviewView key={reviewSeq} review={review} />
            ) : (
              <p className={styles.homePlaceholder}>Your review will appear here.</p>
            )}
          </section>
        </div>

        <button
          type="button"
          className={styles.homeSubmit}
          onClick={handleReview}
          disabled={loading || !code.trim() || reviewed}
          data-loading={loading}
        >
          {'> '}{error ? 'try again' : reviewed ? 'reviewed' : 'review code'}
          {loading && (
            <span className={styles.homeDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
        </button>
      </section>
    </main>
  );
};

export default Home;