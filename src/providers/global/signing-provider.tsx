import React, { useCallback, useContext, useMemo } from "react";
import { useToast } from "@chakra-ui/react";

import signingService from "../../services/signing";
import { DraftNostrEvent } from "../../types/nostr-event";
import { EventTemplate, UnsignedEvent, VerifiedEvent } from "nostr-tools";
import useCurrentAccount from "../../hooks/use-current-account";

export type SigningContextType = {
  finalizeDraft(draft: EventTemplate): Promise<UnsignedEvent>;
  requestSignature(draft: EventTemplate | DraftNostrEvent): Promise<VerifiedEvent>;
  requestDecrypt(data: string, pubkey: string): Promise<string>;
  requestEncrypt(data: string, pubkey: string): Promise<string>;
};

export const SigningContext = React.createContext<SigningContextType>({
  finalizeDraft: () => {
    throw new Error("not setup yet");
  },
  requestSignature: () => {
    throw new Error("not setup yet");
  },
  requestDecrypt: () => {
    throw new Error("not setup yet");
  },
  requestEncrypt: () => {
    throw new Error("not setup yet");
  },
});

export function useSigningContext() {
  return useContext(SigningContext);
}

export function SigningProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const current = useCurrentAccount();

  const finalizeDraft = useCallback(
    async (draft: EventTemplate) => {
      if (!current) throw new Error("No account");
      return await signingService.finalizeDraft(draft, current);
    },
    [toast, current],
  );
  const requestSignature = useCallback(
    async (draft: DraftNostrEvent) => {
      if (!current) throw new Error("No account");
      return await signingService.requestSignature(draft, current);
    },
    [toast, current],
  );
  const requestDecrypt = useCallback(
    async (data: string, pubkey: string) => {
      if (!current) throw new Error("No account");
      return await signingService.nip04Decrypt(data, pubkey, current);
    },
    [toast, current],
  );
  const requestEncrypt = useCallback(
    async (data: string, pubkey: string) => {
      if (!current) throw new Error("No account");
      return await signingService.nip04Encrypt(data, pubkey, current);
    },
    [toast, current],
  );

  const context = useMemo(
    () => ({ requestSignature, requestDecrypt, requestEncrypt, finalizeDraft }),
    [requestSignature, requestDecrypt, requestEncrypt, finalizeDraft],
  );

  return <SigningContext.Provider value={context}>{children}</SigningContext.Provider>;
}
