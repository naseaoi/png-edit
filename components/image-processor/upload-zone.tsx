"use client"

import { useRef, useState } from "react"
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

  const submitFiles = async (files: File[]) => {
    if (files.length > 0) await onFiles(files)
  }

  return (
    <section
      aria-label="导入图片"
      className={`upload-zone ${dragging ? "upload-zone-active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={async (event) => {
        event.preventDefault()
        setDragging(false)
        if (disabled) return

        try {
          await submitFiles(await getDroppedFiles(event.dataTransfer))
        } catch {
          onError("无法读取拖入的文件夹")
        }
      }}
    >
      <div className="upload-zone-icon" aria-hidden="true">
        <Upload />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-semibold text-slate-900">导入 PNG</h2>
        <p className="mt-1 text-sm text-slate-600">拖放图片或文件夹到此处</p>
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
        accept=".png,image/png"
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
        accept=".png,image/png"
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
