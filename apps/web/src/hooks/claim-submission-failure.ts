// Earlier clients saved only this message after Privy's rejected sponsorship request.
const legacyRevert = "Execution reverted for an unknown reason. Details: execution reverted";

export function readClaimSubmission(storage: Pick<Storage, "getItem" | "removeItem">, key: string) {
  const stored = storage.getItem(key);
  if (
    stored === "pending" &&
    storage.getItem(`${key}:outcome`) === null &&
    storage.getItem(`${key}:error`) === legacyRevert
  ) {
    clearClaimSubmission(storage, key);
    return null;
  }
  return stored;
}

export function isRejectedClaimSubmission(initialError: unknown): boolean {
  let error = initialError;
  for (let depth = 0; depth < 5 && typeof error === "object" && error !== null; depth++) {
    if (
      "name" in error &&
      error.name === "PrivyApiError" &&
      "status" in error &&
      error.status === 400 &&
      "code" in error &&
      error.code === "transaction_broadcast_failure" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.startsWith("Execution reverted")
    )
      return true;
    error = "cause" in error ? error.cause : undefined;
  }
  return false;
}

export function clearClaimSubmission(storage: Pick<Storage, "removeItem">, key: string) {
  storage.removeItem(key);
  storage.removeItem(`${key}:error`);
  storage.removeItem(`${key}:outcome`);
}
