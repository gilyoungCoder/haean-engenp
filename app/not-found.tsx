import Link from "next/link"
import { Home, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold text-gradient">404</h1>
        <p className="text-lg font-semibold">페이지를 찾을 수 없습니다</p>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link href="/">
          <Button>
            <Home className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </Link>
      </div>
    </div>
  )
}
