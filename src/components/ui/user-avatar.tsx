import Image from "next/image"
import { cn } from "@/lib/utils"

function getInitials(name?: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface UserAvatarProps {
  name?: string | null
  image?: string | null
  size?: number
  className?: string
}

export function UserAvatar({ name, image, size = 32, className }: UserAvatarProps) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "User avatar"}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    )
  }

  return (
    <span
      className={cn(
        "rounded-full flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground font-semibold select-none",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </span>
  )
}
