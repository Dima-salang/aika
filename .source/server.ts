// @ts-nocheck
import * as __fd_glob_12 from "../content/docs/user/time-logging.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/user/reporting-notion.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/user/projects-tasks.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/user/index.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/user/collaboration-tenancy.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/user/attachments-evidence.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/developer/observability-auditing.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/developer/index.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/developer/architecture.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/user/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/developer/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "developer/meta.json": __fd_glob_1, "user/meta.json": __fd_glob_2, }, {"index.mdx": __fd_glob_3, "developer/architecture.mdx": __fd_glob_4, "developer/index.mdx": __fd_glob_5, "developer/observability-auditing.mdx": __fd_glob_6, "user/attachments-evidence.mdx": __fd_glob_7, "user/collaboration-tenancy.mdx": __fd_glob_8, "user/index.mdx": __fd_glob_9, "user/projects-tasks.mdx": __fd_glob_10, "user/reporting-notion.mdx": __fd_glob_11, "user/time-logging.mdx": __fd_glob_12, });