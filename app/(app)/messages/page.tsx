'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_SHORT, ORBIT_COLORS } from '@/lib/supabase';
import type { Message, Member, OrbitType } from '@/lib/supabase';
import { MemberAvatar } from '@/components/orbit/MemberAvatar';
import { Send, Hash, MessageCircle, X } from 'lucide-react';

const CHANNELS: { id: string; label: string; orbit?: OrbitType }[] = [
  { id: 'general', label: 'General' }, { id: 'orbit-forge', label: 'Forge', orbit: 'FORGE' },
  { id: 'orbit-labs', label: 'Labs', orbit: 'LABS' }, { id: 'orbit-core', label: 'Core', orbit: 'CORE' },
  { id: 'orbit-open', label: 'Open', orbit: 'OPEN' }, { id: 'orbit-intelligence', label: 'Intelligence', orbit: 'INTELLIGENCE' },
];

type MessageWithSender = Message & {
  sender?: Member;
  recipient?: Member;
  status?: 'sending' | 'sent' | 'failed';
};

type ConversationType = 'channel' | 'dm';

interface Conversation {
  id: string;
  type: ConversationType;
  participantId?: string;
  participant?: Member;
  lastMessage?: MessageWithSender;
  label: string;
  icon: 'channel' | 'user';
}

