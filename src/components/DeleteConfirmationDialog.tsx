import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isDangerous?: boolean;
}

/**
 * Reusable Delete Confirmation Dialog Component
 * 
 * Usage:
 * <DeleteConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete Event"
 *   description="Are you sure you want to delete this event?"
 *   itemName="Team Meeting"
 *   onConfirm={handleDelete}
 *   isDangerous={true}
 * />
 */
export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title = "Confirm Delete",
  description = "Are you sure you want to delete this item?",
  itemName,
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = true,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={isDangerous ? "text-red-600" : ""}>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <p className="text-base text-gray-700">{description}</p>
          {itemName && (
            <p className="text-sm font-medium text-gray-600">
              Item: <span className="font-semibold">{itemName}</span>
            </p>
          )}
          {isDangerous && (
            <p className="text-xs text-red-500 font-medium">
              ⚠️ This action cannot be undone.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 sm:flex-initial ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
