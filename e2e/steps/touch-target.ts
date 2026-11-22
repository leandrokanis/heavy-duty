import { expect, type Locator } from '@playwright/test'

// boundingBox() includes the transform of a running transition, so a sheet that is still opening
// measures below its final size (55.99994 px for a 56 px button). Measure only after it settles.
export async function settledBox(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        for (let node: Element | null = element; node; node = node.parentElement) {
          if (node.getAnimations().length > 0) return false
        }
        return true
      }),
    )
    .toBe(true)
  return locator.boundingBox()
}
