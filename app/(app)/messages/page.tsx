'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_SHORT, ORBIT_COLORS } from '@/lib/supabase';
import type { Message, Member, OrbitType } from '@/lib/supabase';
import { MemberAvatar } from '@/components/orbit/MemberAvatar';
import { Send, Hash, MessageCircle } from 'lucide-react';

const CHANNELS: { id: string; label: string; orbit?: OrbitType }[] = [
  { id: 'general', label: 'General' }, { id: 'orbit-forge', label: 'Forge', orbit: 'FORGE' },
  { id: 'orbit-labs', label: 'Labs', orbit: 'LABS' }, { id: 'orbit-core', label: 'Core', orbit: 'CORE' },
  { id: 'orbit-open', label: 'Open', orbit: 'OPEN' }, { id: 'orbit-intelligence', label: 'Intelligence', orbit: 'INTELLIGENCE' },
];

export default function MessagesPage() {
  const { member } = useAuth();
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!member) return;
    supabase.from('members').select('*').order('name').then(({ data }) => setMembers(data ?? []));
  }, [member]);

  async function loadMessages() {
   const { data } = await supabase
  .from('messages')
  .select(`
    *,
    sender:members!messages_sender_id_fkey(*)
  `)
  .eq('channel_id', activeChannel)
  .order('sent_at', { ascending: true })
  .limit(50);
    setMessages(data ?? []);
  }

  useEffect(() => {
    if (!member) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChannel, member]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !member) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({ sender_id: member.id, channel_id: activeChannel, content: content.trim() });
    if (!error) { setContent(''); await loadMessages(); }
    setSending(false);
  }

  const activeChannelInfo = CHANNELS.find((c) => c.id === activeChannel);

  return (
    <div className="h-[calc(100vh-56px)] md:h-screen flex bg-[#0D0D0D]">
      <div className="w-48 flex-shrink-0 border-r border-[#1E1E1E] bg-[#111111] flex flex-col">
        <div className="p-4 border-b border-[#1E1E1E]"><span className="text-xs text-[#888888] font-display uppercase tracking-widest">Channels</span></div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {CHANNELS.map((ch) => (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150"
              style={{ background: activeChannel === ch.id ? '#0F6E5618' : 'transparent', color: activeChannel === ch.id ? '#1D9E75' : '#888888', border: activeChannel === ch.id ? '1px solid #0F6E5630' : '1px solid transparent' }}>
              <Hash size={11} /><span style={{ color: ch.orbit ? ORBIT_COLORS[ch.orbit] : undefined }}>{ch.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1E1E1E]">
          <div className="flex items-center gap-2 px-2 py-1"><MessageCircle size={11} className="text-[#444444]" /><span className="text-[10px] text-[#444444] font-display uppercase tracking-wider">Members</span></div>
          <div className="mt-2 space-y-1">{members.slice(0, 8).map((m) => <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded"><MemberAvatar member={m} size="sm" /><span className="text-xs text-[#888888] truncate">{m.name.split(' ')[0]}</span></div>)}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1E1E1E] bg-[#111111]">
          <Hash size={14} className="text-[#888888]" />
          <span className="font-semibold text-[#F5F5F5] text-sm" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{activeChannelInfo?.label ?? activeChannel}</span>
          {activeChannelInfo?.orbit && <span className="text-xs px-2 py-0.5 rounded" style={{ color: ORBIT_COLORS[activeChannelInfo.orbit], background: `${ORBIT_COLORS[activeChannelInfo.orbit]}18` }}>{ORBIT_SHORT[activeChannelInfo.orbit]}</span>}
          <span className="ml-auto text-xs text-[#444444]">Polling 5s</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Hash size={24} className="text-[#2E2E2E] mb-3" />
              <p className="text-sm text-[#888888]">No messages in #{activeChannelInfo?.label ?? activeChannel} yet.</p>
              <p className="text-xs text-[#444444] mt-1">Start the conversation.</p>
            </div>
          ) : messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const isSame = prev?.sender_id === msg.sender_id;
            const isOwn = msg.sender_id === member?.id;
            return (
              <div key={msg.id} className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isSame && !isOwn && msg.sender && <MemberAvatar member={msg.sender as Member} size="sm" className="mt-0.5 flex-shrink-0" />}
                {isSame && !isOwn && <div className="w-7 flex-shrink-0" />}
                <div className={`max-w-sm ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isSame && !isOwn && msg.sender && <span className="text-xs text-[#888888] mb-1 ml-1">{(msg.sender as Member).name}</span>}
                  <div className="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed" style={{ background: isOwn ? 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' : '#1E1E1E', color: isOwn ? '#fff' : '#F5F5F5', borderRadius: isOwn ? '18px 18px 6px 18px' : '18px 18px 18px 6px' }}>{msg.content}</div>
                  <span className="text-[10px] text-[#444444] mt-1 mx-1">{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="px-4 py-3 border-t border-[#1E1E1E] bg-[#111111]">
          <div className="flex items-center gap-2 rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] px-4 py-2.5 focus-within:border-[#0F6E56] transition-all duration-150">
            <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder={`Message #${activeChannelInfo?.label ?? activeChannel}`}
              className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#444444] outline-none" />
            <button type="submit" disabled={!content.trim() || sending} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: content.trim() ? '#1D9E75' : '#444444' }}><Send size={15} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}
