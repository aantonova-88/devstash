import { toast } from "sonner"

// Writes `value` to the clipboard and reports the outcome with a toast.
// Resolves to whether the write succeeded; never rejects.
export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success("Copied to clipboard")
    return true
  } catch {
    toast.error("Could not copy to clipboard")
    return false
  }
}
