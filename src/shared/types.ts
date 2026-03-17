// Shared types used across all extension contexts

export interface ExtensionMessage {
  type: string
  term?: string
  pageContent?: string
  pageTitle?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}

export interface PageContent {
  title: string
  content: string
  url: string
}

export interface Settings {
  apiKey: string
  baseURL: string
  model: string
}
