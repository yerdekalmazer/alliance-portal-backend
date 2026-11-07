/**
 * Uçtan uca akış testi — gerçek Postgres ister.
 *   TEST_DATABASE_URL=postgres://... npm test
 * DİKKAT: test veritabanındaki tüm tabloları siler; canlı veritabanına bağlamayın.
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  console.log('TEST_DATABASE_URL yok — entegrasyon testi atlandı');
  process.exit(0);
}
process.env.DATABASE_URL = TEST_DB;
process.env.JWT_SECRET = 'test-secret-test-secret-test';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@divizyon.org';
process.env.ADMIN_PASSWORD = 'admin-sifre-123';

/* eslint-disable @typescript-eslint/no-require-imports */
const { migrate, pool } = require('../src/db');
const { createApp } = require('../src/app');
const { ensureAdminFromEnv } = require('../src/seedAdmin');
/* eslint-enable @typescript-eslint/no-require-imports */

let server: Server;
let base = '';

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

before(async () => {
  await pool.query('DROP TABLE IF EXISTS case_team_members, cases, ideas, alliance_members, alliance_applications, users CASCADE');
  await migrate();
  await migrate(); // ikinci çalıştırma da hatasız olmalı
  await ensureAdminFromEnv();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server?.close();
  await pool.end();
});

// Eski "Yeni Case Oluştur" formunun gönderdiği gövde
const CASE_FORM = {
  title: 'Akıllı Depo',
  description: 'Depo yerleşimini öneren web aracı',
  domain: 'web-platformu',
  job_types: ['Web Platformu', 'Frontend Developer'],
  specializations: ['React'],
  requirements: ['Lojistik firmaları'],
  initial_threshold: 75,
  team_requirements: [
    { jobType: 'Frontend Developer', count: 2, priority: 'high' },
    { jobType: 'UI/UX Tasarımcı', count: 1, priority: 'medium' },
  ],
};

