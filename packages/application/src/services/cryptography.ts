import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { Context, Effect, Layer, Redacted } from "effect";

import { ProviderError } from "@memento/protocol";

export class Cryptography extends Context.Service<
  Cryptography,
  {
    readonly random: () => `0x${string}`;
    readonly emailId: (email: string) => `0x${string}`;
    readonly equal: (a: string, b: string) => boolean;
    readonly seal: (plaintext: string, context: string) => string;
    readonly open: (ciphertext: string, context: string) => Effect.Effect<string, ProviderError>;
  }
>()("@memento/application/Cryptography") {
  static live(key: Redacted.Redacted<string>, emailKey: Redacted.Redacted<string>) {
    return Layer.sync(Cryptography, () => {
      const secret = Buffer.from(Redacted.value(key), "hex");
      const emailSecret = Buffer.from(Redacted.value(emailKey), "hex");

      if (secret.length !== 32 || emailSecret.length !== 32)
        throw new Error("Encryption and email HMAC keys must each be 32 bytes");

      return Cryptography.of({
        random: () => `0x${randomBytes(32).toString("hex")}`,

        emailId: (email) =>
          `0x${createHmac("sha256", emailSecret).update(`memento:recipient-email:v1:${email.trim().toLowerCase()}`).digest("hex")}`,

        equal: (a, b) =>
          Buffer.byteLength(a) === Buffer.byteLength(b) &&
          timingSafeEqual(Buffer.from(a), Buffer.from(b)),

        seal: (plaintext, context) => {
          const iv = randomBytes(12);
          const cipher = createCipheriv("aes-256-gcm", secret, iv);

          cipher.setAAD(Buffer.from(context));

          const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

          return `v1.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
        },

        open: (ciphertext, context) =>
          Effect.try({
            try: () => {
              if (!ciphertext.startsWith("v1.")) throw new Error("Unknown ciphertext version");

              const bytes = Buffer.from(ciphertext.slice(3), "base64url");

              if (bytes.length < 28) throw new Error("Invalid ciphertext");

              const decipher = createDecipheriv("aes-256-gcm", secret, bytes.subarray(0, 12));

              decipher.setAAD(Buffer.from(context));
              decipher.setAuthTag(bytes.subarray(12, 28));

              return Buffer.concat([
                decipher.update(bytes.subarray(28)),
                decipher.final(),
              ]).toString("utf8");
            },

            catch: () =>
              new ProviderError({
                provider: "encryption",
                retryable: false,
                message: "Unable to decrypt stored authorization",
              }),
          }),
      });
    });
  }
}
