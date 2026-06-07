import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BookOpen, Plus, Flame, Star } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Pick up where you left off.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              0 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Study today to start your streak
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total XP</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              0
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete decks to earn XP
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Decks</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              0
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/decks">
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Deck
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Ready to learn?</h3>
        <p className="text-muted-foreground mt-1 mb-4">
          Create your first deck or explore the community
        </p>
        <div className="flex gap-3">
          <Link href="/decks">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Deck
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="outline">Explore Community</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
