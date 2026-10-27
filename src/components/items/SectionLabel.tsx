/** Small uppercase heading over a block of the item drawer. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </p>
  )
}
