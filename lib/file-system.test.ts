import { describe, expect, it } from "vitest"
import { collectFilesFromEntry } from "@/lib/file-system"

describe("collectFilesFromEntry", () => {
  it("reads every directory batch until empty", async () => {
    const first = new File(["a"], "a.png")
    const second = new File(["b"], "b.png")
    const fileEntry = (file: File) =>
      ({
        isFile: true,
        isDirectory: false,
        file: (resolve: (value: File) => void) => resolve(file),
      }) as FileSystemFileEntry
    const batches = [[fileEntry(first)], [fileEntry(second)], []]
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
