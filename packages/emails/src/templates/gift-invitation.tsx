import type { CSSProperties } from "react";

import type { GiftEmail } from "@memento/protocol";
import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

export type GiftInvitationProps = Pick<
  GiftEmail,
  "url" | "senderName" | "recipientName" | "message" | "expiresAt"
>;

const colors = {
  paper: "#fbf9fd",
  ink: "#221f28",
  soft: "#6d637b",
  lavender: "#f3eef9",
  rule: "#e9e0f1",
  accent: "#604785",
};
const body: CSSProperties = {
  backgroundColor: colors.paper,
  color: colors.ink,
  fontFamily: '"DM Sans", Arial, sans-serif',
  margin: 0,
  padding: "32px 12px",
};
const card: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${colors.rule}`,
  borderRadius: "20px",
  overflow: "hidden",
};
const eyebrow: CSSProperties = {
  color: colors.accent,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "2px",
  lineHeight: "18px",
  margin: "0 0 16px",
  textTransform: "uppercase",
};
const paragraph: CSSProperties = {
  color: colors.soft,
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};
const heading: CSSProperties = {
  fontFamily: "Manrope, Arial, sans-serif",
  fontWeight: 700,
  letterSpacing: "-1px",
  lineHeight: "42px",
  fontSize: "34px",
  margin: "0 0 24px",
};
const button: CSSProperties = {
  backgroundColor: colors.ink,
  borderRadius: "28px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  padding: "15px 28px",
  textDecoration: "none",
};

export function GiftInvitation({
  url,
  senderName,
  recipientName,
  message,
  expiresAt,
}: GiftInvitationProps) {
  const sender = senderName || "Someone special";
  const claimBy =
    expiresAt === undefined
      ? undefined
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(expiresAt * 1000));

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <Font
          fontFamily="DM Sans"
          fallbackFontFamily="Arial"
          fontWeight={400}
          fontStyle="normal"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource-variable/dm-sans@5.2.8/files/dm-sans-latin-wght-normal.woff2",
            format: "woff2",
          }}
        />
        <Font
          fontFamily="Manrope"
          fallbackFontFamily="Arial"
          fontWeight={700}
          fontStyle="normal"
          webFont={{
            url: "https://cdn.jsdelivr.net/npm/@fontsource-variable/manrope@5.2.8/files/manrope-latin-wght-normal.woff2",
            format: "woff2",
          }}
        />
      </Head>
      <Preview>{sender} sent you a name for your next chapter. Your gift is waiting.</Preview>
      <Body style={body}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Text
            style={{
              fontFamily: "Manrope, Arial, sans-serif",
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "-1.5px",
              margin: "0 0 24px",
            }}
          >
            memento<span style={{ color: "#a489ce" }}>.</span>
          </Text>
          <Section style={card}>
            <Section
              style={{
                padding: "32px 28px",
                backgroundColor: colors.lavender,
                textAlign: "center",
              }}
            >
              <Text style={eyebrow}>A gift, just for you</Text>
              <Heading style={heading}>A name of your own.</Heading>
              <Section
                style={{
                  backgroundColor: "#ffffff",
                  border: `1px solid ${colors.rule}`,
                  borderRadius: "12px",
                  padding: "24px 16px",
                  maxWidth: "320px",
                  margin: "0 auto",
                }}
              >
                <Text
                  style={{ ...eyebrow, fontSize: "9px", margin: "0 0 10px", color: colors.soft }}
                >
                  For your next chapter
                </Text>
                <Text
                  style={{
                    fontFamily: "Manrope, Arial, sans-serif",
                    fontSize: "30px",
                    fontWeight: 700,
                    letterSpacing: "-1.5px",
                    lineHeight: "38px",
                    margin: "0",
                  }}
                >
                  yourname<span style={{ color: "#a489ce" }}>.eth</span>
                </Text>
                <Text
                  style={{
                    color: colors.soft,
                    fontSize: "12px",
                    lineHeight: "18px",
                    margin: "12px 0 0",
                  }}
                >
                  A little gift. A world of possibility.
                </Text>
              </Section>
            </Section>
            <Section style={{ padding: "28px" }}>
              <Heading
                as="h2"
                style={{
                  ...heading,
                  fontSize: "23px",
                  lineHeight: "31px",
                  letterSpacing: "-0.5px",
                  margin: "0 0 12px",
                  overflowWrap: "anywhere",
                }}
              >
                {recipientName ? `${recipientName}, this one’s for you.` : "This one’s for you."}
              </Heading>
              <Text style={paragraph}>
                <strong style={{ color: colors.ink }}>{sender}</strong> sent you a gift - a personal
                ENS name you get to choose.
              </Text>
              {message ? (
                <Section
                  style={{
                    borderLeft: "3px solid #cbb8e4",
                    padding: "2px 0 2px 18px",
                    margin: "24px 0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: "18px",
                      lineHeight: "28px",
                      color: colors.ink,
                      whiteSpace: "pre-line",
                      overflowWrap: "anywhere",
                      margin: "0 0 8px",
                    }}
                  >
                    “{message}”
                  </Text>
                  <Text style={{ ...paragraph, fontSize: "13px", margin: "0" }}>From {sender}</Text>
                </Section>
              ) : null}
              <Text style={paragraph}>
                Choose a name you love and make it yours. Your gift covers registration, and Memento
                takes care of the fees.
              </Text>
              <Section style={{ margin: "26px 0 20px" }}>
                <Button href={url} style={button}>
                  Open your gift
                </Button>
              </Section>
              {claimBy ? (
                <Text style={{ ...paragraph, fontSize: "12px", margin: "0" }}>
                  Claim by {claimBy}
                </Text>
              ) : null}
              <Hr style={{ borderColor: colors.rule, margin: "24px 0" }} />
              <Text
                style={{ ...paragraph, fontSize: "12px", lineHeight: "20px", margin: "0 0 10px" }}
              >
                This gift is tied to your email. Sign in with the email address that received this
                invitation.
              </Text>
              <Text style={{ ...paragraph, fontSize: "12px", lineHeight: "20px", margin: "0" }}>
                Button not opening?{" "}
                <Link href={url} style={{ color: colors.accent, textDecoration: "underline" }}>
                  Open your private invitation here.
                </Link>
              </Text>
            </Section>
          </Section>
          <Text
            style={{
              color: colors.soft,
              fontSize: "12px",
              lineHeight: "20px",
              textAlign: "center",
              margin: "24px 0 0",
            }}
          >
            Memento · A name is a beginning.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

GiftInvitation.PreviewProps = {
  senderName: "Alex",
  recipientName: "Jamie",
  message: "For your next chapter. Make it a good one.",
  url: "https://example.com/g/sample#preview-only",
  expiresAt: 1791849600,
} satisfies GiftInvitationProps;

export default GiftInvitation;
