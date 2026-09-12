import { Layer } from "effect";

import { TransactionService } from "#/core/transaction";

import { AuditRepository } from "./audit.js";
import { ClaimRepository } from "./claim.js";
import { GiftRepository } from "./gift.js";
import { JobRepository } from "./job.js";

export * from "./gift.js";
export * from "./claim.js";
export * from "./job.js";
export * from "./audit.js";

export const RepositoriesLive = Layer.mergeAll(
  GiftRepository.layer,
  ClaimRepository.layer,
  JobRepository.layer,
  AuditRepository.layer,
).pipe(Layer.provideMerge(TransactionService.layer));
