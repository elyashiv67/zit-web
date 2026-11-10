import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PasswordField} from './Field.jsx';
import {textDirection} from '../lib/textDirection.js';

describe('textDirection', () => {
    it.each([
        ['', 'rtl'],            // empty: the page's own direction
        ['שלום', 'rtl'],
        ['abc', 'ltr'],
        ['6752', 'ltr'],        // digits only: like English
        ['!@#', 'ltr'],
        ['12שלום', 'rtl'],      // the first letter decides, digits and symbols don't
        ['1abc', 'ltr'],
        ['abcשלום', 'ltr'],
        ['שלוםabc', 'rtl'],
        ['مرحبا', 'rtl'],
    ])('%j -> %s', (text, dir) => {
        expect(textDirection(text)).toBe(dir);
    });
});

// the eye button must sit on the side where the text ends, never on top of it: the input and the button share
// one direction (the input keeps its padding on the same side as the button)
describe('password field direction', () => {
    const renderField = () => {
        render(<PasswordField label="סיסמה" />);
        const input = screen.getByLabelText('סיסמה');
        const button = screen.getByRole('button', {name: 'הצגת הסיסמה'});
        const dirOf = el => el.closest('[dir]')?.getAttribute('dir');
        return {input, button, dirOf};
    };

    it('empty: right to left like the page, so the eye is on the left', () => {
        const {input, button, dirOf} = renderField();
        expect(dirOf(input)).toBe('rtl');
        expect(dirOf(button)).toBe('rtl');
    });

    it('English: left to right, so the eye moves to the right', async () => {
        const {input, button, dirOf} = renderField();
        await userEvent.type(input, 'secret1');
        expect(dirOf(input)).toBe('ltr');
        expect(dirOf(button)).toBe('ltr');
    });

    it('Hebrew: right to left, the eye stays on the left', async () => {
        const {input, button, dirOf} = renderField();
        await userEvent.type(input, 'סיסמה');
        expect(dirOf(input)).toBe('rtl');
        expect(dirOf(button)).toBe('rtl');
    });

    it('follows the text when it is replaced', async () => {
        const {input, button, dirOf} = renderField();
        await userEvent.type(input, 'abc');
        expect(dirOf(button)).toBe('ltr');
        await userEvent.clear(input);
        await userEvent.type(input, 'אבג');
        expect(dirOf(button)).toBe('rtl');
    });

    it('a controlled field takes its direction from the value it is given', () => {
        render(<PasswordField label="סיסמה" value="password" onChange={() => {}} />);
        expect(screen.getByLabelText('סיסמה').closest('[dir]')).toHaveAttribute('dir', 'ltr');
    });
});
