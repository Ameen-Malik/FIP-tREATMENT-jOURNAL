import { onStatusChange } from '../outbox.js';

const LABELS = {
  synced: '',
  pending: n => `Pending (${n})`,
  offline: 'Offline',
};

export function initSyncStatus() {
  const el = document.getElementById('syncStatus');
  const label = document.getElementById('syncLabel');
  if (!el || !label) return;

  onStatusChange(({ status, pendingCount }) => {
    el.className = 'sync-status ' + status;
    el.title = status === 'pending' ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync` : status[0].toUpperCase() + status.slice(1);
    label.textContent = status === 'pending' ? LABELS.pending(pendingCount) : LABELS[status];
  });
}
