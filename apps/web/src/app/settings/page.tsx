'use client';

import { ApiError } from '@perdida-peso/api-client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NeonCard } from '@/components/ui/neon-card';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { me, loading, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!me) router.push('/login');
  }, [loading, me, router]);

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p
          className="text-2xl font-[family-name:var(--font-vt323)] terminal-cursor"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          ▶ cargando
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-2xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1
          className="text-3xl uppercase tracking-widest font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-neon-green)' }}
        >
          ▶ AJUSTES
        </h1>
        <Link
          href="/app"
          className="text-base font-[family-name:var(--font-vt323)] underline"
          style={{ color: 'var(--color-neon-cyan)' }}
        >
          ← volver
        </Link>
      </header>

      <NeonCard tone="cyan" title="CUENTA" symbol="◆">
        <dl className="space-y-2 text-base font-[family-name:var(--font-vt323)]">
          <Row label="Email" value={me.email} />
          <Row
            label="Verificado"
            value={
              me.emailVerifiedAt ? (
                <span style={{ color: 'var(--color-neon-green)' }}>
                  ✓ {new Date(me.emailVerifiedAt).toLocaleDateString('es-ES')}
                </span>
              ) : (
                <span style={{ color: 'var(--color-neon-orange)' }}>✗ pendiente</span>
              )
            }
          />
          <Row
            label="Cuenta creada"
            value={new Date(me.createdAt).toLocaleDateString('es-ES')}
          />
        </dl>
        {!me.emailVerifiedAt && (
          <ResendVerificationButton onDone={() => void refresh()} />
        )}
      </NeonCard>

      <SubscriptionCard />

      <NeonCard tone="purple" title="MIS DATOS (RGPD)" symbol="◇">
        <p className="text-base mb-3" style={{ color: 'var(--color-fg-muted)' }}>
          Descarga un archivo JSON con todos tus datos personales del sistema:
          perfil, pesos, ejercicios, atributos, niveles, semanas, sesiones y
          aceptaciones legales. Cumple con el derecho de portabilidad
          (art. 20 RGPD).
        </p>
        <DownloadExportButton />
      </NeonCard>

      <NeonCard tone="red" title="ZONA DE PELIGRO" symbol="⚠">
        <p className="text-base mb-3" style={{ color: 'var(--color-fg-muted)' }}>
          Borrar la cuenta marca tus datos para eliminación. Tienes 30 días de
          gracia: si vuelves a iniciar sesión durante ese período, la cuenta se
          reactiva. Pasados 30 días, todos tus datos se eliminan definitivamente.
        </p>
        <DeleteAccountDialog
          onDeleted={async () => {
            await refresh();
            router.push('/login');
          }}
        />
      </NeonCard>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1" style={{ borderColor: 'color-mix(in srgb, var(--color-border-strong) 30%, transparent)' }}>
      <dt
        className="uppercase tracking-wide"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {label}
      </dt>
      <dd className="text-right tabular-nums" style={{ color: 'var(--color-fg)' }}>
        {value}
      </dd>
    </div>
  );
}

