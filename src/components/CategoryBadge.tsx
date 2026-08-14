import type { Category } from '../db/mockData';

export const CATEGORY_COLOR_MAP: Record<string, { bg: string; text: string; gradient: string; lightBg: string; border: string }> = {
  ES: {
    bg: '#EFF6FF', text: '#1D4ED8',
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    lightBg: '#F8FAFF', border: '#BFDBFE',
  },
  テスト: {
    bg: '#FAF5FF', text: '#7E22CE',
    gradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
    lightBg: '#FCF9FF', border: '#E9D5FF',
  },
  面接: {
    bg: '#FEF2F2', text: '#B91C1C',
    gradient: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
    lightBg: '#FFFAFA', border: '#FECACA',
  },
  GD: {
    bg: '#FDF2F8', text: '#BE185D',
    gradient: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
    lightBg: '#FFF9FB', border: '#FBCFE8',
  },
  説明会: {
    bg: '#FFFBEB', text: '#B45309',
    gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    lightBg: '#FFFDF5', border: '#FDE68A',
  },
  OB訪問: {
    bg: '#ECFDF5', text: '#047857',
    gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    lightBg: '#F7FCF9', border: '#A7F3D0',
  },
  インターン: {
    bg: '#FFF7ED', text: '#C2410C',
    gradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
    lightBg: '#FFFCF9', border: '#FED7AA',
  },
  その他: {
    bg: '#F8FAFC', text: '#475569',
    gradient: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
    lightBg: '#FAFCFD', border: '#CBD5E1',
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
