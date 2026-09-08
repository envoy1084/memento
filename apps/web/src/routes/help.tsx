import { createFileRoute, Link } from "@tanstack/react-router";

import { Accordion } from "@thenamespace/uikit";

import { Icon } from "#/components/icon";
import { PageTitle } from "#/components/page";
export const Route = createFileRoute("/help")({ component: Help });
const questions = [
  [
    "What is an .eth name?",
    "Think of it as your name for the onchain internet. Instead of introducing yourself with a long wallet address, you can use a name like heyjamie.eth. ENS is the naming system behind it.",
  ],
  [
    "Do I need a wallet or crypto?",
    "You can start with an email and create a wallet when the live app is connected. The person sending your gift covers the registration. In this preview, both wallet creation and claiming are simulated.",
  ],
  [
    "Who owns the name?",
    "The recipient chooses the wallet that receives it. Once a live claim is complete, the name belongs to that wallet. The sender doesn’t keep control.",
  ],
  [
    "Can I choose any name?",
    "Your gift comes with a budget and a few simple rules, like name length and registration duration. You can choose an available name within those rules. If someone gifted you a name they already own, that exact name is reserved for you.",
  ],
  [
    "Is a name mine forever?",
    "Your identity can grow with you, but an ENS registration needs to be renewed. Your gift covers the initial registration period. You’re responsible for future renewals.",
  ],
  [
    "What happens to unused gifts?",
    "The sender can return an unclaimed gift. Expired invitations can no longer be claimed. Community campaigns can also be paused or closed, while names already claimed stay with their recipients.",
  ],
  [
    "Why does a community ask for World ID?",
    "Some communities want to give one name per person. World ID helps check that a person is eligible without sharing their identity with the campaign. Verification is simulated in this preview.",
  ],
  [
    "What works in this preview?",
    "You can create gifts and campaigns, generate local invitation links, claim demo names, and customize a profile. Everything is saved in this browser. No real funds, emails, wallet connections, identity checks, or registrations are involved.",
  ],
];
function Help() {
  return (
    <div className="mx-auto w-[calc(100%-40px)] max-w-[800px] py-14">
      <PageTitle
        eyebrow="NEW HERE? YOU’RE IN GOOD COMPANY."
        title="A little guidance goes a long way."
        description="No jargon needed. Just a few things worth knowing before your next beginning."
      />
      <Accordion className="my-10" allowsMultipleExpanded>
        {questions.map(([question, answer]) => (
          <Accordion.Item key={question} id={question ?? ""}>
            <Accordion.Heading>
              <Accordion.Trigger className="py-6 text-base">
                {question}
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <p className="pb-6 text-sm leading-7 text-muted">{answer}</p>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <div className="rounded-3xl bg-surface-secondary p-7 text-center">
        <h3>Ready for a little possibility?</h3>
        <Link to="/send" className="button button--primary mt-5">
          Give a name
          <Icon name="arrow" size={17} />
        </Link>
      </div>
    </div>
  );
}
