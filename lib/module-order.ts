import type { ProcessingModule } from "@/types"

export const moveModuleOrder = (
  order: ProcessingModule[],
  module: ProcessingModule,
  offset: -1 | 1,
): ProcessingModule[] => {
  const from = order.indexOf(module)
  if (from === -1) return order
  const to = from + offset
  if (to < 0 || to >= order.length) return order
  const next = [...order]
  next.splice(from, 1)
  next.splice(to, 0, module)
  return next
}

export const insertModule = (
  order: ProcessingModule[],
  module: ProcessingModule,
  targetModule: ProcessingModule,
  position: "before" | "after",
): ProcessingModule[] => {
  const from = order.indexOf(module)
  const to = order.indexOf(targetModule)
  if (from === -1 || to === -1 || from === to) return order
  const next = order.filter((item) => item !== module)
  const targetIndex = next.indexOf(targetModule)
  next.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, module)
  return next
}
