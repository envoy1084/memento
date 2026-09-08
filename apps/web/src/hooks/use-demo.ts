import { useAtom } from "@effect/atom-react";

import { demoAtom } from "#/atoms/demo";

export function useDemo() {
  return useAtom(demoAtom);
}
