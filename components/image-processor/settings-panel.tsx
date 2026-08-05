import type {
  CompressionConfig,
  MarginConfig,
  ProcessingConfig,
} from "@/types"
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

export const SettingsPanel = ({
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
}: SettingsPanelProps) => (
    <aside className="settings-panel" aria-label="处理参数">
      <BackgroundSettings
        background={config.background}
        selectedColor={selectedColor}
        customColor={customColor}
        transparentBorder={config.transparentBorder}
        disabled={disabled}
        onEnabledChange={onBackgroundEnabled}
        onPresetColor={onPresetColor}
        onCustomColor={onCustomColor}
      />

      <ResolutionSettings
        resize={config.resize}
        disabled={disabled}
        onChange={onResizeValue}
      />

      <MarginSettings
        margin={config.margin}
        syncMargin={syncMargin}
        disabled={disabled}
        onEnabledChange={onMarginEnabled}
        onValueChange={onMarginValue}
        onToggleSync={onToggleMarginSync}
      />

      <TransparencySettings
        enabled={config.transparentBorder}
        disabled={disabled}
        onEnabledChange={onTransparentBorder}
      />

      <CompressionSettings
        compression={config.compression}
        disabled={disabled}
        onChange={onCompressionValue}
      />
    </aside>
)
