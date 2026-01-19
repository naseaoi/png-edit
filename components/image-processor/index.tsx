"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Upload, Download, ImageIcon, Trash2, RefreshCw, X, RotateCcw, Maximize2, Link2 } from "lucide-react"
import JSZip from "jszip"
import { type ProcessedImage, type BorderConfig } from "@/types"
import { PRESET_COLORS } from "@/constants/colors"

const DEFAULT_BORDER: BorderConfig = {
  enabled: false,
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
}

export default function ImageProcessor() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const [selectedColor, setSelectedColor] = useState<string>("#00FF00")
  const [customColor, setCustomColor] = useState<string>("#00FF00")
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false)

  const [borderConfig, setBorderConfig] = useState<BorderConfig>(DEFAULT_BORDER)
  const [syncBorder, setSyncBorder] = useState<boolean>(false)

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "")
    }
  }, [])

  const [deleteImageId, setDeleteImageId] = useState<string | null>(null)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)

  const handleFileSelect = useCallback((files: FileList) => {
    const newImages: ProcessedImage[] = Array.from(files)
      .filter((file) => file.type === "image/png")
      .map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        processedUrl: null,
        processed: false,
        processing: false,
        history: [],
      }))

    setImages((prev) => [...prev, ...newImages])
  }, [])

  const getAllFilesFromEntry = async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        ;(entry as FileSystemFileEntry).file(
          (f) => resolve(f),
          (err) => reject(err)
        )
      })
      return [file]
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader()
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        dirReader.readEntries(
          (results) => resolve(Array.from(results)),
          (err) => reject(err)
        )
      })
      const files = await Promise.all(entries.map(getAllFilesFromEntry))
      return files.flat()
    }
    return []
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      const items = Array.from(e.dataTransfer.items)
      const fileEntries: FileSystemEntry[] = []

      for (const item of items) {
        const entry = item.webkitGetAsEntry()
        if (entry) {
          fileEntries.push(entry)
        }
      }

      if (fileEntries.length > 0) {
        const allFiles = await Promise.all(fileEntries.map(getAllFilesFromEntry))
        const pngFiles = allFiles.flat().filter((file) => file.type === "image/png")
        if (pngFiles.length > 0) {
          const dataTransfer = new DataTransfer()
          pngFiles.forEach((file) => dataTransfer.items.add(file))
          handleFileSelect(dataTransfer.files)
        }
      } else if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const processImage = useCallback(
    async (image: ProcessedImage): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new Image()

        img.crossOrigin = "anonymous"
        img.onload = () => {
          const newWidth = img.width + borderConfig.left + borderConfig.right
          const newHeight = img.height + borderConfig.top + borderConfig.bottom

          canvas.width = newWidth
          canvas.height = newHeight

          if (ctx) {
            ctx.fillStyle = useCustomColor ? customColor : selectedColor
            ctx.fillRect(0, 0, newWidth, newHeight)
            ctx.drawImage(img, borderConfig.left, borderConfig.top)

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob)
                  resolve(url)
                } else {
                  reject(new Error("Failed to process image"))
                }
              },
              "image/jpeg",
              0.9,
            )
          } else {
            reject(new Error("Canvas context not available"))
          }
        }

        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = image.originalUrl
      })
    },
    [customColor, selectedColor, useCustomColor, borderConfig],
  )

  const processAllImages = useCallback(async () => {
    if (images.length === 0) return

    setProcessing(true)
    setProgress(0)

    const unprocessedImages = images.filter((img) => !img.processed)

    for (let i = 0; i < unprocessedImages.length; i++) {
      const image = unprocessedImages[i]

      setImages((prev) => prev.map((img) => (img.id === image.id ? { ...img, processing: true } : img)))

      try {
        const processedUrl = await processImage(image)

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  processedUrl,
                  processed: true,
                  processing: false,
                  history: [
                    ...img.history,
                    { processedUrl: img.processedUrl, processed: img.processed, timestamp: Date.now() },
                  ],
                }
              : img,
          ),
        )
      } catch (error) {
        console.error("Error processing image:", error)
        setImages((prev) => prev.map((img) => (img.id === image.id ? { ...img, processing: false } : img)))
      }

      setProgress(((i + 1) / unprocessedImages.length) * 100)
    }

    setProcessing(false)
  }, [images, processImage])

  const downloadImage = useCallback((image: ProcessedImage) => {
    if (!image.processedUrl) return

    const link = document.createElement("a")
    link.href = image.processedUrl
    link.download = `${image.originalFile.name.replace(".png", "")}_with_background.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const downloadAllImages = useCallback(async () => {
    const processedImages = images.filter((img) => img.processed && img.processedUrl)
    if (processedImages.length === 0) return

    const zip = new JSZip()

    for (const image of processedImages) {
      if (image.processedUrl) {
        const response = await fetch(image.processedUrl)
        const blob = await response.blob()
        const filename = `${image.originalFile.name.replace(".png", "")}_with_background.jpg`
        zip.file(filename, blob)
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(zipBlob)
    link.download = "processed_images.zip"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [images])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.originalUrl)
        if (imageToRemove.processedUrl) {
          URL.revokeObjectURL(imageToRemove.processedUrl)
        }
      }
      return prev.filter((img) => img.id !== id)
    })
    setDeleteImageId(null)
  }, [])

  const undoImage = useCallback((id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id && img.history.length > 0) {
          const lastState = img.history[img.history.length - 1]
          if (lastState.processedUrl && img.processedUrl) {
            URL.revokeObjectURL(img.processedUrl)
          }
          return {
            ...img,
            processedUrl: lastState.processedUrl,
            processed: lastState.processed,
            history: img.history.slice(0, -1),
          }
        }
        return img
      }),
    )
  }, [])

  const undoAllImages = useCallback(() => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.history.length > 0) {
          if (img.processedUrl) {
            URL.revokeObjectURL(img.processedUrl)
          }
          const lastState = img.history[img.history.length - 1]
          return {
            ...img,
            processedUrl: lastState.processedUrl,
            processed: lastState.processed,
            history: img.history.slice(0, -1),
          }
        }
        return img
      }),
    )
  }, [])

  const clearAll = useCallback(() => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.originalUrl)
      if (image.processedUrl) {
        URL.revokeObjectURL(image.processedUrl)
      }
    })
    setImages([])
    setProgress(0)
    setShowClearAllDialog(false)
  }, [images])

  const processedCount = images.filter((img) => img.processed).length
  const totalCount = images.length

  const currentColor = useCustomColor ? customColor : selectedColor
  const currentColorName = useCustomColor
    ? "自定义"
    : PRESET_COLORS.find((c) => c.value === selectedColor)?.name || "未知"

  const updateBorderValue = (field: keyof BorderConfig, value: number | boolean) => {
    setBorderConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSyncBorderChange = (value: number) => {
    setBorderConfig((prev) => ({
      ...prev,
      top: value,
      bottom: value,
      left: value,
      right: value,
    }))
  }

  const handleSyncBorderToggle = useCallback(() => {
    setBorderConfig((prev) => ({
      ...prev,
      top: prev.top,
      bottom: prev.top,
      left: prev.top,
      right: prev.top,
    }))
    setSyncBorder((prev) => !prev)
  }, [syncBorder])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">PNG 批量处理</h1>
          <p className="text-gray-600">添加背景色并转换为 JPG 格式</p>
        </div>

        <div className="mb-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mx-auto mb-4 transition-colors" />
            <p className="text-lg font-medium text-gray-700 mb-2">拖拽 PNG 图片或文件夹到此处</p>
            <p className="text-sm text-gray-500">或点击选择文件，支持批量上传</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              accept="image/png"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: currentColor }} />
                <div>
                  <h3 className="font-semibold text-gray-900">背景颜色</h3>
                  <p className="text-sm text-gray-500">
                    {currentColorName} · {currentColor.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="space-y-4 flex-1 flex flex-col justify-end">
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`group relative flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        !useCustomColor && selectedColor === color.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedColor(color.value)
                        setUseCustomColor(false)
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-xs font-medium mt-2 text-center">{color.name}</span>
                    </button>
                  ))}

                  <div className="relative">
                    <button
                      className={`group relative flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        useCustomColor ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setUseCustomColor(true)}
                    >
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: customColor }}
                      />
                      <span className="text-xs font-medium mt-2">自定义</span>
                    </button>
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value)
                        setUseCustomColor(true)
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`rounded-xl p-4 border transition-all flex flex-col ${
                borderConfig.enabled
                  ? "bg-white shadow-sm border"
                  : "bg-gray-50/50 border-dashed border-gray-300 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Maximize2 className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">透明边框</h3>
                    <p className="text-sm text-gray-500">为图片添加透明边框区域</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={syncBorder ? "default" : "outline"}
                          size="sm"
                          onClick={handleSyncBorderToggle}
                          className="gap-1"
                        >
                          <Link2 className={`w-4 h-4 ${syncBorder ? "text-white" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{syncBorder ? "关闭同步调整" : "同步调整四边"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Switch checked={borderConfig.enabled} onCheckedChange={(v) => updateBorderValue("enabled", v)} />
                  <Label className="text-sm">{borderConfig.enabled ? "已启用" : "已禁用"}</Label>
                </div>
              </div>

              <div className={`flex-1 flex flex-col ${borderConfig.enabled ? "" : "pointer-events-none opacity-50"}`}>
                <div className="min-h-[90px]">
                  {syncBorder ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs">统一边距</Label>
                          <span className="text-xs text-gray-500">{borderConfig.top}px</span>
                        </div>
                        <Slider
                          value={[borderConfig.top]}
                          onValueChange={(val) => handleSyncBorderChange(val[0])}
                          min={0}
                          max={500}
                          step={1}
                        />
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={500}
                        value={borderConfig.top}
                        onChange={(e) => handleSyncBorderChange(parseInt(e.target.value) || 0)}
                        placeholder="输入边距数值"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="border-top" className="text-xs">
                          上边距
                        </Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[borderConfig.top]}
                            onValueChange={(val) => updateBorderValue("top", val[0])}
                            min={0}
                            max={200}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            id="border-top"
                            type="number"
                            min="0"
                            max={500}
                            value={borderConfig.top}
                            onChange={(e) => updateBorderValue("top", parseInt(e.target.value) || 0)}
                            className="w-16"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="border-bottom" className="text-xs">
                          下边距
                        </Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[borderConfig.bottom]}
                            onValueChange={(val) => updateBorderValue("bottom", val[0])}
                            min={0}
                            max={200}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            id="border-bottom"
                            type="number"
                            min="0"
                            max={500}
                            value={borderConfig.bottom}
                            onChange={(e) => updateBorderValue("bottom", parseInt(e.target.value) || 0)}
                            className="w-16"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="border-left" className="text-xs">
                          左边距
                        </Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[borderConfig.left]}
                            onValueChange={(val) => updateBorderValue("left", val[0])}
                            min={0}
                            max={200}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            id="border-left"
                            type="number"
                            min="0"
                            max={500}
                            value={borderConfig.left}
                            onChange={(e) => updateBorderValue("left", parseInt(e.target.value) || 0)}
                            className="w-16"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="border-right" className="text-xs">
                          右边距
                        </Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[borderConfig.right]}
                            onValueChange={(val) => updateBorderValue("right", val[0])}
                            min={0}
                            max={200}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            id="border-right"
                            type="number"
                            min="0"
                            max={500}
                            value={borderConfig.right}
                            onChange={(e) => updateBorderValue("right", parseInt(e.target.value) || 0)}
                            className="w-16"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-gray-900">批量处理</h3>
                  <Badge variant="secondary" className="bg-gray-100">
                    {processedCount}/{totalCount}
                  </Badge>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={processAllImages}
                    disabled={processing || images.every((img) => img.processed)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {processing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        处理中
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        开始处理
                      </>
                    )}
                  </Button>

                  <Button onClick={downloadAllImages} disabled={processedCount === 0} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    下载全部
                  </Button>

                  <Button onClick={undoAllImages} disabled={processedCount === 0} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    撤销全部
                  </Button>

                  <Button onClick={() => setShowClearAllDialog(true)} variant="outline" size="icon">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>处理进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm border group hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
                        {image.processing ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                          </div>
                        ) : image.processedUrl ? (
                          <img
                            src={image.processedUrl || "/placeholder.svg"}
                            alt="Processed"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <img
                            src={image.originalUrl || "/placeholder.svg"}
                            alt="Original"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>

                      <div className="absolute top-2 right-2 flex gap-1">
                        {image.processed && image.history.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => undoImage(image.id)}
                                  className="h-7 px-3 bg-white hover:bg-gray-50 rounded-md flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-gray-200"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>撤销</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDeleteImageId(image.id)}
                                className="h-7 px-3 bg-white hover:bg-gray-50 rounded-md flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-gray-200"
                              >
                                <X className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>删除</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{image.originalFile.name}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{(image.originalFile.size / 1024).toFixed(1)} KB</span>
                        {image.processed && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            已完成
                          </Badge>
                        )}
                      </div>

                      {image.processed && (
                        <Button
                          size="sm"
                          onClick={() => downloadImage(image)}
                          className="w-full mt-3"
                          variant="outline"
                        >
                          <Download className="w-3 h-3 mr-2" />
                          下载
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">还没有上传任何图片</p>
          </div>
        )}

        <AlertDialog open={deleteImageId !== null} onOpenChange={() => setDeleteImageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除图片</AlertDialogTitle>
              <AlertDialogDescription>确定要删除这张图片吗？此操作无法撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteImageId && removeImage(deleteImageId)}
                className="bg-red-500 hover:bg-red-600"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showClearAllDialog} onOpenChange={() => setShowClearAllDialog(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>清空全部</AlertDialogTitle>
              <AlertDialogDescription>确定要删除所有图片吗？此操作无法撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={clearAll} className="bg-red-500 hover:bg-red-600">
                清空
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
