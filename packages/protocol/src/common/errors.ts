import { Schema } from "effect";

export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()(
  "InvalidRequest",
  {
    code: Schema.String,
    message: Schema.String,
  },
  { httpApiStatus: 400 },
) {}
export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  {
    message: Schema.String,
  },
  { httpApiStatus: 404 },
) {}
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {
    message: Schema.String,
  },
  { httpApiStatus: 403 },
) {}
export class Conflict extends Schema.TaggedError<Conflict>()(
  "Conflict",
  {
    code: Schema.String,
    message: Schema.String,
  },
  { httpApiStatus: 409 },
) {}
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    message: Schema.String,
  },
  { httpApiStatus: 401 },
) {}
export class ProviderError extends Schema.TaggedError<ProviderError>()(
  "ProviderError",
  {
    provider: Schema.String,
    retryable: Schema.Boolean,
    message: Schema.String,
  },
  { httpApiStatus: 503 },
) {}
export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  "DatabaseError",
  {
    cause: Schema.Defect(),
    message: Schema.String,
  },
  { httpApiStatus: 500 },
) {}
export type ApplicationError =
  | InvalidRequest
  | NotFound
  | Forbidden
  | Conflict
  | Unauthorized
  | ProviderError
  | DatabaseError;
