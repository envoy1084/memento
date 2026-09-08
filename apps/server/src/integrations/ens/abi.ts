import { parseAbi } from "viem";
// Integration signatures audited against ENSv2 post-audit-2, revision in architecture/contracts.
export const registrarAbi = parseAbi([
  "function getRegisterPrice(string label,uint64 duration,address token) view returns (uint256 base,uint256 premium)",
  "function isAvailable(string label) view returns (bool)",
  "function makeCommitment(string label,address owner,bytes32 secret,address subregistry,address resolver,uint64 duration,bytes32 referrer) pure returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function commitmentAt(bytes32 commitment) view returns (uint64)",
  "function MIN_REGISTER_DURATION() view returns (uint64)",
  "function MIN_COMMITMENT_AGE() view returns (uint64)",
  "function MAX_COMMITMENT_AGE() view returns (uint64)",
  "function register(string label,address owner,bytes32 secret,address subregistry,address resolver,uint64 duration,address paymentToken,bytes32 referrer) returns (uint256)",
]);
export const registryAbi = parseAbi([
  "function getResource(uint256 anyId) view returns (uint256)",
  "function roleCount(uint256 resource) view returns (uint256)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getTokenId(uint256 anyId) view returns (uint256)",
  "function getResolver(string label) view returns (address)",
  "function safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)",
  "function roles(uint256 resource,address account) view returns (uint256)",
]);
export const factoryAbi = parseAbi([
  "function deployProxy(address implementation,uint256 salt,bytes initData) returns (address)",
  "function verifyContract(address proxy) view returns (address)",
  "function proxyLogic() view returns (address)",
]);
export const hcaFactoryAbi = parseAbi([
  "function authorizedOwnerOf(address hca) view returns (address)",
  "function approvedImplementations(address implementation) view returns (bool)",
  "function VERIFIABLE_FACTORY() view returns (address)",
]);
export const hcaAbi = parseAbi([
  "function accountId() pure returns (string)",
  "function ownerAndSessionNonce() view returns (address owner,uint96 nonce)",
]);
export const resolverAbi = parseAbi([
  "struct Grant { address account; uint256 roleBitmap; }",
  "function initialize(Grant[] grants,bytes[] calls)",
  "function setAddress(bytes name,uint256 coinType,bytes value)",
  "function setText(bytes name,string key,string value)",
  "function roles(uint256 resource,address account) view returns (uint256)",
  "function resolve(bytes name,bytes data) view returns (bytes)",
]);
export const profileAbi = parseAbi([
  "function addr(bytes32 node) view returns (address)",
  "function text(bytes32 node,string key) view returns (string)",
]);
export const reverseAbi = parseAbi([
  "function setNameWithHCA(address owner,string name)",
  "function DEFAULT_REVERSE_REGISTRAR() view returns (address)",
]);
export const defaultReverseAbi = parseAbi([
  "function nameForAddr(address account) view returns (string)",
]);
