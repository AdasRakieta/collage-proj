import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'primary',
  });
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      ...opts,
    });
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolveCallback(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(true);
    }
  }, [resolveCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(false);
    }
  }, [resolveCallback]);

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  };
};
