import type { AdminRole } from './auth';

export type AdminAction =
  | 'view'
  | 'startReview'
  | 'approve'
  | 'reject'
  | 'requestChanges'
  | 'assign'
  | 'resendSignature'
  | 'exportPdf';

const ACTION_ROLES: Record<AdminAction, AdminRole[]> = {
  view: ['ADMIN', 'ANALYST', 'VIEWER'],
  startReview: ['ADMIN', 'ANALYST'],
  approve: ['ADMIN', 'ANALYST'],
  reject: ['ADMIN', 'ANALYST'],
  requestChanges: ['ADMIN', 'ANALYST'],
  assign: ['ADMIN'],
  resendSignature: ['ADMIN', 'ANALYST'],
  exportPdf: ['ADMIN', 'ANALYST'],
};

export const can = (roles: AdminRole[] | undefined, action: AdminAction) => {
  if (!roles) return false;
  return roles.some((role) => ACTION_ROLES[action].includes(role));
};
