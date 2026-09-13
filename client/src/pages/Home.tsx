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
        <div className="home__bar">
          <span className="home__dot" />
          <span className="home__dot" />
          <span className="home__dot" />
          <code className="home__path">root@matrix:~# code --review</code>
          <MusicToggle />
        </div>

        <div className="home__body">
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

          <button
            type="button"
            className="home__submit"
            onClick={handleReview}
            disabled={loading}
          >
            {'> '}{loading ? 'reviewing...' : 'review code'}
          </button>

          {error && <p className="home__status">{error}</p>}
          {review && (
            <pre className="home__stream">{JSON.stringify(review, null, 2)}</pre>
          )}
        </div>
      </section>
    </main>
  )
}

export default Home