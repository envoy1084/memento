// Generated from MementoNameVault.sol by packages/chain/scripts/generate-abis.mjs.
export const MementoNameVaultAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "registry_",
        type: "address",
        internalType: "contract IEnsRegistry",
      },
      {
        name: "factory_",
        type: "address",
        internalType: "contract IVerifiableFactory",
      },
      {
        name: "resolverImplementation_",
        type: "address",
        internalType: "address",
      },
      {
        name: "owner_",
        type: "address",
        internalType: "address",
      },
      {
        name: "coordinator_",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "INTENT_TYPEHASH",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "activateCoordinator",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "activeGift",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "authorizationDigest",
    inputs: [
      {
        name: "intent",
        type: "tuple",
        internalType: "struct ClaimAuthorization.Intent",
        components: [
          {
            name: "giftId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "hca",
            type: "address",
            internalType: "address",
          },
          {
            name: "resolver",
            type: "address",
            internalType: "address",
          },
          {
            name: "labelhash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "nonce",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
      {
        name: "recipientId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "eligible",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimName",
    inputs: [
      {
        name: "intent",
        type: "tuple",
        internalType: "struct ClaimAuthorization.Intent",
        components: [
          {
            name: "giftId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "hca",
            type: "address",
            internalType: "address",
          },
          {
            name: "resolver",
            type: "address",
            internalType: "address",
          },
          {
            name: "labelhash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "nonce",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
      {
        name: "secret",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "label",
        type: "string",
        internalType: "string",
      },
      {
        name: "records",
        type: "tuple[]",
        internalType: "struct MementoNameVault.TextRecord[]",
        components: [
          {
            name: "key",
            type: "string",
            internalType: "string",
          },
          {
            name: "value",
            type: "string",
            internalType: "string",
          },
        ],
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "recipientAuthorization",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "eligibility",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "coordinator",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "coordinatorActivation",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "eip712Domain",
    inputs: [],
    outputs: [
      {
        name: "fields",
        type: "bytes1",
        internalType: "bytes1",
      },
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
      {
        name: "version",
        type: "string",
        internalType: "string",
      },
      {
        name: "chainId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "verifyingContract",
        type: "address",
        internalType: "address",
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "extensions",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IVerifiableFactory",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "gifts",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "sponsor",
        type: "address",
        internalType: "address",
      },
      {
        name: "input",
        type: "tuple",
        internalType: "struct MementoNameVault.Input",
        components: [
          {
            name: "labelhash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "claimHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "restriction",
            type: "tuple",
            internalType: "struct ClaimAuthorization.Recipient",
            components: [
              {
                name: "kind",
                type: "uint8",
                internalType: "uint8",
              },
              {
                name: "id",
                type: "bytes32",
                internalType: "bytes32",
              },
            ],
          },
          {
            name: "recordsHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "expiresAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "worldRequired",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
      {
        name: "status",
        type: "uint8",
        internalType: "enum MementoNameVault.Status",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "intentDigest",
    inputs: [
      {
        name: "intent",
        type: "tuple",
        internalType: "struct ClaimAuthorization.Intent",
        components: [
          {
            name: "giftId",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "hca",
            type: "address",
            internalType: "address",
          },
          {
            name: "resolver",
            type: "address",
            internalType: "address",
          },
          {
            name: "labelhash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "nonce",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "onERC1155BatchReceived",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "onERC1155Received",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "from",
        type: "address",
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "giftData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingCoordinator",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "prepareGift",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "input",
        type: "tuple",
        internalType: "struct MementoNameVault.Input",
        components: [
          {
            name: "labelhash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "claimHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "restriction",
            type: "tuple",
            internalType: "struct ClaimAuthorization.Recipient",
            components: [
              {
                name: "kind",
                type: "uint8",
                internalType: "uint8",
              },
              {
                name: "id",
                type: "bytes32",
                internalType: "bytes32",
              },
            ],
          },
          {
            name: "recordsHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "expiresAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "worldRequired",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "proposeCoordinator",
    inputs: [
      {
        name: "next",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recoverExpired",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "registry",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IEnsRegistry",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resolverImplementation",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [
      {
        name: "id",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usedNonces",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "resolver",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CoordinatorChanged",
    inputs: [
      {
        name: "next",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CoordinatorProposed",
    inputs: [
      {
        name: "next",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "activation",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EIP712DomainChanged",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferStarted",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Prepared",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sponsor",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "labelhash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Recovered",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sponsor",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "InvalidClaim",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidShortString",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidState",
    inputs: [],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
  {
    type: "error",
    name: "SafeCastOverflowedUintDowncast",
    inputs: [
      {
        name: "bits",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "StringTooLong",
    inputs: [
      {
        name: "str",
        type: "string",
        internalType: "string",
      },
    ],
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: [],
  },
] as const;
