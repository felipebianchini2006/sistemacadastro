import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen-dvh bg-soft-gradient px-4 py-12 sm:px-8 sm:py-16">
      <div className="page-shell flex flex-col items-center gap-10">
        <header className="flex flex-col items-center gap-6">
          <Image
            src="/logo-sbacem.svg"
            alt="SBACEM - Por quem nos inspira"
            width={280}
            height={84}
            priority
          />
        </header>

        <section className="max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-md)] sm:p-12">
          <div className="flex flex-col gap-6 text-sm leading-relaxed text-[color:var(--gray-500)] sm:text-base">
            <p>
              Cadastre-se na SBACEM e tenha ao seu lado uma associacao dedicada a proteger e
              promover os direitos autorais de musicos, compositores e artistas no Brasil, com
              compromisso com a transparencia e suporte continuo.
            </p>
            <p>
              Com a SBACEM, voce pode registrar e proteger suas musicas, acompanhando de forma clara
              a arrecadacao e a distribuicao dos seus direitos, alem de contar com atendimento
              especializado, pensado para orientar voce com mais praticidade e menos burocracia.
            </p>
            <p>
              Voce tambem ganha acesso a recursos que facilitam sua rotina, como consultar
              informacoes e status das suas musicas online, registrar eventos e manter seus dados e
              controles reunidos em um so lugar — inclusive com acompanhamento em tempo real pelo
              aplicativo.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/cadastro"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--primary-dark)]"
            >
              Novo Cadastro
            </Link>
            <Link
              href="/migracao"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[var(--primary)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[color:var(--primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--primary)] hover:text-white"
            >
              Migracao
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href="/acompanhar"
              className="text-sm font-medium text-[color:var(--gray-500)] underline underline-offset-2 transition hover:text-[color:var(--primary)]"
            >
              Ja sou filiado
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
