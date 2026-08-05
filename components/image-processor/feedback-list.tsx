import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ValidationIssue } from "@/types"

interface FeedbackListProps {
  issues: ValidationIssue[]
  operationError: string | null
  onDismiss: () => void
}

export const FeedbackList = ({
  issues,
  operationError,
  onDismiss,
}: FeedbackListProps) => {
  if (issues.length === 0 && !operationError) return null

  return (
    <div className="feedback-banner" role="alert">
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{operationError ?? "部分文件未加入队列"}</p>
        {issues.length > 0 && (
          <ul className="mt-1 space-y-1 text-sm">
            {issues.slice(0, 3).map((issue, index) => (
              <li key={`${issue.fileName}-${index}`}>
                <span className="font-medium">{issue.fileName}</span>：{issue.message}
              </li>
            ))}
            {issues.length > 3 && <li>另有 {issues.length - 3} 个文件未加入</li>}
          </ul>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="关闭提示"
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  )
}
