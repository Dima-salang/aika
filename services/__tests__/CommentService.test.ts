import { describe, test, expect, beforeEach } from "bun:test";
import { CommentService } from "../core/CommentService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite, organizationSqlite, timeLogsSqlite, commentsSqlite } from "@/db/schema";
import { sql } from "drizzle-orm";

describe("CommentService", () => {
  let commentService: CommentService;

  const testUserId = "user-comment-123";
  const testOrgId = "org-comment-123";
  const testLogId = "log-comment-123";

  beforeEach(async () => {
    await clearDatabase();
    commentService = new CommentService();

    const now = new Date();

    // Seed organization
    await db.insert(organizationSqlite).values({
      id: testOrgId,
      name: "Comment Test Org",
      slug: "comment-test-org",
      createdAt: now,
    });

    // Seed user
    await db.insert(userSqlite).values({
      id: testUserId,
      name: "Commenter Alice",
      email: "alice.comment@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Seed time log
    await db.insert(timeLogsSqlite).values({
      id: testLogId,
      user_id: testUserId,
      organization_id: testOrgId,
      start_time: new Date(now.getTime() - 7200000),
      end_time: new Date(now.getTime() - 3600000),
      title: "Log title",
      description: "Test log for comments",
      duration: 3600,
    });
  });

  test("createComment should successfully create a top-level comment", async () => {
    const comment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "This is a test comment",
    });

    expect(comment).toBeDefined();
    expect(comment!.id).toBeDefined();
    expect(comment!.comment).toBe("This is a test comment");
    expect(comment!.parent_id).toBeNull();
    expect(comment!.log_id).toBe(testLogId);
    expect(comment!.user_id).toBe(testUserId);
  });

  test("createComment should successfully create a threaded nested comment", async () => {
    const parentComment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Parent comment",
    });
    expect(parentComment).toBeDefined();

    const childComment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      parent_id: parentComment!.id,
      comment: "Child nested comment",
    });

    expect(childComment).toBeDefined();
    expect(childComment!.parent_id).toBe(parentComment!.id);
    expect(childComment!.comment).toBe("Child nested comment");
  });

  test("createComment should throw database error on foreign key constraints if FKs are enabled", async () => {
    await db.run(sql`PRAGMA foreign_keys = ON`);

    expect(
      commentService.createComment({
        log_id: "non-existent-log",
        user_id: testUserId,
        comment: "This should fail",
      })
    ).rejects.toThrow();

    expect(
      commentService.createComment({
        log_id: testLogId,
        user_id: "non-existent-user",
        comment: "This should fail",
      })
    ).rejects.toThrow();
  });

  test("getCommentById should return comment if it exists", async () => {
    const comment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Fetch me",
    });

    const fetched = await commentService.getCommentById(comment!.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(comment!.id);
    expect(fetched!.comment).toBe("Fetch me");
  });

  test("getCommentById should return null for non-existent ID", async () => {
    const fetched = await commentService.getCommentById("fake-id");
    expect(fetched).toBeNull();
  });

  test("getCommentById should return null if comment has been soft deleted", async () => {
    const comment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Delete me",
    });

    await commentService.deleteComment(comment!.id);

    const fetched = await commentService.getCommentById(comment!.id);
    expect(fetched).toBeNull();
  });

  test("listComments should return list of active comments and support filtering", async () => {
    const c1 = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "First comment",
    });

    const c2 = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Second comment",
    });

    // A comment from another user or log to check filtering
    const anotherUser = "another-user-123";
    await db.insert(userSqlite).values({
      id: anotherUser,
      name: "Bob",
      email: "bob@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const c3 = await commentService.createComment({
      log_id: testLogId,
      user_id: anotherUser,
      comment: "Bob's comment",
    });

    const all = await commentService.listComments();
    expect(all.length).toBe(3);

    const filteredByUser = await commentService.listComments({ user_id: testUserId });
    expect(filteredByUser.length).toBe(2);
    expect(filteredByUser.map(c => c.comment)).toContain("First comment");
    expect(filteredByUser.map(c => c.comment)).toContain("Second comment");

    const filteredByLog = await commentService.listComments({ log_id: testLogId });
    expect(filteredByLog.length).toBe(3);
  });

  test("listComments should exclude soft-deleted comments", async () => {
    const comment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Visible",
    });

    const toDelete = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Invisible soon",
    });

    await commentService.deleteComment(toDelete!.id);

    const list = await commentService.listComments();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(comment!.id);
  });

  test("listComments should support pagination via offset and limit", async () => {
    for (let i = 1; i <= 5; i++) {
      await commentService.createComment({
        log_id: testLogId,
        user_id: testUserId,
        comment: `Comment ${i}`,
      });
    }

    const firstPage = await commentService.listComments(undefined, 0, 2);
    expect(firstPage.length).toBe(2);

    const secondPage = await commentService.listComments(undefined, 2, 2);
    expect(secondPage.length).toBe(2);

    const thirdPage = await commentService.listComments(undefined, 4, 2);
    expect(thirdPage.length).toBe(1);
  });

  test("updateComment should successfully update comment text and change updated_at", async () => {
    const comment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "Original text",
    });

    // Simulate small delay
    await new Promise(resolve => setTimeout(resolve, 5));

    const updated = await commentService.updateComment(comment!.id, {
      comment: "Updated text",
    });

    expect(updated).toBeDefined();
    expect(updated!.comment).toBe("Updated text");
    expect(updated!.updated_at.getTime()).toBeGreaterThanOrEqual(comment!.updated_at.getTime());
  });

  test("deleteComment should set deleted_at field", async () => {
    const comment = await commentService.createComment({
      log_id: testLogId,
      user_id: testUserId,
      comment: "To be deleted",
    });

    const deleted = await commentService.deleteComment(comment!.id);
    expect(deleted).toBeDefined();
    expect(deleted!.deleted_at).not.toBeNull();

    // Verify it is not returned in standard fetch
    const fetched = await commentService.getCommentById(comment!.id);
    expect(fetched).toBeNull();
  });
});
