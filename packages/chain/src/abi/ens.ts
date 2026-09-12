import { parseAbi } from "viem";

export {
  ethRegistrarV2Abi as registrarAbi,
  ethRegistryV2Abi as registryAbi,
  verifiableFactoryV2Abi as factoryAbi,
  permissionedResolverV2Abi as resolverAbi,
  defaultReverseRegistrarAdapterV2Abi as reverseAbi,
} from "@ensforge/contracts/v2";
export {
  standaloneHcaFactoryV2Abi as hcaFactoryAbi,
  standaloneSingleOwnerHcaV2Abi as hcaAbi,
} from "@ensforge/contracts/v2/experimental/hca";

export const profileAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node,string key) view returns (string)",
]);

export const defaultReverseAbi = parseAbi([
  "function nameForAddr(address account) view returns (string)",
]);
