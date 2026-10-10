'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useSubmitFeedback } from '@/hooks/useSubmitFeedback';
import { saveProfileAction, type ActionState } from '@/lib/actions/profile';
import s from './ProfileScreen.module.css';

const initial: ActionState = { ok: false };

interface ProfileScreenProps {
  username: string;
  bio: string;
  avatar: string | null;
}

export function ProfileScreen({ username, bio, avatar }: ProfileScreenProps) {
  const router = useRouter();
  const { show } = useToast();

  const [state, action, pending] = useActionState(saveProfileAction, initial);
  const [preview, setPreview] = useState<string | null>(avatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Centre-crop to a square and downscale, so the upload stays small.
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );

      canvas.toBlob((blob) => {
        if (!blob || !fileRef.current) return;
        setPreview(URL.createObjectURL(blob));
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], 'avatar.png', { type: 'image/png' }));
        fileRef.current.files = transfer.files;
      }, 'image/png', 0.9);
    };

    img.src = url;
  };

  // The feedback lives in an effect, not in onSubmit: inside a submit handler
  // `state` is still the previous submission's result, so the toast would fire
  // again on every later submit (see useSubmitFeedback).
  useSubmitFeedback(state, pending, () => {
    show({ tone: 'success', message: 'Profile saved.' });
    router.refresh();
  });

  return (
    <main className="page">
      <PageHeader title="Profile" subtitle="Your name, photo and bio" />

      <form action={action} className={`card ${s.card}`} noValidate>
        {state.message && (
          <div className="alert alert--error" role="alert">
            {state.message}
          </div>
        )}

        <div className={s.avatarRow}>
          <Avatar src={preview} name={username} size={72} />
          <div className={s.avatarActions}>
            <input
              ref={fileRef}
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              iconLeft={Upload}
              onClick={() => fileRef.current?.click()}
            >
              Upload photo
            </Button>
            <span className="t-muted">JPG or PNG, up to 2 MB</span>
          </div>
        </div>

        <Input
          label="Username"
          name="username"
          defaultValue={username}
          required
          error={state.errors?.username}
          hint="Shown on your sidebar and dashboard greeting."
        />

        <Textarea
          label="Bio"
          name="bio"
          defaultValue={bio}
          maxLength={280}
          placeholder="Tell us a little about yourself"
          error={state.errors?.bio}
        />

        <div className={s.actions}>
          <Button type="submit" variant="primary" loading={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </main>
  );
}