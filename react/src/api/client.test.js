import {describe, expect, it, vi} from 'vitest';
import {api, ApiError, authEvents} from './client.js';
import {mockServer} from '../test/utils.jsx';

describe('api client', () => {
    it('sends JSON with the session cookie to /api', async () => {
        const server = mockServer({'POST /pin': {status: 201, body: {pin: {_id: 'p'}}}});
        const res = await api('/pin', {method: 'POST', body: {name: 'x'}});
        expect(res).toEqual({pin: {_id: 'p'}});
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('/api/pin');
        expect(init.credentials).toBe('include');
        expect(init.headers['Content-Type']).toBe('application/json');
        expect(server.calls[0].body).toEqual({name: 'x'});
    });

    it('sends FormData as is (the browser sets the multipart boundary)', async () => {
        mockServer({'POST /pin/p/images': {status: 201, body: {pin: {}}}});
        const form = new FormData();
        await api('/pin/p/images', {method: 'POST', body: form});
        const [, init] = fetch.mock.calls[0];
        expect(init.body).toBe(form);
        expect(init.headers['Content-Type']).toBeUndefined();
    });

    it('translates known server messages to Hebrew', async () => {
        mockServer({'POST /auth/login': {status: 401, body: {message: 'invalid username or password'}}});
        await expect(api('/auth/login', {method: 'POST', body: {}})).rejects.toMatchObject({
            status: 401, message: 'שם משתמש או סיסמה שגויים',
        });
    });

    it('names the duplicate field on 409', async () => {
        mockServer({'POST /auth/register': {status: 409, body: {message: 'user_name already exists', field: 'user_name', fields: ['user_name']}}});
        await expect(api('/auth/register', {method: 'POST', body: {}})).rejects.toThrow('שם המשתמש כבר קיים במערכת');
    });

    it('503 means try again, not log out', async () => {
        mockServer({'GET /pin/allUnit': {status: 503, body: {message: 'database is unavailable, try again in a moment'}}});
        const expired = vi.fn();
        authEvents.addEventListener('expired', expired);
        await expect(api('/pin/allUnit')).rejects.toThrow('השרת לא זמין כרגע. נסו שוב בעוד רגע');
        expect(expired).not.toHaveBeenCalled();
        authEvents.removeEventListener('expired', expired);
    });

    it('401 on a normal request tells the app the session is gone, but a wrong password at login does not', async () => {
        mockServer({
            'GET /pin/allUnit': {status: 401, body: {message: 'need to login'}},
            'POST /auth/login': {status: 401, body: {message: 'invalid username or password'}},
        });
        const expired = vi.fn();
        authEvents.addEventListener('expired', expired);
        await api('/pin/allUnit').catch(() => {});
        expect(expired).toHaveBeenCalledTimes(1);
        await api('/auth/login', {method: 'POST', body: {}}).catch(() => {});
        expect(expired).toHaveBeenCalledTimes(1);
        authEvents.removeEventListener('expired', expired);
    });

    it('no network -> a clear Hebrew error with status 0', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        const err = await api('/x').catch(e => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(0);
        expect(err.message).toMatch('אין חיבור לשרת');
    });

    it('limit of 10 images message', async () => {
        mockServer({'POST /pin/p/images': {status: 400, body: {message: 'a pin can have up to 10 images (it has 9)'}}});
        await expect(api('/pin/p/images', {method: 'POST', body: new FormData()})).rejects.toThrow('לנקודה יכולות להיות עד 10 תמונות');
    });
});
