'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { signOutAction } from '@/lib/actions/auth';
import s from './SignOutDialog.module.css';

/** Shared by the desktop rail and the mobile account sheet. */
export function SignOutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sign out?"
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="danger" iconLeft={LogOut}>
              Sign out
            </Button>
          </form>
        </>
      }
    >
      <p className={s.text}>
        You will be signed out of OmniDesk. Any unsaved changes on this screen
        will be lost.
      </p>
    </Modal>
  );
}
