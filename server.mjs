import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'site.json');
const UPLOADS = path.join(PUBLIC, 'uploads');
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.mkdirSync(UPLOADS, { recursive: true });

// Optional .env file: no npm packages needed.
try {
  const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[m[1]] = value;
    }
  }
} catch { /* .env is optional */ }
const env = process.env;
const PORT = Number(env.PORT) || 3000;
const TIME_ZONE = env.TIME_ZONE || 'America/New_York';
const ADMIN_EMAIL = env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';
const SESSION_SECRET = env.SESSION_SECRET || crypto.randomBytes(48).toString('hex');
const IS_PRODUCTION = env.NODE_ENV === 'production';
const SESSION_TYPES = Object.freeze({
  portraits: { name: 'Portraits', duration: 60, detail: 'Just you, your story, your light.' },
  couples: { name: 'Couples & Engagements', duration: 90, detail: 'For all the love you share.' },
  families: { name: 'Families', duration: 90, detail: 'The little moments, held forever.' },
  celebrations: { name: 'Celebrations & Events', duration: 120, detail: 'A chapter worth remembering.' },
});
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const STOCK_GALLERY_VERSION = 2;
const SEED_GALLERY = [
  {
    "id": "sample-1",
    "title": "Together in the open air",
    "category": "couples",
    "src": "https://images.unsplash.com/photo-1721245445492-90e2274e8967?auto=format&fit=crop&w=1800&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "sample-2",
    "title": "The people who matter most",
    "category": "families",
    "src": "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1800&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "sample-3",
    "title": "Golden-hour portrait",
    "category": "portraits",
    "src": "https://images.unsplash.com/photo-1631226159408-78741022f59b?auto=format&fit=crop&w=1500&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "sample-4",
    "title": "A wedding to remember",
    "category": "celebrations",
    "src": "https://images.unsplash.com/photo-1543835380-c5c7bf5f4d82?auto=format&fit=crop&w=1800&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "stock-5",
    "title": "Sunset over the mountains",
    "category": "landscapes",
    "src": "https://images.unsplash.com/photo-1518095957257-9acd026665c9?auto=format&fit=crop&w=2000&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "stock-6",
    "title": "Reflection at the alpine lake",
    "category": "landscapes",
    "src": "https://images.unsplash.com/photo-1632335479115-1e3db2cdd262?auto=format&fit=crop&w=2000&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "stock-7",
    "title": "Where cliffs meet the sea",
    "category": "landscapes",
    "src": "https://images.unsplash.com/photo-1685021412993-9ce67226bbeb?auto=format&fit=crop&w=2000&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "stock-8",
    "title": "Layers of evening light",
    "category": "landscapes",
    "src": "https://images.unsplash.com/photo-1565768502425-079460b64877?auto=format&fit=crop&w=2000&q=85",
    "featured": true,
    "sample": true
  },
  {
    "id": "stock-9",
    "title": "Mountain waters",
    "category": "landscapes",
    "src": "https://images.unsplash.com/photo-1702360373582-968d932ac789?auto=format&fit=crop&w=2000&q=85",
    "featured": false,
    "sample": true
  },
  {
    "id": "stock-10",
    "title": "A moment in focus",
    "category": "portraits",
    "src": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1500&q=85",
    "featured": false,
    "sample": true
  }
];
const PHOTO_CATEGORIES = new Set([...Object.keys(SESSION_TYPES), 'landscapes']);
const freshData = () => ({ gallery: structuredClone(SEED_GALLERY), stockGalleryVersion: STOCK_GALLERY_VERSION, bookings: [], messages: [] });
let db;
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
catch { db = freshData(); saveDB(); }
// Upgrade only starter examples; preserve client bookings, inquiries and owner uploads.
// The version marker avoids re-adding photos removed by the admin on later restarts.
if (db.stockGalleryVersion !== STOCK_GALLERY_VERSION) {
  const hadOldSamples = Array.isArray(db.gallery) && db.gallery.some(photo => /^sample-[1-4]$/.test(photo.id) && photo.sample === true);
  if (hadOldSamples) {
    db.gallery = [
      ...db.gallery.filter(photo => !(photo.sample === true && /^sample-[1-4]$/.test(photo.id))),
      ...structuredClone(SEED_GALLERY),
    ];
  }
  db.stockGalleryVersion = STOCK_GALLERY_VERSION;
  saveDB();
}
function saveDB() {
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2));
  fs.renameSync(temp, DATA_FILE);
}
function json(res, status, value, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(value));
}
function error(res, status, message) { json(res, status, { error: message }); }
const emailOK = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 250;
const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const escapeHtml = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const take = (x) => parts.find(p => p.type === x).value;
  return `${take('year')}-${take('month')}-${take('day')}`;
};
function dayDistance(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const time = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) return NaN;
  return Math.round((time - Date.parse(`${localToday()}T12:00:00Z`)) / 86400000);
}
const minutes = (hhmm) => { const m = /^(\d{2}):(\d{2})$/.exec(hhmm || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
const displayTime = t => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(`2000-01-01T${t}:00Z`));
function availableSlots(date, type) {
  const duration = SESSION_TYPES[type]?.duration;
  const distance = dayDistance(date);
  if (!duration || !Number.isFinite(distance) || distance < 2 || distance > 120) return [];
  const active = db.bookings.filter(b => b.date === date && b.status !== 'cancelled');
  const times = [];
  for (let start = 9 * 60; start + duration <= 18 * 60; start += 30) {
    if (active.some(b => start < minutes(b.time) + SESSION_TYPES[b.type].duration && start + duration > minutes(b.time))) continue;
    const t = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    times.push({ value: t, label: displayTime(t) });
  }
  return times;
}
function bodyJSON(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > maxBytes) { reject(Object.assign(new Error('Request too large.'), { status: 413 })); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(Object.assign(new Error('Invalid JSON.'), { status: 400 })); } });
    req.on('error', reject);
  });
}
function cookie(req, name) {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1) || '';
}
function sign(payload) { return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url'); }
function isAdmin(req) {
  const raw = cookie(req, 'hp_admin'); const [payload, signature] = raw.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload), a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
const attempts = new Map();
function throttle(ip, label, max, windowMs) {
  const key = `${ip}:${label}`, now = Date.now();
  const recent = (attempts.get(key) || []).filter(t => t > now - windowMs);
  recent.push(now); attempts.set(key, recent);
  return recent.length > max;
}

// SMTP over SSL (port 465) or STARTTLS (port 587), using only built-in Node modules.
class SMTPReplyReader {
  constructor(socket) {
    this.socket = socket; this.buffer = ''; this.lines = []; this.pending = null; this.failure = null;
    this.onData = data => {
      this.buffer += data.toString('utf8');
      let pos;
      while ((pos = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, pos).replace(/\r$/, ''); this.buffer = this.buffer.slice(pos + 1);
        if (this.pending) { const p = this.pending; this.pending = null; p.resolve(line); } else this.lines.push(line);
      }
    };
    this.onError = err => { this.failure = err; if (this.pending) { const p = this.pending; this.pending = null; p.reject(err); } };
    socket.on('data', this.onData); socket.on('error', this.onError);
    socket.on('close', () => this.onError(new Error('SMTP connection closed.')));
  }
  detach() { this.socket.removeListener('data', this.onData); this.socket.removeListener('error', this.onError); }
  line() {
    if (this.lines.length) return Promise.resolve(this.lines.shift());
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending = null; reject(new Error('SMTP timed out.')); }, 18000);
      this.pending = { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } };
    });
  }
  async reply(expected) {
    let line; const lines = [];
    do { line = await this.line(); lines.push(line); } while (/^\d{3}-/.test(line));
    const code = Number(line.slice(0, 3));
    if (!expected.includes(code)) throw new Error(`SMTP ${code}: ${lines.join(' ').slice(0, 240)}`);
    return lines.join('\n');
  }
  async command(text, codes = [250]) { this.socket.write(`${text}\r\n`); return this.reply(codes); }
}
async function smtpSend({ to, subject, body, replyTo }) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.MAIL_FROM || !to) throw new Error('SMTP email settings are incomplete.');
  const port = Number(env.SMTP_PORT || 465), secure = port === 465 || env.SMTP_SECURE === 'true';
  const connect = () => new Promise((resolve, reject) => {
    const sock = secure ? tls.connect({ host: env.SMTP_HOST, port, servername: env.SMTP_HOST }) : net.connect({ host: env.SMTP_HOST, port });
    sock.once(secure ? 'secureConnect' : 'connect', () => resolve(sock)); sock.once('error', reject);
    sock.setTimeout(20000, () => sock.destroy(new Error('SMTP timeout.')));
  });
  let socket = await connect(); let reader = new SMTPReplyReader(socket);
  try {
    await reader.reply([220]);
    let greeting = await reader.command('EHLO harness-photography.local');
    if (!secure) {
      if (!greeting.includes('STARTTLS')) throw new Error('SMTP server does not offer required STARTTLS.');
      await reader.command('STARTTLS', [220]); reader.detach();
      socket = await new Promise((resolve, reject) => {
        const upgraded = tls.connect({ socket, servername: env.SMTP_HOST });
        upgraded.once('secureConnect', () => resolve(upgraded)); upgraded.once('error', reject);
      });
      reader = new SMTPReplyReader(socket);
      greeting = await reader.command('EHLO harness-photography.local');
    }
    const auth = Buffer.from(`\0${env.SMTP_USER}\0${env.SMTP_PASS}`).toString('base64');
    await reader.command(`AUTH PLAIN ${auth}`, [235]);
    const from = env.MAIL_FROM.match(/<([^>]+)>/)?.[1] || env.MAIL_FROM;
    await reader.command(`MAIL FROM:<${from}>`, [250]);
    await reader.command(`RCPT TO:<${to}>`, [250, 251]);
    await reader.command('DATA', [354]);
    const subjectHeader = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const headers = [ `From: ${env.MAIL_FROM}`, `To: ${to}`, `Subject: ${subjectHeader}`, `Date: ${new Date().toUTCString()}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', ...(replyTo && emailOK(replyTo) ? [`Reply-To: ${replyTo}`] : []) ];
    const normalized = body.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    socket.write(`${headers.join('\r\n')}\r\n\r\n${normalized}\r\n.\r\n`);
    await reader.reply([250]);
    await reader.command('QUIT', [221]);
  } finally { socket.destroy(); }
}
async function notifyAdmin(item, kind) {
  if (!ADMIN_EMAIL || !env.SMTP_HOST) return { ok: false, reason: 'Email not configured' };
  let subject, body, replyTo;
  if (kind === 'booking') {
    subject = `New photography booking — ${item.name} (${item.date})`;
    body = [ 'A new photo session has been booked.', '', `Booking ID: ${item.id}`, `Client: ${item.name}`, `Email: ${item.email}`, `Phone: ${item.phone || 'Not provided'}`, `Session: ${SESSION_TYPES[item.type].name}`, `Date: ${item.date}`, `Time: ${displayTime(item.time)} (${TIME_ZONE})`, `Duration: ${SESSION_TYPES[item.type].duration} minutes`, `Notes: ${item.notes || 'None'}`, '', 'Log in to the admin dashboard to review this booking.' ].join('\n');
    replyTo = item.email;
  } else {
    subject = `New website inquiry — ${item.subject}`;
    body = [`From: ${item.name}`, `Email: ${item.email}`, `Subject: ${item.subject}`, '', item.message].join('\n');
    replyTo = item.email;
  }
  try { await smtpSend({ to: ADMIN_EMAIL, subject, body, replyTo }); return { ok: true }; }
  catch (e) { console.error('Email notification failed:', e.message); return { ok: false, reason: e.message }; }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' https://images.unsplash.com data: blob:; font-src 'self' https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
};
async function handler(req, res) {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;
  const ip = req.socket.remoteAddress || 'unknown';
  try {
    if (p === '/api/config' && req.method === 'GET') return json(res, 200, {
      business: 'Harness Photography', email: env.PUBLIC_EMAIL || ADMIN_EMAIL || 'hello@example.com',
      phone: env.PUBLIC_PHONE || '', instagram: env.PUBLIC_INSTAGRAM || '', location: env.PUBLIC_LOCATION || '',
      timeZone: TIME_ZONE, today: localToday(), sessions: SESSION_TYPES,
    });
    if (p === '/api/gallery' && req.method === 'GET') return json(res, 200, { photos: db.gallery });
    if (p === '/api/availability' && req.method === 'GET') {
      const date = url.searchParams.get('date') || '', type = url.searchParams.get('type') || '';
      if (!SESSION_TYPES[type]) return error(res, 400, 'Choose a session type.');
      return json(res, 200, { date, slots: availableSlots(date, type) });
    }
    if (p === '/api/bookings' && req.method === 'POST') {
      if (throttle(ip, 'booking', 8, 60 * 60 * 1000)) return error(res, 429, 'Too many requests. Please try again later.');
      const b = await bodyJSON(req, 12 * 1024);
      if (b.website) return json(res, 200, { success: true }); // hidden spam field
      const name = clean(b.name, 100), email = clean(b.email, 250), phone = clean(b.phone, 50), notes = clean(b.notes, 1200);
      const type = clean(b.type, 35), date = clean(b.date, 10), time = clean(b.time, 5);
      if (name.length < 2 || !emailOK(email) || !SESSION_TYPES[type] || !phone || !availableSlots(date, type).some(s => s.value === time)) return error(res, 400, 'Please check your details, date and time. That slot may no longer be available.');
      const booking = { id: crypto.randomUUID(), name, email, phone, type, date, time, notes, status: 'confirmed', notificationStatus: 'pending', createdAt: new Date().toISOString() };
      // Availability check and write are synchronous to avoid double-booking between requests.
      db.bookings.push(booking); saveDB();
      const sent = await notifyAdmin(booking, 'booking');
      booking.notificationStatus = sent.ok ? 'sent' : 'failed'; saveDB();
      return json(res, 201, { success: true, bookingId: booking.id.slice(0, 8).toUpperCase(), date, time, type });
    }
    if (p === '/api/contact' && req.method === 'POST') {
      if (throttle(ip, 'contact', 5, 60 * 60 * 1000)) return error(res, 429, 'Too many messages. Please try later.');
      const b = await bodyJSON(req, 20 * 1024);
      if (b.website) return json(res, 200, { success: true });
      const name = clean(b.name, 100), email = clean(b.email, 250), subject = clean(b.subject, 140), message = clean(b.message, 3000);
      if (name.length < 2 || !emailOK(email) || subject.length < 2 || message.length < 8) return error(res, 400, 'Complete all fields with a valid email and message.');
      const item = { id: crypto.randomUUID(), name, email, subject, message, createdAt: new Date().toISOString(), notificationStatus: 'pending' };
      db.messages.unshift(item); saveDB();
      const sent = await notifyAdmin(item, 'contact'); item.notificationStatus = sent.ok ? 'sent' : 'failed'; saveDB();
      return json(res, 201, { success: true });
    }
    if (p === '/api/admin/login' && req.method === 'POST') {
      if (!ADMIN_PASSWORD || !env.SESSION_SECRET) return error(res, 503, 'Admin is not configured. Set ADMIN_PASSWORD and SESSION_SECRET in .env.');
      if (throttle(ip, 'login', 8, 15 * 60 * 1000)) return error(res, 429, 'Too many attempts. Try again in 15 minutes.');
      const b = await bodyJSON(req, 3 * 1024);
      const input = Buffer.from(String(b.password || ''));
      const expected = Buffer.from(ADMIN_PASSWORD);
      if (input.length !== expected.length || !crypto.timingSafeEqual(input, expected)) return error(res, 401, 'Incorrect password.');
      const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
      const token = `${payload}.${sign(payload)}`;
      return json(res, 200, { success: true }, { 'Set-Cookie': `hp_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${IS_PRODUCTION ? '; Secure' : ''}` });
    }
    if (p === '/api/admin/logout' && req.method === 'POST') {
      return json(res, 200, { success: true }, { 'Set-Cookie': 'hp_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' });
    }
    if (p.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return error(res, 401, 'Please log in as admin.');
      if (p === '/api/admin/me' && req.method === 'GET') return json(res, 200, { authenticated: true, emailConfigured: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM && ADMIN_EMAIL), adminEmail: ADMIN_EMAIL || '(not configured)' });
      if (p === '/api/admin/bookings' && req.method === 'GET') return json(res, 200, { bookings: [...db.bookings].reverse() });
      if (p === '/api/admin/messages' && req.method === 'GET') return json(res, 200, { messages: db.messages });
      if (p === '/api/admin/bookings/cancel' && req.method === 'POST') {
        const b = await bodyJSON(req, 2 * 1024); const item = db.bookings.find(x => x.id === b.id);
        if (!item) return error(res, 404, 'Booking not found.');
        item.status = 'cancelled'; saveDB(); return json(res, 200, { success: true });
      }
      if (p === '/api/admin/resend' && req.method === 'POST') {
        const b = await bodyJSON(req, 2 * 1024); const item = db.bookings.find(x => x.id === b.id) || db.messages.find(x => x.id === b.id);
        if (!item) return error(res, 404, 'Item not found.');
        const sent = await notifyAdmin(item, 'type' in item ? 'booking' : 'contact');
        item.notificationStatus = sent.ok ? 'sent' : 'failed'; saveDB();
        return sent.ok ? json(res, 200, { success: true }) : error(res, 502, `Email not sent: ${sent.reason}`);
      }
      if (p === '/api/admin/gallery' && req.method === 'POST') {
        const b = await bodyJSON(req);
        const title = clean(b.title, 100), category = clean(b.category, 25);
        if (title.length < 2 || !PHOTO_CATEGORIES.has(category)) return error(res, 400, 'Provide a title and valid category.');
        const match = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(b.image || '');
        if (!match) return error(res, 400, 'Upload a JPEG, PNG, WebP or GIF.');
        const buf = Buffer.from(match[2], 'base64');
        if (buf.length < 50 || buf.length > 8 * 1024 * 1024) return error(res, 400, 'Image must be under 8MB.');
        let ext = '';
        if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) ext = '.jpg';
        else if (buf.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ext = '.png';
        else if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') ext = '.webp';
        else if (['GIF87a', 'GIF89a'].includes(buf.toString('ascii', 0, 6))) ext = '.gif';
        if (!ext) return error(res, 400, 'The file is not a valid supported image.');
        const filename = `${crypto.randomUUID()}${ext}`;
        fs.writeFileSync(path.join(UPLOADS, filename), buf, { flag: 'wx' });
        const photo = { id: crypto.randomUUID(), title, category, src: `/uploads/${filename}`, featured: !!b.featured, sample: false, createdAt: new Date().toISOString() };
        db.gallery.unshift(photo); saveDB(); return json(res, 201, { photo });
      }
      if (p === '/api/admin/gallery/delete' && req.method === 'POST') {
        const b = await bodyJSON(req, 2 * 1024); const item = db.gallery.find(x => x.id === b.id);
        if (!item) return error(res, 404, 'Photo not found.');
        db.gallery = db.gallery.filter(x => x.id !== b.id); saveDB();
        if (item.src.startsWith('/uploads/')) { try { fs.unlinkSync(path.join(UPLOADS, path.basename(item.src))); } catch {} }
        return json(res, 200, { success: true });
      }
      return error(res, 404, 'Admin route not found.');
    }
    if (p.startsWith('/api/')) return error(res, 404, 'Not found.');
    if (req.method !== 'GET' && req.method !== 'HEAD') return error(res, 405, 'Method not allowed.');
    const pathname = decodeURIComponent(p === '/' ? '/index.html' : p);
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) return error(res, 403, 'Forbidden.');
    const full = path.resolve(PUBLIC, '.' + pathname);
    if (!full.startsWith(PUBLIC + path.sep)) return error(res, 403, 'Forbidden.');
    const ext = path.extname(full).toLowerCase();
    if (!MIME[ext]) return error(res, 404, 'Not found.');
    let stat; try { stat = fs.statSync(full); } catch { return error(res, 404, 'Not found.'); }
    if (!stat.isFile()) return error(res, 404, 'Not found.');
    res.writeHead(200, { 'Content-Type': MIME[ext], 'Content-Length': stat.size, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent && !res.writableEnded) error(res, e.status || 500, e.status ? e.message : 'Something went wrong. Please try again.');
  }
}
const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`\nHARNESS PHOTOGRAPHY → http://localhost:${PORT}`);
  // Visual Studio's one-click launch profile opens the default browser on Windows
  // only after the HTTP server has successfully started. No effect on normal npm
  // starts, production deployments, or the server-only debug profile.
  if (env.HP_OPEN_BROWSER === '1' && process.platform === 'win32') {
    execFile('cmd.exe', ['/d', '/c', `start "" "http://localhost:${PORT}"`], { windowsHide: true }, (error) => {
      if (error) console.warn('Could not open browser automatically:', error.message);
    });
  }
  if (!ADMIN_PASSWORD || !env.SESSION_SECRET) console.log('ADMIN SETUP: Copy .env.example to .env and set ADMIN_PASSWORD + SESSION_SECRET.');
  if (!env.SMTP_HOST) console.log('EMAIL SETUP: Configure SMTP_* and MAIL_FROM in .env to send real notification emails.');
});
