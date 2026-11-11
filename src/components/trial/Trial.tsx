import { useState, type ChangeEvent } from 'react'
import styles from './trial.module.css'

type CaptionWord = {
  text: string
  start: number
  end: number
}

type CaptionSegment = {
  text: string
  start: number
  end: number
  words: CaptionWord[]
}

type TranscriptionResult = {
  filename: string
  duration_seconds: number
  video_width: number
  video_height: number
  language: string | null
  word_count: number
  segments: CaptionSegment[]
  video_url: string
  download_url: string
  srt: string
  vtt: string
  ass: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024
const FONT_OPTIONS = ['Arial Black', 'Arial', 'Impact', 'Trebuchet MS', 'Verdana', 'Georgia']

const downloadText = (content: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const Trial = ({ onBack }: { onBack: () => void }) => {
  const [fontName, setFontName] = useState('Arial Black')
  const [fontSize, setFontSize] = useState(48)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [highlightColor, setHighlightColor] = useState('#FFD84D')
  const [filename, setFilename] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<TranscriptionResult | null>(null)

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setResult(null)
    setError('')
    setStatus('')
    setFilename(file.name)

    if (file.size > MAX_FILE_SIZE) {
      setError('This first version accepts video files up to 100 MB.')
      event.target.value = ''
      return
    }
    if (!Number.isInteger(fontSize) || fontSize < 20 || fontSize > 96) {
      setError('Caption size must be a whole number between 20 and 96.')
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('video', file)
    formData.append('font_name', fontName)
    formData.append('font_size', String(fontSize))
    formData.append('text_color', textColor)
    formData.append('highlight_color', highlightColor)
    setIsProcessing(true)
    setStatus('Transcribing and rendering locally. The first run downloads the speech model and may take a little longer.')

    try {
      const response = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok) {
        const detail = payload.detail
        const message = Array.isArray(detail)
          ? detail.map((issue: { msg?: string }) => issue.msg ?? 'Invalid request').join(' ')
          : detail
        throw new Error(message || 'Caption generation failed.')
      }
      setResult(payload as TranscriptionResult)
      setStatus('Your captioned video is ready. Processing stayed on this computer.')
    } catch (reason) {
      setStatus('')
      setError(reason instanceof Error ? reason.message : 'Caption generation failed.')
    } finally {
      setIsProcessing(false)
      event.target.value = ''
    }
  }

  const outputName = filename.replace(/\.[^.]+$/, '') || 'captions'
  const previewWords = result?.segments.flatMap((segment) => segment.words).slice(0, 28) ?? []

  return (
    <main className={styles.trialPage}>
      <button className={`page__backButton ${styles.trialPage__backButton}`} type="button" onClick={onBack}>
        ← Ideas
      </button>
      <div className={styles.trialWorkspace}>
        <header className={styles.trialHeader}>
          <p className={styles.trialEyebrow}>Local captions · Shorts up to 3 minutes</p>
          <h1>Short Video Subs Gen</h1>
          <p>Upload a short video to generate karaoke-style captions and a finished MP4, all on this computer.</p>
        </header>

        <section className={styles.trialSettings} aria-label="Caption appearance">
          <label className={styles.trialField}>
            <span>ASS font</span>
            <select value={fontName} onChange={(event) => setFontName(event.target.value)} disabled={isProcessing}>
              {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </label>
          <label className={styles.trialField}>
            <span>Size</span>
            <input type="number" min="20" max="96" step="2" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} disabled={isProcessing} />
          </label>
          <label className={styles.trialField}>
            <span>Text</span>
            <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} disabled={isProcessing} />
          </label>
          <label className={styles.trialField}>
            <span>Word highlight</span>
            <input type="color" value={highlightColor} onChange={(event) => setHighlightColor(event.target.value)} disabled={isProcessing} />
          </label>
        </section>

        <label className={`${styles.uploadZone} ${isProcessing ? styles.uploadZone__disabled : ''}`}>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.m4v"
            onChange={handleUpload}
            disabled={isProcessing}
          />
          <span className={styles.uploadZone__icon} aria-hidden="true">↑</span>
          <span className={styles.uploadZone__title}>{isProcessing ? 'Working on your captions…' : 'Choose a video to start'}</span>
          <span className={styles.uploadZone__details}>MP4, MOV, WebM, or MKV · max 100 MB · starts automatically</span>
          {filename && <span className={styles.uploadZone__filename}>{filename}</span>}
        </label>

        {(status || error) && (
          <p className={error ? styles.trialError : styles.trialStatus} role={error ? 'alert' : 'status'}>
            {isProcessing && <span className={styles.trialSpinner} aria-hidden="true" />}
            {error || status}
          </p>
        )}

        {result && (
          <section className={styles.resultSection} aria-label="Generated captions">
            <div className={styles.resultHeader}>
              <div>
                <h2>Caption files</h2>
                <p>{result.word_count} timed words · {result.language ?? 'language detected'} · {Math.round(result.duration_seconds)} sec</p>
              </div>
              <div className={styles.downloadActions}>
                <a className={styles.downloadActions__primary} href={result.download_url}>Download MP4</a>
                <button type="button" onClick={() => downloadText(result.srt, `${outputName}.srt`, 'application/x-subrip')}>Download SRT</button>
                <button type="button" onClick={() => downloadText(result.vtt, `${outputName}.vtt`, 'text/vtt')}>Download VTT</button>
                <button type="button" onClick={() => downloadText(result.ass, `${outputName}.ass`, 'text/plain')}>Styled ASS</button>
              </div>
            </div>
            <video className={styles.renderedVideo} controls preload="metadata" src={result.video_url} style={{ aspectRatio: `${result.video_width} / ${result.video_height}` }}>
              Your browser cannot play this video.
            </video>
            <div className={styles.captionPreview} aria-label="Timed word preview">
              {previewWords.map((word, index) => (
                <span key={`${word.start}-${index}`}>{word.text.trim()}</span>
              ))}
              {result.word_count > previewWords.length && <span aria-hidden="true">…</span>}
            </div>
            <p className={styles.formatNote}>The MP4 has the captions burned in. SRT/VTT are optional standard subtitle files; ASS preserves the selected font and karaoke word timing.</p>
          </section>
        )}
      </div>
    </main>
  )
}

export default Trial