test('başvuru → onay → fikir → case akışı', async () => {
  const admin = (await api('POST', '/auth/login', { email: 'ADMIN@divizyon.org', password: 'admin-sifre-123' })).body.data.token;
  assert.ok(admin);
  assert.equal((await api('POST', '/auth/login', { email: 'admin@divizyon.org', password: 'yanlis' })).status, 401);

  // Başvuru formu (onay kutuları dahil)
  const apply = await api('POST', '/alliance-applications', {
    organizationName: 'Örnek A.Ş.', contactName: 'Ayşe Yılmaz', contactTitle: 'İnovasyon Müdürü',
    email: 'ayse@ornek.com', roles: ['Vaka Sağlayıcı'], motivation: 'Birlikte üretmek',
    confirmAccuracy: true, confirmContact: true,
  });
  assert.equal(apply.status, 201);
  const apps = await api('GET', '/alliance-applications', undefined, admin);
  assert.equal(apps.body.data[0].confirm_accuracy, true);
  assert.equal(apps.body.data[0].confirm_contact, true);

  // "Şifre Belirle" — 6 karakter kuralı
  assert.equal((await api('POST', `/alliance-applications/${apply.body.data.id}/approve`, { password: '12345' }, admin)).status, 400);
  const approve = await api('POST', `/alliance-applications/${apply.body.data.id}/approve`, { password: 'uye123' }, admin);
  assert.equal(approve.status, 200);
  const members = await api('GET', '/members', undefined, admin);
  assert.deepEqual(members.body.data[0].expertise, ['Vaka Sağlayıcı']);
  assert.match(members.body.data[0].notes, /Başvuru motivasyonu/);

  const member = (await api('POST', '/auth/login', { email: 'ayse@ornek.com', password: 'uye123' })).body.data.token;
  assert.equal((await api('GET', '/members', undefined, member)).status, 403);

  // "Profil Bilgilerim"
  const prof = await api('PUT', '/auth/profile', {
    name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', organization: 'Örnek A.Ş.', department: 'Ar-Ge',
    position: 'Direktör', phone: '+90 500', currentPassword: 'yanlis', newPassword: 'yeni123', confirmPassword: 'yeni123',
  }, member);
  assert.equal(prof.status, 400);
  const prof2 = await api('PUT', '/auth/profile', {
    name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', organization: 'Örnek A.Ş.', department: 'Ar-Ge', position: 'Direktör', phone: '+90 500',
  }, member);
  assert.equal(prof2.body.data.department, 'Ar-Ge');

  // Uzun form fikir
  const idea = await api('POST', '/ideas', {
    contact_name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', organization: 'Örnek A.Ş.', contribution_types: ['problem'],
    archetype: 'Yönlendirici', project_title: 'Akıllı Depo', target_audience: 'Lojistik ekipleri',
    problem_need: 'Depo yerleşimi verimsiz', must_have_features: 'Raf haritası', stage: 'submitted', tags: ['lojistik'],
  }, member);
  assert.equal(idea.status, 201);
  assert.equal(idea.body.data.status, 'pending');
  assert.deepEqual(idea.body.data.tags, ['lojistik']);
  const ideaId = idea.body.data.id;

  // Onay + admin notu üyeye görünmez
  await api('PATCH', `/ideas/${ideaId}`, { status: 'approved', admin_note: 'gizli' }, admin);
  const mine = await api('GET', '/ideas', undefined, member);
  assert.equal(mine.body.data[0].status, 'approved');
  assert.equal(mine.body.data[0].admin_note, undefined);

  // Case Oluştur — eski form gövdesi
  assert.equal((await api('POST', `/ideas/${ideaId}/convert`, { ...CASE_FORM, description: '' }, admin)).status, 400);
  const conv = await api('POST', `/ideas/${ideaId}/convert`, CASE_FORM, admin);
  assert.equal(conv.status, 201);
  const c = conv.body.data;
  assert.equal(c.initial_threshold, 75);
  assert.equal(c.team_requirements.length, 2);
  assert.equal(c.current_step, 'case-evaluated');
  assert.equal(c.member_name, 'Ayşe Yılmaz');
  assert.equal((await api('POST', `/ideas/${ideaId}/convert`, CASE_FORM, admin)).status, 409);

  // Durum mesajı + süreç
  assert.equal((await api('PUT', `/cases/${c.id}/message`, { title: 'Başladık', description: 'İlk atölye pazartesi' }, member)).status, 403);
  const msg = await api('PUT', `/cases/${c.id}/message`, { title: 'Başladık', description: 'İlk atölye pazartesi' }, admin);
  assert.equal(msg.body.data.admin_message_title, 'Başladık');
  const proc = await api('PUT', `/cases/${c.id}/process`, {
    current_step: 'team-formation',
    process_state: { steps: { 'case-evaluated': { status: 'completed', note: 'tamam' } } },
  }, admin);
  assert.equal(proc.body.data.current_step, 'team-formation');
  assert.equal(proc.body.data.process_state.steps['case-evaluated'].note, 'tamam');
  assert.equal((await api('PUT', `/cases/${c.id}/process`, { current_step: 'uydurma' }, admin)).status, 400);

  // Üye kendi case'ini ve mesajı görür
  const myCases = await api('GET', '/cases', undefined, member);
  assert.equal(myCases.body.data[0].admin_message_description, 'İlk atölye pazartesi');

  // Ekip: admin case'in içinden kişi ekler
  assert.equal((await api('POST', `/cases/${c.id}/team`, { full_name: 'X' }, member)).status, 403);
  assert.equal((await api('POST', `/cases/${c.id}/team`, { role: 'Kurgu' }, admin)).status, 400);
  const tm = await api('POST', `/cases/${c.id}/team`, { full_name: 'Ali Veli', role: 'Kurgu', email: 'ali@x.com', phone: '1' }, admin);
  assert.equal(tm.status, 201);
  await api('PUT', `/cases/${c.id}/team/${tm.body.data.id}`, { full_name: 'Ali Veli', role: 'Yönetmen' }, admin);
  const teamAdmin = await api('GET', `/cases/${c.id}/team`, undefined, admin);
  assert.equal(teamAdmin.body.data[0].role, 'Yönetmen');
  const teamMember = await api('GET', `/cases/${c.id}/team`, undefined, member);
  assert.equal(teamMember.body.data[0].full_name, 'Ali Veli');
  assert.equal(teamMember.body.data[0].email, undefined); // iletişim yalnızca admin
  assert.equal((await api('GET', `/cases/${c.id}`, undefined, admin)).body.data.team_count, 1);

  // Ayarlar: yalnızca gönderilen alan değişir
  const upd = await api('PUT', `/cases/${c.id}`, { status: 'paused' }, admin);
  assert.equal(upd.body.data.status, 'paused');
  assert.equal(upd.body.data.team_requirements.length, 2);

  // Case silinince fikir "Onaylandı"ya döner
  await api('DELETE', `/cases/${c.id}`, undefined, admin);
  assert.equal((await api('GET', `/ideas/${ideaId}`, undefined, admin)).body.data.status, 'approved');

  // Partner Ekle / Düzenle
  const add = await api('POST', '/members', {
    fullName: 'Can Demir', email: 'can@firma.com', password: 'can123', phone: '1', organization: 'Firma',
    role: 'CTO', expertise: ['React', 'Node.js'],
  }, admin);
  assert.equal(add.status, 201);
  assert.equal(add.body.data.member.position, 'CTO');
  const uid = add.body.data.member.user_id;
  const edit = await api('PUT', `/members/${uid}`, { fullName: 'Can Demir', email: 'can@firma.com', role: 'CEO', password: '' }, admin);
  assert.equal(edit.body.data.position, 'CEO');
  assert.equal((await api('POST', '/auth/login', { email: 'can@firma.com', password: 'can123' })).status, 200);
  await api('PUT', `/members/${uid}`, { password: 'yeni456' }, admin);
  assert.equal((await api('POST', '/auth/login', { email: 'can@firma.com', password: 'yeni456' })).status, 200);

  // Pasif üye giremez
  await api('PUT', `/members/${uid}`, { status: 'inactive' }, admin);
  assert.equal((await api('POST', '/auth/login', { email: 'can@firma.com', password: 'yeni456' })).status, 403);

  assert.equal((await api('GET', '/ideas/not-a-uuid', undefined, admin)).status, 404);
});
