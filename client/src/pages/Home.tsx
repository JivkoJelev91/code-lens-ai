import { useState } from 'react';
import MatrixRain from '@/components/MatrixRain';
import MusicControl from '@/components/MusicControl';
import ReviewView, { type Review } from '@/components/ReviewView';
import styles from '@/pages/Home.module.scss';

const Home = () => {
  const [code, setCode] = useState('')
  const [review, setReview] = useState<Review | null>(null)
  const [reviewSeq, setReviewSeq] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReview = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Review failed.')
      setReview(data)
      setReviewSeq((seq) => seq + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.')
      setReview(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.home}>
      <MatrixRain />

      <section className={styles.homeWindow}>
        <header className={styles.homeBar}>
          <span className={styles.homeDot} />
          <span className={styles.homeDot} />
          <span className={styles.homeDot} />
          <h1 className={styles.homeTitle}>CodeLens AI</h1>
          <MusicControl />
        </header>

        <div className={styles.homeSplit}>
          <section className={styles.homePane}>
            <label className={styles.homeLabel} htmlFor="code">
              code
            </label>
            <textarea
              id="code"
              className={styles.homeCode}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="const users = ..."
              spellCheck={false}
            />
          </section>

          <section className={styles.homePane}>
            <label className={styles.homeLabel}>review</label>
            {error ? (
              <>
                <p className={styles.homeStatus}>{error}</p>
                <button
                  type="button"
                  className={styles.homeRetry}
                  onClick={handleReview}
                >
                  try again
                </button>
              </>
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
          disabled={loading || !code.trim()}
          data-loading={loading}
        >
          {'> '}review code
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
  )
}

export default Home