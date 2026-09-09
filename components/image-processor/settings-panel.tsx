import { useState } from "react"
import type { ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { insertModule, moveModuleOrder } from "@/lib/module-order"
import type { CompressionConfig, MarginConfig, ProcessingConfig, ProcessingModule } from "@/types"
import { BackgroundSettings } from "./background-settings"
import { CompressionSettings } from "./compression-settings"
import { MarginSettings } from "./margin-settings"
import { ResolutionSettings } from "./resolution-settings"
import { TransparencySettings } from "./transparency-settings"

type MarginField = Exclude<keyof MarginConfig, "enabled">

interface SettingsPanelProps {
  config: ProcessingConfig
  selectedColor: string | null
  customColor: string
  syncMargin: boolean
  disabled: boolean
  moduleOrder: ProcessingModule[]
  onModuleOrder: (order: ProcessingModule[]) => void
  onBackgroundEnabled: (enabled: boolean) => void
  onPresetColor: (color: string) => void
  onCustomColor: (color: string) => void
  onMarginEnabled: (enabled: boolean) => void
  onMarginValue: (field: MarginField, value: number) => void
  onTransparentBorder: (enabled: boolean) => void
  onToggleMarginSync: () => void
  onResizeValue: <K extends keyof ProcessingConfig["resize"]>(
    field: K,
    value: ProcessingConfig["resize"][K],
  ) => void
  onCompressionValue: <K extends keyof CompressionConfig>(
    field: K,
    value: CompressionConfig[K],
  ) => void
}

interface ModuleRendererProps {
  module: ProcessingModule
  panel: Omit<SettingsPanelProps, "moduleOrder" | "onModuleOrder" | "config"> & {
    config: ProcessingConfig
  }
}

const renderModule = ({ module, panel }: ModuleRendererProps): ReactNode => {
  switch (module) {
    case "background":
      return (
        <BackgroundSettings
          background={panel.config.background}
          selectedColor={panel.selectedColor}
          customColor={panel.customColor}
          transparentBorder={panel.config.transparentBorder}
          disabled={panel.disabled}
          onEnabledChange={panel.onBackgroundEnabled}
          onPresetColor={panel.onPresetColor}
          onCustomColor={panel.onCustomColor}
        />
      )
    case "resize":
      return (
        <ResolutionSettings
          resize={panel.config.resize}
          disabled={panel.disabled}
          onChange={panel.onResizeValue}
        />
      )
    case "margin":
      return (
        <MarginSettings
          margin={panel.config.margin}
          syncMargin={panel.syncMargin}
          disabled={panel.disabled}
          onEnabledChange={panel.onMarginEnabled}
          onValueChange={panel.onMarginValue}
          onToggleSync={panel.onToggleMarginSync}
        />
      )
    case "transparency":
      return (
        <TransparencySettings
          enabled={panel.config.transparentBorder}
          disabled={panel.disabled}
          onEnabledChange={panel.onTransparentBorder}
        />
      )
    case "compression":
      return (
        <CompressionSettings
          compression={panel.config.compression}
          disabled={panel.disabled}
          onChange={panel.onCompressionValue}
        />
      )
  }
}

interface DraggableSectionProps {
  module: ProcessingModule
  title: string
  index: number
  total: number
  dragging: ProcessingModule | null
  dropPosition: DropPosition | null
  onDragStart: (module: ProcessingModule) => void
  onDragOver: (module: ProcessingModule, position: DropPosition) => void
  onDrop: () => void
  onDragEnd: () => void
  onKeyboardMove: (module: ProcessingModule, offset: -1 | 1) => void
  children: ReactNode
}

type DropPosition = "before" | "after"

const getDropPosition = (clientY: number, element: HTMLElement): DropPosition =>
  clientY < element.getBoundingClientRect().top + element.offsetHeight / 2
    ? "before"
    : "after"

const INTERACTIVE_SELECTOR =
  "button, input, select, textarea, a, [role='switch'], [role='slider']"

const shouldCancelSectionDrag = (target: EventTarget | null) => {
  const element = target instanceof HTMLElement ? target : null
  if (!element) return false
  if (element.closest(".drag-handle")) return false
  return Boolean(element.closest(INTERACTIVE_SELECTOR))
}

const DraggableSection = ({
  module,
  title,
  index,
  total,
  dragging,
  dropPosition,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onKeyboardMove,
  children,
}: DraggableSectionProps) => (
  <div
    className="settings-draggable"
    data-dragging={dragging === module}
    data-drop-before={dropPosition === "before" && dragging !== module}
    data-drop-after={dropPosition === "after" && dragging !== module}
    draggable
    onDragStart={(event) => {
      if (shouldCancelSectionDrag(event.target)) {
        event.preventDefault()
        return
      }
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", module)
      onDragStart(module)
    }}
    onDragOver={(event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      onDragOver(module, getDropPosition(event.clientY, event.currentTarget))
    }}
    onDrop={(event) => {
      event.preventDefault()
      onDrop()
    }}
    onDragEnd={onDragEnd}
  >
    <button
      type="button"
      className="drag-handle"
      aria-label={`拖拽调整“${title}”的顺序`}
      title={`拖拽或用方向键调整“${title}”的顺序`}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault()
          onKeyboardMove(module, -1)
        } else if (event.key === "ArrowDown") {
          event.preventDefault()
          onKeyboardMove(module, 1)
        }
      }}
    >
      <GripVertical className="size-4" aria-hidden="true" />
      <span className="sr-only">
        {index + 1} / {total}
      </span>
    </button>
    {children}
  </div>
)

