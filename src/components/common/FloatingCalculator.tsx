// ==========================================
// BasketBuddy - Floating Calculator Widget
// ==========================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, X, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/helpers';

type CalcOp = '+' | '-' | '×' | '÷' | null;

const FloatingCalculator: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [op, setOp] = useState<CalcOp>(null);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [expression, setExpression] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Core logic ───────────────────────────────────────────────
  const reset = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOp(null);
    setWaitingForNext(false);
    setExpression('');
  }, []);

  const inputDigit = useCallback((digit: string) => {
    setDisplay((prev) => {
      if (waitingForNext) {
        setWaitingForNext(false);
        return digit;
      }
      if (prev === '0' && digit !== '.') return digit;
      if (digit === '.' && prev.includes('.')) return prev;
      if (prev.length >= 12) return prev;
      return prev + digit;
    });
  }, [waitingForNext]);

  const handleOp = useCallback((nextOp: CalcOp) => {
    const current = parseFloat(display);
    if (prevValue !== null && !waitingForNext) {
      const result = compute(prevValue, current, op);
      const resultStr = formatResult(result);
      setDisplay(resultStr);
      setPrevValue(result);
      setExpression(`${resultStr} ${nextOp}`);
    } else {
      setPrevValue(current);
      setExpression(`${display} ${nextOp}`);
    }
    setOp(nextOp);
    setWaitingForNext(true);
  }, [display, prevValue, op, waitingForNext]);

  const handleEquals = useCallback(() => {
    const current = parseFloat(display);
    if (prevValue === null || op === null) return;
    const result = compute(prevValue, current, op);
    const resultStr = formatResult(result);
    setExpression(`${expression} ${display} =`);
    setDisplay(resultStr);
    setPrevValue(null);
    setOp(null);
    setWaitingForNext(true);
  }, [display, prevValue, op, expression]);

  const handlePercent = useCallback(() => {
    const v = parseFloat(display);
    setDisplay(formatResult(v / 100));
    setWaitingForNext(true);
  }, [display]);

  const handleSign = useCallback(() => {
    setDisplay((prev) => {
      const v = parseFloat(prev);
      return formatResult(-v);
    });
  }, []);

  const handleBackspace = useCallback(() => {
    if (waitingForNext) return;
    setDisplay((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  }, [waitingForNext]);

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      else if (e.key === '.') inputDigit('.');
      else if (e.key === '+') handleOp('+');
      else if (e.key === '-') handleOp('-');
      else if (e.key === '*') handleOp('×');
      else if (e.key === '/') { e.preventDefault(); handleOp('÷'); }
      else if (e.key === 'Enter' || e.key === '=') handleEquals();
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') reset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, inputDigit, handleOp, handleEquals, handleBackspace, reset]);

  // ── Button config ────────────────────────────────────────────
  const buttons: { label: string; type: 'number' | 'op' | 'action' | 'equals'; wide?: boolean }[] = [
    { label: 'C',   type: 'action' },
    { label: '+/-', type: 'action' },
    { label: '%',   type: 'action' },
    { label: '÷',   type: 'op'     },
    { label: '7',   type: 'number' },
    { label: '8',   type: 'number' },
    { label: '9',   type: 'number' },
    { label: '×',   type: 'op'     },
    { label: '4',   type: 'number' },
    { label: '5',   type: 'number' },
    { label: '6',   type: 'number' },
    { label: '-',   type: 'op'     },
    { label: '1',   type: 'number' },
    { label: '2',   type: 'number' },
    { label: '3',   type: 'number' },
    { label: '+',   type: 'op'     },
    { label: '0',   type: 'number', wide: true },
    { label: '.',   type: 'number' },
    { label: '=',   type: 'equals' },
  ];

  const handleButton = (label: string) => {
    if (label >= '0' && label <= '9') { inputDigit(label); return; }
    switch (label) {
      case '.':   inputDigit('.'); break;
      case 'C':   reset();         break;
      case '+/-': handleSign();    break;
      case '%':   handlePercent(); break;
      case '÷': case '×': case '+': case '-':
        handleOp(label as CalcOp); break;
      case '=':   handleEquals();  break;
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors',
          open
            ? 'bg-gray-700 dark:bg-gray-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/40'
        )}
        aria-label="Toggle calculator"
      >
        {open ? <X size={22} /> : <Calculator size={22} />}
      </motion.button>

      {/* Calculator panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            key="calc"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-72 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="bg-gray-800 dark:bg-gray-900 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <Calculator size={14} />
                <span className="text-xs font-medium tracking-wide">Calculator</span>
              </div>
              <button
                onClick={reset}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                title="Clear all"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Display */}
            <div className="bg-gray-900 px-4 pt-3 pb-2 text-right">
              <p className="text-gray-500 dark:text-gray-600 text-xs h-4 truncate">
                {expression || '\u00A0'}
              </p>
              <p className="text-white text-4xl font-light tracking-tight truncate mt-1 leading-none">
                {display}
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-4 gap-px bg-gray-300 dark:bg-gray-700 bg-opacity-50">
              {buttons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleButton(btn.label)}
                  className={cn(
                    'py-4 text-lg font-medium transition-all active:scale-95 select-none',
                    btn.wide && 'col-span-2',
                    btn.type === 'number' &&
                      'bg-gray-800 hover:bg-gray-700 text-white',
                    btn.type === 'action' &&
                      'bg-gray-600 hover:bg-gray-500 text-white',
                    btn.type === 'op' &&
                      cn(
                        'hover:bg-indigo-500 text-white font-bold',
                        op === btn.label && !waitingForNext
                          ? 'bg-indigo-400'
                          : 'bg-indigo-600'
                      ),
                    btn.type === 'equals' &&
                      'bg-brand-500 hover:bg-brand-600 text-white col-span-1'
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Helpers ──────────────────────────────────────────────────
function compute(a: number, b: number, op: CalcOp): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : 0;
    default:  return b;
  }
}

function formatResult(n: number): string {
  if (!isFinite(n)) return '0';
  const s = parseFloat(n.toPrecision(12)).toString();
  // trim trailing zeros after decimal
  return s;
}

export default FloatingCalculator;
