import { Context, Effect, Layer, Schema } from "effect";

import { DatabaseError, Job } from "@memento/protocol";
import { and, eq, lt, lte, or, sql } from "drizzle-orm";

import { mapRepositoryError } from "#/core/errors";
import { Database } from "#/core/layer";
import { TransactionService, transactionOrDatabase } from "#/core/transaction";
import { job } from "#/schema/index";
const make = Effect.gen(function* () {
  const database = yield* Database;
  const transaction = yield* TransactionService;
  return {
    enqueue: Effect.fn("JobRepository.enqueue")(function* (row: Job) {
      const db = yield* transactionOrDatabase(database);
      yield* db.insert(job).values(row).onConflictDoNothing({ target: job.dedupeKey });
    }, mapRepositoryError),
    lease: Effect.fn("JobRepository.lease")(function* (now: number, token: string) {
      return yield* transaction.run(
        Effect.gen(function* () {
          const db = yield* transactionOrDatabase(database);
          const [row] = yield* db
            .select()
            .from(job)
            .where(
              or(
                and(eq(job.state, "pending"), lte(job.runAt, now)),
                and(eq(job.state, "running"), lt(job.leaseUntil, now)),
              ),
            )
            .orderBy(job.runAt)
            .limit(1)
            .for("update", { skipLocked: true });
          if (!row) return undefined;
          const [leased] = yield* db
            .update(job)
            .set({
              state: "running",
              leaseToken: token,
              leaseUntil: now + 120000,
              attempts: sql`${job.attempts}+1`,
            })
            .where(eq(job.id, row.id))
            .returning();
          return yield* Schema.decodeUnknownEffect(Job)(leased).pipe(
            Effect.mapError((cause) => new DatabaseError({ cause, message: "Invalid leased job" })),
          );
        }),
      );
    }, mapRepositoryError),
    finish: Effect.fn("JobRepository.finish")(function* (
      id: string,
      token: string,
      state: Job["state"],
      runAt: number,
      lastError: string | null = null,
    ) {
      const db = yield* transactionOrDatabase(database);
      const rows = yield* db
        .update(job)
        .set({
          state,
          runAt,
          lastError,
          leaseToken: null,
          leaseUntil: null,
          ...(lastError === null ? { attempts: 0 } : {}),
        })
        .where(and(eq(job.id, id), eq(job.state, "running"), eq(job.leaseToken, token)))
        .returning({ id: job.id });
      return rows.length === 1;
    }, mapRepositoryError),
    retry: Effect.fn("JobRepository.retry")(function* (
      subjectId: string,
      now: number,
      dedupeKey?: string,
    ) {
      const db = yield* transactionOrDatabase(database);
      yield* db
        .update(job)
        .set({ state: "pending", runAt: now, attempts: 0, lastError: null })
        .where(
          and(
            eq(job.subjectId, subjectId),
            eq(job.state, "failed"),
            dedupeKey === undefined ? undefined : eq(job.dedupeKey, dedupeKey),
          ),
        );
    }, mapRepositoryError),
  };
});
export class JobRepository extends Context.Service<JobRepository, Effect.Success<typeof make>>()(
  "@memento/database/JobRepository",
) {
  static readonly layer = Layer.effect(JobRepository, make);
}
