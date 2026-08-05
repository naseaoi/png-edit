import { describe, expect, it } from "vitest"
import { collectFilesFromEntry, getDroppedFiles } from "@/lib/file-system"

const createFileEntry = (
  file: File,
  error?: Error,
) =>
  ({
    isFile: true,
    isDirectory: false,
    file: (resolve: (value: File) => void, reject: (reason: Error) => void) =>
      error ? reject(error) : resolve(file),
  }) as FileSystemFileEntry

const createDataTransfer = (
  items: Partial<DataTransferItem>[],
  files: File[] = [],
) =>
  ({ items, files }) as unknown as DataTransfer

describe("collectFilesFromEntry", () => {
  it("reads every directory batch until empty", async () => {
    const first = new File(["a"], "a.png")
    const second = new File(["b"], "b.png")
    const batches = [[createFileEntry(first)], [createFileEntry(second)], []]
    const directory = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (resolve: (value: FileSystemEntry[]) => void) =>
          resolve(batches.shift() ?? []),
      }),
    } as FileSystemDirectoryEntry

    await expect(collectFilesFromEntry(directory)).resolves.toEqual([first, second])
  })
})

describe("getDroppedFiles", () => {
  it("falls back to the FileList when drag items are unavailable", async () => {
    const file = new File(["png"], "fallback.png")

    await expect(getDroppedFiles(createDataTransfer([], [file]))).resolves.toEqual([file])
  })

  it("keeps files whose entry API is unavailable in a mixed drop", async () => {
    const entryFile = new File(["a"], "entry.png")
    const directFile = new File(["b"], "direct.png")
    const dataTransfer = createDataTransfer([
      {
        kind: "file",
        getAsFile: () => entryFile,
        webkitGetAsEntry: () => createFileEntry(entryFile),
      },
      {
        kind: "file",
        getAsFile: () => directFile,
        webkitGetAsEntry: () => null,
      },
    ])

    await expect(getDroppedFiles(dataTransfer)).resolves.toEqual([entryFile, directFile])
  })

  it("adds files from the FileList when drag items expose only the first file", async () => {
    const firstFile = new File(["a"], "first.png")
    const secondFile = new File(["b"], "second.png")
    const dataTransfer = createDataTransfer(
      [
        {
          kind: "file",
          getAsFile: () => firstFile,
          webkitGetAsEntry: () => createFileEntry(firstFile),
        },
      ],
      [firstFile, secondFile],
    )

    await expect(getDroppedFiles(dataTransfer)).resolves.toEqual([firstFile, secondFile])
  })

  it("snapshots all drag sources before reading the first file", async () => {
    const firstFile = new File(["a"], "first.png")
    const secondFile = new File(["b"], "second.png")
    let fileListAvailable = true
    const firstEntry = {
      isFile: true,
      isDirectory: false,
      file: (resolve: (value: File) => void) => {
        fileListAvailable = false
        resolve(firstFile)
      },
    } as FileSystemFileEntry
    const dataTransfer = {
      items: [
        {
          kind: "file",
          getAsFile: () => firstFile,
          webkitGetAsEntry: () => firstEntry,
        },
        {
          kind: "file",
          getAsFile: () => (fileListAvailable ? secondFile : null),
          webkitGetAsEntry: () => (fileListAvailable ? createFileEntry(secondFile) : null),
        },
      ],
      get files() {
        return fileListAvailable ? [firstFile, secondFile] : []
      },
    } as unknown as DataTransfer

    await expect(getDroppedFiles(dataTransfer)).resolves.toEqual([firstFile, secondFile])
  })

  it("uses the direct file when a file entry cannot be read", async () => {
    const file = new File(["png"], "unreadable-entry.png")
    const dataTransfer = createDataTransfer([
      {
        kind: "file",
        getAsFile: () => file,
        webkitGetAsEntry: () => createFileEntry(file, new Error("entry failed")),
      },
    ])

    await expect(getDroppedFiles(dataTransfer)).resolves.toEqual([file])
  })
})
