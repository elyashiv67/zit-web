import {useId, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {textDirection} from '../lib/textDirection.js';

// label + input + error, wired for screen readers. Extra props go to the <input>
// (a <textarea> with `multiline`)
export function Field({label, error, hint, className = '', multiline = false, ...inputProps}) {
    const id = useId();
    const errorId = `${id}-error`;
    const Input = multiline ? 'textarea' : 'input';
    return (
        <div className={`field ${className}`}>
            <label htmlFor={id} className="field-label">{label}</label>
            <Input
                id={id}
                className={`input ${error ? 'input-invalid' : ''}`}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? errorId : undefined}
                {...inputProps}
            />
            {hint && !error && <span className="field-hint">{hint}</span>}
            {error && <span id={errorId} className="field-error">{error}</span>}
        </div>
    );
}

// The eye button sits where the text ends: English (or digits) runs left to right with the eye on the right,
// Hebrew runs right to left with the eye on the left. The input and the button share one `dir`, so the
// input's padding (index.css, .input-with-button) is always on the button's side and the text never runs under it.
export function PasswordField({label, error, onChange, ...inputProps}) {
    const [visible, setVisible] = useState(false);
    // an uncontrolled field (no `value`) still needs the text to pick a direction
    const [typed, setTyped] = useState(inputProps.defaultValue ?? '');
    const dir = textDirection(String(inputProps.value ?? typed));
    const id = useId();
    const errorId = `${id}-error`;
    return (
        <div className="field">
            <label htmlFor={id} className="field-label">{label}</label>
            <div className="input-with-button" dir={dir}>
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    className={`input ${error ? 'input-invalid' : ''}`}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? errorId : undefined}
                    {...inputProps}
                    onChange={e => { setTyped(e.target.value); onChange?.(e); }}
                />
                <button type="button" className="icon-btn" onClick={() => setVisible(v => !v)}
                    aria-label={visible ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'} aria-pressed={visible}>
                    {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
            </div>
            {error && <span id={errorId} className="field-error">{error}</span>}
        </div>
    );
}
