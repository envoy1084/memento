import { Layer } from "effect";

import { TransactionService } from "#/core/transaction";

import { AuditRepository } from "./audit.js";
import { CampaignRepository } from "./campaign.js";
import { ChainTransactionRepository } from "./chain-transaction.js";
import { ClaimRepository } from "./claim.js";
import { EnsWorkflowRepository } from "./ens-workflow.js";
import { GiftRepository } from "./gift.js";
import { JobRepository } from "./job.js";
import { WorldRepository } from "./world.js";

export * from "./gift.js";
export * from "./claim.js";
export * from "./campaign.js";
export * from "./job.js";
export * from "./audit.js";
export * from "./world.js";

export const RepositoriesLive = Layer.mergeAll(
  EnsWorkflowRepository.layer,
  ChainTransactionRepository.layer,
  GiftRepository.layer,
  ClaimRepository.layer,
  CampaignRepository.layer,
  JobRepository.layer,
  AuditRepository.layer,
  WorldRepository.layer,
).pipe(Layer.provideMerge(TransactionService.layer));

export * from "./chain-transaction.js";

export * from "./ens-workflow.js";
