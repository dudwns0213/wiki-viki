import { MouseEvent, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@/public/close.svg';

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

const Modal = ({ children, isOpen, onClose }: ModalProps) => {
  const modalRef = useRef(null);

  const handleClickOutside = (e: MouseEvent<HTMLElement>) => {
    e.target === modalRef.current && onClose();
  };

  if (typeof window === 'undefined') {
    return <></>;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div
            ref={modalRef}
            onClick={handleClickOutside}
            className="fixed inset-0 flex items-center justify-center bg-grayscale-500/30"
          >
            <div className="mx-2 flex h-auto w-[335px] flex-col rounded-[10px] bg-white p-[20px] shadow-lg md:w-[395px]">
              <div className="flex justify-end">
                <CloseIcon className="cursor-pointer" onClick={onClose} />
              </div>
              {children}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;