/** Request lifecycle — kept as strings for SQLite simplicity. */
export const TimeOffStatus = {
  PENDING_VALIDATION: 'pending_validation',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const OutboxStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

export const OutboxOperation = {
  HCM_VALIDATE: 'hcm_validate',
  HCM_COMMIT: 'hcm_commit',
};

export const AuditAction = {
  BALANCE_UPSERT: 'balance_upsert',
  BALANCE_DRIFT: 'balance_drift',
  TIME_OFF_CREATED: 'time_off_created',
  TIME_OFF_APPROVED: 'time_off_approved',
  TIME_OFF_REJECTED: 'time_off_rejected',
  IDEMPOTENT_REPLAY: 'idempotent_replay',
  STALE_BALANCE_REVALIDATED: 'stale_balance_revalidated',
};
