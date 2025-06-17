"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, ImageIcon, Trash2, RefreshCw, X } from "lucide-react"
import JSZip from "jszip"

interface ProcessedImage {
  id: string
  originalFile: File
  originalUrl: string
  processedUrl: string | null
  processed: boolean
  processing: boolean
}

interface BackgroundColor {
  name: string
  value: string
  description: string
}

const PRESET_COLORS: BackgroundColor[] = [
  { name: "标准绿幕", value: "#00FF00", description: "经典绿幕" },
  { name: "影视绿幕", value: "#00B04F", description: "专业绿幕" },
  { name: "蓝幕背景", value: "#0000FF", description: "标准蓝幕" },
  { name: "天蓝背景", value: "#00BFFF", description: "天蓝色" },
  { name: "纯白背景", value: "#FFFFFF", description: "纯白色" },
  { name: "纯黑背景", value: "#000000", description: "纯黑色" },
]

export default function Component() {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedColor, setSelectedColor] = useState<string>("#00FF00")
  const [customColor, setCustomColor] = useState<string>("#00FF00")
  const [useCustomColor, setUseCustomColor] = useState<boolean>(false)

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
      }))

    setImages((prev) => [...prev, ...newImages])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files) {
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
          canvas.width = img.width
          canvas.height = img.height

          if (ctx) {
            ctx.fillStyle = useCustomColor ? customColor : selectedColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)

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
    [customColor, selectedColor, useCustomColor],
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
          prev.map((img) => (img.id === image.id ? { ...img, processedUrl, processed: true, processing: false } : img)),
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
  }, [images])

  const processedCount = images.filter((img) => img.processed).length
  const totalCount = images.length

  const currentColor = useCustomColor ? customColor : selectedColor
  const currentColorName = useCustomColor
    ? "自定义"
    : PRESET_COLORS.find((c) => c.value === selectedColor)?.name || "未知"

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">PNG 批量处理</h1>
          <p className="text-gray-600">添加背景色并转换为 JPG 格式</p>
        </div>

        {/* 上传区域 */}
        <div className="mb-8">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 group-hover:text-blue-500 mx-auto mb-4 transition-colors" />
            <p className="text-lg font-medium text-gray-700 mb-2">拖拽 PNG 图片到此处</p>
            <p className="text-sm text-gray-500">或点击选择文件，支持批量上传</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png"
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
          </div>
        </div>

        {/* 背景颜色选择 */}
        {images.length > 0 && (
          <div className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: currentColor }} />
                <div>
                  <h3 className="font-semibold text-gray-900">背景颜色</h3>
                  <p className="text-sm text-gray-500">
                    {currentColorName} · {currentColor.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* 预设颜色 */}
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

                  {/* 自定义颜色 */}
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
          </div>
        )}

        {/* 控制面板 */}
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

                  <Button onClick={clearAll} variant="outline" size="icon">
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

        {/* 图片网格 */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm border group hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="space-y-4">
                    {/* 图片预览 */}
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

                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {/* 文件信息 */}
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

        {/* 空状态 */}
        {images.length === 0 && (
          <div className="text-center py-16">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">还没有上传任何图片</p>
          </div>
        )}
      </div>
    </div>
  )
}
