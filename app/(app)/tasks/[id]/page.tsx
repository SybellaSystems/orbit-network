'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, Review } from '@/lib/supabase';
import { OrbitTag } from '@/components/orbit/OrbitTag';
import { Clock, CheckCircle, ArrowLeft, Send, Star, AlertCircle, Eye } from 'lucide-react';

function getDeadlineInfo(deadline: string) {
  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: '#A32D2D' };
  if (diffDays === 0) return { label: 'Due today', color: '#BA7517' };
  if (diffDays <= 3) return { label: `${diffDays}d left`, color: '#BA7517' };
  return { label: `${diffDays}d left`, color: '#888888' };
}

const STATUS_CONFIG = { PENDING: { label: 'Pending', color: '#888888' }, IN_REVIEW: { label: 'In Review', color: '#378ADD' }, COMPLETE: { label: 'Complete', color: '#1D9E75' } };

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { member } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [artifactUrl, setArtifactUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [qualityScore, setQualityScore] = useState(7);
  const [collabScore, setCollabScore] = useState(7);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    if (!id || !member) return;
    async function load() {
      const [{ data: taskData }, { data: reviewData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', id).maybeSingle(),
        supabase.from('reviews').select('*, reviewer:members(*)').eq('task_id', id),
      ]);
      setTask(taskData);
      setReviews(reviewData ?? []);
      setHasReviewed((reviewData ?? []).some((r) => r.reviewer_id === member!.id));
      setLoading(false);
    }
    load();
  }, [id, member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !member) return;
    setSubmitting(true); setSubmitError('');
    const { error } = await supabase.from('tasks').update({ artifact_url: artifactUrl, notes: submissionNotes, status: 'IN_REVIEW' }).eq('id', task.id).eq('assignee_id', member.id);
    if (error) setSubmitError(error.message);
    else setTask({ ...task, status: 'IN_REVIEW', artifact_url: artifactUrl, notes: submissionNotes });
    setSubmitting(false);
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !member) return;
    setReviewing(true); setReviewError('');
    const { error } = await supabase.from('reviews').insert({ task_id: task.id, reviewer_id: member.id, quality_score: qualityScore, collaboration_score: collabScore, notes: reviewNotes || null });
    if (error) { setReviewError(error.message); }
    else {
      setHasReviewed(true);
      const { data } = await supabase.from('reviews').select('*, reviewer:members(*)').eq('task_id', task.id);
      setReviews(data ?? []);
      if ((data?.length ?? 0) >= 2 && task.status === 'IN_REVIEW') {
        await supabase.from('tasks').update({ status: 'COMPLETE' }).eq('id', task.id);
        setTask({ ...task, status: 'COMPLETE' });
      }
    }
    setReviewing(false);
  }

  if (loading) return <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-6 bg-[#2E2E2E] rounded w-1/2" /><div className="h-4 bg-[#2E2E2E] rounded w-full" /><div className="h-4 bg-[#2E2E2E] rounded w-3/4" /></div></div>;
  if (!task) return <div className="p-8 text-center"><AlertCircle size={24} className="text-[#888888] mx-auto mb-3" /><p className="text-[#888888]">Task not found.</p></div>;

  const deadline = getDeadlineInfo(task.deadline);
  const status = STATUS_CONFIG[task.status];
  const isAssignee = task.assignee_id === member?.id;
  const canReview = !isAssignee && task.status === 'IN_REVIEW' && !hasReviewed;
  const avgQuality = reviews.length > 0 ? reviews.reduce((s, r) => s + r.quality_score, 0) / reviews.length : 0;
  const avgCollab = reviews.length > 0 ? reviews.reduce((s, r) => s + r.collaboration_score, 0) / reviews.length : 0;

  const inputStyle = { background: '#222222', border: '1px solid #2E2E2E', color: '#F5F5F5' };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[#888888] hover:text-[#F5F5F5] mb-6"><ArrowLeft size={14} />Back to tasks</button>

      <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#F5F5F5] mb-2" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{task.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <OrbitTag orbit={task.orbit} />
              <span className="text-sm font-medium" style={{ color: status.color }}>{status.label}</span>
              <div className="flex items-center gap-1 text-xs" style={{ color: deadline.color }}><Clock size={11} />{deadline.label}</div>
            </div>
          </div>
        </div>
        <p className="text-[#888888] text-sm leading-relaxed mb-4">{task.description}</p>
        <div className="flex items-center gap-2 pt-4 border-t border-[#2E2E2E]">
          <span className="text-xs text-[#888888]">Deadline:</span>
          <span className="text-xs font-mono text-[#F5F5F5]">{new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {task.artifact_url && (
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5 mb-5">
          <div className="flex items-center gap-2 mb-3"><CheckCircle size={13} className="text-[#1D9E75]" /><span className="text-xs font-display uppercase tracking-wide text-[#1D9E75]">Submitted</span></div>
          <a href={task.artifact_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#378ADD] hover:underline break-all">{task.artifact_url}</a>
          {task.notes && <p className="text-xs text-[#888888] mt-2">{task.notes}</p>}
        </div>
      )}

      {isAssignee && task.status === 'PENDING' && (
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5 mb-5">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Submit Work</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Artifact URL</label>
              <input type="url" value={artifactUrl} onChange={(e) => setArtifactUrl(e.target.value)} placeholder="https://github.com/you/project" required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-150" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
            </div>
            <div>
              <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Notes (optional)</label>
              <textarea value={submissionNotes} onChange={(e) => setSubmissionNotes(e.target.value)} placeholder="Brief notes" rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 resize-none" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
            </div>
            {submitError && <p className="text-xs text-red-400">{submitError}</p>}
            <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}>
              <Send size={13} />{submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Eye size={13} className="text-[#888888]" /><span className="text-sm font-semibold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Reviews</span></div>
          <span className="text-xs font-mono text-[#888888]">{reviews.length}/2 min</span>
        </div>
        {reviews.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#888888]"><span>Avg Quality</span><span className="font-mono" style={{ color: '#1D9E75' }}>{avgQuality.toFixed(1)}/10</span></div>
            <div className="flex items-center justify-between text-xs text-[#888888]"><span>Avg Collaboration</span><span className="font-mono" style={{ color: '#378ADD' }}>{avgCollab.toFixed(1)}/10</span></div>
          </div>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="border border-[#2E2E2E] rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Star size={11} className="text-[#BA7517]" />
              <span className="text-xs font-mono" style={{ color: '#1D9E75' }}>Q:{review.quality_score}</span>
              <span className="text-xs font-mono" style={{ color: '#378ADD' }}>C:{review.collaboration_score}</span>
              <span className="text-xs text-[#888888] ml-auto">{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
            {review.notes && <p className="text-xs text-[#888888]">{review.notes}</p>}
          </div>
        ))}
        {reviews.length === 0 && !canReview && <p className="text-xs text-[#444444] text-center py-3">No reviews yet.</p>}
      </div>

      {canReview && (
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Submit Review</h3>
          <form onSubmit={handleReview} className="space-y-4">
            {[
              { label: 'Quality Score', value: qualityScore, onChange: setQualityScore, color: '#1D9E75' },
              { label: 'Collaboration Score', value: collabScore, onChange: setCollabScore, color: '#378ADD' },
            ].map((field) => (
              <div key={field.label}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#888888] font-display uppercase tracking-wide">{field.label}</label>
                  <span className="font-mono text-sm font-medium" style={{ color: field.color }}>{field.value}/10</span>
                </div>
                <input type="range" min={1} max={10} value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} className="w-full accent-[#0F6E56]" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Notes (optional)</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Feedback" rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 resize-none" style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
            </div>
            {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
            <button type="submit" disabled={reviewing} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}>
              <Send size={13} />{reviewing ? 'Submitting...' : 'Submit review'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
