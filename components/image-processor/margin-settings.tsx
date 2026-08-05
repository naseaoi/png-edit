import { Frame, Link2, Unlink2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { IMAGE_LIMITS } from "@/constants/limits"
import type { MarginConfig } from "@/types"
import { SettingSection } from "./setting-section"

type MarginField = Exclude<keyof MarginConfig, "enabled">

interface MarginSettingsProps {
  margin: MarginConfig
  syncMargin: boolean
  disabled: boolean
  onEnabledChange: (enabled: boolean) => void
  onValueChange: (field: MarginField, value: number) => void
  onToggleSync: () => void
}

const MARGIN_FIELDS: Array<{ field: MarginField; label: string }> = [
  { field: "top", label: "上" },
  { field: "right", label: "右" },
  { field: "bottom", label: "下" },
  { field: "left", label: "左" },
]

export const MarginSettings = ({
  margin,
  syncMargin,
  disabled,
  onEnabledChange,
  onValueChange,
  onToggleSync,
}: MarginSettingsProps) => (
  <SettingSection
    id="margin-enabled"
    title="边距"
    description={syncMargin ? "四边同步" : "四边独立"}
    icon={<Frame className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    enabled={margin.enabled}
    disabled={disabled}
    onEnabledChange={onEnabledChange}
    trailing={
      margin.enabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="margin-sync-toggle"
              aria-label={syncMargin ? "取消同步四边" : "同步四边"}
              aria-pressed={syncMargin}
              disabled={disabled}
              onClick={onToggleSync}
            >
              {syncMargin ? <Link2 /> : <Unlink2 />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{syncMargin ? "取消同步四边" : "同步四边"}</TooltipContent>
        </Tooltip>
      ) : null
    }
  >
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
            value={margin[field]}
            disabled={disabled || (syncMargin && field !== "top")}
            onChange={(event) => onValueChange(field, Number(event.currentTarget.value))}
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
        value={[margin.top]}
        disabled={disabled}
        onValueChange={([value]) => onValueChange("top", value)}
      />
    )}
  </SettingSection>
)
