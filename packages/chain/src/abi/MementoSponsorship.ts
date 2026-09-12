// Generated from MementoSponsorship.sol by packages/chain/scripts/generate-abis.mjs.
export const MementoSponsorshipAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "token_",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "factory_",
        type: "address",
        internalType: "contract IHcaFactory",
      },
      {
        name: "registry_",
        type: "address",
        internalType: "contract IEnsRegistry",
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
    name: "campaignClaimId",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "index",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "campaigns",
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
        name: "root",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "policy",
        type: "tuple",
        internalType: "struct MementoSponsorship.Policy",
        components: [
          {
            name: "maxPrice",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "expiresAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "duration",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "minLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "maxLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "worldRequired",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
      {
        name: "count",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "reserved",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "available",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "closed",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancel",
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
    name: "completeGift",
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
    name: "createCampaign",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "root",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "count",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "policy",
        type: "tuple",
        internalType: "struct MementoSponsorship.Policy",
        components: [
          {
            name: "maxPrice",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "expiresAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "duration",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "minLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "maxLength",
            type: "uint8",
            internalType: "uint8",
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
    name: "createGift",
    inputs: [
      {
        name: "id",
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
        name: "policy",
        type: "tuple",
        internalType: "struct MementoSponsorship.Policy",
        components: [
          {
            name: "maxPrice",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "expiresAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "duration",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "minLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "maxLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "worldRequired",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
      {
        name: "metadataHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
        name: "policy",
        type: "tuple",
        internalType: "struct MementoSponsorship.Policy",
        components: [
          {
            name: "maxPrice",
            type: "uint96",
            internalType: "uint96",
          },
          {
            name: "expiresAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "duration",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "minLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "maxLength",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "worldRequired",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
      {
        name: "metadataHash",
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
        name: "labelhash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "remaining",
        type: "uint96",
        internalType: "uint96",
      },
      {
        name: "status",
        type: "uint8",
        internalType: "enum MementoSponsorship.Status",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hcaFactory",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IHcaFactory",
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
    name: "invitationLeaf",
    inputs: [
      {
        name: "index",
        type: "uint32",
        internalType: "uint32",
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
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "invitationsUsed",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "",
        type: "uint32",
        internalType: "uint32",
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
    name: "paymentToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IERC20",
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
    name: "refundCampaign",
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
    name: "refundExpired",
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
    name: "releaseToHca",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "amount",
        type: "uint96",
        internalType: "uint96",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "reserveCampaignClaim",
    inputs: [
      {
        name: "campaignId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "index",
        type: "uint32",
        internalType: "uint32",
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
        name: "secret",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "proof",
        type: "bytes32[]",
        internalType: "bytes32[]",
      },
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
    name: "reserveGift",
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
    name: "CampaignCreated",
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
        name: "root",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Completed",
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
    name: "EIP712DomainChanged",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "GiftCreated",
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
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
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
    name: "Refunded",
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
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Released",
    inputs: [
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "hca",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint96",
        indexed: false,
        internalType: "uint96",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Reserved",
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
        name: "hca",
        type: "address",
        indexed: false,
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
    name: "SafeERC20FailedOperation",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
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
