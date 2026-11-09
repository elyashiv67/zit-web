// "Add to home screen" on a phone: index.html and the web manifest must point at real icons from any page.
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';

const ROOT = path.join(import.meta.dirname, '..', '..');
const PUBLIC = path.join(ROOT, 'public');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => m[0]);
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
const linkFor = rel => links.find(l => attr(l, 'rel') === rel);

// PNG width/height from the IHDR chunk
const pngSize = file => {
    const b = fs.readFileSync(file);
    expect(b.subarray(1, 4).toString()).toBe('PNG');
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};
// "/shortcutIcon/x.png" in index.html is a file in public/ (Vite adds the /zit-web/ base at build time)
const publicFile = href => path.join(PUBLIC, href.replace(/^\//, ''));

describe('home screen icon', () => {
    it('every icon / manifest link is absolute, so it works from deep pages like /pins/123', () => {
        const hrefs = links.filter(l => /icon|manifest/.test(attr(l, 'rel'))).map(l => attr(l, 'href'));
        expect(hrefs.length).toBeGreaterThan(0);
        for (const href of hrefs) {
            expect(href, href).toMatch(/^\//);
            expect(fs.existsSync(publicFile(href)), href).toBe(true);
        }
    });

    it('iPhone gets a 180x180 PNG apple-touch-icon (iOS ignores .ico)', () => {
        const href = attr(linkFor('apple-touch-icon'), 'href');
        expect(href).toMatch(/\.png$/);
        expect(pngSize(publicFile(href))).toBe('180x180');
    });

    describe('web manifest (Android)', () => {
        const href = attr(linkFor('manifest'), 'href');
        const manifestPath = publicFile(href);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        // relative URLs in a manifest resolve against the manifest's own URL
        const base = new URL(`https://x.test/zit-web${href}`);
        const resolve = u => new URL(u, base).pathname;

        it('opens the app start page, not the page the shortcut was saved from', () => {
            expect(resolve(manifest.start_url)).toBe('/zit-web/');
            expect(resolve(manifest.scope)).toBe('/zit-web/');
            expect(manifest.display).toBe('standalone');
        });

        it('has 192 and 512 "any" icons that exist with the stated size', () => {
            for (const size of ['192x192', '512x512']) {
                const icon = manifest.icons.find(i => i.sizes === size && i.purpose.split(' ').includes('any'));
                expect(icon, size).toBeTruthy();
                expect(pngSize(path.join(path.dirname(manifestPath), icon.src))).toBe(size);
            }
        });

        it('maskable icons are separate files (a full-bleed icon gets cropped when masked)', () => {
            const maskable = manifest.icons.filter(i => i.purpose.split(' ').includes('maskable'));
            expect(maskable.length).toBeGreaterThan(0);
            for (const icon of maskable) {
                expect(icon.purpose).toBe('maskable');
                expect(icon.src).toMatch(/maskable/);
                expect(pngSize(path.join(path.dirname(manifestPath), icon.src))).toBe(icon.sizes);
            }
        });
    });
});
