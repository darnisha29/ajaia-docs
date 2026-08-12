import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"

import "@/styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Ajaia Docs",
  description: "A lightweight collaborative document editor.",
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => (
  <html lang="en">
    <body className={`${inter.className} antialiased`}>
      {children}
      <Toaster
        position="bottom-center"
        richColors
      />
    </body>
  </html>
)

export default RootLayout
