// Hebrew / Arabic letters (and their presentation forms) read right to left
const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
// any other letter (Latin, Cyrillic, ...) reads left to right
const LTR_LETTER = /\p{L}/u;

// the direction of a piece of text, decided by its first letter (digits and symbols don't count).
// Text with no letters at all (a PIN like "6752") reads left to right; empty text keeps the page's direction (rtl).
export function textDirection(text) {
    for (const char of text) {
        if (RTL_LETTER.test(char)) return 'rtl';
        if (LTR_LETTER.test(char)) return 'ltr';
    }
    return text ? 'ltr' : 'rtl';
}
