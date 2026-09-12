import { Schema } from "effect";

export const EnsWorkflowRecord = Schema.Struct({
  namespace: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
  revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  valueCiphertext: Schema.NonEmptyString,
});
export type EnsWorkflowRecord = typeof EnsWorkflowRecord.Type;
