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
import { IMAGE_LIMITS } from "@/constants/limits"
import type { MarginConfig, ProcessingConfig } from "@/types"

type MarginField = keyof MarginConfig

interface SettingsPanelProps {
  config: ProcessingConfig
  selectedColor: string | null
  customColor: string
  syncMargin: boolean
  disabled: boolean
  onPresetColor: (color: string) => void
  onCustomColor: (color: string) => void
  onMarginValue: (field: MarginField, value: number) => void
  onTransparentBorder: (enabled: boolean) => void
  onToggleMarginSync: () => void
  onJpegQuality: (quality: number) => void
}

const MARGIN_FIELDS: Array<{ field: MarginField; label: string }> = [
  { field: "top", label: "上" },
  { field: "right", label: "右" },
  { field: "bottom", label: "下" },
  { field: "left", label: "左" },
]

export const SettingsPanel = ({
  config,
  selectedColor,
  customColor,
  syncMargin,
  disabled,
  onPresetColor,
  onCustomColor,
  onMarginValue,
  onTransparentBorder,
  onToggleMarginSync,
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
          <h2>边距</h2>
          <p>{syncMargin ? "四边同步" : "四边独立"}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={syncMargin ? "secondary" : "ghost"}
              aria-label={syncMargin ? "取消同步四边" : "同步四边"}
              aria-pressed={syncMargin}
              disabled={disabled}
              onClick={onToggleMarginSync}
            >
              {syncMargin ? <Link2 /> : <Unlink2 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{syncMargin ? "取消同步四边" : "同步四边"}</TooltipContent>
        </Tooltip>
      </div>

      <div className="margin-input-grid">
        {MARGIN_FIELDS.map(({ field, label }) => (
          <div key={field}>
            <Label htmlFor={`margin-${field}`}>{label}</Label>
            <Input
              id={`margin-${field}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={IMAGE_LIMITS.maxMargin}
              value={config.margin[field]}
              disabled={disabled || (syncMargin && field !== "top")}
              onChange={(event) => onMarginValue(field, Number(event.currentTarget.value))}
            />
          </div>
        ))}
      </div>

      {syncMargin && (
        <Slider
          className="mt-4"
          aria-label="统一边距"
          min={0}
          max={IMAGE_LIMITS.maxMargin}
          step={1}
          value={[config.margin.top]}
          disabled={disabled}
          onValueChange={([value]) => onMarginValue("top", value)}
        />
      )}
    </div>

    <div className="settings-section">
      <div className="settings-heading mb-0">
        <div>
          <h2>透明边框</h2>
          <p>{config.transparentBorder ? "开启 · PNG 输出" : "关闭 · JPG 输出"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="transparent-border" className="sr-only">
            透明边框
          </Label>
          <Switch
            id="transparent-border"
            checked={config.transparentBorder}
            disabled={disabled}
            onCheckedChange={onTransparentBorder}
          />
        </div>
      </div>
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
        disabled={disabled || config.transparentBorder}
        onValueChange={([value]) => onJpegQuality(value / 100)}
      />
    </div>
  </aside>
)
