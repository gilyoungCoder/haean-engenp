"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  FileText,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

interface ProjectItem {
  _id: string
  title: string
  originalFileName: string
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  questionCount: number
}

interface ProjectHistoryProps {
  collapsed: boolean
  onToggle: () => void
  onProjectSelect: (projectId: string) => void
  onNewProject: () => void
  selectedProjectId: string | null | undefined
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "outline" },
  processing: { label: "처리중", variant: "secondary" },
  completed: { label: "완료", variant: "default" },
  failed: { label: "실패", variant: "destructive" },
}

export function ProjectHistory({
  collapsed,
  onToggle,
  onProjectSelect,
  onNewProject,
  selectedProjectId,
}: ProjectHistoryProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/projects")
        if (response.ok) {
          const data = await response.json() as { projects: ProjectItem[] }
          setProjects(data.projects)
        }
      } catch {
        // Silently fail on initial load
      } finally {
        setIsLoading(false)
      }
    }
    loadProjects()
  }, [selectedProjectId])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${deleteTarget}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("삭제 실패")

      setProjects((prev) => prev.filter((p) => p._id !== deleteTarget))
      toast("프로젝트가 삭제되었습니다.")
    } catch {
      toast("프로젝트 삭제에 실패했습니다.")
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    })
  }

  // Collapsed view
  if (collapsed) {
    return (
      <div className="hidden md:flex flex-col items-center w-[40px] shrink-0 border-r border-border bg-background py-2">
        <button
          className="p-2 rounded-md hover:bg-muted transition-colors"
          onClick={onToggle}
          aria-label="프로젝트 패널 열기"
        >
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    )
  }

  // Expanded view
  return (
    <div className="flex flex-col h-full w-full md:w-[240px] md:shrink-0 border-r border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">프로젝트</h3>
        <button
          className="hidden md:block p-1 rounded-md hover:bg-muted transition-colors"
          onClick={onToggle}
          aria-label="프로젝트 패널 접기"
        >
          <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* New project button */}
      <div className="shrink-0 px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8"
          onClick={onNewProject}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          새 프로젝트
        </Button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            아직 프로젝트가 없습니다
          </p>
        ) : (
          projects.map((project) => {
            const status = STATUS_BADGE[project.status] ?? STATUS_BADGE.pending
            const isSelected = selectedProjectId === project._id

            return (
              <div
                key={project._id}
                className={`group relative rounded-md p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted border border-transparent"
                }`}
                onClick={() => onProjectSelect(project._id)}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {project.title || project.originalFileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(project.createdAt)}
                      </span>
                      <Badge
                        variant={status.variant}
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        {status.label}
                      </Badge>
                      {project.questionCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {project.questionCount}문항
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(project._id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-destructive" />
              프로젝트 삭제
            </DialogTitle>
            <DialogDescription>
              이 프로젝트와 관련된 모든 데이터(지문, 문제, 채팅 이력)가 영구 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