export const SettingsPanel = ({
  config,
  selectedColor,
  customColor,
  syncMargin,
  disabled,
  moduleOrder,
  onModuleOrder,
  onBackgroundEnabled,
  onPresetColor,
  onCustomColor,
  onMarginEnabled,
  onMarginValue,
  onTransparentBorder,
  onToggleMarginSync,
  onResizeValue,
  onCompressionValue,
}: SettingsPanelProps) => {
  const [dragging, setDragging] = useState<ProcessingModule | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    module: ProcessingModule
    position: DropPosition
  } | null>(null)

  const commitDrop = () => {
    if (dragging && dropTarget && dragging !== dropTarget.module) {
      onModuleOrder(
        insertModule(moduleOrder, dragging, dropTarget.module, dropTarget.position),
      )
    }
    setDragging(null)
    setDropTarget(null)
  }

  const panel = {
    config,
    selectedColor,
    customColor,
    syncMargin,
    disabled,
    onBackgroundEnabled,
    onPresetColor,
    onCustomColor,
    onMarginEnabled,
    onMarginValue,
    onTransparentBorder,
    onToggleMarginSync,
    onResizeValue,
    onCompressionValue,
  }

  return (
    <aside className="settings-panel" aria-label="处理参数">
      {moduleOrder.map((module, index) => (
        <DraggableSection
          key={module}
          module={module}
          title={MODULE_TITLES[module]}
          index={index}
          total={moduleOrder.length}
          dragging={dragging}
          dropPosition={dropTarget?.module === module ? dropTarget.position : null}
          onDragStart={setDragging}
          onDragOver={(target, position) =>
            setDropTarget({ module: target, position })
          }
          onDrop={commitDrop}
          onDragEnd={() => {
            setDragging(null)
            setDropTarget(null)
          }}
          onKeyboardMove={(module, offset) =>
            onModuleOrder(moveModuleOrder(moduleOrder, module, offset))
          }
        >
          {renderModule({ module, panel })}
        </DraggableSection>
      ))}
    </aside>
  )
}

const MODULE_TITLES: Record<ProcessingModule, string> = {
  background: "背景颜色",
  resize: "输出尺寸",
  margin: "边距",
  transparency: "保留透明",
  compression: "图片压缩",
}
