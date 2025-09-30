"use client"

import * as React from "react"

// Define your mobile breakpoint (e.g. < 768px)
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  React.useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile
}
