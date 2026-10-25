import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import styles from './panoramaStitcher.module.css'

type StitchImage = {
  id: number
  fileName: string
  url: string
  image: HTMLImageElement
  width: number
  height: number
}

type MergedImage = {
  url: string
  fileName: string
  width: number
  height: number
  scaled: boolean
}

const MAX_IMAGES = 100
const MAX_IMAGE_PIXELS = 120_000_000
const MAX_CANVAS_EDGE = 16_384
const MAX_CANVAS_PIXELS = 32_000_000
const IMAGE_GAP = 100
const IMAGE_BORDER = 10
const IMAGE_BORDER_COLOR = '#c65a5a'
const filenameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const compareFileNames = (left: string, right: string) => {
  const leftNumber = left.match(/\d+/)?.[0]
  const rightNumber = right.match(/\d+/)?.[0]

  if (leftNumber && rightNumber) {
    const numberDifference = BigInt(leftNumber) - BigInt(rightNumber)
    if (numberDifference < 0n) return -1
    if (numberDifference > 0n) return 1
  } else if (leftNumber) {
    return -1
  } else if (rightNumber) {
    return 1
  }

  return filenameCollator.compare(left, right)
}

const sortImages = (images: StitchImage[]) =>
  [...images].sort((left, right) => compareFileNames(left.fileName, right.fileName) || left.id - right.id)

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The merged image could not be created.')), 'image/png')
  })

