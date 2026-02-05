import type { AdminRole } from './auth';

export type AdminAction =
  | 'view'
  | 'startReview'
  | 'update'
  | 'note'
  | 'message'
  | 'approve'
  | 'reject'
  | 'requestChanges'
  | 'assign'
  | 'resendSignature'
  | 'exportPdf'
  | 'reprocessTotvs'
  | 'manageUsers';

const ACTION_ROLES: Record<AdminAction, AdminRole[]> = {
  view: ['ADMIN', 'ANALYST', 'VIEWER'],
  startReview: ['ADMIN', 'ANALYST'],
  update: ['ADMIN', 'ANALYST'],
  note: ['ADMIN', 'ANALYST'],
  message: ['ADMIN', 'ANALYST'],
  approve: ['ADMIN', 'ANALYST'],
  reject: ['ADMIN', 'ANALYST'],
  requestChanges: ['ADMIN', 'ANALYST'],
  assign: ['ADMIN'],
  resendSignature: ['ADMIN', 'ANALYST'],
  exportPdf: ['ADMIN', 'ANALYST'],
  reprocessTotvs: ['ADMIN', 'ANALYST'],
  manageUsers: ['ADMIN'],
};

export const can = (roles: AdminRole[] | undefined, action: AdminAction) => {
  if (!roles) return false;
  return roles.some((role) => ACTION_ROLES[action].includes(role));
};
