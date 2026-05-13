export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: '¿Necesito una báscula especial?',
    a: 'No. Cualquier báscula doméstica vale. El sistema te pide el peso de la báscula al despertar y hace todo el cálculo de XP, retención y peso teórico por ti.',
  },
  {
    q: '¿Qué pasa si me salto un día?',
    a: 'Nada grave. Si no registras peso un día, el rango esperado del día siguiente se ensancha un poco y el sistema sigue. No pierdes la racha por un descanso puntual; sí por varios seguidos.',
  },
  {
    q: '¿Funciona si solo quiero mantener peso, no perder?',
    a: 'Sí. El "déficit" puede ser tan pequeño como tú decidas. El sistema sirve igual para mantenimiento sostenido o recomposición lenta.',
  },
  {
    q: '¿Mis datos están seguros? ¿RGPD?',
    a: 'Sí. Cumplimos RGPD + LOPDGDD española. Puedes exportar todos tus datos en un clic desde ajustes (JSON), y borrar tu cuenta dispara una purga total a los 30 días. Nunca vendemos datos.',
  },
  {
    q: '¿Funciona en el móvil?',
    a: 'Sí. La web es responsive y se instala como PWA: desde Safari iOS pulsa "Añadir a pantalla de inicio", desde Chrome Android sale el banner de instalar. App nativa en App Store y Play Store llegará si hay demanda.',
  },
  {
    q: '¿Por qué este sistema y no Habitica o MyFitnessPal?',
    a: 'Habitica gamifica hábitos genéricos sin enfoque en peso. MyFitnessPal es tracking puro sin progresión visible. Déficit combina ambos: tracking real de peso + progresión RPG diseñada específicamente para que no abandones.',
  },
  {
    q: '¿Me cobran automáticamente tras el trial de 14 días?',
    a: 'No. El trial es sin tarjeta — al terminar, tu plan vuelve a Free automáticamente. Solo se cobra si tú activas Premium desde ajustes y metes la tarjeta tú mismo.',
  },
  {
    q: '¿Puedo cancelar Premium cuando quiera?',
    a: 'Sí. Desde "Suscripción" en ajustes accedes al Customer Portal de Stripe: cancelas en 2 clicks, sin permanencia. Mantienes Premium hasta el final del periodo facturado.',
  },
];
