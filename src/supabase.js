import { createClient } from '@supabase/supabase-js';
import { getSessionToken, getUserId } from './auth.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// accessToken hands Supabase the live Clerk session JWT on every request —
// this is what RLS's auth.jwt()->>'sub' checks are actually verifying against.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: () => getSessionToken(),
});

// Postgres rejects an empty string for numeric/integer/bigint columns
// ("invalid input syntax for type numeric: \"\"") — form fields routinely
// hold '' rather than null/undefined when left blank, so every numeric
// column needs this, not just a `?? null` check.
function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toCatRow(cat) {
  return {
    id: cat.id,
    clerk_user_id: getUserId(),
    name: cat.name,
    type: cat.type || null,
    conc: numOrNull(cat.conc),
    weight: numOrNull(cat.weight),
    start_date: cat.startDate,
    typical_time: cat.typicalTime || null,
    method: cat.method || 'injection',
  };
}
function fromCatRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type || '',
    conc: row.conc || 30,
    weight: row.weight || '',
    startDate: row.start_date,
    typicalTime: row.typical_time || '',
    method: row.method || 'injection',
  };
}

function toLogRow(catId, dateKey, entry) {
  return {
    cat_id: catId,
    date_key: dateKey,
    done: !!entry.done,
    ts: numOrNull(entry.ts),
    temp: numOrNull(entry.temp),
    weight: numOrNull(entry.weight),
    conc: numOrNull(entry.conc),
    dose_kg: numOrNull(entry.doseKg),
    actual: numOrNull(entry.actual),
    note: entry.note || null,
    method: entry.method || 'injection',
    capsule_band: entry.capsuleBand || null,
  };
}
function fromLogRow(row) {
  return {
    done: row.done,
    ts: row.ts ?? undefined,
    temp: row.temp ?? undefined,
    weight: row.weight ?? undefined,
    conc: row.conc ?? undefined,
    doseKg: row.dose_kg ?? undefined,
    actual: row.actual ?? undefined,
    note: row.note ?? undefined,
    method: row.method || 'injection',
    capsuleBand: row.capsule_band ?? undefined,
  };
}

/** All cats owned by the signed-in user (RLS scopes this automatically). */
export async function getCats() {
  const { data, error } = await supabase.from('cats').select('*');
  if (error) throw error;
  return data.map(fromCatRow);
}

/** Insert or update a cat profile. `cat.id` must already be a client-generated UUID. */
export async function upsertCat(cat) {
  const { error } = await supabase.from('cats').upsert(toCatRow(cat));
  if (error) throw error;
}

export async function deleteCat(catId) {
  const { error } = await supabase.from('cats').delete().eq('id', catId);
  if (error) throw error;
}

/** All logs for one cat, keyed by date_key (same shape as S_data.logs[catId]). */
export async function getLogs(catId) {
  const { data, error } = await supabase.from('logs').select('*').eq('cat_id', catId);
  if (error) throw error;
  const out = {};
  for (const row of data) out[row.date_key] = fromLogRow(row);
  return out;
}

/** Insert or update a single day's log entry for a cat. */
export async function upsertLog(catId, dateKey, entry) {
  const { error } = await supabase
    .from('logs')
    .upsert(toLogRow(catId, dateKey, entry), { onConflict: 'cat_id,date_key' });
  if (error) throw error;
}

export async function deleteLog(catId, dateKey) {
  const { error } = await supabase.from('logs').delete().eq('cat_id', catId).eq('date_key', dateKey);
  if (error) throw error;
}

/** Returns the active share link id for a cat, creating one if none exists. */
export async function getOrCreateShareLink(catId) {
  const { data: existing, error: selErr } = await supabase
    .from('share_links').select('id').eq('cat_id', catId).eq('revoked', false).maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from('share_links').insert({ cat_id: catId }).select('id').single();
  if (insErr) throw insErr;
  return created.id;
}

/** Revokes the active share link for a cat, if any. */
export async function revokeShareLink(catId) {
  const { error } = await supabase
    .from('share_links').update({ revoked: true }).eq('cat_id', catId).eq('revoked', false);
  if (error) throw error;
}

/** All blood report rows for a cat, newest first. */
export async function getBloodReports(catId) {
  const { data, error } = await supabase
    .from('blood_reports').select('*').eq('cat_id', catId).order('date_key', { ascending: false });
  if (error) throw error;
  return data;
}

/** Uploads a blood report image and records it against a specific day. */
export async function uploadBloodReport(catId, dateKey, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${catId}/${dateKey}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('blood-reports').upload(path, file);
  if (upErr) throw upErr;
  const { data, error: insErr } = await supabase
    .from('blood_reports').insert({ cat_id: catId, date_key: dateKey, storage_path: path }).select().single();
  if (insErr) throw insErr;
  return data;
}

export async function deleteBloodReport(report) {
  await supabase.storage.from('blood-reports').remove([report.storage_path]);
  const { error } = await supabase.from('blood_reports').delete().eq('id', report.id);
  if (error) throw error;
}

/**
 * Fetches an image's bytes through RLS (not a bare public URL — the bucket
 * is private) and hands back a local object URL for <img src>. Works
 * identically for the signed-in owner and an anonymous share-link viewer;
 * which one succeeds is entirely down to which Storage policy matches.
 */
export async function bloodReportObjectUrl(storagePath) {
  const { data, error } = await supabase.storage.from('blood-reports').download(storagePath);
  if (error) throw error;
  return URL.createObjectURL(data);
}
