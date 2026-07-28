import { S_data } from '../state.js';
import { getBatchMode } from '../batch-log.js';

export function openSheet(id)  { document.getElementById(id).classList.add('open'); }
export function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'batchLogSheet' && getBatchMode()) {
    document.getElementById('batchLogBanner').style.display = 'flex';
  }
}

window.closeSheet = closeSheet;

['nameSheet','protoSheet','editSheet','catSwitcherSheet','onboardingSheet','cloudLinkSheet','shareCardSheet','shareSheet','batchLogSheet','confirmSheet'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (id === 'onboardingSheet' && !S_data.activeCatId) return;
    if (e.target === document.getElementById(id)) closeSheet(id);
  });
});
