'use client';

import Link from 'next/link';
import { StatusBadge } from '../../components/StatusBadge';

export type ProposalListItem = {
  id: string;
  protocol: string;
  status: string;
  type: string;
  createdAt: string;
  person: { fullName: string; cpfMasked: string | null } | null;
  sla?: { startedAt?: string | null; dueAt?: string | null; breachedAt?: string | null };
  assignedAnalyst?: { id: string; name: string; email: string } | null;
};

export const ProposalsTable = ({ items }: { items: ProposalListItem[] }) => {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-[0.2em] text-zinc-500">
          <tr>
            <th className="px-4 py-3">Protocolo</th>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">CPF</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Criada</th>
            <th className="px-4 py-3">Analista</th>
          </tr>
        </thead>
        <tbody>
          {items.map((proposal) => (
            <tr key={proposal.id} className="border-t border-zinc-100">
              <td className="px-4 py-3 font-semibold text-zinc-900">
                <Link href={`/admin/propostas/${proposal.id}`} className="hover:underline">
                  {proposal.protocol}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-700">{proposal.person?.fullName ?? '-'}</td>
              <td className="px-4 py-3 text-zinc-500">{proposal.person?.cpfMasked ?? '-'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={proposal.status} />
              </td>
              <td className="px-4 py-3 text-zinc-500">{proposal.type}</td>
              <td className="px-4 py-3 text-zinc-500">
                {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {proposal.assignedAnalyst?.name ?? 'Nao atribuido'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
