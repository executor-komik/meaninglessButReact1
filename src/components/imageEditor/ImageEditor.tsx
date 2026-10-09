import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import styles from './imageEditor.module.css'

type Point = { x: number; y: number }
type TemplateId = 'diagonal' | 'reverse' | 'plus' | 'x' | 'horizontal' | 'verticalBands' | 'slashBands' | 'backslashBands' | 'radial' | 'apex'
type BandAxis = 'vertical' | 'slash' | 'backslash'
type LoadedImage = { image: HTMLImageElement; name: string }
type SlicePreview = { index: number; blob: Blob; url: string }

const templates: { id: TemplateId; name: string; pieces: number; mark: string }[] = [
  { id: 'diagonal', name: 'Diagonal split', pieces: 2, mark: '╲' },
  { id: 'reverse', name: 'Reverse diagonal', pieces: 2, mark: '╱' },
  { id: 'plus', name: 'Plus / cross cut', pieces: 4, mark: '+' },
  { id: 'x', name: 'X cut', pieces: 4, mark: '×' },
  { id: 'horizontal', name: 'Horizontal bands', pieces: 3, mark: '☰' },
  { id: 'verticalBands', name: 'Vertical bands', pieces: 6, mark: '║' },
  { id: 'slashBands', name: 'Diagonal bands', pieces: 7, mark: '╱' },
  { id: 'backslashBands', name: 'Reverse diagonal bands', pieces: 7, mark: '╲' },
  { id: 'radial', name: 'Radial 8-piece', pieces: 8, mark: '✳' },
  { id: 'apex', name: 'Apex triangle', pieces: 3, mark: '△' },
]

const getBandProjection = (axis: BandAxis, width: number, height: number) => {
  if (axis === 'vertical') return { min: 0, max: width, value: (point: Point) => point.x }
  if (axis === 'slash') return { min: 0, max: width + height, value: (point: Point) => point.x + point.y }
  return { min: -height, max: width, value: (point: Point) => point.x - point.y }
}

const clipPolygon = (polygon: Point[], valueAt: (point: Point) => number, threshold: number, keepGreater: boolean): Point[] => {
  const clipped: Point[] = []
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    const startValue = valueAt(start)
    const endValue = valueAt(end)
    const startInside = keepGreater ? startValue >= threshold : startValue <= threshold
    const endInside = keepGreater ? endValue >= threshold : endValue <= threshold

    if (startInside && endInside) {
      clipped.push(end)
    } else if (startInside !== endInside) {
      const amount = (threshold - startValue) / (endValue - startValue)
      const intersection = {
        x: start.x + (end.x - start.x) * amount,
        y: start.y + (end.y - start.y) * amount,
      }
      clipped.push(intersection)
      if (endInside) clipped.push(end)
    }
  }
  return clipped
}

const getBandPolygons = (axis: BandAxis, width: number, height: number, pieceCount: number): Point[][] => {
  const { min, max, value } = getBandProjection(axis, width, height)
  const bounds: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]

  return Array.from({ length: pieceCount }, (_, index) => {
    const lower = min + ((max - min) * index) / pieceCount
    const upper = min + ((max - min) * (index + 1)) / pieceCount
    return clipPolygon(clipPolygon(bounds, value, lower, true), value, upper, false)
  })
}

const getBandLine = (axis: BandAxis, threshold: number, width: number, height: number): [Point, Point] => {
  const candidates = axis === 'vertical'
    ? [{ x: threshold, y: 0 }, { x: threshold, y: height }]
    : axis === 'slash'
      ? [{ x: threshold, y: 0 }, { x: width, y: threshold - width }, { x: threshold - height, y: height }, { x: 0, y: threshold }]
      : [{ x: threshold, y: 0 }, { x: width, y: width - threshold }, { x: threshold + height, y: height }, { x: 0, y: -threshold }]
  const intersections = candidates.filter((point) =>
    point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height,
  ).filter((point, index, points) =>
    points.findIndex((other) => Math.abs(other.x - point.x) < 0.0001 && Math.abs(other.y - point.y) < 0.0001) === index,
  )
  return [intersections[0], intersections[1]]
}

