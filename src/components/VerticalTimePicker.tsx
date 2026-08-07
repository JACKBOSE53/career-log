import { useState, useRef, useEffect } from 'react';

interface VerticalTimePickerProps {
  initialHour?: number;
  initialMinute?: number;
  minuteStep?: number;
  hourUnit?: '時間' | '時';
  onChange: (hour: number, minute: number, formatted: string) => void;
}

export default function VerticalTimePicker({
  initialHour = 14,
  initialMinute = 0,
  minuteStep = 1,
  hourUnit = '時間',
  onChange,
}: VerticalTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const ITEM_HEIGHT = 44; // 1行の高さ

  useEffect(() => {
    if (hourRef.current) {
      hourRef.current.scrollTop = selectedHour * ITEM_HEIGHT;
    }
    if (minuteRef.current) {
      const minIdx = minutes.indexOf(selectedMinute);
      if (minIdx !== -1) {
        minuteRef.current.scrollTop = minIdx * ITEM_HEIGHT;
      }
    }
  }, []);

  function handleHourScroll() {
    if (!hourRef.current) return;
    const top = hourRef.current.scrollTop;
    const idx = Math.min(23, Math.max(0, Math.round(top / ITEM_HEIGHT)));
    if (idx !== selectedHour) {
      setSelectedHour(idx);
      notifyChange(idx, selectedMinute);
    }
  }

  function handleMinuteScroll() {
    if (!minuteRef.current) return;
    const top = minuteRef.current.scrollTop;
    const idx = Math.min(minutes.length - 1, Math.max(0, Math.round(top / ITEM_HEIGHT)));
    const minVal = minutes[idx];
    if (minVal !== selectedMinute) {
      setSelectedMinute(minVal);
      notifyChange(selectedHour, minVal);
    }
  }

  function notifyChange(h: number, m: number) {
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    onChange(h, m, `${hStr}:${mStr}`);
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
        上下にスライドして{hourUnit === '時' ? '時刻' : '時間'}を指定
      </div>

      <div style={{
        position: 'relative', width: '100%', height: ITEM_HEIGHT * 3,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden', userSelect: 'none',
      }}>
        {/* 中央のハイライト枠線 */}
        <div style={{
          position: 'absolute', top: ITEM_HEIGHT, height: ITEM_HEIGHT,
          left: 10, right: 10,
          borderTop: '2px solid var(--color-primary)',
          borderBottom: '2px solid var(--color-primary)',
          background: 'var(--color-primary-glow)',
          borderRadius: 10, pointerEvents: 'none', zIndex: 1,
        }} />

        {/* 1. 時間 (時 or 時間) ドラム */}
        <div
          ref={hourRef}
          onScroll={handleHourScroll}
          style={{
            flex: 1, height: ITEM_HEIGHT * 3,
            overflowY: 'scroll', scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            paddingTop: ITEM_HEIGHT, paddingBottom: ITEM_HEIGHT,
            zIndex: 2,
          }}
        >
          {hours.map((h) => (
            <div
              key={h}
              onClick={() => {
                setSelectedHour(h);
                if (hourRef.current) hourRef.current.scrollTop = h * ITEM_HEIGHT;
                notifyChange(h, selectedMinute);
              }}
              style={{
                height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: h === selectedHour ? '1.15rem' : '0.95rem',
                fontWeight: h === selectedHour ? 600 : 400,
                color: h === selectedHour ? 'var(--color-primary)' : 'var(--text-muted)',
                opacity: h === selectedHour ? 1 : 0.4,
                scrollSnapAlign: 'center', cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {String(h).padStart(2, '0')} <span style={{ fontSize: '0.8rem', marginLeft: 4, fontWeight: 500 }}>{hourUnit}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', zIndex: 2, padding: '0 6px' }}>:</div>

        {/* 2. 時間 (分) ドラム */}
        <div
          ref={minuteRef}
          onScroll={handleMinuteScroll}
          style={{
            flex: 1, height: ITEM_HEIGHT * 3,
            overflowY: 'scroll', scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
            paddingTop: ITEM_HEIGHT, paddingBottom: ITEM_HEIGHT,
            zIndex: 2,
          }}
        >
          {minutes.map((m, idx) => (
            <div
              key={m}
              onClick={() => {
                setSelectedMinute(m);
                if (minuteRef.current) minuteRef.current.scrollTop = idx * ITEM_HEIGHT;
                notifyChange(selectedHour, m);
              }}
              style={{
                height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: m === selectedMinute ? '1.15rem' : '0.95rem',
                fontWeight: m === selectedMinute ? 600 : 400,
                color: m === selectedMinute ? 'var(--color-primary)' : 'var(--text-muted)',
                opacity: m === selectedMinute ? 1 : 0.4,
                scrollSnapAlign: 'center', cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {String(m).padStart(2, '0')} <span style={{ fontSize: '0.8rem', marginLeft: 4, fontWeight: 500 }}>分</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
