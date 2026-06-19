import { remarkMdxMermaid, remarkNpm, remarkSteps } from 'fumadocs-core/mdx-plugins';
import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid, remarkNpm, remarkSteps],
  },
});