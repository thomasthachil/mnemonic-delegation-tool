import DelegationForm from "@/components/delegation-form"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mnemonic Delegation Tool</h1>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground mb-8">Delegates with a dummy transaction using your mnemonic phrase</p>
      <DelegationForm />
    </main>
  )
}
