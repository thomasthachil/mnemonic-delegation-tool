"use client"

import { useState, useSyncExternalStore } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { type HDAccount, mnemonicToAccount } from "viem/accounts"
import { createWalletClient, fallback, http, publicActions, type Transport } from "viem"
import { mainnet, optimism, base, unichain, bsc, arbitrum, celo, polygon, monad, tempo, robinhood } from "viem/chains"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2, KeyRound, Crosshair, Search, Ban, ExternalLink, Eye, EyeOff } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const formSchema = z.object({
  mnemonic: z.string().min(12, {
    message: "Mnemonic must be at least 12 words",
  }),
  derivationIndex: z.string(),
  contractAddress: z.string().min(42, {
    message: "Please enter a valid contract address",
  }),
  chain: z.string(),
})

const chains = {
  mainnet: mainnet,
  unichain: unichain,
  optimism: optimism,
  base: base,
  bsc: bsc,
  arbitrum: arbitrum,
  celo: celo,
  polygon: polygon,
  monad: monad,
  tempo: tempo,
  robinhood: robinhood,
}

// Custom RPC endpoints (keyless public providers) that are more reliable than
// viem's chain defaults. Chains omitted here fall back to the viem default.
const rpcUrls: Partial<Record<keyof typeof chains, string[]>> = {
  mainnet: [
    "https://eth-mainnet.public.blastapi.io",
    "https://ethereum-rpc.publicnode.com",
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
  ],
}

// Build a transport for a chain: a fallback over the custom RPC list when one
// exists, otherwise viem's default transport.
function transportFor(chainKey: keyof typeof chains): Transport {
  const urls = rpcUrls[chainKey]
  if (!urls || urls.length === 0) return http()
  return fallback(urls.map(url => http(url)))
}

// Build a block-explorer link for a tx hash or address on a given chain.
function explorerUrl(chainKey: keyof typeof chains, kind: "tx" | "address", value: string): string | null {
  const base = chains[chainKey]?.blockExplorers?.default?.url
  return base ? `${base}/${kind}/${value}` : null
}

// Abbreviate a long hex string as 0x1234…abcd for compact readouts.
function shortHex(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value
}

// Chain styling. `logo` is an official mark from DefiLlama's icon CDN; `icon`
// (emoji) stays as a graceful fallback if the image fails to load.
const chainLogo = (slug: string) => `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`

const chainStyles = {
  mainnet: { color: "#627EEA", icon: "⟠", label: "Mainnet", logo: chainLogo("ethereum") },
  unichain: { color: "#FF007A", icon: "🦄", label: "Unichain", logo: chainLogo("unichain") },
  // sepolia: { color: "#9064FF", icon: "🧪", label: "Sepolia" },
  optimism: { color: "#FF0420", icon: "🔴", label: "Optimism", logo: chainLogo("optimism") },
  base: { color: "#0052FF", icon: "🔵", label: "Base", logo: chainLogo("base") },
  // unichainSepolia: { color: "#FF007A", icon: "🦄", label: "Unichain Sepolia" },
  arbitrum: { color: "#12AAFF", icon: "🔗", label: "Arbitrum", logo: chainLogo("arbitrum") },
  celo: { color: "#FCFF52", icon: "🔗", label: "Celo", logo: chainLogo("celo") },
  polygon: { color: "#8247E5", icon: "🔗", label: "Polygon", logo: chainLogo("polygon") },
  bsc: { color: "#F0B90B", icon: "🔗", label: "BSC", logo: chainLogo("binance") },
  monad: { color: "#836EF9", icon: "🟣", label: "Monad", logo: chainLogo("monad") },
  tempo: { color: "#635BFF", icon: "🎵", label: "Tempo", logo: chainLogo("tempo") },
  robinhood: { color: "#CCFF00", icon: "🪶", label: "Robinhood", logo: chainLogo("robinhood") },
  // blast: { color: "#FF007A", icon: "🔗", label: "Blast" },
  // worldchain: { color: "#FF007A", icon: "🔗", label: "Worldchain" },
  // avalanche: { color: "#FF007A", icon: "🔗", label: "Avalanche" },
}

