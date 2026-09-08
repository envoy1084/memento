import { createRouter } from "@tanstack/react-router";

import { RegistryContext, scheduleTask } from "@effect/atom-react";
import { AtomRegistry } from "effect/unstable/reactivity";

import { demoAtom, decodeDemo, storageNoticeAtom } from "#/atoms/demo";

import { routeTree } from "./routeTree.gen";

const storageKey = "memento:demo:v1";

export function getRouter() {
  const atomRegistry = AtomRegistry.make({ scheduleTask, defaultIdleTTL: 30_000 });
  let storageMessage: string | undefined;

  try {
    const saved = localStorage.getItem(storageKey);

    if (saved) atomRegistry.set(demoAtom, decodeDemo(saved));
  } catch {
    storageMessage = "Your saved preview could not be restored. A fresh demo is ready.";
  }

  atomRegistry.subscribe(demoAtom, (state) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      atomRegistry.set(
        storageNoticeAtom,
        "Changes can’t be saved in this browser. Keep this tab open to retain your preview.",
      );
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey || event.newValue === null) return;

    try {
      atomRegistry.set(demoAtom, decodeDemo(event.newValue));
    } catch {
      atomRegistry.set(
        storageNoticeAtom,
        "Another tab saved an incompatible preview. Your current view is unchanged.",
      );
    }
  });

  return createRouter({
    routeTree,
    context: { atomRegistry, storageMessage },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,

    Wrap: ({ children }) => (
      <RegistryContext.Provider value={atomRegistry}>{children}</RegistryContext.Provider>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
