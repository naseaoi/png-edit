import { describe, expect, it } from "vitest"
import type { ProcessingModule } from "@/types"
import { insertModule, moveModuleOrder } from "@/lib/module-order"

const ORDER: ProcessingModule[] = [
  "background",
  "resize",
  "margin",
  "transparency",
  "compression",
]

describe("module order helpers", () => {
  it("moves a module up and down within bounds", () => {
    expect(moveModuleOrder(ORDER, "margin", -1)).toEqual([
      "background",
      "margin",
      "resize",
      "transparency",
      "compression",
    ])
    expect(moveModuleOrder(ORDER, "margin", 1)).toEqual([
      "background",
      "resize",
      "transparency",
      "margin",
      "compression",
    ])
  })

  it("keeps order unchanged at boundaries", () => {
    expect(moveModuleOrder(ORDER, "background", -1)).toEqual(ORDER)
    expect(moveModuleOrder(ORDER, "compression", 1)).toEqual(ORDER)
  })

  it("returns the original order for unknown modules", () => {
    expect(moveModuleOrder(ORDER, "unknown" as ProcessingModule, 1)).toEqual(
      ORDER,
    )
  })

  it("inserts before or after the target module", () => {
    expect(insertModule(ORDER, "compression", "resize", "before")).toEqual([
      "background",
      "compression",
      "resize",
      "margin",
      "transparency",
    ])
    expect(insertModule(ORDER, "background", "margin", "after")).toEqual([
      "resize",
      "margin",
      "background",
      "transparency",
      "compression",
    ])
  })

  it("returns the original order when inserting onto itself or unknown modules", () => {
    expect(insertModule(ORDER, "margin", "margin", "before")).toEqual(ORDER)
    expect(
      insertModule(ORDER, "margin", "unknown" as ProcessingModule, "after"),
    ).toEqual(ORDER)
  })
})
