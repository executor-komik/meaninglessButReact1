import { useEffect, useState } from 'react'
import styles from './capitalGainsCalculator.module.css'

type AssetType = 'equity-share' | 'equity-fund' | 'debt-fund'

type Transaction = {
  id: string
  assetType: AssetType
  name: string
  date: string
  quantity: string
  amount: string
}

type TransactionType = 'purchase' | 'sale'
type Bucket =
  | 'shares-short'
  | 'shares-long'
  | 'equity-funds-short'
  | 'equity-funds-long'
  | 'debt-funds-short'
  | 'debt-funds-long'

type Match = {
  investmentName: string
  assetType: AssetType
  purchaseDate: string
  saleDate: string
  quantity: number
  gain: number
  holdingPeriod: 'Short-term' | 'Long-term'
  financialYear: string
}

type YearSummary = {
  financialYear: string
  taxableShortTerm: number
  taxableLongTerm: number
  estimatedTax: number
}

type Calculation = {
  netByBucket: Record<Bucket, number>
  totalProfit: number
  totalLoss: number
  netResult: number
  estimatedTax: number
  matches: Match[]
  years: YearSummary[]
}

type Validation = { message: string }

const bucketOrder: Bucket[] = [
  'shares-short',
  'shares-long',
  'equity-funds-short',
  'equity-funds-long',
  'debt-funds-short',
  'debt-funds-long',
]

const bucketLabels: Record<Bucket, string> = {
  'shares-short': 'Equity shares · short-term',
  'shares-long': 'Equity shares · long-term',
  'equity-funds-short': 'Equity-oriented funds · short-term',
  'equity-funds-long': 'Equity-oriented funds · long-term',
  'debt-funds-short': 'Debt mutual funds · short-term',
  'debt-funds-long': 'Debt mutual funds · long-term',
}

const shortBuckets: Bucket[] = ['shares-short', 'equity-funds-short', 'debt-funds-short']
const longBuckets: Bucket[] = ['shares-long', 'equity-funds-long', 'debt-funds-long']
const equityShortBuckets: Bucket[] = ['shares-short', 'equity-funds-short']
const equityLongBuckets: Bucket[] = ['shares-long', 'equity-funds-long']

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const assetLabels: Record<AssetType, string> = {
  'equity-share': 'Equity shares',
  'equity-fund': 'Equity mutual fund',
  'debt-fund': 'Debt mutual fund',
}

const createTransaction = (): Transaction => ({
  id: crypto.randomUUID(),
  assetType: 'equity-share',
  name: '',
  date: '',
  quantity: '',
  amount: '',
})

const emptyBuckets = (): Record<Bucket, number> => ({
  'shares-short': 0,
  'shares-long': 0,
  'equity-funds-short': 0,
  'equity-funds-long': 0,
  'debt-funds-short': 0,
  'debt-funds-long': 0,
})

const totalFor = (values: Record<Bucket, number>, buckets: Bucket[]) =>
  buckets.reduce((total, bucket) => total + values[bucket], 0)

