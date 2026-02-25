"use client"

import React, { useState, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Wallet,
  Lock,
  ChevronDown,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  EthereumIcon,
  UnichainIcon,
  OptimismIcon,
  BaseIcon,
  BscIcon,
  ArbitrumIcon,
} from "@/components/chain-icons"
import { type HDAccount, mnemonicToAccount } from "viem/accounts"
import { createWalletClient, http, publicActions } from "viem"
import { mainnet, optimism, base, unichain, bsc, arbitrum } from "viem/chains"

const viemChains = {
  mainnet,
  unichain,
  optimism,
  base,
  bsc,
  arbitrum,
}

type ChainKey = keyof typeof viemChains

const contractAddresses = {
  metamask: {
    mainnet: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    base: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
    arbitrum: "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b",
  } as Record<string, string>,
  uniswap: {
    mainnet: "0x3cbad1e3b9049ecdb9588fb48dd61d80faf41bd5",
    unichain: "0x3cbad1e3b9049ecdb9588fb48dd61d80faf41bd5",
    optimism: "0x3cbad1e3b9049ecdb9588fb48dd61d80faf41bd5",
    base: "0x3cbad1e3b9049ecdb9588fb48dd61d80faf41bd5",
    bsc: "0x3cbad1e3b9049ecdb9588fb48dd61d80faf41bd5",
  } as Record<string, string>,
  uniswapNew: {
    mainnet: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    unichain: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    optimism: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    base: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    bsc: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
    arbitrum: "0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00",
  } as Record<string, string>,
}

const EIP_7702_BYTECODE_PREFIX = "0xef0100"

type ContractPreset = "metamask" | "uniswap" | "uniswapNew" | "undelegate" | "custom"

const CHAIN_UI: {
  key: ChainKey
  name: string
  icon: React.ReactNode
  hover: string
  active: string
  text: string
}[] = [
  { key: "mainnet", name: "Ethereum", icon: <EthereumIcon className="w-7 h-7" />, hover: "hover:border-teal-500", active: "border-teal-500 bg-teal-500/10 shadow-[0_0_15px_rgba(20,184,166,0.3)]", text: "text-teal-500" },
  { key: "unichain", name: "Unichain", icon: <UnichainIcon className="w-7 h-7 rounded-md" />, hover: "hover:border-pink-500", active: "border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]", text: "text-pink-500" },
  { key: "optimism", name: "Optimism", icon: <OptimismIcon className="w-7 h-7 rounded-full" />, hover: "hover:border-red-500", active: "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]", text: "text-red-500" },
  { key: "base", name: "Base", icon: <BaseIcon className="w-7 h-7 rounded-full" />, hover: "hover:border-blue-500", active: "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]", text: "text-blue-500" },
  { key: "bsc", name: "BSC", icon: <BscIcon className="w-7 h-7 rounded-full" />, hover: "hover:border-yellow-500", active: "border-yellow-500 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]", text: "text-yellow-500" },
  { key: "arbitrum", name: "Arbitrum", icon: <ArbitrumIcon className="w-7 h-7 rounded-full" />, hover: "hover:border-sky-500", active: "border-sky-500 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.3)]", text: "text-sky-500" },
]

const CONTRACT_UI: {
  key: ContractPreset
  name: string
  desc: string
  icon: string
  hover: string
  active: string
  chains: ChainKey[]
}[] = [
  { key: "uniswapNew", name: "Uniswap (latest)", desc: "Universal Router v2", icon: "🦄", hover: "hover:border-pink-500", active: "border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]", chains: ["mainnet", "unichain", "optimism", "base", "bsc", "arbitrum"] },
  { key: "metamask", name: "MetaMask", desc: "Native Delegation", icon: "🦊", hover: "hover:border-orange-500", active: "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)]", chains: ["mainnet", "base", "arbitrum"] },
  { key: "uniswap", name: "Uniswap (old)", desc: "Legacy Router", icon: "🦄", hover: "hover:border-fuchsia-500", active: "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.3)]", chains: ["mainnet", "unichain", "optimism", "base", "bsc"] },
  { key: "undelegate", name: "Undelegate", desc: "Remove Delegation", icon: "❌", hover: "hover:border-red-500", active: "border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]", chains: ["mainnet", "unichain", "optimism", "base", "bsc", "arbitrum"] },
  { key: "custom", name: "Custom", desc: "Enter address manually", icon: "✏️", hover: "hover:border-zinc-400", active: "border-zinc-400 bg-zinc-400/10 shadow-[0_0_15px_rgba(161,161,170,0.3)]", chains: ["mainnet", "unichain", "optimism", "base", "bsc", "arbitrum"] },
]

