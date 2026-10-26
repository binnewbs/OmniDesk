'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Live camera preview that hands back a captured frame as a JPEG File.
 * Prefers the rear camera on phones. getUserMedia only works on https or
 * localhost, which covers both the Vercel deploy and local development.
 */
export function ReceiptCamera({
  onCapture,
  onCancel,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available in this browser. Use Upload instead.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
        }
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow it in your browser settings, or use Upload.'
            : name === 'NotFoundError'
              ? 'No camera found on this device. Use Upload instead.'
              : 'Could not start the camera. Use Upload instead.',
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], 'receipt.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      {error ? (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      ) : (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-label="Camera preview"
          style={{ width: '100%', maxHeight: 360, borderRadius: 'var(--radius-md, 12px)', background: '#000', objectFit: 'cover' }}
        />
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {!error && (
          <Button variant="primary" iconLeft={Camera} onClick={capture} disabled={!ready}>
            Capture
          </Button>
        )}
      </div>
    </div>
  );
}
