export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://sarcastic-api.onrender.com/api/v1').trim().replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function request<T>(path: string, token = '', method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 85000);
  try {
    const response = await fetch(API_URL + path, {
      method, signal: controller.signal,
      headers: { Accept: 'application/json', ...(token && { Authorization: 'Bearer ' + token }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, data?.error || 'El servicio respondió con el código ' + response.status);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('No se pudo contactar con Render. Revisa tu conexión y vuelve a intentar.');
  } finally { clearTimeout(timeout); }
}
export type User = { id: string; name: string; username: string; email: string };
export type Experience = { experience_points: number; rank: string; level: number };
export type Task = { id: string; title: string; description: string | null; priority: 'ordinary'|'important'|'vital';
  status: 'pending'|'in_progress'|'completed'|'postponed'; deadline: string | null; completion_date: string | null; creation_date: string; alternative_plan: string | null };
export const priorities = { ordinary: 'Hábito', important: 'Importante', vital: 'Prioridad máxima' };
export const states = { pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completada', postponed: 'Pospuesta' };
export function dateKey(d = new Date()) {
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
}
export function daysFrom(days: number, from = new Date()) {
  const date = new Date(from); date.setDate(date.getDate() + days); return date;
}
export function shortDate(value: string) {
  return new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('es-BO', {day:'numeric', month:'short'});
}
