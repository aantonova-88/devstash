import { prisma } from "@/lib/prisma"

export interface ProfileUser {
  id: string
  name: string | null
  email: string
  image: string | null
  createdAt: Date
  hasPassword: boolean
}

// The password hash is read only to derive `hasPassword` and never leaves this
// function.
export async function getProfileUser(userId: string): Promise<ProfileUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, password: true, createdAt: true },
  })
  if (!user) return null

  const { password, ...rest } = user
  return { ...rest, hasPassword: password !== null }
}