function PanoramaStitcher({ onBack }: { onBack: () => void }) {
  const [images, setImages] = useState<StitchImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState('')
  const [isStitching, setIsStitching] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [mergedImage, setMergedImage] = useState<MergedImage | null>(null)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragId = useRef<number | null>(null)
  const nextId = useRef(0)
  const pendingLoads = useRef(0)
  const objectUrls = useRef(new Set<string>())
  const mergedUrls = useRef(new Set<string>())

  useEffect(() => () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url)
    for (const url of mergedUrls.current) URL.revokeObjectURL(url)
  }, [])

  const clearMergedImage = () => {
    for (const url of mergedUrls.current) URL.revokeObjectURL(url)
    mergedUrls.current.clear()
    setMergedImage(null)
  }

  const loadOneImage = async (file: File, id: number): Promise<StitchImage> => {
    if (!file.type.startsWith('image/')) throw new Error('not a supported image')

    const url = URL.createObjectURL(file)
    objectUrls.current.add(url)
    const image = new Image()
    image.src = url

    try {
      await image.decode()
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('image has no usable dimensions')
      if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error('image is too large to decode safely')
      return {
        id,
        fileName: file.name,
        url,
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }
    } catch (error) {
      objectUrls.current.delete(url)
      URL.revokeObjectURL(url)
      throw error
    }
  }

  const addFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList)
    if (!incoming.length) return

    const remainingSlots = Math.max(0, MAX_IMAGES - images.length)
    const files = incoming.slice(0, remainingSlots)
    const omittedCount = incoming.length - files.length
    if (!files.length) {
      setErrorMessage(`You can stitch up to ${MAX_IMAGES} images at a time.`)
      return
    }

    clearMergedImage()
    setErrorMessage('')
    setStatusMessage('')
    setIsLoading(true)
    setLoadProgress(`Loading 0 of ${files.length}`)
    pendingLoads.current += files.length
    let completed = 0
    const entries = files.map((file) => ({ file, id: nextId.current++ }))

    const results = await Promise.allSettled(entries.map(async ({ file, id }) => {
      try {
        return await loadOneImage(file, id)
      } finally {
        completed += 1
        setLoadProgress(`Loading ${completed} of ${files.length}`)
      }
    }))

    const loaded = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    const failures = results.flatMap((result, index) => result.status === 'rejected'
      ? [`${files[index].name}: ${result.reason instanceof Error ? result.reason.message : 'could not be opened'}`]
      : [])

    if (loaded.length) {
      setImages((current) => sortImages([...current, ...loaded]))
      setStatusMessage(`${loaded.length} image${loaded.length === 1 ? '' : 's'} ready, sorted by filename number.`)
    }
    if (failures.length || omittedCount) {
      const details = failures.slice(0, 3).join('; ')
      const omitted = failures.length > 3 ? `; and ${failures.length - 3} more failed` : ''
      const limit = omittedCount ? ` ${omittedCount} file${omittedCount === 1 ? '' : 's'} skipped at the ${MAX_IMAGES}-image limit.` : ''
      setErrorMessage(`${details}${omitted}${limit}`.trim())
    }

    pendingLoads.current -= files.length
    if (pendingLoads.current === 0) {
      setIsLoading(false)
      setLoadProgress('')
    }
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (selected.length) void addFiles(selected)
  }

  const handleFileDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setIsDropTarget(false)
    if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files)
  }

  const reorderImages = (fromId: number, toId: number) => {
    if (fromId === toId) return
    const fromIndex = images.findIndex((image) => image.id === fromId)
    const toIndex = images.findIndex((image) => image.id === toId)
    if (fromIndex < 0 || toIndex < 0) return

    const reordered = [...images]
    const [image] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, image)
    setImages(reordered)
    clearMergedImage()
    setStatusMessage('Image order updated. Stitch again to export the new sequence.')
  }

  const moveImage = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= images.length) return
    reorderImages(images[index].id, images[targetIndex].id)
  }

  const removeImage = (id: number) => {
    const image = images.find((item) => item.id === id)
    if (!image) return
    objectUrls.current.delete(image.url)
    URL.revokeObjectURL(image.url)
    setImages((current) => current.filter((item) => item.id !== id))
    clearMergedImage()
    setStatusMessage('Image removed. Stitch again to export the updated sequence.')
  }

  const stitchImages = async () => {
    if (!images.length || isStitching) return

    clearMergedImage()
    setErrorMessage('')
    setStatusMessage('')
    setIsStitching(true)

    try {
      const targetHeight = Math.max(...images.map((image) => image.height))
      const imageWidthAtTargetHeight = images.reduce((sum, image) => sum + (image.width / image.height) * targetHeight, 0)
      const unscaledWidth = imageWidthAtTargetHeight + images.length * IMAGE_BORDER * 2 + (images.length - 1) * IMAGE_GAP
      const unscaledHeight = targetHeight + IMAGE_BORDER * 2
      let scale = Math.min(
        1,
        MAX_CANVAS_EDGE / unscaledWidth,
        MAX_CANVAS_EDGE / unscaledHeight,
        Math.sqrt(MAX_CANVAS_PIXELS / (unscaledWidth * unscaledHeight)),
      )

      const getLayout = (layoutScale: number) => {
        const border = Math.max(1, Math.round(IMAGE_BORDER * layoutScale))
        const gap = Math.round(IMAGE_GAP * layoutScale)
        const canvasHeight = Math.max(1, Math.floor(targetHeight * layoutScale)) + border * 2
        const imageHeight = canvasHeight - border * 2
        const widths = images.map((image) => Math.max(1, Math.round((image.width / image.height) * imageHeight)))
        const canvasWidth = widths.reduce((sum, width) => sum + width, 0) + images.length * border * 2 + (images.length - 1) * gap
        return { border, gap, canvasHeight, imageHeight, widths, canvasWidth }
      }

      let layout = getLayout(scale)
      for (let attempt = 0; attempt < 4 && (
        layout.canvasWidth > MAX_CANVAS_EDGE ||
        layout.canvasHeight > MAX_CANVAS_EDGE ||
        layout.canvasWidth * layout.canvasHeight > MAX_CANVAS_PIXELS
      ); attempt += 1) {
        const correction = Math.min(
          MAX_CANVAS_EDGE / layout.canvasWidth,
          MAX_CANVAS_EDGE / layout.canvasHeight,
          Math.sqrt(MAX_CANVAS_PIXELS / (layout.canvasWidth * layout.canvasHeight)),
        )
        scale *= correction * 0.999
        layout = getLayout(scale)
      }

      const { border, gap, canvasHeight, imageHeight, widths, canvasWidth } = layout
      if (canvasWidth > MAX_CANVAS_EDGE || canvasHeight > MAX_CANVAS_EDGE || canvasWidth * canvasHeight > MAX_CANVAS_PIXELS) {
        throw new Error('This image sequence exceeds the safe canvas size. Remove some images and try again.')
      }

      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('The browser could not create a canvas for stitching.')

      let x = 0
      images.forEach((image, index) => {
        const framedWidth = widths[index] + border * 2
        context.fillStyle = IMAGE_BORDER_COLOR
        context.fillRect(x, 0, framedWidth, canvasHeight)
        context.drawImage(image.image, x + border, border, widths[index], imageHeight)
        x += framedWidth + (index < images.length - 1 ? gap : 0)
      })

      const blob = await canvasToBlob(canvas)
      const url = URL.createObjectURL(blob)
      mergedUrls.current.add(url)
      setMergedImage({
        url,
        fileName: 'panorama-stitched.png',
        width: canvasWidth,
        height: canvasHeight,
        scaled: scale < 1,
      })
      setStatusMessage(scale < 1
        ? 'The source was downscaled to stay within safe canvas limits.'
        : 'Stitch complete. Your transparent PNG is ready to download.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The images could not be stitched.')
    } finally {
      setIsStitching(false)
    }
  }

  const handleImageDragStart = (event: DragEvent<HTMLElement>, imageId: number) => {
    dragId.current = imageId
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(imageId))
  }

  const handleImageDrop = (event: DragEvent<HTMLElement>, targetId: number) => {
    event.preventDefault()
    event.stopPropagation()
    const fromId = dragId.current ?? Number(event.dataTransfer.getData('text/plain'))
    if (Number.isFinite(fromId)) reorderImages(fromId, targetId)
    dragId.current = null
  }

  const handleDropZoneDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    if (event.dataTransfer.types.includes('Files')) setIsDropTarget(true)
  }

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <div className={styles.brandGroup}>
            <button className={styles.backButton} type="button" onClick={onBack} aria-label="Back to ideas">←</button>
            <div>
              <p className={styles.eyebrow}>Canvas tools / 02</p>
              <h1 className={styles.title}>Panorama stitch</h1>
            </div>
          </div>
          <div className={styles.toolbarActions}>
            <label className={styles.uploadButton}>
              <span aria-hidden="true">＋</span> Add images
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileInput} />
            </label>
            <button className={styles.stitchButton} type="button" onClick={() => void stitchImages()} disabled={!images.length || isLoading || isStitching}>
              {isStitching ? <span className={styles.spinner} aria-hidden="true" /> : <span aria-hidden="true">▤</span>}
              {isStitching ? 'Stitching…' : 'Export / Stitch Image'}
            </button>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.intro}>
          <p className={styles.introLabel}>Sequence builder</p>
          <p className={styles.introText}>Arrange numbered frames into one continuous strip.</p>
        </section>

        <section className={styles.sequenceSection} aria-labelledby="sequence-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>01 / Sequence</p>
              <h2 id="sequence-heading">Image order</h2>
            </div>
            <div className={styles.sequenceMeta}>
              <span>{images.length} / {MAX_IMAGES} images</span>
              {images.length > 0 && (
                <button className={styles.clearButton} type="button" onClick={() => {
                  images.forEach((image) => {
                    objectUrls.current.delete(image.url)
                    URL.revokeObjectURL(image.url)
                  })
                  setImages([])
                  clearMergedImage()
                  setStatusMessage('Sequence cleared.')
                }}>Clear all</button>
              )}
            </div>
          </div>

          <div
            className={`${styles.sequenceViewport} ${isDropTarget ? styles.sequenceViewportActive : ''}`}
            onDragOver={handleDropZoneDragOver}
            onDragLeave={() => setIsDropTarget(false)}
            onDrop={handleFileDrop}
          >
            {images.length ? (
              <div className={styles.imageTrack}>
                {images.map((image, index) => (
                  <article
                    className={styles.imageCard}
                    key={image.id}
                    draggable
                    onDragStart={(event) => handleImageDragStart(event, image.id)}
                    onDragEnd={() => { dragId.current = null }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleImageDrop(event, image.id)}
                    aria-label={`Image ${index + 1}: ${image.fileName}`}
                  >
                    <div className={styles.imagePreview}>
                      <img src={image.url} alt={image.fileName} draggable={false} />
                      <span className={styles.sequenceBadge}>{String(index + 1).padStart(2, '0')}</span>
                      <button className={styles.removeButton} type="button" aria-label={`Remove ${image.fileName}`} onClick={() => removeImage(image.id)}>×</button>
                    </div>
                    <div className={styles.cardInfo}>
                      <span className={styles.imageName} title={image.fileName}>{image.fileName}</span>
                      <span className={styles.imageDimensions}>{image.width} × {image.height}</span>
                    </div>
                    <div className={styles.reorderControls}>
                      <button type="button" aria-label={`Move ${image.fileName} left`} onClick={() => moveImage(index, -1)} disabled={index === 0}>← Move left</button>
                      <button type="button" aria-label={`Move ${image.fileName} right`} onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>Move right →</button>
                    </div>
                  </article>
                ))}
                <button className={styles.addMore} type="button" onClick={() => fileInputRef.current?.click()} aria-label="Add more images">
                  <span aria-hidden="true">＋</span><span>Add frames</span>
                </button>
              </div>
            ) : (
              <button className={styles.emptyState} type="button" onClick={() => fileInputRef.current?.click()}>
                <span className={styles.emptyIcon} aria-hidden="true">▧</span>
                <span className={styles.emptyTitle}>Drop images to begin</span>
                <span className={styles.emptyHint}>or choose multiple image files</span>
              </button>
            )}
          </div>

          <div className={styles.sequenceFooter}>
            <span className={styles.dragHint}><span aria-hidden="true">⠿</span> Drag cards to reorder</span>
            <span className={styles.sequenceHint}>Numbers in filenames sort automatically</span>
          </div>

          {(isLoading || isStitching) && (
            <div className={styles.progressRow} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              <span>{isStitching ? 'Combining frames…' : loadProgress}</span>
            </div>
          )}
          {errorMessage && <p className={styles.errorMessage} role="alert">{errorMessage}</p>}
          {statusMessage && !errorMessage && <p className={styles.statusMessage} role="status">{statusMessage}</p>}
        </section>

        <section className={styles.outputSection} aria-labelledby="output-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>02 / Output</p>
              <h2 id="output-heading">Merged image</h2>
              <p className={styles.formatHint}>Transparent PNG · alpha-preserving output</p>
            </div>
            <div className={styles.outputActions}>
              <a className={styles.downloadButton} href={mergedImage?.url} download={mergedImage?.fileName} aria-disabled={!mergedImage} onClick={(event) => { if (!mergedImage) event.preventDefault() }}>
                <span aria-hidden="true">↓</span> Download Merged Image
              </a>
            </div>
          </div>

          {mergedImage ? (
            <div className={styles.mergedPanel}>
              <div className={styles.mergedImageFrame}>
                <img src={mergedImage.url} alt="Stitched panorama preview" />
              </div>
              <div className={styles.mergedMeta}>
                <span className={styles.readyDot} />
                <span>{mergedImage.fileName}</span>
                <span className={styles.metaSeparator}>·</span>
                <span>{mergedImage.width} × {mergedImage.height} px</span>
                {mergedImage.scaled && <span className={styles.scaledNote}>Scaled to fit canvas limits</span>}
              </div>
            </div>
          ) : (
            <div className={styles.outputEmpty}>
              <span>Stitched preview appears here</span>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default PanoramaStitcher