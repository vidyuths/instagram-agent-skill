import { cn } from "@/lib/utils"

// A rendered slide. The PNG comes from the server, so next/image has nothing to optimise.
export function SlideImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className={cn("bg-muted block h-auto w-full rounded-md border", className)} />
  )
}
