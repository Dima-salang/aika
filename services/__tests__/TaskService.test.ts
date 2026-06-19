import { describe, test, expect, beforeEach } from "bun:test";
import { TaskService } from "../core/TaskService";
import { clearDatabase } from "./db-helper";
import { db } from "./db-helper";
import { tasksSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("TaskService", () => {
  const taskService = new TaskService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("getTaskById should return null if it does not exist", async () => {
    const res = await taskService.getTaskById("non-existent");
    expect(res).toBeNull();
  });

  test("getTaskById should return task if exists and active", async () => {
    await db.insert(tasksSqlite).values({
      id: "task-1",
      title: "Clean Kitchen",
      status: "todo",
      user_id: "user-1",
      organization_id: "org-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await taskService.getTaskById("task-1");
    expect(res).toBeDefined();
    expect(res!.id).toBe("task-1");
    expect(res!.title).toBe("Clean Kitchen");
  });

  test("getTaskById should return null if soft-deleted", async () => {
    await db.insert(tasksSqlite).values({
      id: "task-1",
      title: "Clean Kitchen",
      status: "todo",
      user_id: "user-1",
      organization_id: "org-1",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: new Date(),
    });

    const res = await taskService.getTaskById("task-1");
    expect(res).toBeNull();
  });

  test("createTask should successfully insert a task", async () => {
    const res = await taskService.createTask({
      id: "task-1",
      title: "Clean Kitchen",
      status: "todo",
      user_id: "user-1",
      organization_id: "org-1",
      priority: "high",
    });

    expect(res).toBeDefined();
    expect(res!.id).toBe("task-1");
    expect(res!.title).toBe("Clean Kitchen");
    expect(res!.status).toBe("todo");
    expect(res!.priority).toBe("high");
    expect(res!.created_at).toBeInstanceOf(Date);
  });

  test("updateTask should partially change fields", async () => {
    await db.insert(tasksSqlite).values({
      id: "task-1",
      title: "Clean Kitchen",
      status: "todo",
      user_id: "user-1",
      organization_id: "org-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await taskService.updateTask("task-1", {
      status: "in_progress",
      priority: "medium",
    });

    expect(res).toBeDefined();
    expect(res!.status).toBe("in_progress");
    expect(res!.priority).toBe("medium");
  });

  test("deleteTask should soft delete the task", async () => {
    await db.insert(tasksSqlite).values({
      id: "task-1",
      title: "Clean Kitchen",
      status: "todo",
      user_id: "user-1",
      organization_id: "org-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const deleted = await taskService.deleteTask("task-1");
    expect(deleted).toBeDefined();
    expect(deleted!.deleted_at).toBeInstanceOf(Date);

    const check = await taskService.getTaskById("task-1");
    expect(check).toBeNull();
  });

  test("listTasks should return tasks matching dynamic criteria", async () => {
    await db.insert(tasksSqlite).values([
      {
        id: "task-1",
        title: "Clean Kitchen",
        status: "todo",
        priority: "low",
        project_id: "project-1",
        team_id: "team-1",
        user_id: "user-1",
        organization_id: "org-1",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "task-2",
        title: "Buy Groceries",
        status: "in_progress",
        priority: "medium",
        project_id: null,
        team_id: null,
        user_id: "user-1",
        organization_id: "org-1",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "task-3",
        title: "Walk Dog",
        status: "done",
        priority: "high",
        project_id: null,
        team_id: "team-2",
        user_id: "user-2",
        organization_id: "org-2",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: new Date(),
      },
    ]);

    // Default lists only active tasks
    const listAll = await taskService.listTasks(undefined, {});
    expect(listAll.length).toBe(2);

    // Filter id
    const listId = await taskService.listTasks({ id: "task-1" }, {});
    expect(listId.length).toBe(1);

    // Filter projectId null
    const listNullProject = await taskService.listTasks({ projectId: null }, {});
    expect(listNullProject.length).toBe(1);
    expect(listNullProject[0].id).toBe("task-2");

    // Filter projectId specific
    const listProject = await taskService.listTasks({ projectId: "project-1" }, {});
    expect(listProject.length).toBe(1);
    expect(listProject[0].id).toBe("task-1");

    // Filter userId
    const listUser = await taskService.listTasks({ userId: "user-1" }, {});
    expect(listUser.length).toBe(2);

    // Filter teamId null
    const listNullTeam = await taskService.listTasks({ teamId: null }, {});
    expect(listNullTeam.length).toBe(1);
    expect(listNullTeam[0].id).toBe("task-2");

    // Filter teamId specific
    const listTeam = await taskService.listTasks({ teamId: "team-1" }, {});
    expect(listTeam.length).toBe(1);

    // Filter organizationId
    const listOrg = await taskService.listTasks({ organizationId: "org-1" }, {});
    expect(listOrg.length).toBe(2);

    // Filter status
    const listStatus = await taskService.listTasks({ status: "todo" }, {});
    expect(listStatus.length).toBe(1);
    expect(listStatus[0].id).toBe("task-1");

    // Filter priority
    const listPriority = await taskService.listTasks({ priority: "medium" }, {});
    expect(listPriority.length).toBe(1);
    expect(listPriority[0].id).toBe("task-2");

    // Filter deleted
    const listDeleted = await taskService.listTasks({ deleted: true }, {});
    expect(listDeleted.length).toBe(1);
    expect(listDeleted[0].id).toBe("task-3");
  });
});