export default function DelegationForm() {
  const [seedPhrase, setSeedPhrase] = useState("")
  const [isMasked, setIsMasked] = useState(true)
  const [derivationIndex, setDerivationIndex] = useState("0")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedChain, setSelectedChain] = useState<ChainKey | null>(null)
  const [selectedContract, setSelectedContract] = useState<ContractPreset | null>(null)
  const [customAddress, setCustomAddress] = useState("")

  const [account, setAccount] = useState<HDAccount | null>(null)
  const [status, setStatus] = useState<{
    type: "success" | "error" | "loading" | null
    message: string
    txHash?: `0x${string}`
    isConfirmed?: boolean
    delegationVerified?: boolean
  }>({ type: null, message: "" })

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const wordCount = seedPhrase
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
  const isSeedValid = wordCount >= 12
  const showChainSelection = isSeedValid
  const showContractSelection = showChainSelection && selectedChain !== null

  const getContractAddress = (): `0x${string}` | null => {
    if (!selectedContract || !selectedChain) return null
    if (selectedContract === "custom") {
      return customAddress.length >= 42 ? (customAddress as `0x${string}`) : null
    }
    if (selectedContract === "undelegate") {
      return "0x0000000000000000000000000000000000000000"
    }
    const contractMap = contractAddresses[selectedContract as keyof typeof contractAddresses]
    if (!contractMap) return null
    return (contractMap[selectedChain] as `0x${string}`) ?? null
  }

  const resolvedAddress = getContractAddress()
  const showAction = showContractSelection && resolvedAddress !== null

  const handleChainSelect = (chainKey: ChainKey) => {
    setSelectedChain(chainKey)
    if (selectedContract && selectedContract !== "custom" && selectedContract !== "undelegate") {
      const contract = CONTRACT_UI.find((c) => c.key === selectedContract)
      if (contract && !contract.chains.includes(chainKey)) {
        setSelectedContract(null)
        setCustomAddress("")
      }
    }
  }

  const availableContracts = selectedChain
    ? CONTRACT_UI.filter((c) => c.chains.includes(selectedChain))
    : CONTRACT_UI

  const triggerConfetti = () => {
    const duration = 3000
    const end = Date.now() + duration
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#3b82f6", "#10b981", "#f43f5e"],
      })
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#3b82f6", "#10b981", "#f43f5e"],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }

  const handleDelegate = async () => {
    try {
      setStatus({ type: "loading", message: "Processing delegation..." })

      const derivationInd = Number.parseInt(derivationIndex)
      const acct = mnemonicToAccount(seedPhrase, { addressIndex: derivationInd })
      setAccount(acct)

      const chainConfig = viemChains[selectedChain!]
      const targetAddress = resolvedAddress!

      const walletClient = createWalletClient({
        account: acct,
        chain: chainConfig,
        transport: http(),
      }).extend(publicActions)

      const authorization = await walletClient.signAuthorization({
        account: acct,
        contractAddress: targetAddress,
        executor: "self",
      })

      const encodedDataHex = "0x" as `0x${string}`

      const gas = await walletClient.estimateGas({
        data: encodedDataHex,
        value: BigInt(0),
        to: acct.address,
      })

      const hash = await walletClient.sendTransaction({
        authorizationList: [authorization],
        data: encodedDataHex,
        value: BigInt(0),
        to: acct.address,
        chainId: chainConfig.id,
        gas: gas + BigInt(210000),
      })

      setStatus({
        type: "success",
        message: "Transaction submitted successfully!",
        txHash: hash,
        isConfirmed: false,
      })

      try {
        await walletClient.waitForTransactionReceipt({ hash })
        setStatus((prev) => ({
          ...prev,
          message: "Transaction confirmed! Verifying delegation...",
          isConfirmed: true,
        }))

        try {
          const code = await walletClient.getCode({ address: acct.address })
          const isDelegated = code?.startsWith(EIP_7702_BYTECODE_PREFIX)
            ? "0x" + code.slice(EIP_7702_BYTECODE_PREFIX.length).toLowerCase() ===
              targetAddress.toLowerCase()
            : false

          setStatus((prev) => ({
            ...prev,
            message: isDelegated
              ? "Delegation verified successfully!"
              : "Transaction confirmed but delegation verification failed.",
            delegationVerified: isDelegated,
          }))

          if (isDelegated) triggerConfetti()
        } catch (error) {
          console.error("Error verifying delegation:", error)
          setStatus((prev) => ({
            ...prev,
            message: "Transaction confirmed but could not verify delegation status.",
            delegationVerified: false,
          }))
        }
      } catch (error) {
        console.error("Error waiting for transaction confirmation:", error)
        setStatus((prev) => ({
          ...prev,
          message: prev.message + " Error confirming transaction.",
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

  const handleReset = () => {
    setStatus({ type: null, message: "" })
    setAccount(null)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30 flex items-center justify-center p-4 md:p-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4"
          >
            <Wallet className="w-8 h-8 text-blue-400" />
          </motion.div>
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
          >
            EIP-7702 Delegator
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-400"
          >
            Securely delegate your wallet capabilities in a single transaction.
          </motion.p>
        </div>

        {/* Step 1: Seed Phrase */}
        <motion.div
          layout
          className={cn(
            "p-6 rounded-3xl border backdrop-blur-xl transition-colors duration-500",
            isSeedValid
              ? "bg-zinc-900/40 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.05)]"
              : "bg-white/5 border-white/10",
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-zinc-400">
                1
              </span>
              Secret Recovery Phrase
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/5 text-xs font-medium text-emerald-400">
              <Lock className="w-3 h-3" />
              Local Execution Only
            </div>
          </div>

          <div className="relative group">
            <textarea
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              placeholder="Paste your 12 or 24-word phrase here..."
              className={cn(
                "w-full h-32 p-4 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none resize-none transition-all duration-300 placeholder:text-zinc-600 font-mono text-sm",
                isMasked &&
                  seedPhrase.length > 0 &&
                  "blur-sm text-transparent text-shadow-mask",
              )}
            />
            {isMasked && seedPhrase.length > 0 && (
              <div className="absolute inset-0 z-10 pointer-events-none" />
            )}
            <button
              type="button"
              onClick={() => setIsMasked(!isMasked)}
              className="absolute bottom-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors z-20"
            >
              {isMasked ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  showAdvanced && "rotate-180",
                )}
              />
              Advanced Options
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex items-center gap-3">
                    <label className="text-sm text-zinc-400">
                      Derivation Index
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={derivationIndex}
                      onChange={(e) => setDerivationIndex(e.target.value)}
                      className="w-20 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isSeedValid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 flex items-center text-sm text-green-400 gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" /> Valid phrase detected (
                {wordCount} words)
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Step 2: Chain Selection */}
        <AnimatePresence>
          {showChainSelection && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-zinc-400">
                  2
                </span>
                Select Network
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CHAIN_UI.map((chain) => {
                  const isSelected = selectedChain === chain.key
                  const isDimmed = selectedChain !== null && !isSelected

                  return (
                    <motion.button
                      key={chain.key}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChainSelect(chain.key)}
                      className={cn(
                        "relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2",
                        isSelected
                          ? chain.active
                          : "border-white/10 bg-black/20",
                        !isSelected && chain.hover,
                        isDimmed &&
                          "opacity-40 grayscale hover:grayscale-0 hover:opacity-100",
                      )}
                    >
                      {isSelected && (
                        <CheckCircle2
                          className={cn(
                            "absolute top-2 right-2 w-4 h-4",
                            chain.text,
                          )}
                        />
                      )}
                      {chain.icon}
                      <span
                        className={cn(
                          "font-medium text-sm",
                          isSelected ? "text-white" : "text-zinc-400",
                        )}
                      >
                        {chain.name}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Contract Selection */}
        <AnimatePresence>
          {showContractSelection && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-zinc-400">
                  3
                </span>
                Target Contract
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableContracts.map((contract) => {
                  const isSelected = selectedContract === contract.key
                  const isDimmed = selectedContract !== null && !isSelected

                  return (
                    <motion.button
                      key={contract.key}
                      type="button"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedContract(contract.key)
                        if (contract.key !== "custom") setCustomAddress("")
                      }}
                      className={cn(
                        "relative p-4 rounded-2xl border transition-all duration-300 text-left",
                        isSelected
                          ? contract.active
                          : "border-white/10 bg-black/20",
                        !isSelected && contract.hover,
                        isDimmed &&
                          "opacity-40 grayscale hover:grayscale-0 hover:opacity-100",
                      )}
                    >
                      {isSelected && (
                        <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-white" />
                      )}
                      <div className="text-lg mb-1">{contract.icon}</div>
                      <div
                        className={cn(
                          "font-semibold text-sm mb-0.5",
                          isSelected ? "text-white" : "text-zinc-200",
                        )}
                      >
                        {contract.name}
                      </div>
                      <div className="text-xs text-zinc-500 line-clamp-1">
                        {contract.desc}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <AnimatePresence>
                {selectedContract === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4">
                      <input
                        type="text"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono text-sm placeholder:text-zinc-600"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {selectedContract &&
                  selectedContract !== "custom" &&
                  resolvedAddress && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 text-xs text-zinc-500 font-mono break-all"
                    >
                      → {resolvedAddress}
                    </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4: Action */}
        <AnimatePresence>
          {showAction && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <motion.button
                layout
                type="button"
                onClick={handleDelegate}
                disabled={
                  status.type === "loading" || status.type === "success"
                }
                className={cn(
                  "w-full relative overflow-hidden flex items-center justify-center p-4 rounded-2xl font-semibold text-lg transition-all duration-300",
                  !status.type
                    ? "bg-white text-black hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99]"
                    : "",
                  status.type === "loading"
                    ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : "",
                  status.type === "success"
                    ? "bg-green-500 text-white shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                    : "",
                  status.type === "error"
                    ? "bg-white text-black hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99]"
                    : "",
                )}
              >
                {!status.type && (
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                )}

                <AnimatePresence mode="popLayout">
                  {(!status.type || status.type === "error") && (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      Delegate Wallet
                    </motion.span>
                  )}
                  {status.type === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Executing...
                    </motion.div>
                  )}
                  {status.type === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      Delegation Active
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {(status.type === "success" || status.type === "error") && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={handleReset}
                  className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-300"
                >
                  {status.type === "error"
                    ? "Try again"
                    : "Perform another delegation"}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Panel */}
        <AnimatePresence>
          {status.type && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-6 rounded-3xl border backdrop-blur-xl",
                status.type === "error"
                  ? "bg-red-950/30 border-red-500/30"
                  : status.type === "success" && status.delegationVerified
                    ? "bg-green-950/30 border-green-500/30"
                    : "bg-white/5 border-white/10",
              )}
            >
              {status.type === "error" && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-400 mb-1">Error</h3>
                    <p className="text-sm text-zinc-400 break-all">
                      {status.message}
                    </p>
                  </div>
                </div>
              )}

              {status.type !== "error" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    {status.type === "loading" ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    <span className="text-zinc-300">{status.message}</span>
                  </div>

                  {account && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Account</p>
                      <p className="text-xs font-mono text-zinc-400 break-all">
                        {account.address}
                      </p>
                    </div>
                  )}

                  {status.txHash && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">
                        Transaction Hash
                      </p>
                      <p className="text-xs font-mono text-zinc-400 break-all">
                        {status.txHash}
                      </p>
                    </div>
                  )}

                  {status.txHash && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500">Status:</p>
                      {status.isConfirmed ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Pending
                        </span>
                      )}
                    </div>
                  )}

                  {status.isConfirmed && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-zinc-500">Delegation:</p>
                      {status.delegationVerified === undefined ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Verifying...
                        </span>
                      ) : status.delegationVerified ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          Failed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          .text-shadow-mask { text-shadow: 0 0 10px rgba(255,255,255,0.8); }
          @keyframes shimmer { 100% { transform: translateX(100%); } }
        `,
        }}
      />
    </div>
  )
}
