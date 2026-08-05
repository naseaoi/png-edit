import { Blend } from "lucide-react"
import { SettingSection } from "./setting-section"

interface TransparencySettingsProps {
  enabled: boolean
  disabled: boolean
  onEnabledChange: (enabled: boolean) => void
}

export const TransparencySettings = ({
  enabled,
  disabled,
  onEnabledChange,
}: TransparencySettingsProps) => (
  <SettingSection
    id="transparent-border"
    title="保留透明"
    description={enabled ? "PNG 输出 · 保留 Alpha" : "不强制透明输出"}
    icon={<Blend className="size-4 shrink-0 text-primary" aria-hidden="true" />}
    enabled={enabled}
    disabled={disabled}
    onEnabledChange={onEnabledChange}
  />
)
