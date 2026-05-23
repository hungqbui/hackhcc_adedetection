import React, { createContext, useContext, useState } from 'react';
import { medeaseApi } from '../api';
import type { MedicationAdvisingInfo } from '../api';
import type { View } from '../App';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  imageUrl?: string;
  retrievedMedications?: MedicationAdvisingInfo[];
  riskLevel?: 'Safe' | 'Moderate' | 'High';
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
  sendMessage: (text: string, file?: File | null, onNavigate?: (view: View) => void) => Promise<void>;
  clearChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: "Hello! I'm your MedEase AI Assistant. Ask me about drug interactions, side effects, or your medication schedule.", timestamp: new Date() }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (text: string, file?: File | null, onNavigate?: (view: View) => void) => {
    if (!text.trim() && !file) return;

    let imageUrl: string | undefined = undefined;
    if (file) {
      imageUrl = URL.createObjectURL(file);
    }

    const historyPayload = JSON.stringify(
      messages.map(m => ({ role: m.sender, text: m.text }))
    );

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date(), imageUrl };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Create a placeholder AI message that we'll stream into
    const aiMsgId = (Date.now() + 1).toString();

    try {
      const response = await medeaseApi.chat.advisingStream(
        text || 'Please analyze this image.', file, null, historyPayload
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let retrievedMedications: MedicationAdvisingInfo[] | undefined;
      let action: string | undefined;
      let placeholderAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              if (eventType === 'metadata') {
                retrievedMedications = data.retrieved_medications;
                action = data.action;
                // Add placeholder message now that metadata arrived
                if (!placeholderAdded) {
                  setMessages(prev => [...prev, {
                    id: aiMsgId, sender: 'ai', text: '', timestamp: new Date(),
                    retrievedMedications
                  }]);
                  placeholderAdded = true;
                  setIsTyping(false);
                }
              } else if (eventType === 'token') {
                fullText += data.token;
                const currentText = fullText;
                setMessages(prev =>
                  prev.map(m => m.id === aiMsgId ? { ...m, text: currentText } : m)
                );
              } else if (eventType === 'error') {
                setMessages(prev => [...prev, {
                  id: aiMsgId, sender: 'ai',
                  text: `Error: ${data.detail}`,
                  timestamp: new Date()
                }]);
                setIsTyping(false);
                return;
              }
            } catch {
              // Skip malformed JSON
            }
            eventType = '';
          }
        }
      }

      // Handle redirect action after stream completes
      if (action === 'REDIRECT_TO_DASHBOARD') {
        window.dispatchEvent(new CustomEvent('medease-schedule-updated'));
        if (onNavigate) {
          onNavigate('dashboard');
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: aiMsgId, sender: 'ai',
        text: 'Sorry, I encountered an error communicating with the server.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([{ id: Date.now().toString(), sender: 'ai', text: "Chat cleared. Ask me about drug interactions, side effects, or your medication schedule.", timestamp: new Date() }]);
  };

  return (
    <ChatContext.Provider value={{ messages, setMessages, isTyping, setIsTyping, sendMessage, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
