import type { Category } from '../db/mockData';

export const CATEGORY_COLOR_MAP: Record<string, { bg: string; text: string; gradient: string; lightBg: string; border: string }> = {
  ES: {
    bg: '#F4F6FF', text: '#4F46E5',
    gradient: 'linear-gradient(135deg, #F4F6FF 0%, #E0E7FF 100%)',
    lightBg: '#FAFCFF', border: '#E0E7FF',
  },
  テスト: {
    bg: '#FAF5FF', text: '#9333EA',
    gradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    lightBg: '#FAFAF9', border: '#F3E8FF',
  },
  面接: {
    bg: '#FFF5F5', text: '#E11D48',
    gradient: 'linear-gradient(135deg, #FFF5F5 0%, #FFE4E6 100%)',
    lightBg: '#FFFAFA', border: '#FFE4E6',
  },
  GD: {
    bg: '#FFF5F9', text: '#DB2777',
    gradient: 'linear-gradient(135deg, #FFF5F9 0%, #FCE7F3 100%)',
    lightBg: '#FAFBFD', border: '#FCE7F3',
  },
  説明会: {
    bg: '#FFFDF0', text: '#D97706',
    gradient: 'linear-gradient(135deg, #FFFDF0 0%, #FEF3C7 100%)',
    lightBg: '#FFFDF5', border: '#FEF3C7',
  },
  OB訪問: {
    bg: '#F2FDF7', text: '#059669',
    gradient: 'linear-gradient(135deg, #F2FDF7 0%, #D1FAE5 100%)',
    lightBg: '#F7FCF9', border: '#D1FAE5',
  },
  インターン: {
    bg: '#FFF9F5', text: '#EA580C',
    gradient: 'linear-gradient(135deg, #FFF9F5 0%, #FFEDD5 100%)',
    lightBg: '#FFFDFB', border: '#FFEDD5',
  },
  その他: {
    bg: '#F8FAFC', text: '#64748B',
    gradient: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
    lightBg: '#F8FAFC', border: '#E2E8F0',
  },
};

interface CategoryBadgeProps {
  category: Category | string;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const theme = CATEGORY_COLOR_MAP[category] || CATEGORY_COLOR_MAP['その他'];

  return (
    <span
      style={{
        background: theme.bg,
        color: theme.text,
        border: `1px solid ${theme.border}`,
        fontSize: size === 'sm' ? '0.72rem' : '0.78rem',
        padding: size === 'sm' ? '3px 10px' : '4px 12px',
        fontWeight: 700,
        borderRadius: 20,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        boxShadow: 'none',
      }}
    >
      {category}
    </span>
  );
}
