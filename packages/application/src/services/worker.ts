import { Context, DateTime, Effect, Layer, Schema } from "effect";

import {
  ClaimRepository,
  GiftRepository,
  JobRepository,
  TransactionService,
} from "@memento/database";
import {
  type Job,
  type ApplicationError,
  Conflict,
  InvalidRequest,
  ProviderError,
} from "@memento/protocol";

import { Chain, Mailer } from "./chain.js";
import { Cryptography } from "./cryptography.js";

const Mail = Schema.Struct({
  to: Schema.String,
  url: Schema.String,
  idempotencyKey: Schema.String,
});

const make = Effect.gen(function* () {
  const claims = yield* ClaimRepository;
  const gifts = yield* GiftRepository;
  const jobs = yield* JobRepository;
  const tx = yield* TransactionService;
  const chain = yield* Chain;
  const mailer = yield* Mailer;
  const crypto = yield* Cryptography;
  const now = DateTime.now.pipe(Effect.map(DateTime.toEpochMillis));

  const execute = Effect.fn("Worker.execute")(function* (job: Job, token: string) {
    const timestamp = yield* now;

    if (job.kind === "email") {
      if (!job.payloadCiphertext)
        return yield* new InvalidRequest({
          code: "INVALID_EMAIL_JOB",
          message: "Missing email payload",
        });

      const payload = yield* crypto.open(job.payloadCiphertext, `email:${job.subjectId}`);

      const mail = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Mail))(payload).pipe(
        Effect.mapError(
          () => new InvalidRequest({ code: "INVALID_EMAIL_JOB", message: "Invalid email payload" }),
        ),
      );

      yield* mailer.send(mail);
      yield* jobs.finish(job.id, token, "complete", timestamp);

      return;
    }

    const claim = yield* claims.find(job.subjectId);

    if (!claim)
      return yield* new InvalidRequest({ code: "MISSING_CLAIM", message: "Claim does not exist" });

    const gift = yield* gifts.find(claim.giftId);

    if (!gift)
      return yield* new InvalidRequest({ code: "MISSING_GIFT", message: "Gift does not exist" });

    const progress = yield* chain.advance(gift, claim);

    yield* tx.run(
      Effect.gen(function* () {
        // Fence the entire state update, not only the job acknowledgement.
        if (
          !(yield* jobs.finish(
            job.id,
            token,
            ["complete", "refunded"].includes(progress.state) ? "complete" : "pending",
            progress.retryAt ?? timestamp + 1000,
          ))
        ) {
          return yield* new Conflict({ code: "LEASE_LOST", message: "Worker lease was replaced" });
        }

        if (
          !(yield* claims.transition(claim.id, claim.state, {
            state: progress.state,
            lastError: null,
            ...(progress.commitmentAt === undefined ? {} : { commitmentAt: progress.commitmentAt }),
            ...(progress.price === undefined ? {} : { price: progress.price }),
            ...(["complete", "refunded"].includes(progress.state)
              ? {
                  commitmentSecretCiphertext: null,
                  recipientAuthorizationCiphertext: null,
                }
              : {}),
          }))
        ) {
          return yield* new Conflict({
            code: "CLAIM_CHANGED",
            message: "Claim changed during execution",
          });
        }

        if (progress.state === "complete" || progress.state === "refunded")
          yield* gifts.transition(gift.id, gift.status, progress.state);
      }),
    );
  });

  const failed = Effect.fn("Worker.failed")(function* (
    job: Job,
    token: string,
    error: ApplicationError,
  ) {
    const retryable =
      error._tag === "ProviderError"
        ? error.retryable
        : error._tag === "DatabaseError" ||
          (error._tag === "Conflict" && error.code === "TRANSACTION_PENDING");

    const timestamp = yield* now;
    const message = error._tag === "DatabaseError" ? "Database operation failed" : error.message;

    yield* tx.run(
      Effect.gen(function* () {
        if (
          !(yield* jobs.finish(
            job.id,
            token,
            retryable && job.attempts < 12 ? "pending" : "failed",
            timestamp + Math.min(300000, 2000 * 2 ** Math.min(job.attempts, 8)),
            message,
          ))
        )
          return;

        if (job.kind === "claim") {
          const claim = yield* claims.find(job.subjectId);

          if (claim) yield* claims.transition(claim.id, claim.state, { lastError: message });
        }
      }),
    );
    yield* Effect.logWarning("Background job failed", {
      jobId: job.id,
      kind: job.kind,
      errorTag: error._tag,
      retryable,
    });
  });

  return {
    tick: Effect.fn("Worker.tick")(function* () {
      const token = crypto.random();
      const job = yield* jobs.lease(yield* now, token);

      if (!job) return false;

      yield* execute(job, token).pipe(
        Effect.timeoutOrElse({
          duration: "90 seconds",

          orElse: () =>
            Effect.fail(
              new ProviderError({
                provider: job.kind === "email" ? "email" : "chain",
                retryable: true,
                message: "Operation timed out; its recorded result will be checked on retry",
              }),
            ),
        }),
        Effect.catch((error) => failed(job, token, error)),
      );

      return true;
    }),
  };
});

export class Worker extends Context.Service<Worker, Effect.Success<typeof make>>()(
  "@memento/application/Worker",
) {
  static readonly layer = Layer.effect(Worker, make);
}
