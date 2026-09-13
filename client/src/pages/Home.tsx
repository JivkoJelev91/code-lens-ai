import { useState } from 'react';
import MatrixRain from '@/components/MatrixRain';
import MusicToggle from '@/components/MusicToggle';
import '@/pages/Home.scss';

const Home = () => {
  const [code, setCode] = useState('')
  const [review, setReview] = useState<Record<string, unknown> | null>(null)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed.')
      setReview(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="home">
      <MatrixRain />
      <MusicToggle />

      <section className="home__window">
        <header className="home__bar">
          <span className="home__dot" />
          <span className="home__dot" />
          <span className="home__dot" />
          <h1 className="home__title">CodeLens AI</h1>
          <MusicToggle />
        </header>

        <div className="home__split">
          <section className="home__pane">
            <label className="home__label" htmlFor="code">
              code
            </label>
            <textarea
              id="code"
              className="home__code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="const users = ..."
              spellCheck={false}
            />
          </section>

          <section className="home__pane">
            <label className="home__label">review</label>
            {error ? (
              <p className="home__status">{error}</p>
            ) : review ? (
              <pre className="home__stream">{JSON.stringify(review, null, 2)}</pre>
            ) : (
              <p className="home__placeholder">Your review will appear here.</p>
            )}
          </section>
        </div>

        <button
          type="button"
          className="home__submit"
          onClick={handleReview}
          disabled={loading}
        >
          {'> '}review code
          {loading && (
            <span className="home__dots" aria-hidden="true">
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