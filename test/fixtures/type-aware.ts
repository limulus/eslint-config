// Intentional lint violations, exercised by test/config.test.js.
// Covers the type-aware half of the config (universe's typescript-analysis rules), which only
// reports when the consumer supplies parserOptions pointing at a TypeScript project.

export class Collector {
  private items: string[] = []

  add(item: string): this {
    this.items.push(item)
    return this
  }
}
