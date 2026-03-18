interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="bg-brand ml-8 p-4 rounded-lg-md rounded-br-sm shadow-elevated">
      <p className="text-white whitespace-pre-wrap">{content}</p>
    </div>
  )
}
