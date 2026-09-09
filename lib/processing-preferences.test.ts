import { describe, expect, it } from "vitest"
import {
  DEFAULT_MODULE_PREFERENCES,
  parseModulePreferences,
} from "@/lib/processing-preferences"

describe("module preferences", () => {
  it("defaults every module to disabled", () => {
    expect(parseModulePreferences(null)).toEqual(DEFAULT_MODULE_PREFERENCES)
  })

  it("restores valid switch states", () => {
    expect(
      parseModulePreferences(
        JSON.stringify({
          background: true,
          resize: false,
          margin: true,
          transparency: false,
          compression: true,
        }),
      ),
    ).toEqual({
      background: true,
      resize: false,
      margin: true,
      transparency: false,
      compression: true,
      moduleOrder: DEFAULT_MODULE_PREFERENCES.moduleOrder,
    })
  })

  it("rejects invalid and unexpected values per field", () => {
    expect(
      parseModulePreferences(
        JSON.stringify({
          background: "true",
          resize: true,
          margin: 1,
          transparency: null,
          compression: {},
        }),
      ),
    ).toEqual({
      background: false,
      resize: true,
      margin: false,
      transparency: false,
      compression: false,
      moduleOrder: DEFAULT_MODULE_PREFERENCES.moduleOrder,
    })
    expect(parseModulePreferences("not-json")).toEqual(
      DEFAULT_MODULE_PREFERENCES,
    )
  })

  it("restores a valid custom module order", () => {
    expect(
      parseModulePreferences(
        JSON.stringify({
          moduleOrder: [
            "margin",
            "resize",
            "background",
            "compression",
            "transparency",
          ],
        }),
      ).moduleOrder,
    ).toEqual([
      "margin",
      "resize",
      "background",
      "compression",
      "transparency",
    ])
  })

  it("falls back to the default order for corrupted module order", () => {
    expect(
      parseModulePreferences(
        JSON.stringify({ moduleOrder: ["margin", "resize"] }),
      ).moduleOrder,
    ).toEqual(DEFAULT_MODULE_PREFERENCES.moduleOrder)
    expect(
      parseModulePreferences(JSON.stringify({ moduleOrder: "margin" }))
        .moduleOrder,
    ).toEqual(DEFAULT_MODULE_PREFERENCES.moduleOrder)
  })
})
