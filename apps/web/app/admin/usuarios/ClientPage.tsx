'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetchWithRefresh } from '../lib/api';
import { cn } from '../../lib/utils';
import { Plus, Pencil, UserX, UserCheck, X } from 'lucide-react';

type AdminRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  roles: AdminRole[];
};

type UserFormData = {
  name: string;
  email: string;
  password: string;
  roles: AdminRole[];
};

type EditFormData = {
  name: string;
  email: string;
  newPassword: string;
  roles: AdminRole[];
  isActive: boolean;
};

const ROLES: { value: AdminRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'ANALYST', label: 'Analista' },
  { value: 'VIEWER', label: 'Visualizador' },
];

const roleLabel = (role: AdminRole) => {
  const found = ROLES.find((r) => r.value === role);
  return found?.label ?? role;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const emptyCreateForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  roles: [],
};

export default function ClientPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormData>(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    email: '',
    newPassword: '',
    roles: [],
    isActive: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchWithRefresh<AdminUserItem[]>('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreateError(null);
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateError('Preencha todos os campos obrigatorios');
      return;
    }
    if (createForm.roles.length === 0) {
      setCreateError('Selecione ao menos uma role');
      return;
    }
    setCreating(true);
    try {
      await adminFetchWithRefresh('/admin/users', {
        method: 'POST',
        body: createForm as unknown as Record<string, unknown>,
      });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erro ao criar usuario');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      newPassword: '',
      roles: [...user.roles],
      isActive: user.isActive,
    });
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    setEditError(null);
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Nome e email sao obrigatorios');
      return;
    }
    if (editForm.roles.length === 0) {
      setEditError('Selecione ao menos uma role');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        roles: editForm.roles,
        isActive: editForm.isActive,
      };
      if (editForm.newPassword.trim()) {
        body.newPassword = editForm.newPassword;
      }
      await adminFetchWithRefresh(`/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body,
      });
      setEditingUser(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AdminUserItem) => {
    try {
      if (user.isActive) {
        await adminFetchWithRefresh(`/admin/users/${user.id}`, {
          method: 'DELETE',
        });
      } else {
        await adminFetchWithRefresh(`/admin/users/${user.id}`, {
          method: 'PATCH',
          body: { isActive: true },
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar status');
    }
  };

  const toggleCreateRole = (role: AdminRole) => {
    setCreateForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const toggleEditRole = (role: AdminRole) => {
    setEditForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[color:var(--gray-900)]">Usuarios</h1>
          <p className="mt-1 text-sm text-[color:var(--gray-500)]">
            Gerencie os usuarios administrativos do sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateForm(emptyCreateForm);
            setCreateError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo Usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !users.length ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : (
        <div className="admin-card overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold text-[color:var(--gray-500)]">Nome</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--gray-500)]">Email</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--gray-500)]">Roles</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--gray-500)]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--gray-500)]">
                    Criado em
                  </th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--gray-500)]">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      'border-b border-[var(--border)] last:border-b-0',
                      !user.isActive && 'opacity-50',
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-[color:var(--gray-900)]">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-[color:var(--gray-500)]">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : role === 'ANALYST'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600',
                            )}
                          >
                            {roleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                        )}
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--gray-500)]">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[color:var(--gray-500)] hover:bg-[var(--muted)]"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]',
                            user.isActive ? 'text-red-500' : 'text-green-600',
                          )}
                          title={user.isActive ? 'Desativar' : 'Reativar'}
                        >
                          {user.isActive ? (
                            <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-[color:var(--gray-500)]"
                    >
                      Nenhum usuario encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--gray-900)]">Novo Usuario</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--gray-500)] hover:bg-[var(--muted)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Nome
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="admin-field w-full"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="admin-field w-full"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Senha
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="admin-field w-full"
                  placeholder="Minimo 6 caracteres"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleCreateRole(role.value)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        createForm.roles.includes(role.value)
                          ? 'bg-[var(--primary)] text-white'
                          : 'border border-[var(--border)] bg-[var(--card)] text-[color:var(--gray-500)] hover:border-[var(--primary)]',
                      )}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {createError && <p className="mt-3 text-xs text-red-600">{createError}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--gray-900)]">Editar Usuario</h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--gray-500)] hover:bg-[var(--muted)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Nome
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="admin-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="admin-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Nova Senha (opcional)
                </label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="admin-field w-full"
                  placeholder="Deixe vazio para manter a atual"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--gray-500)]">
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleEditRole(role.value)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        editForm.roles.includes(role.value)
                          ? 'bg-[var(--primary)] text-white'
                          : 'border border-[var(--border)] bg-[var(--card)] text-[color:var(--gray-500)] hover:border-[var(--primary)]',
                      )}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[color:var(--gray-500)]">Status</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.isActive}
                  onClick={() => setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    editForm.isActive ? 'bg-green-500' : 'bg-gray-300',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                      editForm.isActive ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            </div>

            {editError && <p className="mt-3 text-xs text-red-600">{editError}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--gray-700)] hover:bg-[var(--muted)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEdit}
                disabled={saving}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
