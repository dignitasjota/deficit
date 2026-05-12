'use client';

import type { AttributesSummary } from '@perdida-peso/schemas';
import { useState } from 'react';
import { AttributesCard } from '@/components/dashboard/attributes-card';
import { DeporteCard } from '@/components/dashboard/deporte-card';
import { HidratacionCard } from '@/components/dashboard/hidratacion-card';
import { PremiumLockedCard } from '@/components/dashboard/premium-locked-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DailyInputTabsProps {
  pesoKg: number;
  attributes: AttributesSummary;
  /** Si false, Hidratación se sustituye por PremiumLockedCard. */
  isPremium: boolean;
}

/**
 * Pestañas para registro diario rápido. Reemplaza el grid 1×2 y la fila
 * separada de atributos por un único bloque navegable: Deporte /
 * Hidratación / Atributos.
 *
 * Defaults a "Deporte" porque es la entrada más frecuente (pasos +
 * ejercicios). Mantiene el estado de tab activo durante la sesión.
 */
export function DailyInputTabs({ pesoKg, attributes, isPremium }: DailyInputTabsProps) {
  const [value, setValue] = useState<'deporte' | 'hidratacion' | 'atributos'>('deporte');

  return (
    <div
      className="border p-2 sm:p-3"
      style={{
        borderColor: 'var(--color-border-strong)',
        background: 'color-mix(in oklch, var(--color-bg-elevated) 60%, transparent)',
      }}
    >
      <Tabs value={value} onValueChange={(v) => setValue(v as typeof value)}>
        <TabsList>
          <TabsTrigger value="deporte" tone="green">
            ✦ Deporte
          </TabsTrigger>
          <TabsTrigger value="hidratacion" tone="cyan">
            ◇ Hidratación
          </TabsTrigger>
          <TabsTrigger value="atributos" tone="pink">
            ◈ Atributos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deporte">
          <DeporteCard pesoKg={pesoKg} />
        </TabsContent>

        <TabsContent value="hidratacion">
          {isPremium ? (
            <HidratacionCard />
          ) : (
            <PremiumLockedCard
              title="HIDRATACIÓN HOY"
              description="Meta dinámica según tu sodio + multiplicadores por bebida (agua, café/té, zero)."
            />
          )}
        </TabsContent>

        <TabsContent value="atributos">
          <AttributesCard data={attributes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
