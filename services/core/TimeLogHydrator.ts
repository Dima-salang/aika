import { DBInstance } from "@/db";
import { tables } from "@/db/tables";
import { eq, inArray, and, isNull } from "drizzle-orm";

export interface HydratedEvidence {
  id: string;
  time_log_id: string;
  file_url: string;
  file_key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface HydratedTask {
  id: string;
  title: string;
  status: string;
}

export interface HydratedRelations {
  tasks: HydratedTask[];
  evidence: HydratedEvidence[];
}

export class TimeLogHydrator {
  /**
   * Bulk hydrator to batch fetch tasks and evidence records in memory for a given set of log IDs.
   */
  static async hydrateRelations(
    logIds: string[],
    tx: DBInstance
  ): Promise<Record<string, HydratedRelations>> {
    const mapping: Record<string, HydratedRelations> = {};
    if (logIds.length === 0) return mapping;

    // Initialize map
    for (const logId of logIds) {
      mapping[logId] = { tasks: [], evidence: [] };
    }

    // 1. Fetch evidence in a single query
    const evidenceTable = tables.documentEvidences;
    const evidenceList = await tx
      .select()
      .from(evidenceTable)
      .where(
        and(
          inArray(evidenceTable.time_log_id, logIds),
          isNull(evidenceTable.deleted_at)
        )
      );

    // 2. Fetch tasks in a single query via inner join
    const tasksJoinTable = tables.timeLogTasks;
    const tasksTable = tables.tasks;
    const tasksList = await tx
      .select({
        time_log_id: tasksJoinTable.time_log_id,
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
      })
      .from(tasksJoinTable)
      .innerJoin(tasksTable, eq(tasksJoinTable.task_id, tasksTable.id))
      .where(
        and(
          inArray(tasksJoinTable.time_log_id, logIds),
          isNull(tasksTable.deleted_at)
        )
      );

    // Map evidence and tasks in memory
    evidenceList.forEach((ev) => {
      if (mapping[ev.time_log_id]) {
        mapping[ev.time_log_id].evidence.push(ev as HydratedEvidence);
      }
    });

    tasksList.forEach((t) => {
      if (mapping[t.time_log_id]) {
        mapping[t.time_log_id].tasks.push({
          id: t.id,
          title: t.title,
          status: t.status,
        });
      }
    });

    return mapping;
  }
}
