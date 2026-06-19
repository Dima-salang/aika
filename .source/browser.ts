// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "developer/architecture.mdx": () => import("../content/docs/developer/architecture.mdx?collection=docs"), "developer/index.mdx": () => import("../content/docs/developer/index.mdx?collection=docs"), "developer/observability-auditing.mdx": () => import("../content/docs/developer/observability-auditing.mdx?collection=docs"), "user/attachments-evidence.mdx": () => import("../content/docs/user/attachments-evidence.mdx?collection=docs"), "user/collaboration-tenancy.mdx": () => import("../content/docs/user/collaboration-tenancy.mdx?collection=docs"), "user/index.mdx": () => import("../content/docs/user/index.mdx?collection=docs"), "user/projects-tasks.mdx": () => import("../content/docs/user/projects-tasks.mdx?collection=docs"), "user/reporting-notion.mdx": () => import("../content/docs/user/reporting-notion.mdx?collection=docs"), "user/time-logging.mdx": () => import("../content/docs/user/time-logging.mdx?collection=docs"), }),
};
export default browserCollections;