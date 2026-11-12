import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Role = 'customer' | 'admin'
type Screen = 'loading' | 'welcome' | 'login' | 'register' | 'registered' | 'dashboard'

type User = {
  user_id: string
  name: string
  role: Role
}

type RegistrationResponse = {
  message: string
  user: User
}

type LoginResponse = {
  user: User
}

type SessionResponse = {
  user: User | null
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const navigationByRole: Record<Role, string[]> = {
  customer: ['Home', 'Reservation', 'Billing', 'History', 'Bookings', 'Contact Support'],
  admin: ['Home', 'Reservation', 'Billing', 'History', 'Room Status', 'Bookings', 'Support / Feedback'],
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  let payload: unknown
  try {
    payload = await response.json()
  } catch (cause) {
    throw new Error('The hotel service returned an unreadable response.', { cause })
  }

  if (!response.ok) {
    throw new ApiError(readErrorMessage(payload, response.status), response.status)
  }
  return payload as T
}

function readErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    const detail = payload.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item !== 'object' || item === null || !('msg' in item)) return ''
          const message = item.msg
          return typeof message === 'string' ? message : ''
        })
        .filter(Boolean)
        .join(' ')
    }
  }
  return `The request could not be completed (HTTP ${status}).`
}

function errorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Could not reach the hotel service. Start the app with “npm run hotel” and try again.'
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [loginRole, setLoginRole] = useState<Role>('customer')
  const [registeredUser, setRegisteredUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    void request<SessionResponse>('/api/auth/session')
      .then(({ user: sessionUser }) => {
        if (!active) return
        if (sessionUser) {
          setUser(sessionUser)
          setScreen('dashboard')
        } else {
          setScreen('welcome')
        }
      })
      .catch((cause: unknown) => {
        if (!active) return
        setScreen('welcome')
        setNotice(errorMessage(cause))
      })
    return () => {
      active = false
    }
  }, [])

  const showLogin = (role: Role) => {
    setLoginRole(role)
    setError('')
    setNotice('')
    setScreen('login')
  }

  const submitRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const form = new FormData(event.currentTarget)
    if (form.get('password') !== form.get('confirm_password')) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await request<RegistrationResponse>('/api/auth/register', {
        name: form.get('name'),
        email: form.get('email'),
        phone_country_code: form.get('phone_country_code'),
        phone_number: form.get('phone_number'),
        address: form.get('address'),
        password: form.get('password'),
      })
      setRegisteredUser(result.user)
      setScreen('registered')
    } catch (cause: unknown) {
      setError(errorMessage(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const result = await request<LoginResponse>('/api/auth/login', {
        user_id: form.get('user_id'),
        password: form.get('password'),
        role: loginRole,
      })
      setUser(result.user)
      setScreen('dashboard')
    } catch (cause: unknown) {
      setError(errorMessage(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  const logout = async () => {
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        throw new ApiError(`Sign out failed (HTTP ${response.status}). Please try again.`, response.status)
      }
      setUser(null)
      setScreen('welcome')
    } catch (cause: unknown) {
      setError(errorMessage(cause))
    }
  }

  if (screen === 'loading') {
    return <main className="loadingScreen" aria-live="polite">Checking your sign-in...</main>
  }

  if (screen === 'dashboard' && user) {
    return (
      <main className="hotelApp">
        <header className="topBar">
          <a className="brand" href="/" aria-label="Haven Hotel home">
            <span className="brand__mark" aria-hidden="true">H</span>
            <span>Haven <strong>Hotel</strong></span>
          </a>
          <div className="topBar__account">
            <span>Welcome, <strong>{user.name}</strong></span>
            <button className="button button--quiet" type="button" onClick={logout}>Log out</button>
          </div>
        </header>

        <nav className="primaryNav" aria-label={`${user.role} navigation`}>
          {navigationByRole[user.role].map((item) => (
            <button
              className={`primaryNav__item${item === 'Home' ? ' primaryNav__item--active' : ''}`}
              disabled={item !== 'Home'}
              key={item}
              title={item === 'Home' ? undefined : 'Available in a later phase'}
              type="button"
            >
              {item}
              {item !== 'Home' && <span className="primaryNav__soon">Soon</span>}
            </button>
          ))}
        </nav>

        <section className="dashboard">
          <p className="eyebrow">{user.role === 'admin' ? 'Administration' : 'Guest account'} · Phase 1</p>
          <h1>Your stay,<br /><em>made simple.</em></h1>
          <p className="dashboard__intro">
            {user.role === 'admin'
              ? 'Your administrator workspace is ready. Reservation and room tools will appear here in upcoming phases.'
              : 'Your customer account is ready. You will be able to manage reservations and your stay here in upcoming phases.'}
          </p>
          <div className="accountCard">
            <span className="accountCard__label">{user.role === 'admin' ? 'Administrator ID' : 'Customer ID'}</span>
            <strong>{user.user_id}</strong>
            <span className="accountCard__note">Keep this ID handy for your next sign-in.</span>
          </div>
          {error && <p className="formMessage formMessage--error" role="alert">{error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="entryPage">
      <header className="topBar topBar--entry">
        <a className="brand" href="/" aria-label="Haven Hotel home">
          <span className="brand__mark" aria-hidden="true">H</span>
          <span>Haven <strong>Hotel</strong></span>
        </a>
        <span className="topBar__caption">A place to feel at home</span>
      </header>

      <section className="entryLayout">
        <div className="entryIntro">
          <p className="eyebrow">A better kind of stay</p>
          <h1>Arrive.<br /><em>Unwind.</em></h1>
          <p>Thoughtful hospitality begins with a simple, comfortable experience.</p>
          <div className="entryIntro__rule" />
          <span className="entryIntro__location">Your next stay starts here</span>
        </div>

        <section className="authPanel" aria-labelledby="auth-heading">
          {screen === 'welcome' && (
            <>
              <p className="eyebrow">Welcome to Haven</p>
              <h2 id="auth-heading">How would you like to continue?</h2>
              <p className="authPanel__copy">Sign in to your account, or create a customer account to get started.</p>
              {notice && <p className="formMessage formMessage--error" role="alert">{notice}</p>}
              <button className="button button--primary button--full" type="button" onClick={() => showLogin('customer')}>
                Customer sign in
              </button>
              <button className="button button--secondary button--full" type="button" onClick={() => setScreen('register')}>
                Create a customer account
              </button>
              <div className="authPanel__divider"><span>Hotel team</span></div>
              <button className="button button--quiet button--full" type="button" onClick={() => showLogin('admin')}>
                Administrator sign in
              </button>
            </>
          )}

          {screen === 'register' && (
            <>
              <button className="textButton" type="button" onClick={() => setScreen('welcome')}>← Back</button>
              <p className="eyebrow">Customer account</p>
              <h2 id="auth-heading">Create your account</h2>
              <p className="authPanel__copy">Your customer ID will be generated after registration.</p>
              <form className="form" onSubmit={submitRegistration}>
                <label className="form__field">
                  <span>Customer name</span>
                  <input autoComplete="name" maxLength={50} name="name" placeholder="Your full name" required />
                </label>
                <label className="form__field">
                  <span>Email address</span>
                  <input autoComplete="email" maxLength={254} name="email" placeholder="you@example.com" required type="email" />
                </label>
                <div className="form__row">
                  <label className="form__field form__field--country">
                    <span>Country code</span>
                    <select autoComplete="tel-country-code" defaultValue="+91" name="phone_country_code">
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+61">+61</option>
                      <option value="+81">+81</option>
                      <option value="+91">+91</option>
                      <option value="+971">+971</option>
                    </select>
                  </label>
                  <label className="form__field">
                    <span>Mobile number</span>
                    <input
                      autoComplete="tel-national"
                      inputMode="numeric"
                      maxLength={10}
                      minLength={10}
                      name="phone_number"
                      pattern="[0-9]{10}"
                      placeholder="10 digits"
                      required
                      type="tel"
                    />
                  </label>
                </div>
                <label className="form__field">
                  <span>Mailing address</span>
                  <textarea autoComplete="street-address" maxLength={500} name="address" placeholder="Street, city, and postal code" required rows={2} />
                </label>
                <label className="form__field">
                  <span>Password</span>
                  <input autoComplete="new-password" maxLength={30} minLength={8} name="password" required type="password" />
                  <small>8–30 characters; include uppercase, lowercase, and a special character.</small>
                </label>
                <label className="form__field">
                  <span>Confirm password</span>
                  <input autoComplete="new-password" maxLength={30} minLength={8} name="confirm_password" required type="password" />
                </label>
                {error && <p className="formMessage formMessage--error" role="alert">{error}</p>}
                <button className="button button--primary button--full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Creating account...' : 'Register'}
                </button>
                <button className="button button--quiet button--full" type="reset">Reset form</button>
              </form>
            </>
          )}

          {screen === 'registered' && registeredUser && (
            <div className="acknowledgment">
              <span className="acknowledgment__check" aria-hidden="true">✓</span>
              <p className="eyebrow">Registration complete</p>
              <h2 id="auth-heading">Welcome, {registeredUser.name}.</h2>
              <p className="acknowledgment__success">Customer registration successful.</p>
              <div className="accountCard accountCard--ack">
                <span className="accountCard__label">Your generated Customer ID</span>
                <strong>{registeredUser.user_id}</strong>
                <span className="accountCard__note">Save this ID. You will need it to sign in.</span>
              </div>
              <button className="button button--primary button--full" type="button" onClick={() => showLogin('customer')}>
                Continue to customer sign in
              </button>
            </div>
          )}

          {screen === 'login' && (
            <>
              <button className="textButton" type="button" onClick={() => setScreen('welcome')}>← Back</button>
              <p className="eyebrow">{loginRole === 'admin' ? 'Hotel team' : 'Customer account'}</p>
              <h2 id="auth-heading">{loginRole === 'admin' ? 'Administrator sign in' : 'Welcome back'}</h2>
              <p className="authPanel__copy">Sign in with your User ID and password.</p>
              <form className="form" onSubmit={submitLogin}>
                <label className="form__field">
                  <span>User ID</span>
                  <input autoComplete="username" maxLength={20} minLength={5} name="user_id" placeholder="Enter your User ID" required />
                </label>
                <label className="form__field">
                  <span>Password</span>
                  <input autoComplete="current-password" maxLength={30} name="password" required type="password" />
                </label>
                {error && <p className="formMessage formMessage--error" role="alert">{error}</p>}
                <button className="button button--primary button--full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </>
          )}
        </section>
      </section>
      <footer className="entryFooter">Haven Hotel <span>·</span> A calmer way to check in</footer>
    </main>
  )
}

export default App
