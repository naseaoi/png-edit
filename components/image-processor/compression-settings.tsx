import { Archive } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { CompressionConfig } from "@/types"
import { SettingSection } from "./setting-section"

interface CompressionSettingsProps {
  compression: CompressionConfig
  disabled: boolean
  onChange: <K extends keyof CompressionConfig>(
    field: K,
    value: CompressionConfig[K],
  ) => void
}

export const CompressionSettings = ({
  compression,
  disabled,
  onChange,
}: CompressionSettingsProps) => (
  <SettingSection
    id="compression-enabled"
    title="图片压缩"
    description={
      compression.enabled
        ? `PNG / JPG / WebP · 质量 ${compression.quality}%`
        : "保持最高编码质量"
    }
    icon={<Archive className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    enabled={compression.enabled}
    disabled={disabled}
    onEnabledChange={(value) => onChange("enabled", value)}
  >
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label htmlFor="compression-quality">输出质量</Label>
        <span className="font-mono text-sm text-neutral-700">
          {compression.quality}%
        </span>
      </div>
      <Slider
        id="compression-quality"
        aria-label="图片压缩质量"
        min={60}
        max={100}
        step={1}
        value={[compression.quality]}
        disabled={disabled}
        onValueChange={([value]) => onChange("quality", value)}
      />
    </div>
  </SettingSection>
)
