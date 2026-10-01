import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevStash",
  description: "One fast, searchable, AI-enhanced hub for all your dev knowledge & resources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
        {/* bottom-left: the item drawer is right-anchored and full-height, so its
            action bar (Copy / Edit / Delete) owns the bottom-right corner. The
            bottom offset lifts the toast clear of the two things pinned to the
            bottom edge — the 57px sidebar footer on desktop, and the 64px drawer
            action bar on mobile, where the drawer goes full-width. mobileOffset
            has to repeat it: sonner drops to its own default below 600px. */}
        <Toaster
          richColors
          theme="dark"
          position="bottom-left"
          offset={{ bottom: 81, left: 24 }}
          mobileOffset={{ bottom: 81, left: 16 }}
        />
      </body>
    </html>
  );
}
