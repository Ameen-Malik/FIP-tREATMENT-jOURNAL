import { S_data } from './state.js';
import { getOrCreateShareLink, revokeShareLink } from './supabase.js';
import { openSheet } from './ui/sheets.js';
import { toast } from './ui/toast.js';

function shareUrl(token) {
  return `${window.location.origin}/share.html?t=${token}`;
}

async function loadShareLink() {
  const catId = S_data.activeCatId;
  if (!catId) return;
  const input = document.getElementById('shareLinkInput');
  input.value = 'Generating link…';
  try {
    const token = await getOrCreateShareLink(catId);
    input.value = shareUrl(token);
  } catch (e) {
    input.value = '';
    toast('Could not generate link — try again');
  }
}

document.getElementById('shareRow').addEventListener('click', () => {
  if (!S_data.activeCatId) return;
  openSheet('shareSheet');
  loadShareLink();
});

document.getElementById('shareCopyBtn').addEventListener('click', async () => {
  const input = document.getElementById('shareLinkInput');
  if (!input.value || input.value.startsWith('Generating')) return;
  try {
    await navigator.clipboard.writeText(input.value);
    toast('Link copied ✓');
  } catch {
    input.select();
    toast('Select & copy the link above');
  }
});

document.getElementById('shareRevokeBtn').addEventListener('click', async () => {
  const catId = S_data.activeCatId;
  if (!catId) return;
  const input = document.getElementById('shareLinkInput');
  input.value = 'Generating new link…';
  try {
    await revokeShareLink(catId);
    const token = await getOrCreateShareLink(catId);
    input.value = shareUrl(token);
    toast('New link generated — old link no longer works');
  } catch {
    toast('Could not revoke — try again');
  }
});
