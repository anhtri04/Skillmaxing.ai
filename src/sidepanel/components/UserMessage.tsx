interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="bg-brand ml-8 p-4 rounded-xl rounded-br-md shadow-elevated">
      <p className="text-white whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  )
}
