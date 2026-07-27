export function setPills(sel, val) {
  document.querySelectorAll(sel+' .pill').forEach(p => p.classList.toggle('sel', String(p.dataset.v)===String(val)));
}
export function setShPills(sel, val) {
  document.querySelectorAll(sel+' .sh-pill').forEach(p => p.classList.toggle('sel', String(p.dataset.v)===String(val)));
}
