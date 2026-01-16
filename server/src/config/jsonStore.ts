import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(__dirname, '..', '..', 'data');

const tableFile = (table: string) => path.join(dataDir, `${table}.json`);

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function loadTable(table: string): Promise<any[]> {
  await ensureDataDir();
  const file = tableFile(table);
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return [];
  }
}

async function saveTable(table: string, data: any[]) {
  await ensureDataDir();
  const file = tableFile(table);
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

export async function getAll(table: string) {
  return await loadTable(table);
}

export async function findByField(table: string, field: string, value: any) {
  const all = await loadTable(table);
  return all.filter((r: any) => r[field] === value);
}

export async function getById(table: string, id: number) {
  const all = await loadTable(table);
  return all.find((r: any) => r.id === id) || null;
}

export async function insert(table: string, row: any) {
  const all = await loadTable(table);
  const maxId = all.reduce((m: number, r: any) => Math.max(m, r.id || 0), 0);
  const newRow = { id: maxId + 1, ...row };
  all.push(newRow);
  await saveTable(table, all);
  return newRow;
}

export async function updateById(table: string, id: number, patch: any) {
  const all = await loadTable(table);
  const idx = all.findIndex((r: any) => r.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  await saveTable(table, all);
  return all[idx];
}

export async function deleteById(table: string, id: number) {
  const all = await loadTable(table);
  const idx = all.findIndex((r: any) => r.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await saveTable(table, all);
  return true;
}

export default {
  getAll,
  findByField,
  getById,
  insert,
  updateById,
  deleteById,
  loadTable,
  saveTable
};
