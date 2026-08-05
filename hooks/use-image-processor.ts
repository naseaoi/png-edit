"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import JSZip from "jszip"
import {
  getOutputFileName,
  getProcessingConfigKey,
  getUniqueFileName,
  processImage,
} from "@/lib/image-processing"
import { getFileKey, validateImageFiles } from "@/lib/image-validation"
import type {
  ProcessedImage,
  ProcessingConfig,
  ValidationIssue,
} from "@/types"

const revokeOutput = (image: ProcessedImage) => {
  if (image.output) URL.revokeObjectURL(image.output.url)
}

const revokeImage = (image: ProcessedImage) => {
  URL.revokeObjectURL(image.originalUrl)
  revokeOutput(image)
}

const triggerDownload = (url: string, fileName: string) => {
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export const useImageProcessor = (config: ProcessingConfig) => {
  const [images, setImages] = useState<ProcessedImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [operationError, setOperationError] = useState<string | null>(null)
  const imagesRef = useRef<ProcessedImage[]>([])
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const configKey = useMemo(() => getProcessingConfigKey(config), [config])
  const previousConfigKeyRef = useRef(configKey)

  const commitImages = useCallback((nextImages: ProcessedImage[]) => {
    imagesRef.current = nextImages
    setImages(nextImages)
  }, [])

  const updateImage = useCallback(
    (id: string, updater: (image: ProcessedImage) => ProcessedImage) => {
      commitImages(
        imagesRef.current.map((image) => (image.id === id ? updater(image) : image)),
      )
    },
    [commitImages],
  )

  useEffect(() => {
    if (previousConfigKeyRef.current === configKey) return

    const nextImages = imagesRef.current.map((image) => {
      revokeOutput(image)
      return {
        ...image,
        status: "pending" as const,
        output: null,
        error: null,
      }
    })
    commitImages(nextImages)
    setProgress({ completed: 0, total: 0 })
    previousConfigKeyRef.current = configKey
  }, [commitImages, configKey])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      abortControllerRef.current?.abort()
      imagesRef.current.forEach(revokeImage)
    }
  }, [])

  const addFiles = useCallback(
    async (files: File[]) => {
      setOperationError(null)
      const currentImages = imagesRef.current
      const result = await validateImageFiles(files, {
        existingCount: currentImages.length,
        existingBytes: currentImages.reduce(
          (total, image) => total + image.originalFile.size,
          0,
        ),
        existingKeys: new Set(currentImages.map((image) => getFileKey(image.originalFile))),
      })
      if (!mountedRef.current) return

      const newImages: ProcessedImage[] = result.accepted.map(({ file, width, height, mimeType }) => ({
        id: crypto.randomUUID(),
        originalFile: file,
        originalUrl: URL.createObjectURL(file),
        originalWidth: width,
        originalHeight: height,
        originalMimeType: mimeType,
        status: "pending",
        output: null,
        error: null,
      }))

      if (newImages.length > 0) {
        commitImages([...imagesRef.current, ...newImages])
      }
      setValidationIssues(result.issues)
    },
    [commitImages],
  )

  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const processAll = useCallback(async () => {
    const targets = imagesRef.current.filter((image) => image.status !== "done")
    if (targets.length === 0 || processing) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    setProcessing(true)
    setOperationError(null)
    setProgress({ completed: 0, total: targets.length })

    try {
      for (let index = 0; index < targets.length; index += 1) {
        if (controller.signal.aborted) break
        const target = targets[index]

        updateImage(target.id, (image) => ({
          ...image,
          status: "processing",
          error: null,
        }))

        try {
          const result = await processImage({
            sourceUrl: target.originalUrl,
            sourceMimeType: target.originalMimeType,
            config,
            signal: controller.signal,
          })
          if (controller.signal.aborted || !mountedRef.current) break

          const outputUrl = URL.createObjectURL(result.blob)
          updateImage(target.id, (image) => {
            revokeOutput(image)
            return {
              ...image,
              status: "done",
              output: {
                ...result,
                url: outputUrl,
                configKey,
              },
              error: null,
            }
          })
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            if (mountedRef.current) {
              updateImage(target.id, (image) => ({
                ...image,
                status: "pending",
                error: null,
              }))
            }
            break
          }

          const message = error instanceof Error ? error.message : "图片处理失败"
          if (mountedRef.current) {
            updateImage(target.id, (image) => ({
              ...image,
              status: "error",
              error: message,
            }))
          }
        }

        if (mountedRef.current) {
          setProgress({ completed: index + 1, total: targets.length })
        }
      }
    } finally {
      abortControllerRef.current = null
      if (mountedRef.current) setProcessing(false)
    }
  }, [config, configKey, processing, updateImage])

  const resetImage = useCallback(
    (id: string) => {
      if (processing) return
      updateImage(id, (image) => {
        revokeOutput(image)
        return { ...image, status: "pending", output: null, error: null }
      })
    },
    [processing, updateImage],
  )

  const resetAll = useCallback(() => {
    if (processing) return
    const nextImages = imagesRef.current.map((image) => {
      revokeOutput(image)
      return { ...image, status: "pending" as const, output: null, error: null }
    })
    commitImages(nextImages)
    setProgress({ completed: 0, total: 0 })
  }, [commitImages, processing])

  const removeImage = useCallback(
    (id: string) => {
      if (processing) return
      const image = imagesRef.current.find((item) => item.id === id)
      if (image) revokeImage(image)
      commitImages(imagesRef.current.filter((item) => item.id !== id))
    },
    [commitImages, processing],
  )

  const clearAll = useCallback(() => {
    abortControllerRef.current?.abort()
    imagesRef.current.forEach(revokeImage)
    commitImages([])
    setProgress({ completed: 0, total: 0 })
    setValidationIssues([])
    setOperationError(null)
  }, [commitImages])

  const downloadImage = useCallback(
    (image: ProcessedImage) => {
      if (!image.output) return
      triggerDownload(
        image.output.url,
        getOutputFileName(
          image.originalFile.name,
          config,
          image.originalMimeType,
        ),
      )
    },
    [config],
  )

  const downloadAll = useCallback(async () => {
    const completedImages = imagesRef.current.filter((image) => image.output)
    if (completedImages.length === 0 || downloading) return

    setDownloading(true)
    setOperationError(null)

    try {
      const zip = new JSZip()
      const usedNames = new Set<string>()

      completedImages.forEach((image) => {
        if (!image.output) return
        const fileName = getUniqueFileName(
          getOutputFileName(
            image.originalFile.name,
            config,
            image.originalMimeType,
          ),
          usedNames,
        )
        zip.file(fileName, image.output.blob)
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const zipUrl = URL.createObjectURL(zipBlob)
      triggerDownload(zipUrl, "image_batch_output.zip")
      window.setTimeout(() => URL.revokeObjectURL(zipUrl), 1_000)
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "打包下载失败")
    } finally {
      setDownloading(false)
    }
  }, [config, downloading])

  const clearMessages = useCallback(() => {
    setValidationIssues([])
    setOperationError(null)
  }, [])

  const reportOperationError = useCallback((message: string) => {
    setOperationError(message)
  }, [])

  const completedCount = images.filter((image) => image.status === "done").length
  const pendingCount = images.filter((image) => image.status !== "done").length

  return {
    images,
    processing,
    downloading,
    progress,
    validationIssues,
    operationError,
    completedCount,
    pendingCount,
    addFiles,
    processAll,
    cancelProcessing,
    resetImage,
    resetAll,
    removeImage,
    clearAll,
    downloadImage,
    downloadAll,
    clearMessages,
    reportOperationError,
  }
}
