import { useState } from 'react'
import MatrixRain from '@/components/MatrixRain'
import '@/pages/Home.scss'

const LANGUAGES = ['TypeScript', 'JavaScript', 'React', 'JSON'] as const

type Language = (typeof LANGUAGES)[number]

const Home = () => {
  const [language, setLanguage] = useState<Language>('TypeScript')
  const [code, setCode] = useState('')

  return (
    <main className="home">
      <MatrixRain />

      <section className="home__window">
        <div className="home__bar">
          <span className="home__dot" />
          <span className="home__dot" />
          <span className="home__dot" />
          <code className="home__path">root@matrix:~# code --review</code>
        </div>

        <div className="home__body">
          <label className="home__label" htmlFor="language">
            language
          </label>
          <div className="home__select-wrap">
            <select
              id="language"
              className="home__select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

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

          <button type="button" className="home__submit">
            {'> '}review code
          </button>
        </div>
      </section>
    </main>
  )
}

export default Home