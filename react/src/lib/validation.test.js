import {describe, expect, it} from 'vitest';
import {onlyDigits, validatePasswordChange, validatePin, validateUnit, validateUser} from './validation.js';

const pin = (o = {}) => ({name: 'שער', lat: '32.6', lng: '35.29', dvrUser: '', dvrPass: '', ownerName: '', ownerId: '', ownerPhone: '', ownerNotes: '', ...o});

describe('validatePin', () => {
    it('accepts a good pin', () => expect(validatePin(pin())).toEqual({}));
    it('needs a name, max 100', () => {
        expect(validatePin(pin({name: '  '})).name).toBeTruthy();
        expect(validatePin(pin({name: 'x'.repeat(101)})).name).toBeTruthy();
    });
    it('checks coordinate ranges', () => {
        expect(validatePin(pin({lat: '91'})).lat).toBeTruthy();
        expect(validatePin(pin({lat: ''})).lat).toBeTruthy();
        expect(validatePin(pin({lng: '-181'})).lng).toBeTruthy();
        expect(validatePin(pin({lng: 'abc'})).lng).toBeTruthy();
    });
    it('limits DVR fields', () => {
        expect(validatePin(pin({dvrPass: 'p'.repeat(101)})).dvrPass).toBeTruthy();
    });
    it('DVR owner: optional, but any detail needs a name', () => {
        expect(validatePin(pin({ownerName: 'משה', ownerId: '123456789', ownerPhone: '052-123 4567', ownerNotes: 'בבוקר'}))).toEqual({});
        expect(validatePin(pin({ownerPhone: '0521234567'})).ownerName).toBe('צריך למלא את שם הבעלים');
        expect(validatePin(pin({ownerNotes: 'רק הערה'})).ownerName).toBeTruthy();
        expect(validatePin(pin({ownerName: 'x'.repeat(101)})).ownerName).toBeTruthy();
    });
    it('DVR owner ID / phone are digits (spaces and dashes allowed), notes up to 500', () => {
        expect(validatePin(pin({ownerName: 'משה', ownerId: '12a'})).ownerId).toBeTruthy();
        expect(validatePin(pin({ownerName: 'משה', ownerId: '1234567890'})).ownerId).toBeTruthy();
        expect(validatePin(pin({ownerName: 'משה', ownerPhone: '05212345678'})).ownerPhone).toBeTruthy();
        expect(validatePin(pin({ownerName: 'משה', ownerNotes: 'n'.repeat(501)})).ownerNotes).toBeTruthy();
        expect(onlyDigits('052-123 4567')).toBe('0521234567');
    });
});

describe('validateUser', () => {
    const user = {name: 'דנה', user_name: 'dana', pass: 'secret1', TZ: '1', police_id: '2', phone: '0501234567', email: 'a@b.co', role: 'r', unit: 'u'};
    it('accepts a full user', () => expect(validateUser(user, {requirePassword: true})).toEqual({}));
    it('phone is up to 10 digits', () => {
        expect(validateUser({...user, phone: '050-123'}).phone).toBeTruthy();
        expect(validateUser({...user, phone: '05012345678'}).phone).toBeTruthy();
    });
    it('email format', () => expect(validateUser({...user, email: 'nope'}).email).toBeTruthy());
    it('password at least 6 when creating', () => {
        expect(validateUser({...user, pass: '12345'}, {requirePassword: true}).pass).toBeTruthy();
    });
    it('role and unit are required', () => {
        const e = validateUser({...user, role: '', unit: ''});
        expect(e.role).toBeTruthy();
        expect(e.unit).toBeTruthy();
    });
    it('only checks the fields it is given (profile form)', () => {
        expect(validateUser({name: 'x', phone: '0501234567', email: 'a@b.co'})).toEqual({});
    });
});

describe('validatePasswordChange', () => {
    it('needs current, 6+ and matching confirm', () => {
        expect(validatePasswordChange({current: '', next: '123', confirm: 'x'})).toEqual({
            current: expect.any(String), next: expect.any(String), confirm: expect.any(String),
        });
        expect(validatePasswordChange({current: 'old', next: 'newpass', confirm: 'newpass'})).toEqual({});
    });
    it('admin reset does not need the current password', () => {
        expect(validatePasswordChange({current: '', next: 'newpass', confirm: 'newpass'}, {needCurrent: false})).toEqual({});
    });
});

describe('validateUnit', () => {
    it('all three parts are required', () => {
        expect(Object.keys(validateUnit({district: '', merhav: ' ', station: 'x'}))).toEqual(['district', 'merhav']);
    });
});
