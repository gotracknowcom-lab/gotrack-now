import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { ChatMessage } from '../types';
import { MessageSquare, Send, X, User, ShieldCheck, CheckCheck, Minimize2, Circle } from 'lucide-react';

interface LiveChatWidgetProps {
  trackingCode: string;
  customerName?: string;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({ trackingCode, customerName = 'Customer' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackingCode) return;

    const chatQuery = query(
      collection(db, 'chat_messages'),
      where('trackingCode', '==', trackingCode)
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const msgList: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgList.push({ ...docSnap.data(), id: docSnap.id } as ChatMessage);
      });

      // Sort messages by timestamp ascending
      msgList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(msgList);

      // Unread messages calculation from admin
      const unreads = msgList.filter((m) => m.sender === 'admin' && !m.isRead).length;
      setUnreadCount(unreads);
    }, (err) => {
      console.warn('LiveChat widget listener note:', err);
    });

    return () => unsubscribe();
  }, [trackingCode]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !trackingCode) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chat_messages'), {
        shipmentId: trackingCode,
        trackingCode: trackingCode,
        sender: 'customer',
        senderName: customerName,
        text: msgText,
        timestamp: new Date().toISOString(),
        isRead: false,
      });

      // Also create an admin notification for live chat
      await addDoc(collection(db, 'admin_notifications'), {
        title: `New Chat Message (${trackingCode})`,
        message: `${customerName}: "${msgText.slice(0, 40)}..."`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'chat',
        trackingCode: trackingCode,
      });
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 border border-sky-400/30"
          id="open-live-chat-btn"
        >
          <MessageSquare className="w-6 h-6 text-white" />
          <span className="font-bold text-sm pr-1 hidden sm:inline font-sans">Dispatcher Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-800 w-[92vw] sm:w-[380px] h-[520px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Chat Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  GoTrack Dispatcher Support
                </h4>
                <p className="text-[11px] text-sky-400 font-mono">Ref: {trackingCode}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              id="close-live-chat-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages List Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/80">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs">No messages yet. Send a message to chat with our 24/7 logistics dispatch office.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 px-1">
                      {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {isMe && (
                      <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-sky-400" /> Delivered
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask dispatcher about your package..."
              className="flex-1 bg-slate-800 text-xs text-white placeholder-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-sky-500"
              id="live-chat-input"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-colors shrink-0"
              id="live-chat-send-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
