import * as UPNG from "upng-js"

type PngEncoder = (
  images: ArrayBuffer[],
  width: number,
  height: number,
  colorCount: number,
  delays?: number[],
  forbidPalette?: boolean,
) => ArrayBuffer

const encodePng = UPNG.encode as PngEncoder

export const encodeRgbaToPng = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  colorCount = 0,
  forbidPalette = true,
) => {
  const expectedLength = width * height * 4
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    rgba.byteLength !== expectedLength ||
    !Number.isInteger(colorCount) ||
    colorCount < 0 ||
    colorCount > 4096 ||
    typeof forbidPalette !== "boolean"
  ) {
    throw new Error("PNG 编码数据无效")
  }

  const buffer = rgba.buffer.slice(
    rgba.byteOffset,
    rgba.byteOffset + rgba.byteLength,
  ) as ArrayBuffer
  return new Blob([encodePng([buffer], width, height, colorCount, undefined, forbidPalette)], {
    type: "image/png",
  })
}
