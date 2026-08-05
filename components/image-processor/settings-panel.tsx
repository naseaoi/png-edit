import { Link2, Unlink2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PRESET_COLORS } from "@/constants/colors"
import type { BorderConfig, ProcessingConfig } from "@/types"

type BorderField = keyof Omit<BorderConfig, "enabled">

interface SettingsPanelProps {
  config: ProcessingConfig
  selectedColor: string | null
  customColor: string
  syncBorder: boolean
  disabled: boolean
  onPresetColor: (color: string) => void
  onCustomColor: (color: string) => void
  onBorderEnabled: (enabled: boolean) => void
  onBorderValue: (field: BorderField, value: number) => void
  onToggleBorderSync: () => void
  onJpegQuality: (quality: number) => void
}

const BORDER_FIELDS: Array<{ field: BorderField; label: string }> = [
  { field: "top", label: "上" },
  { field: "right", label: "右" },
  { field: "bottom", label: "下" },
  { field: "left", label: "左" },
]

export const SettingsPanel = ({
  config,
  selectedColor,
  customColor,
  syncBorder,
  disabled,
  onPresetColor,
  onCustomColor,
  onBorderEnabled,
  onBorderValue,
  onToggleBorderSync,
  onJpegQuality,
}: SettingsPanelProps) => (
  <aside className="settings-panel" aria-label="处理参数">
    <div className="settings-section">
      <div className="settings-heading">
        <div>
          <h2>背景颜色</h2>
          <p className="font-mono text-xs">{config.backgroundColor.toUpperCase()}</p>
        </div>
        <span
          className="color-preview"
          style={{ backgroundColor: config.backgroundColor }}
          aria-hidden="true"
        />
      </div>
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
    </div>

    <div className="settings-section">
      <div className="settings-heading">
        <div>
          <h2>透明边框</h2>
          <p>{config.border.enabled ? "PNG 输出" : "JPG 输出"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="border-enabled" className="sr-only">
            透明边框
          </Label>
          <Switch
            id="border-enabled"
            checked={config.border.enabled}
            disabled={disabled}
            onCheckedChange={onBorderEnabled}
          />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">边距 px</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={syncBorder ? "secondary" : "ghost"}
              aria-label={syncBorder ? "取消同步四边" : "同步四边"}
              aria-pressed={syncBorder}
              disabled={disabled || !config.border.enabled}
              onClick={onToggleBorderSync}
            >
              {syncBorder ? <Link2 /> : <Unlink2 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{syncBorder ? "取消同步四边" : "同步四边"}</TooltipContent>
        </Tooltip>
      </div>

      <div className="border-input-grid">
        {BORDER_FIELDS.map(({ field, label }) => (
          <div key={field}>
            <Label htmlFor={`border-${field}`}>{label}</Label>
            <Input
              id={`border-${field}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              value={config.border[field]}
              disabled={disabled || !config.border.enabled || (syncBorder && field !== "top")}
              onChange={(event) => onBorderValue(field, Number(event.currentTarget.value))}
            />
          </div>
        ))}
      </div>

      {syncBorder && config.border.enabled && (
        <Slider
          className="mt-4"
          aria-label="统一边距"
          min={0}
          max={500}
          step={1}
          value={[config.border.top]}
          disabled={disabled}
          onValueChange={([value]) => onBorderValue("top", value)}
        />
      )}
    </div>

    <div className="settings-section">
      <div className="settings-heading">
        <div>
          <h2>JPG 质量</h2>
          <p className="font-mono">{Math.round(config.jpegQuality * 100)}%</p>
        </div>
      </div>
      <Slider
        aria-label="JPG 输出质量"
        min={60}
        max={100}
        step={1}
        value={[Math.round(config.jpegQuality * 100)]}
        disabled={disabled || config.border.enabled}
        onValueChange={([value]) => onJpegQuality(value / 100)}
      />
    </div>
  </aside>
)
