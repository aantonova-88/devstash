import { Label } from "@/components/ui/label"

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}

/** Labelled form row shared by the item create and edit forms. */
export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
