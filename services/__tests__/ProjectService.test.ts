import { describe, test, expect, beforeEach } from "bun:test";
import { ProjectService } from "../ProjectService";
import { clearDatabase } from "./db-helper";
import { db } from "@/db";
import { projectsSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("ProjectService", () => {
  const projectService = new ProjectService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("getProject should return null if it does not exist", async () => {
    const res = await projectService.getProject("non-existent");
    expect(res).toBeNull();
  });

  test("getProject should return project if exists and active", async () => {
    await db.insert(projectsSqlite).values({
      id: "project-1",
      organization_id: "org-1",
      name: "Project A",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await projectService.getProject("project-1");
    expect(res).toBeDefined();
    expect(res!.id).toBe("project-1");
    expect(res!.name).toBe("Project A");
  });

  test("getProject should return null if soft-deleted", async () => {
    await db.insert(projectsSqlite).values({
      id: "project-1",
      organization_id: "org-1",
      name: "Project A",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: new Date(),
    });

    const res = await projectService.getProject("project-1");
    expect(res).toBeNull();
  });

  test("createProject should successfully insert a project", async () => {
    const res = await projectService.createProject({
      id: "project-1",
      organization_id: "org-1",
      name: "Project A",
      description: "My first project",
    });

    expect(res).toBeDefined();
    expect(res!.id).toBe("project-1");
    expect(res!.name).toBe("Project A");
    expect(res!.created_at).toBeInstanceOf(Date);
  });

  test("updateProject should partially change fields", async () => {
    await db.insert(projectsSqlite).values({
      id: "project-1",
      organization_id: "org-1",
      name: "Project A",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await projectService.updateProject("project-1", {
      name: "Project B",
      description: "Updated description",
    });

    expect(res).toBeDefined();
    expect(res!.name).toBe("Project B");
    expect(res!.description).toBe("Updated description");
  });

  test("deleteProject should soft delete the project", async () => {
    await db.insert(projectsSqlite).values({
      id: "project-1",
      organization_id: "org-1",
      name: "Project A",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const deleted = await projectService.deleteProject("project-1");
    expect(deleted).toBeDefined();
    expect(deleted!.deleted_at).toBeInstanceOf(Date);

    const check = await projectService.getProject("project-1");
    expect(check).toBeNull();
  });

  test("listProjects should return projects matching complex criteria", async () => {
    await db.insert(projectsSqlite).values([
      {
        id: "project-1",
        organization_id: "org-1",
        team_id: "team-1",
        name: "Project A",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "project-2",
        organization_id: "org-1",
        team_id: null,
        name: "Project B",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "project-3",
        organization_id: "org-2",
        team_id: "team-2",
        name: "Project C",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: new Date(),
      },
    ]);

    // Test default lists only active
    const listAll = await projectService.listProjects();
    expect(listAll.length).toBe(2);

    // Test filter id
    const listId = await projectService.listProjects({ id: "project-1" });
    expect(listId.length).toBe(1);

    // Test filter teamId is null
    const listNullTeam = await projectService.listProjects({ teamId: null });
    expect(listNullTeam.length).toBe(1);
    expect(listNullTeam[0].id).toBe("project-2");

    // Test filter teamId is specific
    const listTeam = await projectService.listProjects({ teamId: "team-1" });
    expect(listTeam.length).toBe(1);
    expect(listTeam[0].id).toBe("project-1");

    // Test filter organizationId
    const listOrg = await projectService.listProjects({ organizationId: "org-1" });
    expect(listOrg.length).toBe(2);

    // Test filter deleted
    const listDeleted = await projectService.listProjects({ deleted: true });
    expect(listDeleted.length).toBe(1);
    expect(listDeleted[0].id).toBe("project-3");
  });
});
