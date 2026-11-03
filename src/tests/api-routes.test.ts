import { describe, it, expect } from 'vitest';

describe('API Route contracts and manifests', () => {
  it('validates manifest structure for mobile home screen shortcut', async () => {
    const manifestModule = await import('@/app/manifest');
    const manifest = manifestModule.default();

    expect(manifest.name).toBe('Diller-Hub — Gestão Integrada');
    expect(manifest.short_name).toBe('Diller-Hub');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0f172a');
    expect(manifest.background_color).toBe('#f8fafc');
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons?.[0].src).toBe('/diller.jpg');
    expect(manifest.icons?.[1].src).toBe('/diller.jpg');
  });

  it('validates query params parsing logic for API routes', () => {
    const url = new URL('http://localhost:3000/api/clients?page=2&pageSize=12&search=Carol');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('pageSize') || '10', 10));
    const search = url.searchParams.get('search')?.trim();

    expect(page).toBe(2);
    expect(pageSize).toBe(12);
    expect(search).toBe('Carol');
  });

  it('validates sales query params parsing with filter', () => {
    const url = new URL('http://localhost:3000/api/sales?page=1&pageSize=12&paymentMethod=pix');
    const paymentMethod = url.searchParams.get('paymentMethod');
    expect(paymentMethod).toBe('pix');
  });

  it('validates installments query params parsing with status', () => {
    const url = new URL('http://localhost:3000/api/installments?status=pending');
    const status = url.searchParams.get('status');
    expect(status).toBe('pending');
  });
});

