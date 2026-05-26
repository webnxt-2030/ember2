import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { cn } from '@/lib/cn'

interface SafeMarkdownProps {
  content: string
  className?: string
}

export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