const offsetProportionally = (
  balances: Record<Bucket, number>,
  loss: number,
  buckets: Bucket[],
) => {
  const total = totalFor(balances, buckets)
  const used = Math.min(total, loss)
  if (total === 0 || used === 0) return loss

  const portions = buckets.map((bucket) => {
    const exact = (used * balances[bucket]) / total
    return { bucket, amount: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let centsLeft = used - portions.reduce((sum, portion) => sum + portion.amount, 0)
  portions
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((portion) => {
      if (centsLeft > 0 && portion.amount < balances[portion.bucket]) {
        portion.amount += 1
        centsLeft -= 1
      }
    })
  portions.forEach(({ bucket, amount }) => {
    balances[bucket] -= amount
  })
  return loss - used
}

const subtractProportionally = (
  balances: Record<Bucket, number>,
  loss: number,
  sourceLosses: Record<Bucket, number>,
  buckets: Bucket[],
) => {
  const total = totalFor(sourceLosses, buckets)
  if (loss <= 0 || total <= 0) return
  const portions = buckets.map((bucket) => {
    const exact = (loss * sourceLosses[bucket]) / total
    return { bucket, amount: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let centsLeft = loss - portions.reduce((sum, portion) => sum + portion.amount, 0)
  portions
    .sort((left, right) => right.remainder - left.remainder)
    .forEach((portion) => {
      if (centsLeft > 0 && portion.amount < sourceLosses[portion.bucket]) {
        portion.amount += 1
        centsLeft -= 1
      }
    })
  portions.forEach(({ bucket, amount }) => {
    balances[bucket] -= amount
  })
}

const addMonths = (date: Date, months: number) => {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDayOfMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate()
  result.setUTCDate(Math.min(day, lastDayOfMonth))
  return result
}

const isLongTerm = (assetType: AssetType, purchaseDate: Date, saleDate: Date) => {
  const debtRuleStart = Date.UTC(2023, 3, 1)
  if (assetType === 'debt-fund' && purchaseDate.getTime() >= debtRuleStart) {
    return false
  }
  const holdingMonths = assetType === 'debt-fund' ? 24 : 12
  return saleDate.getTime() > addMonths(purchaseDate, holdingMonths).getTime()
}

const getFinancialYear = (date: Date) => {
  const year = date.getUTCFullYear()
  const startYear = date.getUTCMonth() >= 3 ? year : year - 1
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`
}

const bucketFor = (assetType: AssetType, isLong: boolean): Bucket => {
  const term = isLong ? 'long' : 'short'
  if (assetType === 'equity-share') return `shares-${term}`
  if (assetType === 'equity-fund') return `equity-funds-${term}`
  return `debt-funds-${term}`
}

const getValidationError = (purchases: Transaction[], sales: Transaction[]): Validation | null => {
  if (purchases.length === 0 || sales.length === 0) {
    return { message: 'Add at least one purchase and one sale before calculating.' }
  }

  for (const [type, transactions] of [
    ['purchase', purchases],
    ['sale', sales],
  ] as const) {
    for (let index = 0; index < transactions.length; index += 1) {
      const transaction = transactions[index]
      const label = `${type === 'purchase' ? 'Purchase' : 'Sale'} ${index + 1}`
      if (!transaction.name.trim() || !transaction.date) {
        return { message: `${label}: enter an investment name and transaction date.` }
      }
      if (!Number.isFinite(Date.parse(`${transaction.date}T00:00:00Z`))) {
        return { message: `${label}: enter a valid transaction date.` }
      }
      if (Number(transaction.quantity) <= 0 || Number(transaction.amount) <= 0) {
        return { message: `${label}: quantity and total amount must both be greater than zero.` }
      }
      if (!Number.isFinite(Number(transaction.quantity)) || !Number.isFinite(Number(transaction.amount))) {
        return { message: `${label}: enter valid numbers for quantity and total amount.` }
      }
    }
  }

  return null
}

const calculateCapitalGains = (
  purchases: Transaction[],
  sales: Transaction[],
  slabRate: number,
): Calculation | Validation => {
  const validation = getValidationError(purchases, sales)
  if (validation) return validation

  const transactions = [
    ...purchases.map((transaction) => ({ ...transaction, type: 'purchase' as const })),
    ...sales.map((transaction) => ({ ...transaction, type: 'sale' as const })),
  ].sort((left, right) => {
    const dateOrder = left.date.localeCompare(right.date)
    if (dateOrder !== 0) return dateOrder
    if (left.type === right.type) return 0
    return left.type === 'purchase' ? -1 : 1
  })

  const lots = new Map<string, { date: Date; units: number; costCents: number }[]>()
  const gainsByYear = new Map<string, Record<Bucket, number>>()
  const lossesByYear = new Map<string, Record<Bucket, number>>()
  const matches: Match[] = []

  for (const transaction of transactions) {
    const key = `${transaction.assetType}:${transaction.name.trim().toLocaleLowerCase()}`
    const units = Number(transaction.quantity)
    const totalCents = Math.round(Number(transaction.amount) * 100)
    const transactionDate = new Date(`${transaction.date}T00:00:00Z`)
    const holdingLots = lots.get(key) ?? []

    if (transaction.type === 'purchase') {
      holdingLots.push({ date: transactionDate, units, costCents: totalCents })
      lots.set(key, holdingLots)
      continue
    }

    let unitsRemaining = units
    let proceedsRemaining = totalCents
    while (unitsRemaining > 0.00000001) {
      const lot = holdingLots.find((candidate) => candidate.units > 0.00000001)
      if (!lot) {
        const name = transaction.name.trim()
        return {
          message: `Sale of "${name}" is ${unitsRemaining.toLocaleString('en-IN')} unit(s) more than its purchases available by the sale date. Check the investment name/type and add any missing earlier purchases.`,
        }
      }

      const unitsMatched = Math.min(unitsRemaining, lot.units)
      const isFinalSaleAllocation = unitsMatched >= unitsRemaining - 0.00000001
      const proceedsCents = isFinalSaleAllocation
        ? proceedsRemaining
        : Math.min(proceedsRemaining, Math.round((totalCents * unitsMatched) / units))
      const costCents = unitsMatched >= lot.units - 0.00000001
        ? lot.costCents
        : Math.round((lot.costCents * unitsMatched) / lot.units)
      const gainCents = proceedsCents - costCents
      const longTerm = isLongTerm(transaction.assetType, lot.date, transactionDate)
      const bucket = bucketFor(transaction.assetType, longTerm)
      const financialYear = getFinancialYear(transactionDate)
      const yearlyValues = (gainCents >= 0 ? gainsByYear : lossesByYear).get(financialYear)
        ?? emptyBuckets()
      yearlyValues[bucket] += Math.abs(gainCents)
      ;(gainCents >= 0 ? gainsByYear : lossesByYear).set(financialYear, yearlyValues)

      matches.push({
        investmentName: transaction.name.trim(),
        assetType: transaction.assetType,
        purchaseDate: lot.date.toISOString().slice(0, 10),
        saleDate: transaction.date,
        quantity: unitsMatched,
        gain: gainCents / 100,
        holdingPeriod: longTerm ? 'Long-term' : 'Short-term',
        financialYear,
      })

      lot.units -= unitsMatched
      lot.costCents -= costCents
      unitsRemaining = Math.max(0, unitsRemaining - unitsMatched)
      proceedsRemaining -= proceedsCents
    }
  }

  const netByBucket = emptyBuckets()
  const years: YearSummary[] = []
  let totalProfitCents = 0
  let totalLossCents = 0

  const financialYears = new Set([...gainsByYear.keys(), ...lossesByYear.keys()])
  for (const financialYear of [...financialYears].sort()) {
    const gains = gainsByYear.get(financialYear) ?? emptyBuckets()
    const losses = lossesByYear.get(financialYear) ?? emptyBuckets()
    totalProfitCents += totalFor(gains, bucketOrder)
    totalLossCents += totalFor(losses, bucketOrder)
    const yearNet = { ...gains }
    let shortLossRemaining = totalFor(losses, shortBuckets)
    shortLossRemaining = offsetProportionally(yearNet, shortLossRemaining, shortBuckets)
    shortLossRemaining = offsetProportionally(yearNet, shortLossRemaining, longBuckets)
    const longLosses = totalFor(losses, longBuckets)
    const longLossRemaining = offsetProportionally(
      yearNet,
      longLosses,
      longBuckets,
    )
    subtractProportionally(yearNet, shortLossRemaining, losses, shortBuckets)
    subtractProportionally(yearNet, longLossRemaining, losses, longBuckets)

    bucketOrder.forEach((bucket) => {
      netByBucket[bucket] += yearNet[bucket]
    })

    const equityShortTaxable = Math.max(0, totalFor(yearNet, equityShortBuckets) / 100)
    const equityLongTaxable = Math.max(
      0,
      (totalFor(yearNet, equityLongBuckets) - 12_500_000) / 100,
    )
    const debtShortTaxable = Math.max(0, yearNet['debt-funds-short'] / 100)
    const debtLongTaxable = Math.max(0, yearNet['debt-funds-long'] / 100)
    const taxBeforeCess =
      equityShortTaxable * 0.2 +
      equityLongTaxable * 0.125 +
      debtShortTaxable * (slabRate / 100) +
      debtLongTaxable * 0.125

    years.push({
      financialYear,
      taxableShortTerm: equityShortTaxable + debtShortTaxable,
      taxableLongTerm: equityLongTaxable + debtLongTaxable,
      estimatedTax: taxBeforeCess * 1.04,
    })
  }

  bucketOrder.forEach((bucket) => {
    netByBucket[bucket] /= 100
  })
  const totalProfit = totalProfitCents / 100
  const totalLoss = totalLossCents / 100

  return {
    netByBucket,
    totalProfit,
    totalLoss,
    netResult: totalProfit - totalLoss,
    estimatedTax: years.reduce((total, year) => total + year.estimatedTax, 0),
    matches,
    years,
  }
}

const formatAmount = (amount: number) =>
  `${amount < 0 ? '−' : ''}${money.format(Math.abs(amount))}`

type PdfExporter = (calculation: Calculation, slabRate: number) => Blob

const CapitalGainsCalculator = ({ onBack }: { onBack: () => void }) => {
  const [purchases, setPurchases] = useState<Transaction[]>([createTransaction()])
  const [sales, setSales] = useState<Transaction[]>([createTransaction()])
  const [slabRate, setSlabRate] = useState('30')
  const [calculation, setCalculation] = useState<Calculation | null>(null)
  const [error, setError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [pdfExporter, setPdfExporter] = useState<PdfExporter | null>(null)

  useEffect(() => {
    let isMounted = true
    import('./exportCapitalGainsPdf')
      .then(({ default: exporter }) => {
        if (isMounted) setPdfExporter(() => exporter)
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setExportError(
            reason instanceof Error
              ? `PDF download is unavailable: ${reason.message}`
              : 'PDF download is unavailable. Please reload and try again.',
          )
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  const updateTransaction = (
    type: TransactionType,
    id: string,
    updates: Partial<Transaction>,
  ) => {
    const setRows = type === 'purchase' ? setPurchases : setSales
    setRows((current) =>
      current.map((transaction) =>
        transaction.id === id ? { ...transaction, ...updates } : transaction,
      ),
    )
    setCalculation(null)
    setError('')
  }

  const addTransaction = (type: TransactionType) => {
    const setRows = type === 'purchase' ? setPurchases : setSales
    setRows((current) => [...current, createTransaction()])
    setCalculation(null)
    setError('')
  }

  const removeTransaction = (type: TransactionType, id: string) => {
    const setRows = type === 'purchase' ? setPurchases : setSales
    setRows((current) => current.filter((transaction) => transaction.id !== id))
    setCalculation(null)
    setError('')
  }

  const handleCalculate = () => {
    const result = calculateCapitalGains(
      purchases,
      sales,
      Math.min(100, Math.max(0, Number(slabRate) || 0)),
    )
    if ('message' in result) {
      setCalculation(null)
      setError(result.message)
      setExportStatus('')
      return
    }
    setError('')
    setExportStatus('')
    setCalculation(result)
  }

  const handleDownloadPdf = () => {
    if (!calculation || !pdfExporter) return
    try {
      const pdfBlob = pdfExporter(
        calculation,
        Math.min(100, Math.max(0, Number(slabRate) || 0)),
      )
      if (pdfBlob.size === 0) throw new Error('The generated report was empty.')
      const downloadUrl = URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = `capital-gains-report-${new Date().toISOString().slice(0, 10)}.pdf`
      try {
        document.body.append(downloadLink)
        downloadLink.click()
      } finally {
        downloadLink.remove()
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      }
      setExportError('')
      setExportStatus('Your PDF report download has started.')
    } catch (reason) {
      setExportStatus('')
      setExportError(
        reason instanceof Error
          ? `PDF download failed: ${reason.message}`
          : 'PDF download failed. Please try again.',
      )
    }
  }

  const renderTransaction = (transaction: Transaction, index: number, type: TransactionType) => {
    return (
      <fieldset className={styles.transaction} key={transaction.id}>
        <legend className={styles.srOnly}>{type === 'purchase' ? 'Purchase' : 'Sale'} {index + 1}</legend>
        <label className={`${styles.field} ${styles.nameField}`}>
          <span>Investment name</span>
          <input
            type="text"
            value={transaction.name}
            placeholder="Use the same name on buys and sells"
            onChange={(event) => updateTransaction(type, transaction.id, { name: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Investment type</span>
          <select
            value={transaction.assetType}
            onChange={(event) =>
              updateTransaction(type, transaction.id, { assetType: event.target.value as AssetType })
            }
          >
            <option value="equity-share">Equity shares</option>
            <option value="equity-fund">Equity mutual fund</option>
            <option value="debt-fund">Debt mutual fund</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{type === 'purchase' ? 'Purchase date' : 'Sale date'}</span>
          <input
            type="date"
            value={transaction.date}
            onChange={(event) => updateTransaction(type, transaction.id, { date: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Quantity / units</span>
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={transaction.quantity}
            placeholder="e.g. 10"
            onChange={(event) => updateTransaction(type, transaction.id, { quantity: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>{type === 'purchase' ? 'Total purchase amount (₹)' : 'Total sale amount (₹)'}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={transaction.amount}
            placeholder="e.g. 25,000"
            onChange={(event) => updateTransaction(type, transaction.id, { amount: event.target.value })}
          />
        </label>
        <button
          className={styles.removeButton}
          type="button"
          aria-label={`Remove ${type} ${index + 1}`}
          onClick={() => removeTransaction(type, transaction.id)}
        >
          Remove
        </button>
      </fieldset>
    )
  }

  return (
    <main className={styles.page}>
      <button className="page__backButton" type="button" onClick={onBack}>← Home</button>

      <header className={styles.header}>
        <p className={styles.eyebrow}>India · capital gains</p>
        <h1>Profit or loss?</h1>
        <p className={styles.intro}>
          Enter what you bought and sold. We&apos;ll match sales to your oldest
          purchases and work out short-term vs long-term gains from the dates.
        </p>
        <div className={styles.steps} aria-label="How it works">
          <span><b>1</b> Add purchases</span>
          <span><b>2</b> Add sales</span>
          <span><b>3</b> Calculate your result</span>
        </div>
      </header>

      <section className={styles.panel} aria-labelledby="purchases-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>Money going in</p>
            <h2 id="purchases-title">What did you buy?</h2>
          </div>
          <button
            className={styles.addButton}
            type="button"
            onClick={() => addTransaction('purchase')}
          >
            <span aria-hidden="true">+</span> Add purchase
          </button>
        </div>
        <p className={styles.sectionHelp}>
          Enter each buy as its own row. Total amount means the full cost for that quantity.
        </p>
        <div className={styles.transactionList}>
          {purchases.length > 0
            ? purchases.map((transaction, index) => renderTransaction(transaction, index, 'purchase'))
            : <p className={styles.emptyState}>No purchases yet. Add one to get started.</p>}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="sales-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>Money coming out</p>
            <h2 id="sales-title">What did you sell?</h2>
          </div>
          <button
            className={styles.addButton}
            type="button"
            onClick={() => addTransaction('sale')}
          >
            <span aria-hidden="true">+</span> Add sale
          </button>
        </div>
        <p className={styles.sectionHelp}>
          Use the same investment name and type as its purchases. We match units in purchase-date order.
        </p>
        <div className={styles.transactionList}>
          {sales.length > 0
            ? sales.map((transaction, index) => renderTransaction(transaction, index, 'sale'))
            : <p className={styles.emptyState}>No sales yet. Add one to get started.</p>}
        </div>
      </section>

      <section className={styles.calculatePanel} aria-label="Calculate gains and losses">
        <label className={`${styles.field} ${styles.slabField}`}>
          <span>Tax slab for debt mutual funds</span>
          <span className={styles.slabInput}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={slabRate}
              onChange={(event) => {
                setSlabRate(event.target.value)
                setCalculation(null)
              }}
            />
            <span>%</span>
          </span>
        </label>
        <button className={styles.calculateButton} type="button" onClick={handleCalculate}>
          <span aria-hidden="true">ƒx</span>
          Calculate my gains
          <span aria-hidden="true">→</span>
        </button>
        <p className={styles.calculateHint}>
          Add your transactions, then press this button to see your realized profit or loss.
        </p>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {calculation && (
        <section className={styles.results} aria-labelledby="results-title" aria-live="polite">
          <div className={styles.resultHero}>
            <div className={styles.resultHeroTop}>
              <div>
                <p className={styles.sectionEyebrow}>Realized result after FIFO cost matching</p>
                <h2 id="results-title">
                  {calculation.netResult >= 0 ? 'You are in profit' : 'You are in loss'}
                </h2>
                <strong className={calculation.netResult < 0 ? styles.loss : undefined}>
                  {formatAmount(calculation.netResult)}
                </strong>
                <p>
                  Profits {formatAmount(calculation.totalProfit)} · Losses {formatAmount(calculation.totalLoss)}
                </p>
              </div>
              <button
                className={styles.downloadButton}
                type="button"
                disabled={!pdfExporter}
                onClick={handleDownloadPdf}
              >
                <span aria-hidden="true">↓</span>
                {pdfExporter ? 'Download full report (PDF)' : 'Preparing PDF download...'}
              </button>
            </div>
          </div>
          {exportStatus && <p className={styles.exportStatus} role="status">{exportStatus}</p>}
          {exportError && <p className={styles.error} role="alert">{exportError}</p>}

          <div className={styles.resultSection}>
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Losses set off within each financial year</p>
                <h3>Net gain or loss by category</h3>
              </div>
              <strong className={styles.estimatedTax}>
                Est. tax {money.format(calculation.estimatedTax)}
              </strong>
            </div>
            <div className={styles.resultGrid}>
              {bucketOrder.map((bucket) => {
                const amount = calculation.netByBucket[bucket]
                return (
                  <article className={styles.resultCard} key={bucket}>
                    <p>{bucketLabels[bucket]}</p>
                    <strong className={amount < 0 ? styles.loss : undefined}>{formatAmount(amount)}</strong>
                    <span>{amount < 0 ? 'Unabsorbed loss' : amount > 0 ? 'Net gain after set-off' : 'No net gain'}</span>
                  </article>
                )
              })}
            </div>
          </div>

          <div className={styles.resultSection}>
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Date-based classification</p>
                <h3>Matched sales</h3>
              </div>
            </div>
            <div className={styles.tableScroller}>
              <table className={styles.matchTable}>
                <thead>
                  <tr>
                    <th>Investment</th>
                    <th>Bought</th>
                    <th>Sold</th>
                    <th>Units matched</th>
                    <th>Type</th>
                    <th>Realized P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.matches.map((match, index) => (
                    <tr key={`${match.investmentName}-${match.saleDate}-${index}`}>
                      <td>{match.investmentName}<small>{assetLabels[match.assetType]} · {match.financialYear}</small></td>
                      <td>{match.purchaseDate}</td>
                      <td>{match.saleDate}</td>
                      <td>{match.quantity.toLocaleString('en-IN')}</td>
                      <td>{match.holdingPeriod}</td>
                      <td className={match.gain < 0 ? styles.loss : undefined}>{formatAmount(match.gain)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.resultSection}>
            <p className={styles.sectionEyebrow}>Estimated tax by financial year</p>
            <div className={styles.yearList}>
              {calculation.years.map((year) => (
                <div className={styles.yearRow} key={year.financialYear}>
                  <strong>{year.financialYear}</strong>
                  <span>Taxable ST gains {money.format(year.taxableShortTerm)}</span>
                  <span>Taxable LT gains {money.format(year.taxableLongTerm)}</span>
                  <b>{money.format(year.estimatedTax)}</b>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <aside className={styles.disclaimer}>
        <strong>Estimate only, not tax advice.</strong>
        <p>
          FIFO matches purchases and sales with the same investment name and type. Listed equity shares
          and equity mutual funds become long-term after 12 months. Debt mutual funds bought on or after
          1 April 2023 are treated as short-term at your slab rate; earlier debt-fund units become
          long-term after 24 months and are estimated at 12.5%. Estimates use eligible equity STCG at
          20%, equity LTCG at 12.5% after the ₹1,25,000 annual threshold, and 4% cess; surcharge,
          rebates, carried-forward losses, fees and other income are not included. Confirm the applicable
          tax rules for each transaction before filing.
        </p>
      </aside>
    </main>
  )
}

export default CapitalGainsCalculator
