import React, { useEffect, useRef } from "react";

const lineCount = 3;

export type AudioPulseProps = {
  active: boolean;
  volume: number;
  hover?: boolean;
};

export default function AudioPulse({ active, volume, hover }: AudioPulseProps) {
  const lines = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    let timeout: number | null = null;
    const update = () => {
      lines.current.forEach(
        (line, i) =>
          (line.style.height = `${Math.min(
            24,
            4 + volume * (i === 1 ? 400 : 60)
          )}px`)
      );
      timeout = window.setTimeout(update, 100);
    };
    update();
    return () => clearTimeout((timeout as number)!);
  }, [volume]);

  return (
    <div 
      className={`
        flex items-center justify-center space-x-1
        ${active ? 'opacity-100' : 'opacity-50'}
        ${hover ? 'hover:opacity-100' : ''}
      `}
    >
      {Array(lineCount)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            ref={(el) => (lines.current[i] = el!)}
            className="w-1 bg-blue-500 transition-all duration-200 rounded"
            style={{ 
              height: '4px', 
              animationDelay: `${i * 133}ms` 
            }}
          />
        ))}
    </div>
  );
}