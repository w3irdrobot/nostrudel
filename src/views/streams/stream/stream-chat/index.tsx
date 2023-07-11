import { useMemo, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardProps,
  Flex,
  Heading,
  IconButton,
  Input,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";

import { ParsedStream, STREAM_CHAT_MESSAGE_KIND, buildChatMessage, getATag } from "../../../../helpers/nostr/stream";
import { useAdditionalRelayContext } from "../../../../providers/additional-relay-context";
import { useReadRelayUrls } from "../../../../hooks/use-client-relays";
import { useUserRelays } from "../../../../hooks/use-user-relays";
import { RelayMode } from "../../../../classes/relay";
import ZapModal from "../../../../components/zap-modal";
import { LightningIcon } from "../../../../components/icons";
import ChatMessage from "./chat-message";
import ZapMessage from "./zap-message";
import { ImageGalleryProvider } from "../../../../components/image-gallery";
import IntersectionObserverProvider from "../../../../providers/intersection-observer";
import useUserLNURLMetadata from "../../../../hooks/use-user-lnurl-metadata";
import { useInvoiceModalContext } from "../../../../providers/invoice-modal";
import { unique } from "../../../../helpers/array";
import { nostrPostAction } from "../../../../classes/nostr-post-action";
import { useForm } from "react-hook-form";
import { useSigningContext } from "../../../../providers/signing-provider";
import { useTimelineCurserIntersectionCallback } from "../../../../hooks/use-timeline-cursor-intersection-callback";
import useSubject from "../../../../hooks/use-subject";
import { useTimelineLoader } from "../../../../hooks/use-timeline-loader";
import { truncatedId } from "../../../../helpers/nostr-event";
import { css } from "@emotion/react";
import TopZappers from "./top-zappers";
import { parseZapEvent } from "../../../../helpers/zaps";
import { Kind } from "nostr-tools";

const hideScrollbar = css`
  scrollbar-width: 0;

  ::-webkit-scrollbar {
    width: 0;
  }
`;

export type ChatDisplayMode = "log" | "popup";

export default function StreamChat({
  stream,
  actions,
  displayMode,
  ...props
}: CardProps & { stream: ParsedStream; actions?: React.ReactNode; displayMode?: ChatDisplayMode }) {
  const toast = useToast();
  const contextRelays = useAdditionalRelayContext();
  const readRelays = useReadRelayUrls(contextRelays);
  const hostReadRelays = useUserRelays(stream.host)
    .filter((r) => r.mode & RelayMode.READ)
    .map((r) => r.url);

  const timeline = useTimelineLoader(`${truncatedId(stream.event.id)}-chat`, readRelays, {
    "#a": [getATag(stream)],
    kinds: [STREAM_CHAT_MESSAGE_KIND, Kind.Zap],
  });

  const events = useSubject(timeline.timeline).sort((a, b) => b.created_at - a.created_at);

  const zaps = useMemo(() => {
    const parsed = [];
    for (const event of events) {
      try {
        parsed.push(parseZapEvent(event));
      } catch (e) {}
    }
    return parsed;
  }, [events]);

  const scrollBox = useRef<HTMLDivElement | null>(null);
  const callback = useTimelineCurserIntersectionCallback(timeline);

  const { requestSignature } = useSigningContext();
  const { register, handleSubmit, formState, reset, getValues } = useForm({
    defaultValues: { content: "" },
  });
  const sendMessage = handleSubmit(async (values) => {
    try {
      const draft = buildChatMessage(stream, values.content);
      const signed = await requestSignature(draft);
      if (!signed) throw new Error("Failed to sign");
      nostrPostAction(unique([...contextRelays, ...hostReadRelays]), signed);
      reset();
    } catch (e) {
      if (e instanceof Error) toast({ description: e.message, status: "error" });
    }
  });

  const zapModal = useDisclosure();
  const { requestPay } = useInvoiceModalContext();
  const zapMetadata = useUserLNURLMetadata(stream.host);

  const isPopup = !!displayMode;
  const isChatLog = displayMode === "log";

  return (
    <>
      <IntersectionObserverProvider callback={callback} root={scrollBox}>
        <ImageGalleryProvider>
          <Card {...props} overflow="hidden" background={isChatLog ? "transparent" : undefined}>
            {!isPopup && (
              <CardHeader py="3" display="flex" justifyContent="space-between" alignItems="center">
                <Heading size="md">Stream Chat</Heading>
                {actions}
              </CardHeader>
            )}
            <CardBody display="flex" flexDirection="column" overflow="hidden" p={0}>
              <TopZappers zaps={zaps} pt={!isPopup ? 0 : undefined} />
              <Flex
                overflowY="scroll"
                overflowX="hidden"
                ref={scrollBox}
                direction="column-reverse"
                flex={1}
                px="4"
                py="2"
                mb="2"
                gap="2"
                css={isChatLog && hideScrollbar}
              >
                {events.map((event) =>
                  event.kind === STREAM_CHAT_MESSAGE_KIND ? (
                    <ChatMessage key={event.id} event={event} stream={stream} />
                  ) : (
                    <ZapMessage key={event.id} zap={event} stream={stream} />
                  )
                )}
              </Flex>
              {!isChatLog && (
                <Box
                  as="form"
                  borderRadius="md"
                  flexShrink={0}
                  display="flex"
                  gap="2"
                  px="2"
                  pb="2"
                  onSubmit={sendMessage}
                >
                  <Input placeholder="Message" {...register("content", { required: true })} autoComplete="off" />
                  <Button colorScheme="brand" type="submit" isLoading={formState.isSubmitting}>
                    Send
                  </Button>
                  {zapMetadata.metadata?.allowsNostr && (
                    <IconButton
                      icon={<LightningIcon color="yellow.400" />}
                      aria-label="Zap stream"
                      borderColor="yellow.400"
                      variant="outline"
                      onClick={zapModal.onOpen}
                    />
                  )}
                </Box>
              )}
            </CardBody>
          </Card>
        </ImageGalleryProvider>
      </IntersectionObserverProvider>
      {zapModal.isOpen && (
        <ZapModal
          isOpen
          stream={stream}
          pubkey={stream.host}
          onInvoice={async (invoice) => {
            reset();
            zapModal.onClose();
            await requestPay(invoice);
          }}
          onClose={zapModal.onClose}
          initialComment={getValues().content}
          additionalRelays={contextRelays}
        />
      )}
    </>
  );
}