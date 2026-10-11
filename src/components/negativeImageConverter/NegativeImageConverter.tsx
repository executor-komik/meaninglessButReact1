import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import styles from './negativeImageConverter.module.css'

type ImagePreview = {
  id: string
  name: string
  originalUrl: string
  negativeUrl: string
  outputName: string
  width: number
  height: number
}

const MAX_IMAGE_PIXELS = 40_000_000
const MAX_BATCH_PIXELS = 80_000_000
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const getOutputName = (fileName: string) => `${fileName.replace(/\.[^.]+$/, '') || 'image'}-negative.png`

function NegativeImageConverter({ onBack }: { onBack: () => void }) {
  const [images, setImages] = useState<ImagePreview[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDropTarget, setIsDropTarget] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef(new Set<string>())
  const loadSequence = useRef(0)

  useEffect(() => () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url)
  }, [])

  const processFiles = async (files: File[]) => {
    if (!files.length) return
    const sequence = ++loadSequence.current
    setErrorMessage('')
    setImages([])
    for (const url of objectUrls.current) URL.revokeObjectURL(url)
    objectUrls.current.clear()
    setIsProcessing(true)
    setProgress(`Preparing ${files.length} image${files.length === 1 ? '' : 's'}…`)

    const failures: string[] = []
    let processedPixels = 0
    let completed = 0

    for (const [index, file] of files.entries()) {
      if (sequence !== loadSequence.current) return
      let originalUrl = ''

      try {
        if (!SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error('unsupported file type')

        originalUrl = URL.createObjectURL(file)
        objectUrls.current.add(originalUrl)
        const image = new Image()
        image.src = originalUrl
        await image.decode()
        if (sequence !== loadSequence.current) return

        const width = image.naturalWidth
        const height = image.naturalHeight
        const pixelCount = width * height
        if (!width || !height) throw new Error('image has no usable dimensions')
        if (pixelCount > MAX_IMAGE_PIXELS) throw new Error('image exceeds 40 megapixels')
        if (processedPixels + pixelCount > MAX_BATCH_PIXELS) throw new Error('batch exceeds 80 megapixels')

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('canvas could not be prepared')

        context.drawImage(image, 0, 0, width, height)
        const pixels = context.getImageData(0, 0, width, height)
        for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
          pixels.data[pixel] = 255 - pixels.data[pixel]
          pixels.data[pixel + 1] = 255 - pixels.data[pixel + 1]
          pixels.data[pixel + 2] = 255 - pixels.data[pixel + 2]
        }
        context.putImageData(pixels, 0, 0)

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG could not be created')), 'image/png')
        })
        if (sequence !== loadSequence.current) return

        const negativeUrl = URL.createObjectURL(blob)
        objectUrls.current.add(negativeUrl)
        setImages((current) => [...current, {
          id: `${sequence}-${index}`,
          name: file.name,
          originalUrl,
          negativeUrl,
          outputName: getOutputName(file.name),
          width,
          height,
        }])
        processedPixels += pixelCount
      } catch (error) {
        if (originalUrl) {
          objectUrls.current.delete(originalUrl)
          URL.revokeObjectURL(originalUrl)
        }
        const reason = error instanceof Error ? error.message : 'could not be processed'
        failures.push(`${file.name}: ${reason}`)
      } finally {
        completed += 1
        if (sequence === loadSequence.current) {
          setProgress(`Processed ${completed} of ${files.length} images`)
        }
      }
    }

    if (sequence !== loadSequence.current) return
    if (failures.length) {
      const shownFailures = failures.slice(0, 3).join('; ')
      const remaining = failures.length > 3 ? `; and ${failures.length - 3} more files failed` : ''
      setErrorMessage(`${shownFailures}${remaining}`)
    }
    setIsProcessing(false)
    setProgress('')
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (files.length) void processFiles(files)
  }

  const handleFileDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDropTarget(false)
    const files = Array.from(event.dataTransfer.files)
    if (files.length) void processFiles(files)
  }

  const downloadAll = () => {
    images.forEach((image, index) => {
      window.setTimeout(() => {
        const link = document.createElement('a')
        link.href = image.negativeUrl
        link.download = image.outputName
        document.body.append(link)
        link.click()
        link.remove()
      }, index * 180)
    })
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <button className={styles.backButton} type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <p className={styles.eyebrow}>Image tools / 03</p>
          <h1 className={styles.title}>Negative space</h1>
          <p className={styles.subtitle}>Invert the colors. Keep the transparency.</p>
        </header>

        <section className={styles.workspace} aria-label="Image negative converter">
          <div
            className={`${styles.dropZone} ${isDropTarget ? styles.dropZoneActive : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDropTarget(true)
            }}
            onDragLeave={() => setIsDropTarget(false)}
            onDrop={handleFileDrop}
          >
            <div className={styles.dropCopy}>
              <span className={styles.uploadMark} aria-hidden="true">◩</span>
              <div>
                <p className={styles.dropTitle}>Drop an image here</p>
                <p className={styles.dropHint}>PNG, JPG, or WEBP · processed on your device</p>
              </div>
            </div>
            <label className={styles.uploadButton}>
              <span aria-hidden="true">↑</span> Add images
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileInput} />
            </label>
          </div>

          {isProcessing && (
            <div className={styles.progress} role="status">
              <span className={styles.spinner} aria-hidden="true" /> {progress}
            </div>
          )}
          {errorMessage && <p className={styles.errorMessage} role="alert">{errorMessage}</p>}

          {images.length > 0 && (
            <div className={styles.resultArea}>
              <div className={styles.resultHeading}>
                <div>
                  <p className={styles.resultKicker}>Batch results</p>
                  <h2>{images.length} image{images.length === 1 ? '' : 's'} ready</h2>
                </div>
                <button className={styles.downloadButton} type="button" onClick={downloadAll} disabled={isProcessing}>
                  <span aria-hidden="true">↓</span> Download All PNGs
                </button>
              </div>

              <div className={styles.imageBatch}>
                {images.map((image, index) => (
                  <section className={styles.imageResult} key={image.id} aria-label={`Image ${index + 1}: ${image.name}`}>
                    <div className={styles.imageResultHeader}>
                      <p className={styles.imageResultName} title={image.name}>
                        <span>{String(index + 1).padStart(2, '0')}</span> {image.name}
                        <span className={styles.imageDimensions}>{image.width} × {image.height} px</span>
                      </p>
                      <a className={styles.individualDownload} href={image.negativeUrl} download={image.outputName}>
                        <span aria-hidden="true">↓</span> Download PNG
                      </a>
                    </div>
                    <div className={styles.comparison}>
                      <figure className={styles.previewPanel}>
                        <figcaption><span>01</span> Original</figcaption>
                        <div className={styles.imageStage}>
                          <img src={image.originalUrl} alt={`Original image: ${image.name}`} />
                        </div>
                      </figure>
                      <figure className={styles.previewPanel}>
                        <figcaption><span>02</span> Inverted</figcaption>
                        <div className={styles.imageStage}>
                          <img src={image.negativeUrl} alt={`Color-inverted version of ${image.name}`} />
                        </div>
                      </figure>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && !isProcessing && (
            <div className={styles.emptyState}>
              <span className={styles.emptySymbol} aria-hidden="true">◐</span>
              <p>Original and inverted previews will appear here.</p>
            </div>
          )}
        </section>

        <footer className={styles.footer}>RGB channels inverted · alpha preserved · full resolution</footer>
      </div>
    </main>
  )
}

export default NegativeImageConverter