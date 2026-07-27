(function initTheme(){
  const saved = localStorage.getItem('fip_theme')||'light';
  if(saved==='dark') document.documentElement.setAttribute('data-theme','dark');
  document.getElementById('themeBtn').textContent = saved==='dark'?'☀️':'🌙';
  document.getElementById('themeColorMeta').content = saved==='dark'?'#000':'#F2F2F7';
})();
document.getElementById('themeBtn').addEventListener('click',()=>{
  const isDark = document.documentElement.hasAttribute('data-theme');
  if(isDark){
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('fip_theme','light');
    document.getElementById('themeBtn').textContent='🌙';
    document.getElementById('themeColorMeta').content='#F2F2F7';
  } else {
    document.documentElement.setAttribute('data-theme','dark');
    localStorage.setItem('fip_theme','dark');
    document.getElementById('themeBtn').textContent='☀️';
    document.getElementById('themeColorMeta').content='#000';
  }
});
