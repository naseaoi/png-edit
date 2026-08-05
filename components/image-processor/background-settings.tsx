import { Palette } from "lucide-react"
import { PRESET_COLORS } from "@/constants/colors"
import type { BackgroundConfig } from "@/types"
import { SettingSection } from "./setting-section"

interface BackgroundSettingsProps {
  background: BackgroundConfig
  selectedColor: string | null
  customColor: string
  transparentBorder: boolean
  disabled: boolean
  onEnabledChange: (enabled: boolean) => void
  onPresetColor: (color: string) => void
  onCustomColor: (color: string) => void
}

export const BackgroundSettings = ({
  background,
  selectedColor,
  customColor,
  transparentBorder,
  disabled,
  onEnabledChange,
  onPresetColor,
  onCustomColor,
}: BackgroundSettingsProps) => (
  <SettingSection
    id="background-enabled"
    title="背景颜色"
    description={
      transparentBorder ? "保留透明时不应用" : background.color.toUpperCase()
    }
    icon={<Palette className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    enabled={background.enabled}
    disabled={disabled}
    onEnabledChange={onEnabledChange}
  >
    <div className="color-grid" aria-label="预设背景颜色">
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          className="color-swatch"
          aria-label={color.name}
          aria-pressed={selectedColor === color.value}
          disabled={disabled}
          onClick={() => onPresetColor(color.value)}
        >
          <span style={{ backgroundColor: color.value }} />
          <small>{color.name.replace("背景", "").replace("绿幕", "绿")}</small>
        </button>
      ))}
      <label
        className="color-swatch"
        data-active={selectedColor === null}
        aria-label="自定义背景色"
        aria-disabled={disabled}
      >
        <span style={{ backgroundColor: customColor }} />
        <small>自定义</small>
        <input
          type="color"
          value={customColor}
          disabled={disabled}
          onChange={(event) => onCustomColor(event.currentTarget.value)}
        />
      </label>
    </div>
  </SettingSection>
)
