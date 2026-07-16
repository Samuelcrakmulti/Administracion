'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  { q: '¿Qué es NexoPyme AI y para quién está diseñado?', a: 'NexoPyme AI es una plataforma de administración empresarial con Inteligencia Artificial diseñada para micro y pequeñas empresas en Latinoamérica. Está pensada para propietarios, gerentes y administradores que quieren tener el control total de su negocio sin necesidad de ser expertos en tecnología o finanzas.' },
  { q: '¿Necesito conocimientos técnicos para usar la plataforma?', a: 'No. NexoPyme AI está diseñada para ser completamente intuitiva. La configuración inicial toma menos de 5 minutos y no requiere conocimientos técnicos. Si tienes alguna duda, nuestra comunidad y soporte están disponibles para ayudarte.' },
  { q: '¿Cómo funciona la Inteligencia Artificial de NexoPyme?', a: 'Utilizamos Google Gemini AI, uno de los modelos de lenguaje más avanzados del mundo. La IA analiza constantemente todos los datos de tu empresa (ventas, finanzas, inventario, empleados) y genera diagnósticos, predicciones y recomendaciones automáticas en lenguaje natural.' },
  { q: '¿Es segura mi información en NexoPyme AI?', a: 'Sí. Toda tu información se almacena de forma cifrada en Supabase, una plataforma de base de datos segura con certificación SOC 2. Implementamos autenticación segura, políticas de acceso por roles y backups automáticos. Tu información nunca es compartida con terceros.' },
  { q: '¿Puedo usar NexoPyme AI desde mi celular?', a: 'Sí. NexoPyme AI es completamente responsive y funciona perfectamente en smartphones, tablets y computadoras. Desde tu celular puedes registrar ventas, consultar el dashboard y hablar con la IA en tiempo real.' },
  { q: '¿Qué pasa si cancelo mi suscripción?', a: 'Puedes cancelar cuando quieras sin penalidades. Al cancelar, tu cuenta pasa al plan gratuito y conservas acceso a tus datos. Si deseas exportar toda tu información antes de cancelar, puedes hacerlo desde los reportes en cualquier momento.' },
  { q: '¿El plan gratuito tiene límites de tiempo?', a: 'No. El plan gratuito no tiene caducidad. Puedes usarlo de forma indefinida con las funciones incluidas en ese plan. Solo deberás actualizar si necesitas módulos adicionales como Talento Humano, Parqueadero o el Asistente IA ilimitado.' },
  { q: '¿NexoPyme AI sirve para cualquier tipo de negocio?', a: 'Sí. La plataforma está diseñada para adaptarse a diferentes tipos de negocio: tiendas de barrio, restaurantes, clínicas, talleres mecánicos, parqueaderos, distribuidoras, oficinas administrativas y muchos más. Los módulos son independientes, así que activas solo lo que necesitas.' },
  { q: '¿Puedo integrar NexoPyme con otras aplicaciones?', a: 'Actualmente NexoPyme AI funciona como plataforma independiente con integraciones nativas con Supabase y Google Gemini AI. En el plan Empresarial ofrecemos integraciones personalizadas y acceso a API para conectar con sistemas propios o de terceros.' },
  { q: '¿Cómo puedo obtener ayuda si tengo problemas?', a: 'Tienes múltiples canales de soporte: el Asistente IA dentro de la plataforma responde preguntas operativas al instante; la comunidad premium en WhatsApp y Telegram está activa todo el día; y para usuarios de planes pagos, ofrecemos soporte por chat y correo con tiempo de respuesta garantizado.' },
];

function FAQItem({ q, a, index, inView }: { q: string; a: string; index: number; inView: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: index * 0.04 }}
      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${open ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
      <button className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" onClick={() => setOpen(!open)}>
        <span className="text-sm font-semibold text-slate-900 sm:text-base">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${open ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>
            <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="faq" ref={ref} className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">FAQ</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Preguntas frecuentes</h2>
          <p className="mt-5 text-xl text-slate-500">Todo lo que necesitas saber antes de comenzar con NexoPyme AI.</p>
        </motion.div>

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
