import { useEffect, useState } from 'react';

const CHAR_DELAY = 18;
const LINE_DELAY = 300;

export const useTypewriter = (lines: string[]) => {
  const [line, setLine] = useState(0);
  const [char, setChar] = useState(0);

  const done = line >= lines.length;
  const current = lines[line] ?? '';

  const typedAt = (index: number) => {
    if (index < line) return lines[index] ?? '';
    if (index === line) return current.slice(0, char);
    return '';
  };

  useEffect(() => {
    if (done) return;

    const isLineStart = line > 0 && char === 0;
    const delay = current.length === 0 ? 0 : isLineStart ? LINE_DELAY : CHAR_DELAY;
    const skipEmptyOrFinish = current.length === 0 || char + 1 >= current.length;

    const timer = window.setTimeout(() => {
      if (skipEmptyOrFinish) {
        setLine((value) => value + 1);
        setChar(0);
      } else {
        setChar((value) => value + 1);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [done, line, char, current]);

  const skip = () => {
    setLine(lines.length);
    setChar(0);
  };

  return { typedAt, activeLine: done ? -1 : line, line, done, skip };
}