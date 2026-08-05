const readDirectoryBatch = (reader: FileSystemDirectoryReader) =>
  new Promise<FileSystemEntry[]>((resolve, reject) => {
    reader.readEntries((entries) => resolve(Array.from(entries)), reject)
  })

const readDirectoryEntries = async (entry: FileSystemDirectoryEntry) => {
  const reader = entry.createReader()
  const entries: FileSystemEntry[] = []

  while (true) {
    const batch = await readDirectoryBatch(reader)
    if (batch.length === 0) break
    entries.push(...batch)
  }

  return entries
}

export const collectFilesFromEntry = async (
  entry: FileSystemEntry,
  state: TraversalState = { files: 0 },
  depth = 0,
): Promise<File[]> => {
  if (depth > IMAGE_LIMITS.maxDirectoryDepth) {
    throw new Error("文件夹层级超过处理上限")
  }

  if (entry.isFile) {
    state.files += 1
    if (state.files > IMAGE_LIMITS.maxDiscoveredFiles) {
      throw new Error(`一次最多读取 ${IMAGE_LIMITS.maxDiscoveredFiles} 个文件`)
    }
    return [
      await new Promise<File>((resolve, reject) => {
        ;(entry as FileSystemFileEntry).file(resolve, reject)
      }),
    ]
  }

  if (entry.isDirectory) {
    const entries = await readDirectoryEntries(entry as FileSystemDirectoryEntry)
    const nestedFiles: File[] = []
    for (const childEntry of entries) {
      nestedFiles.push(...(await collectFilesFromEntry(childEntry, state, depth + 1)))
    }
    return nestedFiles
  }

  return []
}

export const getDroppedFiles = async (dataTransfer: DataTransfer) => {
  const items = Array.from(dataTransfer.items)
  const files: File[] = []
  const state: TraversalState = { files: 0 }

  for (const item of items) {
    if (item.kind !== "file") continue

    const fallbackFile = item.getAsFile()
    let entry: FileSystemEntry | null = null

    try {
      entry = item.webkitGetAsEntry?.() ?? null
    } catch {
      if (fallbackFile) files.push(fallbackFile)
      continue
    }

    if (!entry) {
      if (fallbackFile) files.push(fallbackFile)
      continue
    }

    try {
      files.push(...(await collectFilesFromEntry(entry, state)))
    } catch (error) {
      if (!entry.isFile || !fallbackFile) throw error
      files.push(fallbackFile)
    }
  }

  return files.length > 0 ? files : Array.from(dataTransfer.files)
}
import { IMAGE_LIMITS } from "@/constants/limits"

interface TraversalState {
  files: number
}