// Contract addresses by chain
const contractAddresses = {
  metamask: {
    mainnet: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    sepolia: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    base: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    arbitrum: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    celo: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    polygon: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
  },
  // Alchemy Modular Account v2, same address on all supported EVM chains
  alchemy: {
    mainnet: "0x69007702764179f14F51cdce752f4f775d74E139",
    unichain: "0x69007702764179f14F51cdce752f4f775d74E139",
    optimism: "0x69007702764179f14F51cdce752f4f775d74E139",
    base: "0x69007702764179f14F51cdce752f4f775d74E139",
    bsc: "0x69007702764179f14F51cdce752f4f775d74E139",
    arbitrum: "0x69007702764179f14F51cdce752f4f775d74E139",
    celo: "0x69007702764179f14F51cdce752f4f775d74E139",
    polygon: "0x69007702764179f14F51cdce752f4f775d74E139",
    monad: "0x69007702764179f14F51cdce752f4f775d74E139",
  },
  // Calibur v1.0
  uniswap: {
    mainnet: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    unichain: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    optimism: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    base: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    bsc: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    arbitrum: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    monad: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    tempo: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
  },
  // Calibur v1.1
  uniswapNew: {
    mainnet: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    unichain: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    optimism: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    base: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    bsc: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    arbitrum: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    monad: "0x000000005c84F8Fd50b21CAC312528A64437030e",
    robinhood: "0x000000005c84F8Fd50b21CAC312528A64437030e",
  },

}

// Contract provider styling
const contractProviderStyles = {
  uniswapNew: { color: "#FF007A", icon: "🦄", label: "Uniswap v1.1 (latest)" },
  uniswap: { color: "#FF007A", icon: "🦄", label: "Uniswap v1.0 (old)" },
  metamask: { color: "#F6851B", icon: "🦊", label: "MetaMask" },
  alchemy: { color: "#363FF9", icon: "⚗️", label: "Alchemy" },
  undelegate: { color: "#FF3B30", icon: "❌", label: "Undelegate" }
}

// Known delegation targets keyed by lowercased address, for friendly labels
const knownDelegationTargets: Record<string, string> = {
  "0x000000005c84f8fd50b21cac312528a64437030e": "Uniswap v1.1 (latest)",
  "0x000000009b1d0af20d8c6d0a44e162d11f9b8f00": "Uniswap v1.0 (old)",
  "0x3cbad1e3b9049ecdb9588fb48dd61d80faf41bd5": "Uniswap (legacy)",
  "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b": "MetaMask",
  "0x69007702764179f14f51cdce752f4f775d74e139": "Alchemy",
}

type ChainKey = keyof typeof chains

// Renders a chain's official logo, falling back to its emoji glyph on load error.
function ChainIcon({ chainKey, size = 20 }: { chainKey: keyof typeof chainStyles; size?: number }) {
  const style = chainStyles[chainKey]
  const [errored, setErrored] = useState(false)
  if (!style) return null
  if (errored || !style.logo) {
    return (
      <span className="leading-none" style={{ color: style.color, fontSize: size * 0.85 }}>
        {style.icon}
      </span>
    )
  }
  return (
    <img
      src={style.logo}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErrored(true)}
      className="shrink-0 rounded-full bg-secondary object-cover"
      style={{ width: size, height: size }}
    />
  )
}

type FormValues = z.infer<typeof formSchema>;

// EIP-3074 AUTH opcode prefixed bytecode signature
const EIP_7702_BYTECODE_PREFIX = "0xef0100"

