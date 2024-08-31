import { Box, Flex, Spacer, Text } from "@chakra-ui/react";
import { PropsWithChildren, ReactNode, forwardRef, memo, useCallback, useContext, useEffect } from "react";
import UserAvatar from "../../../components/user/user-avatar";
import Timestamp from "../../../components/timestamp";
import UserName from "../../../components/user/user-name";
import { CheckIcon } from "../../../components/icons";
import FocusedContext from "../focused-context";

// const ONE_MONTH = 60 * 60 * 24 * 30;

type NotificationIconEntryProps = PropsWithChildren<{
  icon: ReactNode;
  pubkey: string;
  timestamp: number;
  summary: ReactNode;
  id: string;
  onClick?: () => void;
}>;

const NotificationIconEntry = memo(
  forwardRef<HTMLDivElement, NotificationIconEntryProps>(
    ({ children, icon, pubkey, timestamp, summary, id, onClick }, ref) => {
      const { id: focused, focus } = useContext(FocusedContext);
      // const [read, setRead] = useReadStatus(id, ONE_MONTH);

      const expanded = focused === id;

      const focusSelf = useCallback(() => focus(id), [id, focus]);

      // scroll element to stop when opened
      useEffect(() => {
        if (expanded) {
          // @ts-expect-error
          ref.current?.scrollIntoView();
        }
      }, [expanded]);

      // useEffect(() => {
      //   if (!read && expanded) setRead(true);
      // }, [read, expanded]);

      return (
        <Flex direction="column" bg={expanded ? "whiteAlpha.100" : undefined} rounded="md">
          <Flex
            gap="2"
            alignItems="center"
            ref={ref}
            cursor="pointer"
            p="2"
            tabIndex={0}
            onFocus={onClick ? undefined : focusSelf}
            onClick={onClick}
            userSelect="none"
            bg={expanded ? "whiteAlpha.100" : undefined}
          >
            <Box>{icon}</Box>
            <UserAvatar pubkey={pubkey} size="sm" />
            <UserName pubkey={pubkey} hideBelow="md" />
            <Text isTruncated>{summary}</Text>
            <Spacer />
            {/* {read && <CheckIcon boxSize={5} color="green.500" />} */}
            <Timestamp timestamp={timestamp} />
          </Flex>

          {expanded && (
            <Flex
              direction="column"
              w="full"
              gap="2"
              overflow="hidden"
              minH={{ base: "calc(100vh - 10rem)", lg: "xs" }}
              p="2"
              maxH="calc(100vh - 10rem)"
              overflowY="auto"
              overflowX="hidden"
            >
              {children}
            </Flex>
          )}
        </Flex>
      );
    },
  ),
);

export default NotificationIconEntry;
