import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Lock, Users, Check, AlertTriangle } from 'lucide-react';
import type { Community, CommunityMessage } from '../db/mockData';
import {
  getCurrentUser, getUserById, getCommunityMessages, addCommunityMessage,
  isJoinedCommunity, toggleJoinCommunity,
} from '../db/store';

interface CommunityChatModalProps {
  community: Community;
  onClose: () => void;
  onUpdate: () => void;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function CommunityChatModal({ community, onClose, onUpdate }: CommunityChatModalProps) {
  const me = getCurrentUser();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isJoined, setIsJoined] = useState(() => isJoinedCommunity(community.id));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 大学限定アクセス判定
  const isUniversityRestricted = Boolean(community.allowedUniversity);
  const isAllowed = !isUniversityRestricted || me.university === community.allowedUniversity;

  function refreshMessages() {
    setMessages(getCommunityMessages(community.id));
  }

  useEffect(() => {
    refreshMessages();
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [community.id]);

  function handleJoinToggle() {
    const result = toggleJoinCommunity(community.id);
    setIsJoined(result);
    onUpdate();
  }

  function handleSend() {
    if (!inputText.trim() || !isAllowed) return;
    addCommunityMessage(community.id, inputText.trim());
    setInputText('');
    refreshMessages();
    onUpdate();
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} onClick={onClose}>
      <div
        className="modal-content animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, height: '85vh',
          display: 'flex', flexDirection: 'column',
          padding: 0, overflow: 'hidden', borderRadius: 24,
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {/* Back button */}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ width: 34, height: 34 }}
            aria-label="戻る"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Group Icon */}
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: `${community.color}15`,
            border: `1.5px solid ${community.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', flexShrink: 0,
          }}>
            {community.emoji}
          </div>

          {/* Group Info & Join Button */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {community.name}
                </h3>
                {isUniversityRestricted && (
                  <span className="badge" style={{ fontSize: '0.65rem', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FCA5A5' }}>
                     限定
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} /> {community.memberCount + (isJoined ? 1 : 0)} メンバー
              </div>
            </div>

            {/*  グループアイコンの右側（ヘッダー右）に参加するボタン  */}
            <button
              onClick={handleJoinToggle}
              style={{
                padding: '6px 14px', borderRadius: 'var(--border-radius-full)',
                fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 4,
                ...(isJoined
                  ? { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
                  : { background: 'var(--gradient-primary)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
                ),
              }}
            >
              {isJoined ? (
                <>
                  <Check size={14} /> 参加中
                </>
              ) : (
                '参加する'
              )}
            </button>
          </div>
        </div>

        {/* ── Access restriction banner (University restricted) ── */}
        {!isAllowed && (
          <div style={{
            background: '#FEF2F2', borderBottom: '1px solid #FCA5A5',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: '#991B1B', lineHeight: 1.4 }}>
              <strong>【{community.allowedUniversity} 学生限定チャット】</strong><br />
              あなたの設定大学: <strong>{me.university || '未設定'}</strong>。このコミュニティは{community.allowedUniversity}のメンバーのみ参加・投稿が可能です。
            </div>
          </div>
        )}

        {/* ── Chat Messages Body ── */}
        <div style={{
          flex: 1, padding: '16px', overflowY: 'auto',
          background: 'var(--bg-base)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Welcome Info Card */}
          <div style={{
            padding: 16, background: 'white', borderRadius: 16,
            border: '1px solid var(--border-color)', textAlign: 'center',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 4 }}>{community.emoji}</span>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{community.name}へようこそ！</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {community.description}
            </div>
          </div>

          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: '0.85rem' }}>
              まだメッセージがありません。最初の発言をしてみよう！
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.userId === me.id;
              const sender = getUserById(msg.userId);

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex', gap: 8,
                    flexDirection: isMine ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                  }}
                >
                  {/* Sender avatar */}
                  {!isMine && (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', color: 'white', flexShrink: 0,
                    }}>
                      {sender?.avatar || ''}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div style={{ maxWidth: '75%' }}>
                    {!isMine && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2, marginLeft: 2 }}>
                        {sender?.name || '匿名'}・{sender?.university || ''}
                      </div>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMine ? 'var(--gradient-primary)' : 'var(--bg-surface-2)',
                      color: isMine ? 'white' : 'var(--text-primary)',
                      border: isMine ? 'none' : '1px solid var(--border-color)',
                      boxShadow: isMine ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.2)',
                      fontSize: '0.875rem', lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{
                      fontSize: '0.62rem', color: 'var(--text-muted)',
                      marginTop: 2, textAlign: isMine ? 'right' : 'left', padding: '0 2px',
                    }}>
                      {timeAgo(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Chat Input Footer ── */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border-color)',
          background: 'white', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {isAllowed ? (
            <>
              <input
                className="input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${community.name}にメッセージを送信...`}
                style={{ flex: 1, fontSize: '0.875rem', borderRadius: 99, paddingLeft: 16 }}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="btn btn-primary btn-icon"
                style={{ borderRadius: '50%', width: 40, height: 40, opacity: inputText.trim() ? 1 : 0.5 }}
                aria-label="送信"
              >
                <Send size={18} />
              </button>
            </>
          ) : (
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 99,
              background: 'var(--bg-surface-2)', color: 'var(--text-muted)',
              fontSize: '0.8rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Lock size={14} /> 所属大学限定のためメッセージ送信できません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
