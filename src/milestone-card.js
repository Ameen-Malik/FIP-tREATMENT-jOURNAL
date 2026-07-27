import { S, stats, protoDoseKg } from './state.js';
import { fmtFull } from './utils.js';
import { openSheet } from './ui/sheets.js';

export function generateMilestoneCard(dayNum) {
  const canvas = document.getElementById('shareCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 1. Draw Mesh/Linear Gradient Background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, '#007AFF');
  grad.addColorStop(0.5, '#5856D6');
  grad.addColorStop(1, '#30D158');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Glass card border/fill overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  const margin = 20;

  ctx.beginPath();
  const x = margin, y = margin, w = canvas.width - margin*2, h = canvas.height - margin*2, r = 16;
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Draw Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title (Cat name + recovery)
  ctx.font = '800 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${(S.name || 'My Cat').toUpperCase()}'S RECOVERY`, canvas.width / 2, 80);

  // Badge box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  const bx = canvas.width/2 - 90, by = 115, bw = 180, bh = 42, br = 21;
  ctx.moveTo(bx+br, by);
  ctx.arcTo(bx+bw, by, bx+bw, by+bh, br);
  ctx.arcTo(bx+bw, by+bh, bx, by+bh, br);
  ctx.arcTo(bx, by+bh, bx, by, br);
  ctx.arcTo(bx, by, bx+bw, by, br);
  ctx.closePath();
  ctx.fill();

  // Day Badge Text
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`DAY ${dayNum} OF 84`, canvas.width / 2, 136);

  // Subtitle/gamified praise
  let praise = "One step closer to recovery! 🐾";
  if (dayNum >= 84) praise = "FIP GRADUATE! 🎉 Beaten FIP!";
  else if (dayNum >= 80) praise = "Graduation in Sight! 🎓";
  else if (dayNum >= 60) praise = "Two-Thirds Complete! 🌟";
  else if (dayNum >= 42) praise = "Halfway Completed! 💫";
  else if (dayNum >= 30) praise = "One Month Strong! 💪";
  else if (dayNum >= 14) praise = "Two Weeks Completed! ✨";
  else if (dayNum >= 7) praise = "First Week Done! 🏆";

  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(praise, canvas.width / 2, 205);

  // Details
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  const fipType = S.proto.type === 'dry' ? 'Dry FIP' : S.proto.type === 'wet' ? 'Wet FIP' : 'Neurological FIP';
  ctx.fillText(`Type: ${fipType} | Target: ${protoDoseKg()} mg/kg`, canvas.width / 2, 250);

  // Date timestamp
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Recorded on ${fmtFull(new Date())}`, canvas.width / 2, 280);

  // Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("FIP TREATMENT JOURNAL", canvas.width / 2, 345);

  // 4. Update download link url
  const downloadBtn = document.getElementById('downloadShareBtn');
  if (downloadBtn) {
    downloadBtn.href = canvas.toDataURL("image/png");
    downloadBtn.download = `${S.name || 'cat'}-day${dayNum}-milestone.png`;
  }
}

// Share status trophy button listener
document.getElementById('shareStatusBtn').addEventListener('click', () => {
  const st = stats();
  generateMilestoneCard(st.done);
  openSheet('shareCardSheet');
});