export default function MessagesPage() {
  const { member } = useAuth();
  const [conversationType, setConversationType] = useState<ConversationType>('channel');
  const [activeConversation, setActiveConversation] = useState('general');
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [dmConversations, setDmConversations] = useState<Conversation[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sentMessageIdsRef = useRef<Set<string>>(new Set());

  // Load members
  useEffect(() => {
    if (!member) return;
    supabase.from('members').select('*').order('name').then(({ data }) => setMembers(data ?? []));
  }, [member]);

  // Load initial messages and setup real-time subscription
  const loadMessages = useCallback(async () => {
    if (!member) return;
    setError(null);

    try {
      let query = supabase
        .from('messages')
        .select(`
          id,
          channel_id,
          content,
          sent_at,
          sender_id,
          recipient_id,
          sender:members!messages_sender_id_fkey(id, name, email),
          recipient:members!messages_recipient_id_fkey(id, name, email)
        `)
        .order('sent_at', { ascending: true })
        .limit(100);

      if (conversationType === 'channel') {
        query = query.eq('channel_id', activeConversation).is('recipient_id', null);
      } else {
        // DM: messages where current user is sender or recipient with this participant
        const participantId = activeConversation;
        const { data } = await query;
        if (data) {
          const filtered = data.filter(
            (m: any) =>
              (m.sender_id === member.id && m.recipient_id === participantId) ||
              (m.sender_id === participantId && m.recipient_id === member.id)
          );
          const normalized = filtered.map((m: any) => ({
            ...m,
            sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
            recipient: Array.isArray(m.recipient) ? m.recipient[0] : m.recipient,
          }));
          setMessages(normalized);
          return;
        }
      }

      const { data, error: err } = await query;
      if (err) {
        console.error('Load messages error:', err);
        setError('Failed to load messages');
        return;
      }

      const normalized: MessageWithSender[] = (data ?? []).map((m: any) => ({
        ...m,
        sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
        recipient: Array.isArray(m.recipient) ? m.recipient[0] : m.recipient,
        status: sentMessageIdsRef.current.has(m.id) ? 'sent' : undefined,
      }));

      setMessages(normalized);
    } catch (err) {
      console.error('Load messages error:', err);
      setError('Failed to load messages');
    }
  }, [member, activeConversation, conversationType]);

  // Setup real-time subscription
  useEffect(() => {
    if (!member) return;

    loadMessages();

    // Setup real-time listener
    const channel = supabase
      .channel(`messages-${conversationType}-${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          const isRelevant =
            conversationType === 'channel'
              ? newMsg.channel_id === activeConversation && !newMsg.recipient_id
              : (newMsg.sender_id === member.id && newMsg.recipient_id === activeConversation) ||
                (newMsg.recipient_id === member.id && newMsg.sender_id === activeConversation);

          if (isRelevant) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === newMsg.id);
              if (exists) return prev;
              return [
                ...prev,
                {
                  id: newMsg.id,
                  sender_id: newMsg.sender_id,
                  channel_id: newMsg.channel_id,
                  recipient_id: newMsg.recipient_id,
                  content: newMsg.content,
                  sent_at: newMsg.sent_at,
                  status: 'sent',
                },
              ];
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member, activeConversation, conversationType, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load recent DMs
  useEffect(() => {
    if (!member) return;

    const loadRecentDMs = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          id,
          sender_id,
          recipient_id,
          content,
          sent_at,
          sender:members!messages_sender_id_fkey(id, name, email),
          recipient:members!messages_recipient_id_fkey(id, name, email)
        `
        )
        .or(`sender_id.eq.${member.id},recipient_id.eq.${member.id}`)
        .not('recipient_id', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error || !data) return;

      // Group by conversation partner
      const conversations = new Map<string, MessageWithSender>();
      data.forEach((msg: any) => {
        const partnerId = msg.sender_id === member.id ? msg.recipient_id : msg.sender_id;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            ...msg,
            sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
            recipient: Array.isArray(msg.recipient) ? msg.recipient[0] : msg.recipient,
          });
        }
      });

      const dms = Array.from(conversations.entries()).map(([participantId, lastMsg]) => {
        const participant =
          lastMsg.sender_id === member.id ? lastMsg.recipient : lastMsg.sender;
        return {
          id: participantId,
          type: 'dm' as ConversationType,
          participantId,
          participant,
          lastMessage: lastMsg,
          label: participant?.name || 'Unknown',
          icon: 'user' as const,
        };
      });

      setDmConversations(dms);
    };

    loadRecentDMs();
  }, [member]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !member || sending) return;

    setSending(true);
    setError(null);

    try {
      const messageData =
        conversationType === 'channel'
          ? {
              sender_id: member.id,
              channel_id: activeConversation,
              content: content.trim(),
              recipient_id: null,
            }
          : {
              sender_id: member.id,
              recipient_id: activeConversation,
              content: content.trim(),
              channel_id: null,
            };

      const { data, error: err } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (err) {
        console.error('Send error:', err);
        setError('Failed to send message. Try again.');
        setSending(false);
        return;
      }

      if (data) {
        sentMessageIdsRef.current.add(data.id);
        setContent('');
      }
    } catch (err) {
      console.error('Send error:', err);
      setError('Failed to send message. Try again.');
    } finally {
      setSending(false);
    }
  }

  const handleStartDM = (memberId: string) => {
    setConversationType('dm');
    setActiveConversation(memberId);
    const existing = dmConversations.find((c) => c.participantId === memberId);
    if (!existing) {
      const member = members.find((m) => m.id === memberId);
      if (member) {
        setDmConversations((prev) => [
          {
            id: memberId,
            type: 'dm',
            participantId: memberId,
            participant: member,
            label: member.name,
            icon: 'user',
          },
          ...prev,
        ]);
      }
    }
  };

  const closeDM = (memberId: string) => {
    setDmConversations((prev) => prev.filter((c) => c.participantId !== memberId));
    if (activeConversation === memberId && conversationType === 'dm') {
      setConversationType('channel');
      setActiveConversation('general');
    }
  };

  const getConversationLabel = () => {
    if (conversationType === 'channel') {
      const channel = CHANNELS.find((c) => c.id === activeConversation);
      return channel?.label ?? activeConversation;
    }
    const dm = dmConversations.find((c) => c.participantId === activeConversation);
    return dm?.label ?? 'Direct Message';
  };

  const formatMessageDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const groupedMessages = messages.reduce(
    (acc, msg) => {
      const date = new Date(msg.sent_at).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(msg);
      return acc;
    },
    {} as Record<string, MessageWithSender[]>
  );

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex bg-[#0D0D0D]">
      <div className="w-56 flex-shrink-0 border-r border-[#1E1E1E] bg-[#111111] flex flex-col">
        {/* Channels */}
        <div className="p-4 border-b border-[#1E1E1E]">
          <span className="text-xs text-[#888888] font-display uppercase tracking-widest">Channels</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                setConversationType('channel');
                setActiveConversation(ch.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150"
              style={{
                background:
                  conversationType === 'channel' && activeConversation === ch.id ? '#0F6E5618' : 'transparent',
                color:
                  conversationType === 'channel' && activeConversation === ch.id ? '#1D9E75' : '#888888',
                border:
                  conversationType === 'channel' && activeConversation === ch.id
                    ? '1px solid #0F6E5630'
                    : '1px solid transparent',
              }}
            >
              <Hash size={11} />
              <span style={{ color: ch.orbit ? ORBIT_COLORS[ch.orbit] : undefined }}>{ch.label}</span>
            </button>
          ))}
        </nav>

        {/* Direct Messages */}
        <div className="p-3 border-t border-[#1E1E1E]">
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            <MessageCircle size={11} className="text-[#444444]" />
            <span className="text-[10px] text-[#444444] font-display uppercase tracking-wider">Direct Messages</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {dmConversations.length === 0 ? (
              <p className="text-xs text-[#444444] px-2 py-1">No conversations yet</p>
            ) : (
              dmConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setConversationType('dm');
                    setActiveConversation(conv.participantId!);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all duration-150"
                  style={{
                    background:
                      conversationType === 'dm' && activeConversation === conv.participantId
                        ? '#0F6E5618'
                        : 'transparent',
                  }}
                >
                  {conv.participant && <MemberAvatar member={conv.participant} size="sm" />}
                  <span
                    className="text-xs flex-1 truncate"
                    style={{
                      color:
                        conversationType === 'dm' && activeConversation === conv.participantId
                          ? '#1D9E75'
                          : '#888888',
                    }}
                  >
                    {conv.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDM(conv.participantId!);
                    }}
                    className="p-0.5 hover:bg-[#1E1E1E] rounded transition-colors"
                  >
                    <X size={12} className="text-[#444444]" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Members to Message */}
        <div className="p-3 border-t border-[#1E1E1E]">
          <div className="text-[10px] text-[#444444] font-display uppercase tracking-wider px-2 py-1 mb-1">
            Members
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {members
              .filter((m) => m.id !== member?.id)
              .slice(0, 8)
              .map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleStartDM(m.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1E1E1E] transition-colors text-left"
                >
                  <MemberAvatar member={m} size="sm" />
                  <span className="text-xs text-[#888888] truncate">{m.name.split(' ')[0]}</span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1E1E1E] bg-[#111111]">
          {conversationType === 'channel' ? (
            <>
              <Hash size={14} className="text-[#888888]" />
              <span className="font-semibold text-[#F5F5F5] text-sm" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>
                {getConversationLabel()}
              </span>
              {CHANNELS.find((c) => c.id === activeConversation)?.orbit && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    color: ORBIT_COLORS[CHANNELS.find((c) => c.id === activeConversation)!.orbit!],
                    background: `${ORBIT_COLORS[CHANNELS.find((c) => c.id === activeConversation)!.orbit!]}18`,
                  }}
                >
                  {ORBIT_SHORT[CHANNELS.find((c) => c.id === activeConversation)!.orbit!]}
                </span>
              )}
            </>
          ) : (
            <>
              {dmConversations.find((c) => c.participantId === activeConversation)?.participant && (
                <MemberAvatar
                  member={dmConversations.find((c) => c.participantId === activeConversation)!.participant!}
                  size="sm"
                />
              )}
              <span className="font-semibold text-[#F5F5F5] text-sm" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>
                {getConversationLabel()}
              </span>
            </>
          )}
          <span className="ml-auto text-xs text-[#444444]">●  Live</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              {conversationType === 'channel' ? <Hash size={24} className="text-[#2E2E2E] mb-3" /> : <MessageCircle size={24} className="text-[#2E2E2E] mb-3" />}
              <p className="text-sm text-[#888888]">
                {conversationType === 'channel'
                  ? `No messages in #${getConversationLabel()} yet.`
                  : `No messages with ${getConversationLabel()} yet.`}
              </p>
              <p className="text-xs text-[#444444] mt-1">Start the conversation.</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateStr, dateMessages]) => (
              <div key={dateStr}>
                <div className="flex items-center justify-center py-2 mb-2">
                  <span className="text-[10px] text-[#444444] bg-[#111111] px-2 py-1 rounded">
                    {formatMessageDate(new Date(dateStr))}
                  </span>
                </div>
                <div className="space-y-3">
                  {dateMessages.map((msg, idx) => {
                    const prev = dateMessages[idx - 1];
                    const isSame = prev?.sender_id === msg.sender_id;
                    const isOwn = msg.sender_id === member?.id;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {!isSame && !isOwn && msg.sender && (
                          <MemberAvatar member={msg.sender as Member} size="sm" className="flex-shrink-0" />
                        )}
                        {isSame && !isOwn && <div className="w-7 flex-shrink-0" />}
                        <div className={`max-w-xs ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isSame && !isOwn && msg.sender && (
                            <span className="text-xs text-[#888888] mb-1 ml-1">{(msg.sender as Member).name}</span>
                          )}
                          <div
                            className="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed"
                            style={{
                              background: isOwn ? 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' : '#1E1E1E',
                              color: isOwn ? '#fff' : '#F5F5F5',
                              borderRadius: isOwn ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                            }}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-[#444444] mt-1 mx-1">
                            {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isOwn && msg.status && (
                              <span className="ml-1" title={msg.status}>
                                {msg.status === 'sending' ? '⏱' : msg.status === 'sent' ? '✓' : '✗'}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-5 py-2 bg-[#3E1E1E] border-b border-[#8B4545] text-xs text-[#FF6B6B]">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-[#8B4545] hover:text-[#FF6B6B]"
            >
              ×
            </button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-[#1E1E1E] bg-[#111111]">
          <div className="flex items-center gap-2 rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-2.5 focus-within:border-[#0F6E56] transition-all duration-150">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as any);
                }
              }}
              placeholder={`Message ${conversationType === 'channel' ? '#' : ''}${getConversationLabel()}`}
              className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#444444] outline-none"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="p-1.5 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ color: content.trim() ? '#1D9E75' : '#444444' }}
              title={sending ? 'Sending...' : 'Send'}
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}