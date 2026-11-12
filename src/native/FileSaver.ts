import { Capacitor, registerPlugin } from '@capacitor/core'

type SaveFileResult = { sessionId?: string; saved?: boolean }

type FileSaverPlugin = {
  createFile(options: { fileName: string; mimeType: string }): Promise<SaveFileResult>
  writeChunk(options: { sessionId: string; data: string }): Promise<void>
  finishFile(options: { sessionId: string }): Promise<void>
  cancelFile(options: { sessionId: string }): Promise<void>
}

const NativeFileSaver = registerPlugin<FileSaverPlugin>('FileSaver')
const CHUNK_SIZE = 256 * 1024

const readAsBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The file data could not be read.'))
        return
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('The file data could not be read.'))
    reader.readAsDataURL(blob)
  })

const downloadInBrowser = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function saveFile(blob: Blob, fileName: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(blob, fileName)
    return true
  }

  const { sessionId, saved } = await NativeFileSaver.createFile({
    fileName,
    mimeType: blob.type || 'application/octet-stream',
  })
  if (saved === false) return false
  if (!sessionId) throw new Error('The save operation could not be started.')

  try {
    for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
      const data = await readAsBase64(blob.slice(offset, offset + CHUNK_SIZE))
      await NativeFileSaver.writeChunk({ sessionId, data })
    }
    await NativeFileSaver.finishFile({ sessionId })
    return true
  } catch (error) {
    await NativeFileSaver.cancelFile({ sessionId })
    throw error
  }
}
