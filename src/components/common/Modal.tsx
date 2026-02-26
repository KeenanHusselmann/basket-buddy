// ==========================================
// BasketBuddy - Modal Component
// ==========================================

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-portal-root">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Sheet: anchored to bottom, grows upward, max 88% tall */}
      <div className="modal-sheet dark:bg-gray-900 dark:border-gray-700">
        {/* Drag pill */}
        <div className="modal-pill-wrap">
          <div className="modal-pill dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="modal-header dark:border-gray-800">
          <h2 className="modal-title dark:text-gray-100">{title}</h2>
          <button className="modal-close dark:text-gray-400 dark:hover:bg-gray-800" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