const getBandLines = (axis: BandAxis, width: number, height: number, pieceCount: number): [Point, Point][] => {
  const { min, max } = getBandProjection(axis, width, height)
  return Array.from({ length: pieceCount - 1 }, (_, index) =>
    getBandLine(axis, min + ((max - min) * (index + 1)) / pieceCount, width, height),
  )
}

const getPolygons = (template: TemplateId, width: number, height: number): Point[][] => {
  const center = { x: width / 2, y: height / 2 }
  const topCenter = { x: center.x, y: 0 }
  const bottomLeft = { x: 0, y: height }
  const bottomRight = { x: width, y: height }

  switch (template) {
    case 'diagonal':
      return [
        [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }],
        [{ x: 0, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
      ]
    case 'reverse':
      return [
        [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: 0, y: height }],
        [{ x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
      ]
    case 'plus':
      return [
        [{ x: 0, y: 0 }, { x: center.x, y: 0 }, { x: center.x, y: center.y }, { x: 0, y: center.y }],
        [{ x: center.x, y: 0 }, { x: width, y: 0 }, { x: width, y: center.y }, { x: center.x, y: center.y }],
        [{ x: center.x, y: center.y }, { x: width, y: center.y }, { x: width, y: height }, { x: center.x, y: height }],
        [{ x: 0, y: center.y }, { x: center.x, y: center.y }, { x: center.x, y: height }, { x: 0, y: height }],
      ]
    case 'x':
      return [
        [{ x: 0, y: 0 }, { x: width, y: 0 }, center],
        [{ x: width, y: 0 }, { x: width, y: height }, center],
        [{ x: width, y: height }, { x: 0, y: height }, center],
        [{ x: 0, y: height }, { x: 0, y: 0 }, center],
      ]
    case 'horizontal':
      return [
        [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height / 3 }, { x: 0, y: height / 3 }],
        [{ x: 0, y: height / 3 }, { x: width, y: height / 3 }, { x: width, y: (height * 2) / 3 }, { x: 0, y: (height * 2) / 3 }],
        [{ x: 0, y: (height * 2) / 3 }, { x: width, y: (height * 2) / 3 }, { x: width, y: height }, { x: 0, y: height }],
      ]
    case 'verticalBands':
      return getBandPolygons('vertical', width, height, 6)
    case 'slashBands':
      return getBandPolygons('slash', width, height, 7)
    case 'backslashBands':
      return getBandPolygons('backslash', width, height, 7)
    case 'radial': {
      const perimeter = [
        topCenter,
        { x: width, y: 0 },
        { x: width, y: center.y },
        bottomRight,
        { x: center.x, y: height },
        bottomLeft,
        { x: 0, y: center.y },
        { x: 0, y: 0 },
      ]
      return perimeter.map((point, index) => [center, point, perimeter[(index + 1) % perimeter.length]])
    }
    case 'apex':
      return [
        [{ x: 0, y: 0 }, topCenter, bottomLeft],
        [topCenter, { x: width, y: 0 }, bottomRight],
        [topCenter, bottomRight, bottomLeft],
      ]
  }
}

const getCutLines = (template: TemplateId, width: number, height: number): [Point, Point][] => {
  const center = { x: width / 2, y: height / 2 }

  switch (template) {
    case 'diagonal':
      return [[{ x: 0, y: 0 }, { x: width, y: height }]]
    case 'reverse':
      return [[{ x: width, y: 0 }, { x: 0, y: height }]]
    case 'plus':
      return [
        [{ x: width / 2, y: 0 }, { x: width / 2, y: height }],
        [{ x: 0, y: height / 2 }, { x: width, y: height / 2 }],
      ]
    case 'x':
      return [
        [{ x: 0, y: 0 }, { x: width, y: height }],
        [{ x: width, y: 0 }, { x: 0, y: height }],
      ]
    case 'horizontal':
      return [
        [{ x: 0, y: height / 3 }, { x: width, y: height / 3 }],
        [{ x: 0, y: (height * 2) / 3 }, { x: width, y: (height * 2) / 3 }],
      ]
    case 'verticalBands':
      return getBandLines('vertical', width, height, 6)
    case 'slashBands':
      return getBandLines('slash', width, height, 7)
    case 'backslashBands':
      return getBandLines('backslash', width, height, 7)
    case 'radial': {
      const endpoints = [
        { x: width / 2, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height / 2 },
        { x: width, y: height },
        { x: width / 2, y: height },
        { x: 0, y: height },
        { x: 0, y: height / 2 },
        { x: 0, y: 0 },
      ]
      return endpoints.map((point) => [center, point])
    }
    case 'apex':
      return [
        [{ x: width / 2, y: 0 }, { x: 0, y: height }],
        [{ x: width / 2, y: 0 }, { x: width, y: height }],
      ]
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not create a PNG slice.'))
    }, 'image/png')
  })