export default function DelegationForm() {
  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null
    message: string
    txHash?: `0x${string}`
    chain?: ChainKey
    isConfirmed?: boolean
    delegationVerified?: boolean
  }>({ type: null, message: "" })
  const [account, setAccount] = useState<HDAccount | null>(null)
  const [undelegatingAll, setUndelegatingAll] = useState(false)
  const [undelegateAll, setUndelegateAll] = useState<Record<string, {
    status: "pending" | "success" | "error"
    txHash?: `0x${string}`
    message?: string
  }> | null>(null)
  const [checkingDelegations, setCheckingDelegations] = useState(false)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [delegations, setDelegations] = useState<Record<string, {
    status: "pending" | "done" | "error"
    delegatedTo?: string | null
    message?: string
  }> | null>(null)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mnemonic: "",
      derivationIndex: "0",
      contractAddress: "",
      chain: "mainnet",
    },
  })

  const setContractAddress = (address: string) => {
    form.setValue("contractAddress", address);
  };

  async function onSubmit(values: FormValues) {
    try {
      setStatus({ type: "loading", message: "Processing delegation..." })

      // Generate account from mnemonic
      const derivationInd = Number.parseInt(values.derivationIndex)
      const account = mnemonicToAccount(values.mnemonic, { addressIndex: derivationInd })
      setAccount(account)

      // Get chain configuration
      const chainKey = values.chain as ChainKey
      const chainConfig = chains[chainKey]

      // Create wallet client for the selected chain
      const walletClient = createWalletClient({
        account,
        chain: chainConfig,
        transport: transportFor(chainKey),
      }).extend(publicActions)

      // Sign authorization
      const authorization = await walletClient.signAuthorization({
        account,
        contractAddress: values.contractAddress as `0x${string}`,
        executor: 'self'
      })

      const encodedDataHex = "0x" as `0x${string}`

      // estimate gas without authorization because it fails for some reason
      const gas = await walletClient.estimateGas({
        // authorizationList: [authorization],
        data: encodedDataHex,
        value: BigInt(0),
        to: account.address,
      })

      // Send transaction on the same chain
      const hash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        data: encodedDataHex,
        value: BigInt(0),
        to: account.address,
        chainId: chainConfig.id,
        gas: gas + BigInt(210000), // offset with authorization gas cost
      })

      // Update status with transaction hash
      setStatus({
        type: "success",
        message: "Transaction submitted successfully!",
        txHash: hash,
        chain: chainKey,
        isConfirmed: false
      })

      // Wait for transaction confirmation
      try {
        const receipt = await walletClient.waitForTransactionReceipt({ hash })
        setStatus(prev => ({ 
          ...prev, 
          message: "Transaction confirmed! Verifying delegation...",
          isConfirmed: true 
        }))
        
        // Verify delegation by checking if the expected contract address is set
        try {
          // Get the target contract address
          const targetContractAddress = values.contractAddress as `0x${string}`
          
          // Check the delegation status through the code at the address
          // or by making a specific call to a method that checks delegation
          const code = await walletClient.getCode({
            address: account.address
          })
          
          const isDelegated = code?.startsWith(EIP_7702_BYTECODE_PREFIX) ? '0x' + code.slice(EIP_7702_BYTECODE_PREFIX.length).toLowerCase() === targetContractAddress.toLowerCase()  : false

          setStatus(prev => ({
            ...prev,
            message: isDelegated 
              ? "Delegation verified successfully!" 
              : "Transaction confirmed but delegation verification failed.",
            delegationVerified: isDelegated
          }))
        } catch (error) {
          console.error("Error verifying delegation:", error)
          setStatus(prev => ({
            ...prev,
            message: "Transaction confirmed but could not verify delegation status.",
            delegationVerified: false
          }))
        }
      } catch (error) {
        console.error("Error waiting for transaction confirmation:", error)
        setStatus(prev => ({ 
          ...prev, 
          message: prev.message + " Error confirming transaction." 
        }))
      }
    } catch (error) {
      console.error(error)
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    }
  }

  const handlePresetContract = (type: keyof typeof contractProviderStyles) => {
    if (type === 'undelegate') {
      setContractAddress("0x0000000000000000000000000000000000000000");
      return;
    }

    const chainValue = form.getValues('chain');
    const addresses: Record<string, string> = contractAddresses[type];
    if (chainValue in addresses) {
      setContractAddress(addresses[chainValue]);
    }
  };

  // Blanket undelegate: clear the EIP-7702 delegation (authorize the zero
  // address) on every supported chain in one click.
  async function handleUndelegateAll() {
    const isValid = await form.trigger("mnemonic")
    if (!isValid) return

    const values = form.getValues()
    const derivationInd = Number.parseInt(values.derivationIndex || "0")
    const account = mnemonicToAccount(values.mnemonic, { addressIndex: derivationInd })
    setAccount(account)

    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const
    const chainKeys = Object.keys(chains) as ChainKey[]

    setUndelegatingAll(true)
    setUndelegateAll(Object.fromEntries(chainKeys.map(key => [key, { status: "pending" as const }])))

    await Promise.allSettled(chainKeys.map(async (chainKey) => {
      try {
        const chainConfig = chains[chainKey]
        const walletClient = createWalletClient({
          account,
          chain: chainConfig,
          transport: transportFor(chainKey),
        }).extend(publicActions)

        const authorization = await walletClient.signAuthorization({
          account,
          contractAddress: ZERO_ADDRESS,
          executor: 'self',
        })

        const encodedDataHex = "0x" as `0x${string}`

        const gas = await walletClient.estimateGas({
          data: encodedDataHex,
          value: BigInt(0),
          to: account.address,
        })

        const hash = await walletClient.sendTransaction({
          authorizationList: [authorization],
          data: encodedDataHex,
          value: BigInt(0),
          to: account.address,
          chainId: chainConfig.id,
          gas: gas + BigInt(210000),
        })

        setUndelegateAll(prev => ({
          ...prev,
          [chainKey]: { status: "success", txHash: hash, message: "Submitted" },
        }))
      } catch (error) {
        setUndelegateAll(prev => ({
          ...prev,
          [chainKey]: {
            status: "error",
            message: error instanceof Error ? error.message.split("\n")[0] : "Failed",
          },
        }))
      }
    }))

    setUndelegatingAll(false)
  };

  // Read the current EIP-7702 delegation for the derived account on every chain.
  async function handleCheckDelegations() {
    const isValid = await form.trigger("mnemonic")
    if (!isValid) return

    const values = form.getValues()
    const derivationInd = Number.parseInt(values.derivationIndex || "0")
    const account = mnemonicToAccount(values.mnemonic, { addressIndex: derivationInd })
    setAccount(account)

    const chainKeys = Object.keys(chains) as ChainKey[]

    setCheckingDelegations(true)
    setDelegations(Object.fromEntries(chainKeys.map(key => [key, { status: "pending" as const }])))

    await Promise.allSettled(chainKeys.map(async (chainKey) => {
      try {
        const chainConfig = chains[chainKey]
        const client = createWalletClient({
          account,
          chain: chainConfig,
          transport: transportFor(chainKey),
        }).extend(publicActions)

        const code = await client.getCode({ address: account.address })
        const delegatedTo = code && code.startsWith(EIP_7702_BYTECODE_PREFIX)
          ? ("0x" + code.slice(EIP_7702_BYTECODE_PREFIX.length)).toLowerCase()
          : null

        setDelegations(prev => ({
          ...prev,
          [chainKey]: { status: "done", delegatedTo },
        }))
      } catch (error) {
        setDelegations(prev => ({
          ...prev,
          [chainKey]: {
            status: "error",
            message: error instanceof Error ? error.message.split("\n")[0] : "Failed",
          },
        }))
      }
    }))

    setCheckingDelegations(false)
  };

  // Don't render UI until mounted to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="overflow-hidden">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" aria-hidden />
            <CardContent className="space-y-7 p-5 sm:p-6">
              <section className="space-y-5">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <h2 className="console-label">Source key</h2>
                </div>
                <FormField
                  control={form.control}
                  name="mnemonic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recovery phrase</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            placeholder="word one  word two  word three  …"
                            className="min-h-[88px] resize-y pr-10 font-mono text-sm leading-relaxed"
                            autoComplete="off"
                            spellCheck={false}
                            style={showMnemonic ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowMnemonic(prev => !prev)}
                            aria-label={showMnemonic ? "Hide recovery phrase" : "Show recovery phrase"}
                            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {showMnemonic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        12–24 words. Processed in this browser only. Hidden while typing — use the eye to reveal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="derivationIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Derivation index</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" className="max-w-32 font-mono" {...field} />
                      </FormControl>
                      <FormDescription>Account index to derive (default 0).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <div className="h-px bg-border" aria-hidden />

              <section className="space-y-5">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-3.5 w-3.5 text-primary" />
                  <h2 className="console-label">Target</h2>
                </div>

          <FormField
            control={form.control}
            name="chain"
            render={({ field }) => {
              const selectedChain = field.value as keyof typeof chainStyles;
              
              return (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chain">
                          {field.value && (
                            <div className="flex items-center gap-2">
                              <ChainIcon chainKey={selectedChain} size={18} />
                              {chainStyles[selectedChain].label}
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(chainStyles).map(([key, { label }]) => (
                        <SelectItem key={key} value={key} className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <ChainIcon chainKey={key as keyof typeof chainStyles} size={18} />
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Where the authorization is signed and the transaction is sent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

                <FormField
                  control={form.control}
                  name="contractAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delegate to</FormLabel>
                      <FormControl>
                        <Input placeholder="0x…" className="font-mono text-sm" autoComplete="off" spellCheck={false} {...field} />
                      </FormControl>
                      <FormDescription>
                        The smart-account contract to authorize. Pick a preset or paste an address.
                      </FormDescription>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(contractProviderStyles).map(([key, { color, icon, label }]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handlePresetContract(key as keyof typeof contractProviderStyles)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <span className="text-sm leading-none" style={{ color }}>{icon}</span>
                            {key === 'undelegate' ? 'Zero address' : label}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </CardContent>
          </Card>

          <div className="mt-5 space-y-3">
            <Button
              type="submit"
              size="lg"
              className="w-full text-[15px] font-semibold"
              disabled={status.type === "loading" || undelegatingAll}
            >
              {status.type === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Sign &amp; delegate
                </>
              )}
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={checkingDelegations}
                onClick={handleCheckDelegations}
              >
                {checkingDelegations ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Check delegations
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={status.type === "loading" || undelegatingAll}
                onClick={handleUndelegateAll}
              >
                {undelegatingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Revoking…
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Revoke all chains
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="text-foreground/80">Revoke all chains</span> clears your delegation
              everywhere at once. Each chain spends gas from the derived account; chains with no balance
              fail and are safe to ignore.
            </p>
          </div>
        </form>
      </Form>

      {delegations && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="console-label">Current delegations</h3>
              <span className="font-mono text-[11px] text-muted-foreground">{Object.keys(delegations).length} chains</span>
            </div>
            <ul className="divide-y divide-border">
              {Object.entries(delegations).map(([key, result]) => {
                const style = chainStyles[key as keyof typeof chainStyles]
                const label = style?.label ?? key
                const known = result.delegatedTo ? knownDelegationTargets[result.delegatedTo] : undefined
                const link = result.delegatedTo ? explorerUrl(key as ChainKey, "address", result.delegatedTo) : null
                return (
                  <li key={key} className="flex items-center gap-3 py-2.5">
                    <ChainIcon chainKey={key as keyof typeof chainStyles} size={20} />
                    <span className="w-20 shrink-0 text-sm font-medium">{label}</span>
                    <div className="min-w-0 flex-1 text-right">
                      {result.status === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>
                      ) : result.status === "error" ? (
                        <span className="text-xs text-destructive">RPC error</span>
                      ) : result.delegatedTo ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {known ?? "Delegated"}</span>
                          {link ? (
                            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground">{shortHex(result.delegatedTo)} <ExternalLink className="h-3 w-3" /></a>
                          ) : (
                            <span className="font-mono text-[11px] text-muted-foreground">{shortHex(result.delegatedTo)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Not delegated</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {undelegateAll && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="console-label">Revoke — all chains</h3>
              <span className="font-mono text-[11px] text-muted-foreground">{Object.keys(undelegateAll).length} chains</span>
            </div>
            <ul className="divide-y divide-border">
              {Object.entries(undelegateAll).map(([key, result]) => {
                const style = chainStyles[key as keyof typeof chainStyles]
                const label = style?.label ?? key
                const link = result.txHash ? explorerUrl(key as ChainKey, "tx", result.txHash) : null
                return (
                  <li key={key} className="flex items-center gap-3 py-2.5">
                    <ChainIcon chainKey={key as keyof typeof chainStyles} size={20} />
                    <span className="w-20 shrink-0 text-sm font-medium">{label}</span>
                    <div className="min-w-0 flex-1 text-right">
                      {result.status === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Submitting…</span>
                      ) : result.status === "success" ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Submitted</span>
                          {result.txHash && (link ? (
                            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground">{shortHex(result.txHash)} <ExternalLink className="h-3 w-3" /></a>
                          ) : (
                            <span className="font-mono text-[11px] text-muted-foreground">{shortHex(result.txHash)}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="max-w-[60%] truncate text-xs text-destructive" title={result.message}>{result.message ?? "Failed"}</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {account && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <p className="console-label mb-1.5">Derived account</p>
            <p className="break-all font-mono text-sm">{account.address}</p>
          </CardContent>
        </Card>
      )}

      {status.type && (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? 
            <AlertCircle className="h-4 w-4" /> : 
            status.type === "loading" ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              <CheckCircle2 className="h-4 w-4" />
          }
          <AlertTitle>{status.type === "error" ? "Something went wrong" : status.type === "loading" ? "Working…" : "Transaction sent"}</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{status.message}</p>
              
              {status.txHash && (
                <div className="mt-2">
                  <p className="console-label mb-1">Transaction</p>
                  {status.chain && explorerUrl(status.chain, "tx", status.txHash) ? (
                    <a
                      href={explorerUrl(status.chain, "tx", status.txHash)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs hover:text-foreground"
                    >
                      {shortHex(status.txHash)} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="font-mono text-xs break-all">{status.txHash}</p>
                  )}
                </div>
              )}
              
              {status.txHash && (
                <div className="mt-1">
                  <p className="console-label mb-1">Status</p>
                  <div className="flex items-center">
                    {status.isConfirmed ? (
                      <span className="inline-block w-2 h-2 rounded-full mr-2 bg-green-500"></span>
                    ) : (
                      <Loader2 className="h-3 w-3 mr-2 text-yellow-500 animate-spin" />
                    )}
                    <p className="text-sm">{status.isConfirmed ? 'Confirmed' : 'Pending'}</p>
                  </div>
                </div>
              )}

              {status.isConfirmed && (
                <div className="mt-1">
                  <p className="console-label mb-1">Delegation check</p>
                  <div className="flex items-center">
                    {status.delegationVerified === undefined ? (
                      <Loader2 className="h-3 w-3 mr-2 text-yellow-500 animate-spin" />
                    ) : (
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        status.delegationVerified ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                    )}
                    <p className="text-sm">{
                      status.delegationVerified === true ? 'Verified' : 
                      status.delegationVerified === false ? 'Failed' : 'Verifying...'
                    }</p>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
