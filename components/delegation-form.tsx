"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldValues } from "react-hook-form"
import { z } from "zod"
import { type HDAccount, mnemonicToAccount } from "viem/accounts"
import { createWalletClient, http, publicActions } from "viem"
import { mainnet, sepolia, optimism, base, unichain, unichainSepolia, arbitrum, opBNB, polygon, blast, worldchain, avalanche, zora, soneium } from "viem/chains"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const formSchema = z.object({
  mnemonic: z.string().min(12, {
    message: "Mnemonic must be at least 12 words",
  }),
  derivationIndex: z.string().default("0"),
  contractAddress: z.string().min(42, {
    message: "Please enter a valid contract address",
  }),
  chain: z.string(),
})

const chains = {
  mainnet: mainnet,
  unichain: unichain,
  sepolia: sepolia,
  optimism: optimism,
  base: base,
  unichainSepolia: unichainSepolia,
  arbitrum: arbitrum,
  polygon: polygon,
  opBNB: opBNB,
  blast: blast,
  worldchain: worldchain,
  avalanche: avalanche,
  zora: zora,
  soneium: soneium,
}

// Chain styling
const chainStyles = {
  mainnet: { color: "#29B6AF", icon: "⟠", label: "Mainnet" },
  unichain: { color: "#FF007A", icon: "🦄", label: "Unichain" },
  sepolia: { color: "#9064FF", icon: "🧪", label: "Sepolia" },
  optimism: { color: "#FF0420", icon: "🔴", label: "Optimism" },
  base: { color: "#0052FF", icon: "🔵", label: "Base" },
  unichainSepolia: { color: "#FF007A", icon: "🦄", label: "Unichain Sepolia" },
  arbitrum: { color: "#FF007A", icon: "🔗", label: "Arbitrum" },
  polygon: { color: "#FF007A", icon: "🔗", label: "Polygon" },
  opBNB: { color: "#FF007A", icon: "🔗", label: "OpBNB" },
  blast: { color: "#FF007A", icon: "🔗", label: "Blast" },
  worldchain: { color: "#FF007A", icon: "🔗", label: "Worldchain" },
  avalanche: { color: "#FF007A", icon: "🔗", label: "Avalanche" },
}

// Contract addresses by chain
const contractAddresses = {
  metamask: {
    mainnet: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    sepolia: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
  },
  uniswap: {
    mainnet: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    sepolia: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    unichain: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    optimism: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    base: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    unichainSepolia: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    arbitrum: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    polygon: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    opBNB: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    blast: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    worldchain: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
  },
  uniswapNew: {
    mainnet: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    sepolia: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    unichain: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    optimism: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    base: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    unichainSepolia: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    arbitrum: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    polygon: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    opBNB: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    blast: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
    worldchain: "0x0c338ca25585035142A9a0a1EEebA267256f281f",
  },

}

// Contract provider styling
const contractProviderStyles = {
  metamask: { color: "#F6851B", icon: "🦊", label: "MetaMask" },
  uniswap: { color: "#FF007A", icon: "🦄", label: "Uniswap" },
  uniswapNew: { color: "#FF007A", icon: "🦄", label: "New Uniswap" },
  undelegate: { color: "#FF3B30", icon: "❌", label: "Undelegate" }
}

type ChainKey = keyof typeof chains

type FormValues = z.infer<typeof formSchema>;

// EIP-3074 AUTH opcode prefixed bytecode signature
const EIP_7702_BYTECODE_PREFIX = "0xef0100"

export default function DelegationForm() {
  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null
    message: string
    txHash?: `0x${string}`
    isConfirmed?: boolean
    delegationVerified?: boolean
  }>({ type: null, message: "" })
  const [account, setAccount] = useState<HDAccount | null>(null)
  const [mounted, setMounted] = useState(false)

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

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
        transport: http(),
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

  const handlePresetContract = (type: 'metamask' | 'uniswap' | 'undelegate' | 'uniswapNew') => {
    const chainValue = form.getValues('chain');
    
    if (type === 'metamask' && chainValue in contractAddresses.metamask) {
      setContractAddress(contractAddresses.metamask[chainValue as keyof typeof contractAddresses.metamask]);
    } else if (type === 'uniswap' && chainValue in contractAddresses.uniswap) {
      setContractAddress(contractAddresses.uniswap[chainValue as keyof typeof contractAddresses.uniswap]);
    } else if (type === 'uniswapNew' && chainValue in contractAddresses.uniswapNew) {
      setContractAddress(contractAddresses.uniswapNew[chainValue as keyof typeof contractAddresses.uniswapNew]);
    } else if (type === 'undelegate') {
      setContractAddress("0x0000000000000000000000000000000000000000");
    }
  };

  // Don't render UI until mounted to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="mnemonic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mnemonic Phrase</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter your mnemonic phrase (12-24 words)" className="font-mono" {...field} />
                </FormControl>
                <FormDescription>
                  Your mnemonic phrase is processed locally and never sent to any server.
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
                <FormLabel>Derivation Index</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>The index to derive your account from (default: 0)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="chain"
            render={({ field }) => {
              const selectedChain = field.value as keyof typeof chainStyles;
              
              return (
                <FormItem>
                  <FormLabel>Blockchain Network</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chain">
                          {field.value && (
                            <div className="flex items-center gap-2">
                              <span className="text-lg" style={{ color: chainStyles[selectedChain].color }}>
                                {chainStyles[selectedChain].icon}
                              </span>
                              {chainStyles[selectedChain].label}
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(chainStyles).map(([key, { color, icon, label }]) => (
                        <SelectItem key={key} value={key} className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg" style={{ color: color }}>{icon}</span>
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The blockchain network where the delegation contract is deployed and transaction will be sent
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
                <FormLabel>Delegation Contract Address</FormLabel>
                <FormControl>
                  <Input placeholder="0x..." className="font-mono" {...field} />
                </FormControl>
                <FormDescription className="mb-0">
                  The address of the delegation contract on the source chain
                </FormDescription>
                <div className="flex gap-2 mt-2">
                  {Object.entries(contractProviderStyles).map(([key, { color, icon, label }]) => (
                    <Button 
                      key={key}
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handlePresetContract(key as 'metamask' | 'uniswap' | 'undelegate' | 'uniswapNew')}
                      className="flex items-center gap-1"
                      style={{ borderColor: color }}
                    >
                      <span className="text-base" style={{ color }}>{icon}</span>
                      <span>{key === 'undelegate' ? 'Undelegate' : `Use ${label} Contract`}</span>
                    </Button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={status.type === "loading"}>
            {status.type === "loading" ? "Processing..." : "Delegate"}
          </Button>
        </form>
      </Form>

      {account && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-2">Account Information</h3>
            <p className="font-mono text-sm break-all">
              <span className="font-semibold">Address:</span> {account.address}
            </p>
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
          <AlertTitle>{status.type === "error" ? "Error" : status.type === "loading" ? "Processing" : "Success"}</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{status.message}</p>
              
              {status.txHash && (
                <div className="mt-2">
                  <p className="font-semibold text-sm">Transaction Hash:</p>
                  <p className="font-mono text-xs break-all">{status.txHash}</p>
                </div>
              )}
              
              {status.txHash && (
                <div className="mt-1">
                  <p className="font-semibold text-sm">Status:</p>
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
                  <p className="font-semibold text-sm">Delegation Verification:</p>
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
