import { Maximize2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { IMAGE_LIMITS } from "@/constants/limits"
import type { ResizeConfig } from "@/types"
import { SettingSection } from "./setting-section"

interface ResolutionSettingsProps {
  resize: ResizeConfig
  disabled: boolean
  onChange: <K extends keyof ResizeConfig>(
    field: K,
    value: ResizeConfig[K],
  ) => void
}

export const ResolutionSettings = ({
  resize,
  disabled,
  onChange,
}: ResolutionSettingsProps) => (
  <SettingSection
    id="resize-enabled"
    title="输出尺寸"
    description={resize.enabled ? "批量修改" : "保持原尺寸"}
    icon={<Maximize2 className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    enabled={resize.enabled}
    disabled={disabled}
    onEnabledChange={(value) => onChange("enabled", value)}
  >
      <div className="space-y-4">
        <div className="segmented-control" aria-label="尺寸修改方式">
          <button
            type="button"
            aria-pressed={resize.mode === "scale"}
            disabled={disabled}
            onClick={() => onChange("mode", "scale")}
          >
            按比例
          </button>
          <button
            type="button"
            aria-pressed={resize.mode === "dimensions"}
            disabled={disabled}
            onClick={() => onChange("mode", "dimensions")}
          >
            自定义
          </button>
        </div>

        {resize.mode === "scale" ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Label htmlFor="resize-scale">缩放比例</Label>
              <span className="font-mono text-sm text-neutral-700">
                {resize.scalePercent}%
              </span>
            </div>
            <Slider
              id="resize-scale"
              aria-label="缩放比例"
              min={1}
              max={100}
              step={1}
              value={[resize.scalePercent]}
              disabled={disabled}
              onValueChange={([value]) => onChange("scalePercent", value)}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="dimension-input-grid">
              <div>
                <Label htmlFor="resize-width">宽</Label>
                <Input
                  id="resize-width"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={IMAGE_LIMITS.maxOutputDimension}
                  value={resize.width}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange("width", Number(event.currentTarget.value))
                  }
                />
              </div>
              <span aria-hidden="true">×</span>
              <div>
                <Label htmlFor="resize-height">高</Label>
                <Input
                  id="resize-height"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={IMAGE_LIMITS.maxOutputDimension}
                  value={resize.height}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange("height", Number(event.currentTarget.value))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="preserve-aspect-ratio">保持原图比例</Label>
              <Switch
                id="preserve-aspect-ratio"
                aria-label="保持原图比例"
                checked={resize.preserveAspectRatio}
                disabled={disabled}
                onCheckedChange={(value) =>
                  onChange("preserveAspectRatio", value)
                }
              />
            </div>
          </div>
        )}
      </div>
  </SettingSection>
)
