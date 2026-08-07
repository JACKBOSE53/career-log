import { CATEGORIES } from '../db/mockData';
import type { Category } from '../db/mockData';

interface CategoryBadgeProps {
  category: Category;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return null;

  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${cat.color}25`,
        color: cat.color,
        border: `1px solid ${cat.color}55`,
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        fontWeight: 600,
      }}
    >
      {cat.label}
    </span>
  );
}
