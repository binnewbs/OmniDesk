'use client';

import { useActionState, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { completeProfileSetupAction, type ProfileSetupState } from '@/lib/actions/profile-setup';
import { skipProfileSetupAction } from '@/lib/actions/auth';
import s from './ProfileSetupForm.module.css';

const initial: ProfileSetupState = { ok: false };

/**
 * Step 2 of 2. The avatar is compressed to 256x256 on a canvas before upload so
 * the action receives a small file, and a preview shows what will be saved.
 */
export function ProfileSetupForm({ initialBio }: { initialBio: string }) {
  const [state, action, pending] = useActionState(completeProfileSetupAction, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const draw = (source: CanvasImageSource, w: number, h: number) => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Centre-crop to a square so the avatar is never stretched.
      const side = Math.min(w, h);
      const sx = (w - side) / 2;
      const sy = (h - side) / 2;
      ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          setPreview(URL.createObjectURL(blob));
          if (fileRef.current) {
            const transfer = new DataTransfer();
            transfer.items.add(new File([blob], 'avatar.png', { type: 'image/png' }));
            fileRef.current.files = transfer.files;
          }
        },
        'image/png',
        0.9,
      );
    };

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => draw(img, img.naturalWidth, img.naturalHeight);
    img.src = url;
  };

  return (
    <form action={action} className={s.form} noValidate>
      <header className={s.head}>
        <span className="t-muted">Step 2 of 2</span>
        <h1 className="t-title">Set up your profile</h1>
        <p className="subtitle">Add a photo and a short bio. You can change these later.</p>
      </header>

      {state.message && (
        <div className="alert alert--error" role="alert">
          {state.message}
        </div>
      )}

      <div className={s.avatarRow}>
        <Avatar src={preview} size={72} name="" />
        <div className={s.avatarActions}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            id="avatar"
            name="avatar"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            iconLeft={Upload}
            onClick={() => fileRef.current?.click()}
          >
            Upload photo
          </Button>
          <span className="t-muted">Optional</span>
        </div>
      </div>

      <Textarea
        label="Bio"
        name="bio"
        defaultValue={initialBio}
        maxLength={280}
        placeholder="Tell us a little about yourself"
        error={state.errors?.bio}
      />

      <Button type="submit" variant="primary" full loading={pending}>
        Continue to dashboard
      </Button>

      {/* formAction rather than a nested <form>, which is invalid HTML. */}
      <div className={s.skip}>
        <button type="submit" formAction={skipProfileSetupAction} className={`t-link ${s.skipButton}`}>
          Skip for now
        </button>
      </div>
    </form>
  );
}