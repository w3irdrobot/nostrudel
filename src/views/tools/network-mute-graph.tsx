import { useMemo } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import AutoSizer from "react-virtualized-auto-sizer";
import { useNavigate } from "react-router-dom";
import ForceGraph, { LinkObject, NodeObject } from "react-force-graph-3d";
import { Mesh, MeshBasicMaterial, SRGBColorSpace, SphereGeometry, Sprite, SpriteMaterial, TextureLoader } from "three";

import useCurrentAccount from "../../hooks/use-current-account";
import RequireCurrentAccount from "../../providers/route/require-current-account";
import { useUsersMetadata } from "../../hooks/use-user-network";
import { MUTE_LIST_KIND, getPubkeysFromList, isPubkeyInList } from "../../helpers/nostr/lists";
import useUserContactList from "../../hooks/use-user-contact-list";
import { useReadRelays } from "../../hooks/use-client-relays";
import replaceableEventsService from "../../services/replaceable-events";
import useSubjects from "../../hooks/use-subjects";
import useUserProfile from "../../hooks/use-user-profile";
import { ChevronLeftIcon } from "../../components/icons";

export function useUsersMuteLists(pubkeys: string[], additionalRelays?: Iterable<string>) {
  const readRelays = useReadRelays(additionalRelays);
  const muteListSubjects = useMemo(() => {
    return pubkeys.map((pubkey) => replaceableEventsService.requestEvent(readRelays, MUTE_LIST_KIND, pubkey));
  }, [pubkeys]);
  return useSubjects(muteListSubjects);
}

type NodeType = { id: string; image?: string; name?: string };

function NetworkGraphPage() {
  const navigate = useNavigate();
  const account = useCurrentAccount()!;

  const selfMetadata = useUserProfile(account.pubkey);
  const contacts = useUserContactList(account.pubkey);
  const contactsPubkeys = useMemo(
    () => (contacts ? getPubkeysFromList(contacts).map((p) => p.pubkey) : []),
    [contacts],
  );
  const usersMetadata = useUsersMetadata(contactsPubkeys);
  const usersMuteLists = useUsersMuteLists(contactsPubkeys);

  const graphData = useMemo(() => {
    if (!contacts) return { nodes: [], links: [] };

    const nodes: Record<string, NodeObject<NodeType>> = {};
    const links: Record<string, LinkObject<NodeType>> = {};

    const getOrCreateNode = (pubkey: string) => {
      if (!nodes[pubkey]) {
        const node: NodeType = {
          id: pubkey,
        };

        const metadata = usersMetadata[pubkey];
        if (metadata) {
          node.image = metadata.picture || metadata.image;
          node.name = metadata.name;
        }

        nodes[pubkey] = node;
      }
      return nodes[pubkey];
    };

    for (const muteList of usersMuteLists) {
      const author = muteList.pubkey;
      for (const user of getPubkeysFromList(muteList)) {
        if (isPubkeyInList(contacts, user.pubkey)) {
          const keyA = [author, user.pubkey].join("|");
          links[keyA] = { source: getOrCreateNode(author), target: getOrCreateNode(user.pubkey) };
        }
      }
    }

    return { nodes: Object.values(nodes), links: Object.values(links) };
  }, [contacts, usersMuteLists, usersMetadata, selfMetadata]);

  return (
    <Flex direction="column" gap="2" h="full" pt="2">
      <Flex gap="2" alignItems="center">
        <Button leftIcon={<ChevronLeftIcon />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Text>Showing how many of your contacts are muting each other</Text>
      </Flex>
      <Box overflow="hidden" flex={1}>
        <AutoSizer>
          {({ height, width }) => (
            <ForceGraph<NodeType>
              graphData={graphData}
              enableNodeDrag={false}
              width={width}
              height={height}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.25}
              nodeThreeObject={(node: NodeType) => {
                if (!node.image) {
                  return new Mesh(
                    new SphereGeometry(5, 12, 6),
                    new MeshBasicMaterial({ color: parseInt(node.id.slice(0, 6), 16) }),
                  );
                }

                const imgTexture = new TextureLoader().load(node.image);
                imgTexture.colorSpace = SRGBColorSpace;
                const material = new SpriteMaterial({ map: imgTexture });
                const sprite = new Sprite(material);
                sprite.scale.set(10, 10, 10);

                return sprite;
              }}
            />
          )}
        </AutoSizer>
      </Box>
    </Flex>
  );
}

export default function NetworkGraphView() {
  return (
    <RequireCurrentAccount>
      <NetworkGraphPage />
    </RequireCurrentAccount>
  );
}
