import type { ReactNode } from "react"
import { Switch } from "@/components/ui/switch"

interface SettingSectionProps {
  id: string
  title: string
  description: string
  icon: ReactNode
  enabled: boolean
  disabled: boolean
  onEnabledChange: (enabled: boolean) => void
  trailing?: ReactNode
  children?: ReactNode
}

export const SettingSection = ({
  id,
  title,
  description,
  icon,
  enabled,
  disabled,
  onEnabledChange,
  trailing,
  children,
}: SettingSectionProps) => (
  <section className="settings-section" data-enabled={enabled}>
    <div className={`settings-heading ${enabled && children ? "" : "mb-0"}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-heading-actions">
        {trailing}
        <Switch
          id={id}
          aria-label={title}
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onEnabledChange}
        />
      </div>
    </div>
    {enabled ? children : null}
  </section>
)
