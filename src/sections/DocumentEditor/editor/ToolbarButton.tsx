import { cn } from "@/lib/utils"

export type ToolbarButtonProps = {
  label: string
  icon: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

const ToolbarButton = ({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) => (
  <button
    type="button"
    // The editor keeps DOM focus, so the selection the command applies to is
    // still there when the click lands.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={active}
    title={label}
    className={cn(
      "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors",
      "hover:bg-muted hover:text-foreground",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
      active && "bg-primary-soft text-primary hover:bg-primary-soft",
    )}
  >
    {icon}
  </button>
)

export default ToolbarButton
