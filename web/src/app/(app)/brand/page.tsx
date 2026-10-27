import { brandIsSaved, getBrand } from "@/lib/brand"
import { BrandForm } from "./brand-form"

export const dynamic = "force-dynamic"

export default function BrandPage() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-semibold">Brand</h1>
        <p className="text-muted-foreground text-sm">
          Colours and handle for every slide the Studio draws. Text colour is chosen for you on each background so it stays readable.
        </p>
      </div>
      <BrandForm initial={getBrand()} isSaved={brandIsSaved()} />
    </div>
  )
}
