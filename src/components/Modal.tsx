import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg';
}

/**
 * Renders via a portal directly into document.body.
 *
 * Why this exists: page wrappers use an `.animate-in` CSS animation that sets
 * a `transform` on mount. Any ancestor with a transform becomes the
 * containing block for `position: fixed` descendants per the CSS spec —
 * so a plain fixed-position modal nested in page content can end up
 * positioned relative to that page div instead of the real viewport,
 * which pushes it off-center or off-screen depending on scroll position.
 * Portaling to document.body sidesteps this entirely.
 */
export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative z-10 glass-card w-full ${maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md'} p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
