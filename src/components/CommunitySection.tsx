import { useState } from 'react';
import { Users, MessageSquare, ChevronRight, Lock, Plus, X, Globe, UserCheck, Shield } from 'lucide-react';
import { getAllCommunities, getJoinedCommunities, getCurrentUser, createCommunity } from '../db/store';
import type { Community } from '../db/mockData';
import CommunityChatModal from './CommunityChatModal';

interface CommunitySectionProps {
  onUpdate: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  university: '大学限定',
  industry: '業界別',
  company: '企業別',
  event: 'イベント/テーマ',
};

export default function CommunitySection({ onUpdate }: CommunitySectionProps) {
  // メインひろばタブ: 'public' (みんなのひろば) | 'private' (私のひろば)
  const [mainTab, setMainTab] = useState<'public' | 'private'>('public');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const me = getCurrentUser();

  // コミュニティ作成モーダル用State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [commType, setCommType] = useState<'university' | 'industry' | 'company' | 'event'>('industry');
  const [iconText, setIconText] = useState('ルーム');
  const [allowedUniv, setAllowedUniv] = useState('');

  const communities = getAllCommunities();
  const joinedIds = getJoinedCommunities();

  // ひろば別のコミュニティ抽出
  const publicRooms = communities.filter((c) => !c.isPrivate); // みんなのひろば (オープン)
  const myRooms = communities.filter((c) => c.isPrivate || c.createdBy === me.id || joinedIds.includes(c.id)); // 私のひろば (自作・招待・参加中)

  const activeRooms = mainTab === 'public' ? publicRooms : myRooms;

  function handleOpenChat(comm: Community) {
    setSelectedCommunity(comm);
  }

  function handleCreateCommunity() {
    if (!name.trim() || !description.trim()) return;
    const newComm = createCommunity({
      name: name.trim(),
      description: description.trim(),
      type: commType,
      emoji: iconText.substring(0, 4) || 'R',
      color: isPrivateRoom ? '#7C3AED' : '#0F172A',
      allowedUniversity: allowedUniv.trim() || undefined,
      isPrivate: isPrivateRoom,
      createdBy: me.id,
    });
    setShowCreateModal(false);
    setName('');
    setDescription('');
    onUpdate();
    setSelectedCommunity(newComm);
  }

  return (
    <div>
      {/* Header & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: 2 }}>チャットひろば</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>みんなで会話するか、自分だけの部屋を作るかを選べます</p>
        </div>
        <button
          onClick={() => {
            setIsPrivateRoom(mainTab === 'private');
            setShowCreateModal(true);
          }}
          className="btn btn-primary btn-sm"
          style={{ gap: 6, borderRadius: 99 }}
        >
          <Plus size={16} /> ルームを作成
        </button>
      </div>

      {/* ── 2大ひろばタブ切り替え (みんなのひろば / 私のひろば) ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        padding: 4, background: 'var(--bg-surface-2)', borderRadius: 14,
        marginBottom: 20, border: '1px solid var(--border-color)',
      }}>
        <button
          onClick={() => setMainTab('public')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 0', borderRadius: 10,
            fontFamily: 'inherit', fontWeight: mainTab === 'public' ? 700 : 500,
            fontSize: '0.875rem',
            background: mainTab === 'public' ? 'var(--bg-surface)' : 'transparent',
            color: mainTab === 'public' ? 'var(--color-primary)' : 'var(--text-muted)',
            boxShadow: mainTab === 'public' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
            border: mainTab === 'public' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <Globe size={16} /> みんなのひろば <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(オープン)</span>
        </button>

        <button
          onClick={() => setMainTab('private')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 0', borderRadius: 10,
            fontFamily: 'inherit', fontWeight: mainTab === 'private' ? 700 : 500,
            fontSize: '0.875rem',
            background: mainTab === 'private' ? 'var(--bg-surface)' : 'transparent',
            color: mainTab === 'private' ? '#C084FC' : 'var(--text-muted)',
            boxShadow: mainTab === 'private' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
            border: mainTab === 'private' ? '1px solid rgba(192, 132, 252, 0.3)' : '1px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <UserCheck size={16} /> 私のひろば <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(自作・招待)</span>
        </button>
      </div>

      {/* ── ひろばの説明バー ── */}
      <div style={{
        padding: '12px 16px', borderRadius: 12, marginBottom: 16,
        background: mainTab === 'public' ? 'var(--bg-surface-2)' : '#4C1D9522',
        border: `1px solid ${mainTab === 'public' ? 'var(--border-color)' : '#5B21B655'}`,
        display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.825rem',
        color: mainTab === 'public' ? 'var(--text-secondary)' : '#C084FC',
      }}>
        {mainTab === 'public' ? (
          <>
            <Globe size={14} /> 誰でも自由に参加してリアルタイムで就活の会話ができるオープン広場です
          </>
        ) : (
          <>
            <Lock size={14} /> 自分で作ったオリジナル部屋や、参加中・招待制のプライベート広場です
          </>
        )}
      </div>

      {/* ── Community Cards ── */}
      {activeRooms.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 16px' }}>
          <p className="empty-state-title">ルームがありません</p>
          <p className="empty-state-desc">「ルームを作成」ボタンから自分だけの部屋を作成してみよう！</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeRooms.map((comm) => {
            const joined = joinedIds.includes(comm.id);
            const isRestricted = Boolean(comm.allowedUniversity);
            const isAllowed = !isRestricted || me.university === comm.allowedUniversity;

            return (
              <div
                key={comm.id}
                className="card card-hover"
                style={{
                  padding: 16, display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer',
                  border: comm.isPrivate ? '1.5px solid #DDD6FE' : undefined,
                }}
                onClick={() => handleOpenChat(comm)}
              >
                {/* Icon text */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: comm.isPrivate ? '#F5F3FF' : `${comm.color}12`,
                  color: comm.isPrivate ? '#7C3AED' : comm.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.9rem',
                  border: `1.5px solid ${comm.isPrivate ? '#C4B5FD' : comm.color + '30'}`,
                  flexShrink: 0,
                }}>
                  {comm.emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{comm.name}</span>
                    {comm.isPrivate && (
                      <span className="badge" style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', fontSize: '0.65rem' }}>
                        私のひろば (招待制)
                      </span>
                    )}
                    <span className="badge" style={{ background: `${comm.color}15`, color: comm.color, border: `1px solid ${comm.color}25`, fontSize: '0.65rem' }}>
                      {TYPE_LABELS[comm.type] ?? 'チャット'}
                    </span>
                    {isRestricted && (
                      <span className="badge" style={{ background: isAllowed ? '#F0FDF4' : '#FEF2F2', color: isAllowed ? '#16A34A' : '#EF4444', border: `1px solid ${isAllowed ? '#BBF7D0' : '#FCA5A5'}`, fontSize: '0.65rem' }}>
                        {comm.allowedUniversity}限定
                      </span>
                    )}
                    {joined && (
                      <span className="badge" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)', fontSize: '0.65rem' }}>
                        参加中
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {comm.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Users size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comm.memberCount.toLocaleString()}人が会話中</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenChat(comm);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, gap: 4, borderRadius: 'var(--border-radius-full)' }}
                >
                  <MessageSquare size={14} /> チャット
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Community Chat Modal ── */}
      {selectedCommunity && (
        <CommunityChatModal
          community={selectedCommunity}
          onClose={() => setSelectedCommunity(null)}
          onUpdate={onUpdate}
        />
      )}

      {/* ── ルーム作成モーダル (大きくて直感的で見やすいUI) ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content animate-scaleUp" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, padding: '28px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>新規チャットルームを作成</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>目的やメンバーに合わせて部屋を開設しよう</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-ghost btn-icon" style={{ padding: 8 }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* ルームの公開種別 (大きなカード選択) */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>
                  1. ひろばタイプを選択
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => setIsPrivateRoom(false)}
                    style={{
                      padding: '16px 12px', borderRadius: 14, textAlign: 'left',
                      border: `2px solid ${!isPrivateRoom ? 'var(--color-primary)' : 'var(--border-color)'}`,
                      background: !isPrivateRoom ? 'var(--bg-surface-2)' : 'white',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Globe size={18} color={!isPrivateRoom ? 'var(--color-primary)' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: !isPrivateRoom ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                        みんなのひろば
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      オープンチャット。全就活生が自由に入退室・会話できる部屋
                    </p>
                  </button>

                  <button
                    onClick={() => setIsPrivateRoom(true)}
                    style={{
                      padding: '16px 12px', borderRadius: 14, textAlign: 'left',
                      border: `2px solid ${isPrivateRoom ? '#7C3AED' : 'var(--border-color)'}`,
                      background: isPrivateRoom ? '#F5F3FF' : 'white',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Lock size={18} color={isPrivateRoom ? '#7C3AED' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isPrivateRoom ? '#7C3AED' : 'var(--text-primary)' }}>
                        私のひろば
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      プライベート。自分が管理し、招待した仲間と話せる個別の部屋
                    </p>
                  </button>
                </div>
              </div>

              {/* ルーム名 */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  2. ルーム名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 早稲田志望者の面接対策部屋 / 2026卒エンジニア志望"
                  style={{ fontSize: '0.95rem', padding: '12px 14px' }}
                />
              </div>

              {/* 部屋の説明 */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  3. 部屋の説明・ルール <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  className="input textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="このルームで話したい内容やトピック、ルールを入力してください..."
                  rows={3}
                  style={{ fontSize: '0.95rem', padding: '12px 14px' }}
                />
              </div>

              {/* カテゴリ & アイコン文字 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>カテゴリ</label>
                  <select
                    className="input"
                    value={commType}
                    onChange={(e: any) => setCommType(e.target.value)}
                    style={{ fontSize: '0.9rem', padding: '10px 12px' }}
                  >
                    <option value="industry">業界別</option>
                    <option value="company">企業別</option>
                    <option value="university">大学限定</option>
                    <option value="event">イベント/テーマ</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>アイコン表示文字 (4字以内)</label>
                  <input
                    className="input"
                    value={iconText}
                    onChange={(e) => setIconText(e.target.value)}
                    maxLength={4}
                    placeholder="例: 面接"
                    style={{ fontSize: '0.95rem', textAlign: 'center', fontWeight: 700, padding: '10px 12px' }}
                  />
                </div>
              </div>

              {commType === 'university' && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>限定する大学名</label>
                  <input
                    className="input"
                    value={allowedUniv}
                    onChange={(e) => setAllowedUniv(e.target.value)}
                    placeholder="例: 早稲田大学"
                    style={{ fontSize: '0.9rem', padding: '10px 12px' }}
                  />
                </div>
              )}

              <button
                onClick={handleCreateCommunity}
                disabled={!name.trim() || !description.trim()}
                className="btn btn-primary"
                style={{
                  marginTop: 6, padding: '14px 0', fontSize: '1rem', fontWeight: 800,
                  borderRadius: 14,
                  background: isPrivateRoom ? 'linear-gradient(135deg, #7C3AED, #6D28D9)' : undefined,
                }}
              >
                {isPrivateRoom ? '「私のひろば」に部屋を立ち上げる' : '「みんなのひろば」に部屋を立ち上げる'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
