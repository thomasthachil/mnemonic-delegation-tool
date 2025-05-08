import DelegationForm from "@/components/delegation-form"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Mnemonic Delegation Tool</h1>
      <p className="text-muted-foreground mb-8">Delegates with a dummy transaction using your mnemonic phrase</p>
      <DelegationForm />
    </main>
  )
}
