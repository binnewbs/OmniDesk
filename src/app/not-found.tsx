import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="page" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="t-hero">Page not found</h1>
      <p className="subtitle">That screen does not exist, or the link is out of date.</p>
      <Link href="/dashboard">
        <Button variant="primary">Back to dashboard</Button>
      </Link>
    </main>
  );
}