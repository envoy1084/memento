import { Accordion, Card, Separator } from "@thenamespace/uikit";

import { Icon, type IconName } from "#/components/common/icon";
import { ButtonLink, PageHeader, RuleHeading, Section } from "#/components/common/page";

const basics: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "person",
    title: "A name, not an address",
    body: "Instead of 0x71C…4F2A, people see heyjamie.eth. Same account, human name.",
  },
  {
    icon: "shield",
    title: "It belongs to whoever claims it",
    body: "The name lands in the recipient's wallet. The sender can't take it back.",
  },
  {
    icon: "gift",
    title: "The sender covers the cost",
    body: "Registration is paid by the gift. The recipient pays nothing to claim.",
  },
];

const questions: [string, string][] = [
  [
    "What is an .eth name?",
    "It's your name for the onchain internet. Rather than introducing yourself with a long wallet address, you use something like heyjamie.eth. ENS is the naming system behind it, and the name works across a growing number of apps and wallets.",
  ],
  [
    "Do I need a wallet or any crypto?",
    "No. You can start with an email address, and a wallet is created for you along the way. The person sending the gift covers the registration. Memento covers the gas fees when you claim with your embedded wallet.",
  ],
  [
    "Who actually owns the name?",
    "The recipient. They choose the wallet that receives it, and once the claim is complete the name belongs to that wallet. The sender keeps no control over it.",
  ],
  [
    "Can I choose any name I want?",
    "Within the gift's rules. Each gift comes with a budget, a name-length range and a registration period. Any available name inside those limits is yours.",
  ],
  [
    "Is the name mine forever?",
    "The name is yours, but an ENS registration is a lease that needs renewing. Your gift covers the first registration period. Renewals after that are up to you.",
  ],
  [
    "What happens to a gift nobody opens?",
    "The sender can return an unclaimed gift, and expired invitations stop working. Names already claimed stay with their recipients.",
  ],
];

export function Help() {
  return (
    <Section width="reading" className="py-14">
      <PageHeader
        eyebrow="How it works"
        title="New here? Start with these."
        description="No jargon. Just the handful of things worth knowing before you give or claim a name."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {basics.map((basic) => (
          <Card
            key={basic.title}
            variant="secondary"
            className="rounded-3xl border-0 p-5 shadow-none"
          >
            <span className="mb-4 grid size-10 place-content-center rounded-xl bg-paper-raised text-lavender-600">
              <Icon name={basic.icon} size={19} />
            </span>
            <p className="m-0 text-sm font-medium">{basic.title}</p>
            <p className="m-0 mt-1.5 text-[13px] leading-6 text-ink-soft">{basic.body}</p>
          </Card>
        ))}
      </div>

      <RuleHeading className="mt-14 mb-2">Questions people ask</RuleHeading>
      <Accordion allowsMultipleExpanded>
        {questions.map(([question, answer]) => (
          <Accordion.Item key={question} id={question}>
            <Accordion.Heading>
              <Accordion.Trigger className="py-6 text-[17px]">
                {question}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <p className="mt-0 mb-6 max-w-[62ch] text-[15px] leading-[1.75] text-ink-soft">
                {answer}
              </p>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      <Separator className="my-12" />

      <div className="rounded-3xl border border-lavender-100 bg-linear-135 from-lavender-50 to-blush-50 p-8 text-center">
        <h2 className="m-0 text-display-md">Ready to give someone a name?</h2>
        <p className="mx-auto mt-3 mb-6 max-w-[42ch] text-[15px] text-ink-soft">
          It takes about a minute, and they’ll have it for as long as they want it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink to="/send" size="lg">
            Give a name
            <Icon name="arrow" size={18} />
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
