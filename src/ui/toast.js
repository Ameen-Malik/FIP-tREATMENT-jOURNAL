let _tt;
export function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  if (isError) {
    el.classList.add('error');
  } else {
    el.classList.remove('error');
  }
  el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2400);
}
