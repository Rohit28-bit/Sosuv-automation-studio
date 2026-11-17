import { Database, DatabaseZap, FileCheck, Folder, Globe, Leaf, Puzzle, Server, Sheet, Timer, type LucideProps } from 'lucide-react'

const ICONS = {
  server: Server,
  database: Database,
  postgres: DatabaseZap,
  mongodb: Leaf,
  sheet: Sheet,
  folder: Folder,
  globe: Globe,
  filecheck: FileCheck,
  timer: Timer,
}

export function ToolIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Puzzle
  return <Icon {...props} />
}
