interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="bg-blue-50 ml-8 p-4 rounded-lg shadow">
      <p className="text-gray-800 whitespace-pre-wrap">{content}</p>
    </div>
  )
}