const getImageName = (fileName: string) => fileName.replace(/\.[^.]+$/, '') || 'image'

function ImageEditor({ onBack }: { onBack: () => void }) {
  const [source, setSource] = useState<LoadedImage | null>(null)
  const [template, setTemplate] = useState<TemplateId>('diagonal')
  const [slices, setSlices] = useState<SlicePreview[]>([])
  const [loadError, setLoadError] = useState('')
  const [sliceError, setSliceError] = useState('')
  const [exportStatus, setExportStatus] = useState('')
  const [isRendering, setIsRendering] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadSequence = useRef(0)

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const sequence = ++loadSequence.current
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    setLoadError('')
    setSliceError('')
    setExportStatus('')
    setSource(null)
    setSlices([])
    setIsRendering(false)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      if (sequence === loadSequence.current) {
        setIsRendering(true)
        setSource({ image, name: getImageName(file.name) })
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      if (sequence === loadSequence.current) setLoadError('This image could not be opened.')
    }
    image.src = objectUrl
  }

  const handleTemplateChange = (nextTemplate: TemplateId) => {
    if (nextTemplate === template) return
    setSlices([])
    setSliceError('')
    setExportStatus('')
    setIsRendering(Boolean(source))
    setTemplate(nextTemplate)
  }

  useEffect(() => {
    if (!source || !canvasRef.current) return

    const canvas = canvasRef.current
    const width = source.image.naturalWidth
    const height = source.image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) return

    canvas.width = width
    canvas.height = height
    context.clearRect(0, 0, width, height)
    context.drawImage(source.image, 0, 0, width, height)

    const lineWidth = Math.max(2, Math.min(width, height) * 0.003)
    for (const [start, end] of getCutLines(template, width, height)) {
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      context.lineWidth = lineWidth + 3
      context.lineCap = 'round'
      context.strokeStyle = 'rgba(6, 12, 20, .78)'
      context.setLineDash([])
      context.stroke()

      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      context.lineWidth = lineWidth
      context.strokeStyle = 'rgba(255, 255, 255, .92)'
      context.setLineDash([lineWidth * 5, lineWidth * 3])
      context.stroke()
    }
  }, [source, template])

  useEffect(() => {
    let disposed = false
    const previewUrls: string[] = []

    if (!source) return

    const renderSlices = async () => {
      try {
        const width = source.image.naturalWidth
        const height = source.image.naturalHeight
        const polygons = getPolygons(template, width, height)
        const blobs = await Promise.all(polygons.map(async (polygon) => {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('The browser could not prepare a slice canvas.')

          context.beginPath()
          context.moveTo(polygon[0].x, polygon[0].y)
          for (const point of polygon.slice(1)) context.lineTo(point.x, point.y)
          context.closePath()
          context.clip()
          context.drawImage(source.image, 0, 0, width, height)
          return canvasToBlob(canvas)
        }))

        if (disposed) return
        const previews = blobs.map((blob, index) => {
          const url = URL.createObjectURL(blob)
          previewUrls.push(url)
          return { index: index + 1, blob, url }
        })
        setSlices(previews)
        setIsRendering(false)
      } catch (error) {
        if (!disposed) {
          setSliceError(error instanceof Error ? error.message : 'The image slices could not be created.')
          setIsRendering(false)
        }
      }
    }

    void renderSlices()
    return () => {
      disposed = true
      for (const url of previewUrls) URL.revokeObjectURL(url)
    }
  }, [source, template])

  const saveSlice = (slice: SlicePreview) => {
    if (!source) return
    const url = URL.createObjectURL(slice.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${source.name}_slice_${String(slice.index).padStart(2, '0')}.png`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportAllSlices = () => {
    if (!slices.length) return
    slices.forEach((slice, index) => {
      window.setTimeout(() => saveSlice(slice), index * 180)
    })
    setExportStatus(`${slices.length} PNG downloads started.`)
  }

  return (
    <main className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.backButton} type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <p className={styles.kicker}>Canvas tools <span> / </span> 01</p>
        </div>
        <div className={styles.headerMain}>
          <div>
            <h1 className={styles.title}>Frame splitter</h1>
            <p className={styles.subtitle}>Cut a frame into aligned, transparent layers.</p>
          </div>
          <div className={styles.toolbar}>
            <label className={styles.uploadButton}>
              <span className={styles.uploadIcon} aria-hidden="true">↑</span>
              <span>{source ? 'Replace image' : 'Upload image'}</span>
              <input className={styles.fileInput} type="file" accept="image/*" onChange={handleImageChange} />
            </label>
            <button className={styles.exportButton} type="button" onClick={exportAllSlices} disabled={!source || !slices.length || isRendering}>
              <span aria-hidden="true">↓</span> Export All Slices
            </button>
          </div>
        </div>
        {source && (
          <div className={styles.imageMeta}>
            <span className={styles.statusDot} />
            <span>{source.name}</span>
            <span className={styles.metaDivider}>/</span>
            <span>{source.image.naturalWidth} × {source.image.naturalHeight} px</span>
          </div>
        )}
        {(loadError || sliceError || exportStatus) && (
          <p className={loadError || sliceError ? styles.errorMessage : styles.statusMessage} role="status">
            {loadError || sliceError || exportStatus}
          </p>
        )}
      </header>

      <section className={styles.templateSection} aria-labelledby="templates-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>01 / Template</p>
            <h2 id="templates-heading">Choose a cut</h2>
          </div>
          <span className={styles.sectionNote}>{templates.find((item) => item.id === template)?.pieces} aligned layers</span>
        </div>
        <div className={styles.templateGrid} role="group" aria-label="Slice templates">
          {templates.map((item, index) => (
            <button
              className={`${styles.templateButton} ${template === item.id ? styles.templateButtonActive : ''}`}
              type="button"
              key={item.id}
              aria-pressed={template === item.id}
              onClick={() => handleTemplateChange(item.id)}
            >
              <span className={styles.templateMark} aria-hidden="true">{item.mark}</span>
              <span className={styles.templateCopy}>
                <span className={styles.templateIndex}>{String(index + 1).padStart(2, '0')} · {item.pieces} pieces</span>
                <span className={styles.templateName}>{item.name}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.workspaceSection} aria-labelledby="workspace-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>02 / Workspace</p>
            <h2 id="workspace-heading">Cut guides</h2>
          </div>
          {source && <span className={styles.sectionNote}>Original pixels · {source.image.naturalWidth} × {source.image.naturalHeight}</span>}
        </div>
        <div className={styles.canvasStage}>
          {source ? (
            <canvas ref={canvasRef} className={styles.sourceCanvas} aria-label="Uploaded image with selected cut guides" />
          ) : (
            <div className={styles.emptyCanvas}>
              <span className={styles.emptyMark} aria-hidden="true">▧</span>
              <span>No image loaded</span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.previewSection} aria-labelledby="preview-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>03 / Output</p>
            <h2 id="preview-heading">Slice previews</h2>
          </div>
          <span className={styles.sectionNote}>{slices.length ? `${slices.length} layers · transparent PNG` : isRendering ? 'Preparing slices' : 'No slices yet'}</span>
        </div>
        {slices.length > 0 ? (
          <div className={styles.previewGrid}>
            {slices.map((slice) => (
              <article className={styles.previewItem} key={slice.index}>
                <div className={styles.previewFrame}>
                  <img className={styles.previewImage} src={slice.url} alt={`Slice ${slice.index} with transparent background`} />
                </div>
                <div className={styles.previewFooter}>
                  <span className={styles.sliceLabel}>Slice {String(slice.index).padStart(2, '0')}</span>
                  <button className={styles.downloadButton} type="button" onClick={() => saveSlice(slice)}>
                    <span aria-hidden="true">↓</span> Download PNG
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyPreview}>
            <span>{isRendering ? 'Rendering transparent layers…' : 'Preview area'}</span>
          </div>
        )}
      </section>
    </main>
  )
}

export default ImageEditor