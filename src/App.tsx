import { useEffect, useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
import './App.css'
import ApiFetcher from './components/apiFetcher/ApiFetcher'
import AnimateSomething from './components/animateSomething/AnimateSomething'
import Calculator, { CalculatorPage } from './components/calculator/Calculator'
import CapitalGainsCalculator from './components/capitalGains/CapitalGainsCalculator'
import ImageEditor from './components/imageEditor/ImageEditor'
import NegativeImageConverter from './components/negativeImageConverter/NegativeImageConverter'
import PanoramaStitcher from './components/panoramaStitcher/PanoramaStitcher'
import SendHai from './components/sendHai/SendHai'
import { App as PromiseLessons } from './promiseLessons/App'
import './promiseLessons/index.css'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const getRoutePath = () => {
  const pathname = window.location.pathname
  if (basePath && pathname === basePath) return '/'
  const path = basePath && pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : pathname
  return path.replace(/\/$/, '') || '/'
}

function App() {
  const [path, setPath] = useState(getRoutePath)
  const [isWaving, setIsWaving] = useState(false)

  useEffect(() => {
    const handlePopState = () => setPath(getRoutePath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = (route: string) => {
    window.history.pushState({}, '', `${import.meta.env.BASE_URL}${route.replace(/^\//, '')}`)
    setPath(route)
  }

  const navigateHome = () => navigateTo('/')
  const navigateIdeas = () => navigateTo('/ideas')
  const navigateCalculator = () => navigateTo('/ideas/calculator')
  const navigatePromiseLessons = () => navigateTo('/ideas/promise-lessons')
  const navigateNeedHelp = () => navigateTo('/ideas/needHelp')
  const navigateEdit = () => navigateTo('/ideas/edit')
  const navigateStitch = () => navigateTo('/ideas/stitch')
  const navigateNegative = () => navigateTo('/ideas/negative')

  const route = path.startsWith('/ideas/') ? path.slice('/ideas'.length) : path

  if (route === '/dailyChallenge') return <DailyChallenge onBack={navigateIdeas} />
  if (route === '/noice') return <Noice onBack={navigateIdeas} />
  if (route === '/calculator') return <CalculatorPage onBack={navigateIdeas} />
  if (route === '/needHelp') return <CapitalGainsCalculator onBack={navigateIdeas} />
  if (route === '/edit') return <ImageEditor onBack={navigateIdeas} />
  if (route === '/stitch') return <PanoramaStitcher onBack={navigateIdeas} />
  if (route === '/negative') return <NegativeImageConverter onBack={navigateIdeas} />
  if (route === '/promise-lessons') {
    return (
      <div className="promiseLessonsPage">
        <button className="page__backButton" type="button" onClick={navigateIdeas}>← Ideas</button>
        <PromiseLessons />
      </div>
    )
  }

  if (path === '/ideas') return (
    <>
      <main className="dashboard">
        <button className="page__backButton" type="button" onClick={navigateHome}>← Portfolio</button>
        <header className="dashboard__intro">
          <p className="dashboard__eyebrow">A small collection of useful actions</p>
          <h1>Choose your next move.</h1>
          <p className="dashboard__subtitle">Nine useful actions, arranged with a little intention.</p>
        </header>

        <section className="actionBoard" aria-label="Available actions">
          <div className="actionBoard__item actionBoard__item--top">
            <span className="actionBoard__index">01</span>
            <SendHai onWave={() => setIsWaving(true)} />
          </div>
          <div className="actionBoard__item actionBoard__item--left">
            <span className="actionBoard__index">02</span>
            <ApiFetcher />
          </div>
          <div className="actionBoard__item actionBoard__item--right">
            <span className="actionBoard__index">03</span>
            <AnimateSomething />
          </div>
          <div className="actionBoard__item actionBoard__item--apiAgain">
            <span className="actionBoard__index">04</span>
            <ApiFetcher label="API Again" onClick={navigatePromiseLessons} />
          </div>
          <div className="actionBoard__item actionBoard__item--calculator">
            <span className="actionBoard__index">05</span>
            <Calculator onOpen={navigateCalculator} />
          </div>
          <div className="actionBoard__item actionBoard__item--advancedCalculator">
            <span className="actionBoard__index">06</span>
            <button className="advancedCalculator" type="button" onClick={navigateNeedHelp}>
              <span aria-hidden="true">ƒx</span>
              <span>Advanced Calculator</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="actionBoard__item actionBoard__item--topIdea">
            <span className="actionBoard__index">07</span>
            <button className="ideaButton ideaButton--top" type="button" onClick={navigateEdit}>
              <span className="ideaButton__icon" aria-hidden="true">↑</span>
              <span>Cut</span>
            </button>
          </div>
          <div className="actionBoard__item actionBoard__item--leftIdea">
            <span className="actionBoard__index">08</span>
            <button className="ideaButton ideaButton--left" type="button" onClick={navigateStitch}>
              <span className="ideaButton__icon" aria-hidden="true">←</span>
              <span>Stitch</span>
            </button>
          </div>
          <div className="actionBoard__item actionBoard__item--rightIdea">
            <span className="actionBoard__index">09</span>
            <button className="ideaButton ideaButton--right" type="button" onClick={navigateNegative}>
              <span className="ideaButton__icon" aria-hidden="true">→</span>
              <span>Negative</span>
            </button>
          </div>
        </section>
      </main>
      {isWaving && <WavingHand onClose={() => setIsWaving(false)} />}
      {/* <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section> */}
    </>
  )

  return <PortfolioPage onOpenIdeas={navigateIdeas} />
}

function PortfolioPage({ onOpenIdeas }: { onOpenIdeas: () => void }) {
  return (
    <main className="portfolio">
      <header className="portfolio__nav">
        <a className="portfolio__brand" href="#top">YN<span>.</span></a>
        <a className="portfolio__navLink" href="#about">About</a>
      </header>

      <section className="portfolio__hero" id="top">
        <p className="portfolio__eyebrow">Portfolio · {new Date().getFullYear()}</p>
        <p className="portfolio__hello">Hello, I&apos;m</p>
        <h1>Your Name<span>.</span></h1>
        <p className="portfolio__role">Developer · maker · curious mind</p>
        <p className="portfolio__summary">
          I enjoy turning ideas into useful, thoughtful digital experiences.
          This is a little corner of the internet where I share what I&apos;m
          learning and building.
        </p>
        <a className="portfolio__contact" href="mailto:hello@example.com">Get in touch <span>↗</span></a>
        <div className="portfolio__orbit portfolio__orbit--one" aria-hidden="true" />
        <div className="portfolio__orbit portfolio__orbit--two" aria-hidden="true" />
      </section>

      <section className="portfolio__about" id="about">
        <div>
          <p className="portfolio__eyebrow">A little about me</p>
          <h2>Building things, one idea at a time.</h2>
        </div>
        <p>
          I&apos;m a developer who likes solving problems, exploring new
          technologies, and making the web more useful. I&apos;m currently
          focused on growing my skills through hands-on projects.
        </p>
      </section>

      <section className="portfolio__focus">
        <p className="portfolio__eyebrow">What I enjoy</p>
        <div className="portfolio__focusGrid">
          <article><span>01</span><h3>Frontend craft</h3><p>Building clean, responsive interfaces.</p></article>
          <article><span>02</span><h3>Creative tools</h3><p>Making small ideas genuinely useful.</p></article>
          <article><span>03</span><h3>Always learning</h3><p>Trying, iterating, and getting better.</p></article>
        </div>
      </section>

      <footer className="portfolio__footer">
        <div>
          <p className="portfolio__eyebrow">Curious about the experiments?</p>
          <h2>Explore my ideas.</h2>
          <p className="portfolio__footerCopy">Small tools, creative experiments, and things I&apos;ve been learning.</p>
        </div>
        <button className="portfolio__ideasButton" type="button" onClick={onOpenIdeas}>
          Ideas <span aria-hidden="true">↗</span>
        </button>
      </footer>
    </main>
  )
}

function DailyChallenge({ onBack }: { onBack: () => void }) {
  const [challenge, setChallenge] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('https://alfa-leetcode-api.onrender.com/daily')
      .then((response) => {
        if (!response.ok) throw new Error('The challenge could not be loaded.')
        return response.json()
      })
      .then(setChallenge)
      .catch((reason: Error) => setError(reason.message))
  }, [])

  return (
    <main className="page page--challenge">
      <button className="page__backButton" type="button" onClick={onBack}>← Ideas</button>
      <div className="page__heading">
        <p className="page__eyebrow">Daily practice</p>
        <h1>Today&apos;s challenge.</h1>
        <p className="page__subtitle">A focused problem to sharpen your problem-solving muscles.</p>
      </div>
      <article className="page__card">
        {error && <p className="page__error">{error}</p>}
        {!challenge && !error && <p className="page__loading">Finding today&apos;s problem...</p>}
        {challenge && (
          <>
            <div className="page__meta"><span>LeetCode daily</span><span>{String(challenge.difficulty ?? 'Practice')}</span></div>
            <h2>{String(challenge.questionTitle ?? challenge.title ?? 'Daily Challenge')}</h2>
            <p>{String(challenge.question ?? challenge.content ?? 'Open the problem to begin today\'s practice.')}</p>
            {typeof challenge.link === 'string' && <a className="page__link" href={challenge.link} target="_blank" rel="noreferrer">Open problem ↗</a>}
          </>
        )}
      </article>
    </main>
  )
}

function Noice({ onBack }: { onBack: () => void }) {
  return (
    <main className="page page--noice">
      <button className="page__backButton page__backButton--noice" type="button" onClick={onBack}>← Ideas</button>
      <div className="page__noiceCopy"><p className="page__eyebrow">Noice mode</p><h1>Let it bounce.</h1></div>
      <div className="page__bouncer" aria-label="An infinitely bouncing shape" />
    </main>
  )
}

function WavingHand({ onClose }: { onClose: () => void }) {
  return (
    <div className="waveOverlay" role="dialog" aria-label="Waving hand">
      <button className="waveOverlay__close" type="button" onClick={onClose} aria-label="Close waving hand">×</button>
      <div className="waveOverlay__hand" aria-hidden="true">👋</div>
      <p>Have a lovely day!</p>
    </div>
  )
}

export default App
