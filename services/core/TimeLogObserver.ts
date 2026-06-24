import { DBInstance } from "@/db";

export interface TimeLogObserver {
  onLogCreated(logId: string, userId: string, tx?: DBInstance): Promise<void>;
  onLogUpdated(logId: string, userId: string, updatedFields?: string[], tx?: DBInstance): Promise<void>;
  onLogDeleted(logId: string, userId: string, tx?: DBInstance): Promise<void>;
}
