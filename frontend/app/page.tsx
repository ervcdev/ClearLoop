import { ClearLoopProvider } from "@/hooks/useContract"
import { Dashboard } from "@/components/Dashboard"

export default function Home() {
  return (
    <ClearLoopProvider>
      <Dashboard />
    </ClearLoopProvider>
  )
}
