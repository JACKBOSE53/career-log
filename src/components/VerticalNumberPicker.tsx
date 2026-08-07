import { useState, useRef, useEffect } from 'react';

interface VerticalNumberPickerProps {
  initialValue?: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (val: number) => void;
}

export default function VerticalNumberPicker({
  initialValue = 3,
  min = 1,
  max = 40,
  unit = '件 / 社',
  onChange,
}: VerticalNumberPickerProps) {
  const [selectedVal, setSelectedVal] = useState(initialValue);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const pickerRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 44;

  useEffect(() => {
    if (pickerRef.current) {
      const idx = values.indexOf(selectedVal);
      if (idx !== -1) {
        pickerRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
    }
  }, []);

  function handleScroll() {
    if (!pickerRef.current) return;
    const top = pickerRef.current.scrollTop;
    const idx = Math.min(values.length - 1, Math.max(0, Math.round(top / ITEM_HEIGHT)));
    const val = values[idx];
    if (val !== selectedVal) {
      setSelectedVal(val);
      onChange(val);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--bg-surface-2)', borderRadius: 16, padding: '12px 16px',
      border: '1px solid var(--border-color)', width: '100%',
    }}>
      <div style={{
        fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        上下にスライドして目標数を指定
      </div>

      <div style={{
        position: 'relative', width: '100%', height: ITEM_HEIGHT * 3,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden', userSelect: 'none',
      }}>
        {/* 中央のハイライト枠線 */}
        <div style={{
          position: 'absolute', top: ITEM_HEIGHT, height: ITEM_HEIGHT,
          left: 20, right: 20,
          borderTop: '2px solid var(--color-primary)',
          borderBottom: '2px solid var(--color-primary)',
          background: 'var(--color-primary-glow)',
          borderRadius: 10, pointerEvents: 'none', zIndex: 1,
        }} />

        <div
          ref={pickerRef}
          onScroll={handleScroll}
          style={{
            flex: 1, height: ITEM_HEIGHT * 3,
            overflowY: 'scroll', scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            paddingTop: ITEM_HEIGHT, paddingBottom: ITEM_HEIGHT,
            zIndex: 2,
          }}
        >
          {values.map((v) => (
            <div
              key={v}
              onClick={() => {
                setSelectedVal(v);
                const idx = values.indexOf(v);
                if (pickerRef.current) pickerRef.current.scrollTop = idx * ITEM_HEIGHT;
                onChange(v);
              }}
              style={{
                height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: v === selectedVal ? '1.15rem' : '0.95rem',
                fontWeight: v === selectedVal ? 600 : 400,
                color: v === selectedVal ? 'var(--color-primary)' : 'var(--text-muted)',
                opacity: v === selectedVal ? 1 : 0.4,
                scrollSnapAlign: 'center', cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {v} <span style={{ fontSize: '0.8rem', marginLeft: 6, fontWeight: 500 }}>{unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
