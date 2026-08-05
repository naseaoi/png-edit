"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FolderOpen, ImagePlus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDroppedFiles } from "@/lib/file-system"

interface UploadZoneProps {
  disabled: boolean
  onFiles: (files: File[]) => Promise<void>
  onError: (message: string) => void
}

export const UploadZone = ({ disabled, onFiles, onError }: UploadZoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const submitFiles = useCallback(async (files: File[]) => {
    if (files.length > 0) await onFiles(files)
  }, [onFiles])

  const importDroppedFiles = useCallback(
    async (dataTransfer: DataTransfer) => {
      try {
        await submitFiles(await getDroppedFiles(dataTransfer))
      } catch (error) {
        onError(error instanceof Error ? error.message : "无法读取拖入的文件或文件夹")
      }
    },
    [onError, submitFiles],
  )

  useEffect(() => {
    let dragDepth = 0

    const isFileDrag = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files")
    const resetDragState = () => {
      dragDepth = 0
      setDragging(false)
    }
    const handleDragEnter = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      dragDepth += 1
      if (!disabled) setDragging(true)
    }
    const handleDragOver = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? "none" : "copy"
    }
    const handleDragLeave = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) setDragging(false)
    }
    const handleDrop = (event: DragEvent) => {
      if (!isFileDrag(event)) return
      event.preventDefault()
      resetDragState()
      if (!disabled && event.dataTransfer) void importDroppedFiles(event.dataTransfer)
    }

    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("dragleave", handleDragLeave)
    window.addEventListener("drop", handleDrop)
    window.addEventListener("dragend", resetDragState)
    window.addEventListener("blur", resetDragState)

    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("dragleave", handleDragLeave)
      window.removeEventListener("drop", handleDrop)
      window.removeEventListener("dragend", resetDragState)
      window.removeEventListener("blur", resetDragState)
    }
  }, [disabled, importDroppedFiles])

  return (
    <section
      aria-label="导入图片"
      className={`upload-zone ${dragging ? "upload-zone-active" : ""}`}
    >
      <div className="upload-zone-icon" aria-hidden="true">
        <Upload />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-semibold text-neutral-950">导入图片</h2>
        <p className="mt-1 text-sm text-neutral-600">支持 PNG、JPG、WebP，或拖放文件夹</p>
      </div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => folderInputRef.current?.click()}
        >
          <FolderOpen />
          选择文件夹
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus />
          选择图片
        </Button>
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        onChange={async (event) => {
          const input = event.currentTarget
          const files = Array.from(input.files ?? [])
          input.value = ""
          await submitFiles(files)
        }}
      />
      <input
        ref={folderInputRef}
        className="hidden"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        aria-hidden="true"
        tabIndex={-1}
        {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={async (event) => {
          const input = event.currentTarget
          const files = Array.from(input.files ?? [])
          input.value = ""
          await submitFiles(files)
        }}
      />
    </section>
  )
}
