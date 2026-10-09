import { jsPDF } from 'jspdf'

type AssetType = 'equity-share' | 'equity-fund' | 'debt-fund'
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

const bucketLabels: Record<Bucket, string> = {
  'shares-short': 'Equity shares - short-term',
  'shares-long': 'Equity shares - long-term',
  'equity-funds-short': 'Equity-oriented funds - short-term',
  'equity-funds-long': 'Equity-oriented funds - long-term',
  'debt-funds-short': 'Debt mutual funds - short-term',
  'debt-funds-long': 'Debt mutual funds - long-term',
}

const bucketOrder: Bucket[] = [
  'shares-short',
  'shares-long',
  'equity-funds-short',
  'equity-funds-long',
  'debt-funds-short',
  'debt-funds-long',
]

const assetLabels: Record<AssetType, string> = {
  'equity-share': 'Equity shares',
  'equity-fund': 'Equity mutual fund',
  'debt-fund': 'Debt mutual fund',
}

const formatAmount = (amount: number) =>
  `INR ${Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const exportCapitalGainsPdf = (calculation: Calculation, slabRate: number): Blob => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addPageIfNeeded = (requiredHeight: number) => {
    if (y + requiredHeight <= pageHeight - margin) return
    pdf.addPage()
    y = margin
  }

  const sectionTitle = (title: string) => {
    addPageIfNeeded(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(27, 39, 58)
    pdf.text(title, margin, y)
    y += 7
  }

  const drawTable = (headers: string[], rows: string[][], widths: number[]) => {
    const drawHeader = () => {
      pdf.setFillColor(31, 44, 65)
      pdf.rect(margin, y, contentWidth, 8, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(255, 255, 255)
      let x = margin + 2
      headers.forEach((header, index) => {
        pdf.text(header, x, y + 5.3)
        x += widths[index]
      })
      y += 8
    }

    drawHeader()
    rows.forEach((row, rowIndex) => {
      const cellLines = row.map((cell, index) =>
        pdf.splitTextToSize(cell, Math.max(5, widths[index] - 4)) as string[],
      )
      const lineCount = Math.max(...cellLines.map((lines) => lines.length))
      const rowHeight = Math.max(7, lineCount * 3.5 + 3)
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage()
        y = margin
        drawHeader()
      }

      if (rowIndex % 2 === 0) {
        pdf.setFillColor(243, 246, 250)
        pdf.rect(margin, y, contentWidth, rowHeight, 'F')
      }
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(48, 58, 75)
      let x = margin + 2
      cellLines.forEach((lines, index) => {
        pdf.text(lines, x, y + 4.5)
        x += widths[index]
      })
      y += rowHeight
    })
    y += 5
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.setTextColor(19, 30, 47)
  pdf.text('Capital Gains Calculation', margin, y + 5)
  y += 11
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(93, 105, 123)
  pdf.text(`Generated ${new Date().toLocaleDateString('en-IN')}`, margin, y + 2)
  y += 10

  pdf.setFillColor(237, 246, 245)
  pdf.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(35, 94, 91)
  pdf.text(
    calculation.netResult >= 0 ? 'REALIZED RESULT: PROFIT' : 'REALIZED RESULT: LOSS',
    margin + 5,
    y + 7,
  )
  pdf.setFontSize(16)
  pdf.setTextColor(24, 44, 60)
  pdf.text(
    `${calculation.netResult < 0 ? '-' : ''}${formatAmount(calculation.netResult)}`,
    margin + 5,
    y + 17,
  )
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(66, 78, 95)
  pdf.text(`Profits ${formatAmount(calculation.totalProfit)}`, margin + 95, y + 10)
  pdf.text(`Losses ${formatAmount(calculation.totalLoss)}`, margin + 155, y + 10)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Estimated tax ${formatAmount(calculation.estimatedTax)}`, margin + 215, y + 10)
  y += 33

  sectionTitle('Net gain or loss by category')
  drawTable(
    ['Category', 'Net after loss set-off'],
    bucketOrder.map((bucket) => [bucketLabels[bucket], formatAmount(calculation.netByBucket[bucket])]),
    [contentWidth * 0.67, contentWidth * 0.33],
  )

  sectionTitle('Estimated tax by financial year')
  drawTable(
    ['Financial year', 'Taxable short-term gains', 'Taxable long-term gains', 'Estimated tax incl. 4% cess'],
    calculation.years.map((year) => [
      year.financialYear,
      formatAmount(year.taxableShortTerm),
      formatAmount(year.taxableLongTerm),
      formatAmount(year.estimatedTax),
    ]),
    [contentWidth * 0.2, contentWidth * 0.25, contentWidth * 0.25, contentWidth * 0.3],
  )

  sectionTitle(`Matched sales (${calculation.matches.length})`)
  const columnWidths = [
    contentWidth * 0.2,
    contentWidth * 0.14,
    contentWidth * 0.12,
    contentWidth * 0.12,
    contentWidth * 0.09,
    contentWidth * 0.11,
    contentWidth * 0.1,
    contentWidth * 0.12,
  ]
  drawTable(
    ['Investment', 'Asset type', 'Purchase date', 'Sale date', 'Units', 'Term', 'Financial year', 'Realized P/L'],
    calculation.matches.map((match) => [
      match.investmentName,
      assetLabels[match.assetType],
      match.purchaseDate,
      match.saleDate,
      match.quantity.toLocaleString('en-IN'),
      match.holdingPeriod,
      match.financialYear,
      `${match.gain < 0 ? '-' : ''}${formatAmount(match.gain)}`,
    ]),
    columnWidths,
  )

  sectionTitle('Assumptions and limitations')
  const disclaimer =
    `FIFO matching is based on the same investment name and type. Eligible listed equity shares and equity mutual funds use a 12-month long-term holding threshold. Debt mutual funds acquired on or after 1 April 2023 are treated as short-term at the selected ${slabRate}% slab; earlier debt-fund units use a 24-month threshold and an estimated 12.5% long-term rate. The estimate applies eligible equity STCG at 20%, equity LTCG at 12.5% after the INR 125,000 annual threshold, plus 4% cess. Surcharge, rebates, carried-forward losses, fees, and other income are not included. This report is an estimate, not tax advice. Confirm applicable rules before filing.`
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(88, 98, 113)
  const disclaimerLines = pdf.splitTextToSize(disclaimer, contentWidth) as string[]
  const disclaimerHeight = disclaimerLines.length * 4 + 5
  addPageIfNeeded(disclaimerHeight)
  pdf.text(disclaimerLines, margin, y)

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(130, 138, 150)
    pdf.text(
      `Capital gains estimate - Page ${page} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' },
    )
  }

  return pdf.output('blob')
}

export default exportCapitalGainsPdf
