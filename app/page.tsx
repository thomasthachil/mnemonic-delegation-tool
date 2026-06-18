import DelegationForm from "@/components/delegation-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { ShieldCheck } from "lucide-react"

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <header className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="console-label">EIP-7702</span>
            <span className="h-px w-8 bg-primary/60" aria-hidden />
            <span className="console-label">Delegation</span>
          </div>
          <ThemeToggle />
        </div>

        <h1 className="font-display mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
          Delegation Console
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Point an EOA at a smart-account contract — or revoke it — across every supported
          chain, signed locally from your mnemonic.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Your mnemonic is processed in this browser and never leaves the page.
        </div>
      </header>

      <DelegationForm />

      <footer className="mt-12 border-t border-border pt-6 console-label text-center">
        Sign locally · Verify on-chain
      </footer>
    </main>
  )
}
