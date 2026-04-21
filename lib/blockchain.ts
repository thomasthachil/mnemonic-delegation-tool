import { createWalletClient, http, type Chain } from "viem"
import type { HDAccount } from "viem/accounts"

export async function signDelegationAuthorization(account: HDAccount, contractAddress: `0x${string}`, chain: Chain) {
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  return walletClient.signAuthorization({
    account,
    contractAddress,
  })
}

export async function sendDummyTransaction(account: HDAccount, authorization: any, chain: Chain) {
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  return walletClient.sendTransaction({
    authorizationList: [authorization],
    data: "0xdeadbeef",
    to: account.address,
  })
}
