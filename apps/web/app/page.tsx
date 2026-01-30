import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-soft-gradient px-6 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white/80 p-10 shadow-xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Cadastro digital
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-zinc-900">
            Experiencia guiada para envio de documentos e validacoes em tempo real.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-zinc-500">
            Cadastre seus dados, envie documentos e acompanhe o status do OCR com autosave local e
            sincronizacao segura com o backend.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200/60 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              Iniciar cadastro
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              Ver fluxo completo
            </Link>
          </div>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Validacao instantanea',
              desc: 'CPF, email, telefone e CEP validam com as mesmas regras da API.',
            },
            {
              title: 'Autosave inteligente',
              desc: 'LocalStorage imediato e sincronizacao backend a cada poucos segundos.',
            },
            {
              title: 'OCR com alertas',
              desc: 'Avisos de divergencia aparecem assim que o OCR processa seus docs.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg"
            >
              <h3 className="text-base font-semibold text-zinc-900">{card.title}</h3>
              <p className="mt-2 text-sm text-zinc-500">{card.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
