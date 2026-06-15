import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  data?: Record<string, any>;
  confirmButtonText?: string;
  confirmText?: string; // Alias para compatibilidad
  isConfirming?: boolean;
  variant?: 'default' | 'destructive';
  showReasonInput?: boolean;
  reasonPlaceholder?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  data = {},
  confirmButtonText = 'Confirmar',
  confirmText,
  isConfirming = false,
  variant = 'default',
  showReasonInput = false,
  reasonPlaceholder = 'Escribe el motivo de esta acción...',
}) => {
  const [reason, setReason] = useState('');
  const dataEntries = Object.entries(data || {});
  const finalConfirmText = confirmText || confirmButtonText;
  const isConfirmDisabled = isConfirming || (showReasonInput && reason.trim().length === 0);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(showReasonInput ? reason.trim() : undefined);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {dataEntries.length > 0 && (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {dataEntries.map(([key, value]) => {
              if (value === null || value === undefined || value === '') return null;

              const formattedKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

              return (
                <div key={key} className="grid grid-cols-3 items-center gap-4">
                  <Label className="col-span-1 text-right text-textSecondary font-medium">
                    {formattedKey}:
                  </Label>
                  <span className="col-span-2 text-foreground break-words">
                    {String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {showReasonInput && (
          <div className="space-y-2 py-2">
            <Label className="text-sm font-bold text-foreground/80">Motivo <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] bg-muted/50 border-border rounded-xl focus:ring-primary/20 font-medium"
            />
            {showReasonInput && reason.trim().length === 0 && (
              <p className="text-[11px] text-red-400 font-medium">Debes ingresar un motivo para continuar.</p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-lg border-border"
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "rounded-lg",
              variant === 'destructive' ? "bg-red-50 dark:bg-red-500/10 dark:text-red-4000 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground"
            )}
            disabled={isConfirmDisabled}
          >
            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : finalConfirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