function SubscriptionCard() {
  const { api } = useAuth();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const billing = useQuery({
    queryKey: ['billing', 'me'],
    queryFn: () => api.getMyBilling(),
  });

  async function onPortal() {
    setLoadingPortal(true);
    setError(null);
    try {
      const { url } = await api.createPortalSession();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
      setLoadingPortal(false);
    }
  }

  if (!billing.data) {
    return (
      <NeonCard tone="orange" title="SUSCRIPCIÓN" symbol="◆">
        <p style={{ color: 'var(--color-fg-subtle)' }}>Cargando…</p>
      </NeonCard>
    );
  }

  const b = billing.data;
  const isPremium = b.effectivePlan === 'premium';
  const tone = isPremium ? 'orange' : 'cyan';

  return (
    <NeonCard tone={tone} title="SUSCRIPCIÓN" symbol="◆">
      <div className="space-y-2 font-[family-name:var(--font-vt323)] text-base">
        <Row
          label="Plan efectivo"
          value={
            <span style={{ color: isPremium ? 'var(--color-neon-orange)' : 'var(--color-fg-muted)' }}>
              {isPremium ? '◆ PREMIUM' : '◇ FREE'}
            </span>
          }
        />
        {b.trialActive && (
          <Row
            label="Trial restante"
            value={
              <span style={{ color: 'var(--color-neon-yellow)' }}>
                {b.trialDaysLeft} día{b.trialDaysLeft === 1 ? '' : 's'}
              </span>
            }
          />
        )}
        {b.subscription && (
          <>
            <Row
              label="Estado"
              value={<span style={{ color: 'var(--color-neon-green)' }}>{b.subscription.status}</span>}
            />
            <Row
              label="Periodo"
              value={b.subscription.period === 'month' ? 'Mensual' : 'Anual'}
            />
            <Row
              label={b.subscription.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima factura'}
              value={new Date(b.subscription.currentPeriodEnd).toLocaleDateString('es-ES')}
            />
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {b.subscription ? (
          <Button tone="orange" size="sm" onClick={onPortal} disabled={loadingPortal}>
            {loadingPortal ? '…' : '[ Gestionar suscripción ]'}
          </Button>
        ) : (
          <Link
            href="/pricing"
            className="border px-3 py-1 font-[family-name:var(--font-vt323)] text-base uppercase tracking-widest"
            style={{
              color: 'var(--color-neon-orange)',
              borderColor: 'var(--color-neon-orange)',
              background: 'color-mix(in oklch, var(--color-neon-orange) 12%, transparent)',
            }}
          >
            [ Ver planes ]
          </Link>
        )}
      </div>
      {error && (
        <p
          className="mt-2 text-base font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-neon-red)' }}
        >
          ✗ {error}
        </p>
      )}
    </NeonCard>
  );
}

function DownloadExportButton() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const { blob, filename } = await api.downloadMyExport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? readError(e) : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button tone="purple" size="sm" onClick={onClick} disabled={loading}>
        {loading ? '…' : '[ Descargar mis datos (.json) ]'}
      </Button>
      {error && (
        <p
          className="mt-2 text-base font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-neon-red)' }}
        >
          ✗ {error}
        </p>
      )}
    </div>
  );
}

function ResendVerificationButton({ onDone }: { onDone: () => void }) {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      await api.resendVerification();
      setDone(true);
      onDone();
    } catch (e) {
      const msg = e instanceof ApiError ? readError(e) : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p
        className="mt-3 text-base font-[family-name:var(--font-vt323)]"
        style={{ color: 'var(--color-neon-green)' }}
      >
        ✓ Email reenviado. Revisa tu bandeja.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <Button tone="cyan" size="sm" onClick={onClick} disabled={loading}>
        {loading ? '…' : '[ Reenviar email de verificación ]'}
      </Button>
      {error && (
        <p
          className="mt-2 text-base font-[family-name:var(--font-vt323)]"
          style={{ color: 'var(--color-neon-red)' }}
        >
          ✗ {error}
        </p>
      )}
    </div>
  );
}

function DeleteAccountDialog({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const { api } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      setOpen(false);
      await onDeleted();
    } catch (e) {
      const msg = e instanceof ApiError ? readError(e) : 'Error inesperado';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button tone="red" size="sm">
          [ Borrar cuenta ]
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrar cuenta</DialogTitle>
          <DialogDescription>
            Confirma con tu contraseña. Tus datos se mantendrán 30 días por si
            cambias de idea (volver a iniciar sesión los reactiva).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onConfirm} className="space-y-4">
          <div>
            <Label>Contraseña</Label>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p
              className="text-base font-[family-name:var(--font-vt323)]"
              style={{ color: 'var(--color-neon-red)' }}
            >
              ✗ {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" tone="cyan">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" tone="red" disabled={loading}>
              {loading ? '…' : 'Confirmar borrado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function readError(e: ApiError): string {
  if (e.status === 401) return 'Contraseña incorrecta';
  if (e.body && typeof e.body === 'object' && 'message' in e.body) {
    return String((e.body as { message: unknown }).message);
  }
  return e.message;
}
