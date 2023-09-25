import { chains } from "chain-registry";
import { getOfflineSignerProto as getOfflineSigner } from "cosmjs-utils";
import { evmos, ibc } from "./codegen_grpc_gateway";
import { Int53, Uint53, Decimal } from "@cosmjs/math";
import { BroadcastMode } from "./codegen_grpc_gateway/cosmos/tx/v1beta1/service";
import Long from "long";
//----
import {
  broadcast,
  getSender,
  signTransaction,
} from "@hanchon/evmos-ts-wallet";
import {
  GasPrice,
  SignerData,
  SigningStargateClient,
  StdFee,
  accountFromAny,
} from "@cosmjs/stargate";
import { PubKey } from "./codegen_grpc_gateway/ethermint/crypto/v1/ethsecp256k1/keys";
import { Any } from "./codegen_grpc_gateway/google/protobuf/any";
import { TxRaw } from "./codegen_grpc_gateway/cosmos/tx/v1beta1/tx";
import {
  OfflineSigner,
  makeAuthInfoBytes,
  makeSignDoc,
} from "@cosmjs/proto-signing";
import { fromBase64 } from "@cosmjs/encoding";
import { DirectEthSecp256k1Wallet } from "@injectivelabs/sdk-ts/dist/cjs/core/accounts/signers/DirectEthSecp256k1Wallet";
import { PrivateKey } from "@injectivelabs/sdk-ts";

//transaction transition is sign => encode => broadcast
// remove telescopeClient, signeraddress param -> evmos only support 1 signer for now
// also add SignerData as param
// reduce the chance of failed to sign by using telescopeClient to get account info
async function sign(
  // telescopeClient: any,
  client: SigningStargateClient, // SigningStargateClient
  signer: DirectEthSecp256k1Wallet, // keplr OfflineSigner
  chainId: string,
  signerAddress: string,
  signerData: SignerData,
  messages: any[],
  fee: StdFee,
  memo: string
) {
  // Query account info, because cosmjs doesn't support Evmos account
  // GET /cosmos/auth/v1beta1/accounts/{address}
  // const baseAccount = await telescopeClient.cosmos.auth.v1beta1.account({
  //   address: signerAddress,
  // });

  // const accountNumber = baseAccount.account?.base_account?.account_number;
  // const sequence = baseAccount.account?.base_account?.sequence;
  // const pubkey = baseAccount.account?.base_account?.pub_key.key;

  const { accountNumber, sequence } = signerData;
  const accountFromSigner = (await signer.getAccounts()).find(
    (account) => account.address === signerAddress
  );
  if (!accountFromSigner) {
    throw new Error("Failed to retrieve account from signer");
  }
  const pubkeyBytes = accountFromSigner.pubkey;

  if (!accountNumber || !sequence || !pubkeyBytes) {
    throw new Error("accountNumber, sequence or pubkeyBytes is null");
  }

  // Custom typeUrl for EVMOS
  const pubk = Any.fromPartial({
    typeUrl: "/ethermint.crypto.v1.ethsecp256k1.PubKey",
    value: PubKey.encode({
      key: pubkeyBytes,
    }).finish(),
  });

  const txBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: messages,
      memo: memo,
    },
  };
  const txBodyBytes = client.registry.encode(txBodyEncodeObject);
  const gasLimit = Int53.fromString(fee.gas).toNumber();
  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey: pubk, sequence }],
    fee.amount,
    gasLimit,
    signerAddress,
    signerAddress
  );
  const signDoc = makeSignDoc(
    txBodyBytes,
    authInfoBytes,
    chainId,
    accountNumber
  );
  const { signature, signed } = await signer.signDirect(signerAddress, signDoc);

  // returns txBytes for broadcast
  return TxRaw.encode({
    bodyBytes: signed.bodyBytes,
    authInfoBytes: signed.authInfoBytes,
    signatures: [fromBase64(signature.signature)],
  }).finish();
}

