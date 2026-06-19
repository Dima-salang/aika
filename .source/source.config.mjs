// source.config.ts
import { remarkMdxMermaid, remarkNpm, remarkSteps } from "fumadocs-core/mdx-plugins";
import { defineDocs, defineConfig } from "fumadocs-mdx/config";
var docs = defineDocs({
  dir: "content/docs"
});
var source_config_default = defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid, remarkNpm, remarkSteps]
  }
});
export {
  source_config_default as default,
  docs
};
