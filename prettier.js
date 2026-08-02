export default {
  printWidth: 92,
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  overrides: [
    {
      // Scoped to Markdown deliberately: a top-level `proseWrap` would also reflow YAML
      // scalars, which mangles workflow and manifest files.
      files: ['*.md', '*.markdown', '*.mdx'],
      options: { proseWrap: 'always' },
    },
  ],
}