const main = async () => {
  const mnemonic = "your mnemonic here";
  const privKey = PrivateKey.fromMnemonic(mnemonic);
  const _address = "realio1edc9dwhzp9qzq58f0cslzuqlygeauntcfe4tmp";

  //create client
  const endpoint = "https://realio-api.genznodes.dev";
  const rpcendpoint = "https://realio-rpc.genznodes.dev";
  const client = await evmos.ClientFactory.createGrpcGateWayClient({
    endpoint: endpoint,
  });

  // balance
  // const balance = await client.cosmos.bank.v1beta1.balance({
  //   address: _address,
  //   denom: "ario",
  // });
  // console.log(balance);
  // return;

  // this part is for testing connection
  // const nodeStatus = await client.cosmos.base.tendermint.v1beta1.getNodeInfo(
  //   {}
  // );
  // console.log(nodeStatus);
  // return;

  // get signer data
  let account;
  try {
    account = await client.cosmos.auth.v1beta1.account({
      address: _address,
    });
  } catch (error) {
    console.log(error);
  }

  const baseAccount = account.account;

  let signerData;
  try {
    signerData = {
      accountNumber: Number(baseAccount.base_account?.account_number),
      sequence: Number(baseAccount.base_account?.sequence),
      chainId: "realionetwork_3301-1",
    };
  } catch (error) {
    console.log("error getting signer data!!:", JSON.stringify(signerData));
    return;
  }

  // ethermint signer
  // get privKey in hex
  const privKeyInHash = privKey.toPrivateKeyHex();
  let signer: DirectEthSecp256k1Wallet;
  try {
    signer = await DirectEthSecp256k1Wallet.fromKey(
      Buffer.from(privKeyInHash.substring(2), "hex"),
      "realio"
    );
  } catch (error) {
    console.log("Error when creating signer", error);
    return;
  }

  let SGClient: SigningStargateClient;
  try {
    SGClient = await SigningStargateClient.connectWithSigner(
      rpcendpoint,
      signer as OfflineSigner,
      {
        gasPrice: GasPrice.fromString("50000000ario"),
        prefix: "realio",
      }
    );
  } catch (error) {
    console.log(error);
    return;
  }

  console.log(await signer.getAccounts());

  //--------------------------------------------
  // example for ibc-transfer msg
  //--------------------------------------------

  const stamp = Date.now();
  const timeoutInNanos = (stamp + 1.2e6) * 1e6;
  const { transfer } = ibc.applications.transfer.v1.MessageComposer.withTypeUrl;

  const msg = transfer({
    sourcePort: "transfer",
    sourceChannel: "channel-1",
    token: {
      denom: "ario",
      amount: "8551685000000000",
    },
    sender: _address,
    receiver: "osmo19crd4fwzm9qtf5ln5l3e2vmquhevjwpr7uccsn",
    timeoutHeight: {
      revisionNumber: Long.fromString("0"),
      revisionHeight: Long.fromString("0"),
    },
    timeoutTimestamp: Long.fromNumber(timeoutInNanos),
    memo: "repay",
  });

  const fee = {
    amount: [
      {
        denom: "ario",
        amount: "20000000",
      },
    ],
    gas: "200000",
  };

  const txRawBytes = await sign(
    // client,
    SGClient,
    signer,
    signerData.chainId,
    _address,
    signerData,
    [msg],
    fee,
    "repay"
  ).catch((error) => {
    console.log("error when signing transaction: ", error);
  });

  // const raw = TxRaw.decode(txRawBytes as Uint8Array);
  // console.log(
  //   "body:",
  //   SGClient.registry.decode({
  //     typeUrl: "/cosmos.tx.v1beta1.TxBody",
  //     value: raw.bodyBytes,
  //   })
  // );

  if (!txRawBytes) {
    console.log("error: txRawBytes is null");
    return;
  }

  // uncomment the following snippet to send transaction
  console.time("broadcastTx");
  try {
    const res = await client.cosmos.tx.v1beta1.broadcastTx({
      txBytes: Uint8Array.from(txRawBytes),
      mode: BroadcastMode.BROADCAST_MODE_BLOCK,
      // simulate then comment mode and uncomment tx
      // tx: null,
    });
    console.log(res);
  } catch (error) {
    console.log("tx failed:", error);
  }

  console.timeEnd("broadcastTx");

  // console.log(res);
};

main().then(() => {
  console.log("done");
});
