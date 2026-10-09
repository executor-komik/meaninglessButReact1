import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import styles from './calculator.module.css'

type Operator = '+' | '−' | '×' | '÷'

const calculate = (left: number, right: number, operator: Operator) => {
  let result: number

  switch (operator) {
    case '+':
      result = left + right
      break
    case '−':
      result = left - right
      break
    case '×':
      result = left * right
      break
    case '÷':
      if (right === 0) return null
      result = left / right
      break
  }

  if (!Number.isFinite(result)) return null
  return Number.isInteger(result) ? result : Number(result.toPrecision(10))
}

const Calculator = ({ onOpen }: { onOpen: () => void }) => (
  <button
    className={styles.calculatorAction}
    type="button"
    onClick={onOpen}
  >
    <span className={styles.calculatorAction__icon} aria-hidden="true">±</span>
    <span>Normal Calculator</span>
    <span className={styles.calculatorAction__arrow} aria-hidden="true">↗</span>
  </button>
)

export const CalculatorPage = ({ onBack }: { onBack: () => void }) => {
  const [display, setDisplay] = useState('0')
  const [storedValue, setStoredValue] = useState<number | null>(null)
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null)
  const [replaceDisplay, setReplaceDisplay] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const clear = () => {
    setDisplay('0')
    setStoredValue(null)
    setPendingOperator(null)
    setReplaceDisplay(false)
  }

  const enterDigit = (digit: string) => {
    if (display === 'Error' || replaceDisplay) {
      setDisplay(digit)
      setReplaceDisplay(false)
      return
    }

    setDisplay(display === '0' ? digit : `${display}${digit}`)
  }

  const enterDecimal = () => {
    if (display === 'Error' || replaceDisplay) {
      setDisplay('0.')
      setReplaceDisplay(false)
    } else if (!display.includes('.')) {
      setDisplay(`${display}.`)
    }
  }

  const enterOperator = (operator: Operator) => {
    if (display === 'Error') return

    let value = Number(display)
    if (storedValue !== null && pendingOperator && !replaceDisplay) {
      const result = calculate(storedValue, value, pendingOperator)
      if (result === null) {
        setDisplay('Error')
        setStoredValue(null)
        setPendingOperator(null)
        setReplaceDisplay(true)
        return
      }
      value = result
      setDisplay(String(result))
    }

    setStoredValue(value)
    setPendingOperator(operator)
    setReplaceDisplay(true)
  }

  const equals = () => {
    if (storedValue === null || pendingOperator === null || replaceDisplay || display === 'Error') return

    const result = calculate(storedValue, Number(display), pendingOperator)
    setDisplay(result === null ? 'Error' : String(result))
    setStoredValue(null)
    setPendingOperator(null)
    setReplaceDisplay(true)
  }

  const backspace = () => {
    if (display === 'Error' || replaceDisplay || display.length === 1) {
      setDisplay('0')
      setReplaceDisplay(false)
      return
    }
    setDisplay(display.slice(0, -1))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event
    if (key === 'Enter' && event.target instanceof HTMLButtonElement) return

    if (/^\d$/.test(key)) enterDigit(key)
    else if (key === '.') enterDecimal()
    else if (key === 'Enter' || key === '=') equals()
    else if (key === 'Backspace') backspace()
    else if (key === 'Escape') onBack()
    else if (key === 'Delete') clear()
    else if (key === '+') enterOperator('+')
    else if (key === '-') enterOperator('−')
    else if (key === '*' || key.toLowerCase() === 'x') enterOperator('×')
    else if (key === '/') enterOperator('÷')
    else return

    event.preventDefault()
  }

  const displayText = pendingOperator !== null && storedValue !== null
    ? `${storedValue} ${pendingOperator}${replaceDisplay ? '' : ` ${display}`}`
    : display

  return (
    <main className={styles.calculatorPage}>
      <button className={`page__backButton ${styles.calculatorPage__backButton}`} type="button" onClick={onBack}>
        ← Home
      </button>
      <output className={styles.calculator__display} aria-live="polite" aria-label="Calculator display">
        {displayText}
      </output>
      <section
        ref={dialogRef}
        className={styles.calculator}
        aria-labelledby="calculator-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.calculator__header}>
          <div>
            <p className={styles.calculator__eyebrow}>Four operations</p>
            <h1 id="calculator-title">Calculator</h1>
          </div>
        </header>
        <div className={styles.calculator__keys}>
          <button className={`${styles.calculator__key} ${styles['calculator__key--utility']} ${styles['calculator__key--wide']}`} type="button" onClick={clear}>C</button>
          <button className={`${styles.calculator__key} ${styles['calculator__key--utility']}`} type="button" onClick={backspace} aria-label="Backspace">⌫</button>
          <button className={`${styles.calculator__key} ${styles['calculator__key--operator']}`} type="button" onClick={() => enterOperator('÷')} aria-label="Divide">÷</button>
          {['7', '8', '9'].map((digit) => (
            <button className={styles.calculator__key} type="button" key={digit} onClick={() => enterDigit(digit)}>{digit}</button>
          ))}
          <button className={`${styles.calculator__key} ${styles['calculator__key--operator']}`} type="button" onClick={() => enterOperator('×')} aria-label="Multiply">×</button>
          {['4', '5', '6'].map((digit) => (
            <button className={styles.calculator__key} type="button" key={digit} onClick={() => enterDigit(digit)}>{digit}</button>
          ))}
          <button className={`${styles.calculator__key} ${styles['calculator__key--operator']}`} type="button" onClick={() => enterOperator('−')} aria-label="Subtract">−</button>
          {['1', '2', '3'].map((digit) => (
            <button className={styles.calculator__key} type="button" key={digit} onClick={() => enterDigit(digit)}>{digit}</button>
          ))}
          <button className={`${styles.calculator__key} ${styles['calculator__key--operator']}`} type="button" onClick={() => enterOperator('+')} aria-label="Add">+</button>
          <button className={`${styles.calculator__key} ${styles['calculator__key--zero']}`} type="button" onClick={() => enterDigit('0')}>0</button>
          <button className={styles.calculator__key} type="button" onClick={enterDecimal}>.</button>
          <button className={`${styles.calculator__key} ${styles['calculator__key--equals']}`} type="button" onClick={equals} aria-label="Equals">=</button>
        </div>
      </section>
    </main>
  )
}

export default Calculator