import {useId, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';

// label + input + error, wired for screen readers. Extra props go to the <input>
export function Field({label, error, hint, className = '', ...inputProps}) {
    const id = useId();
    const errorId = `${id}-error`;
    return (
        <div className={`field ${className}`}>
            <label htmlFor={id} className="field-label">{label}</label>
            <input
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

export function PasswordField({label, error, ...inputProps}) {
    const [visible, setVisible] = useState(false);
    const id = useId();
    const errorId = `${id}-error`;
    return (
        <div className="field">
            <label htmlFor={id} className="field-label">{label}</label>
            <div className="input-with-button">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    className={`input ${error ? 'input-invalid' : ''}`}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? errorId : undefined}
                    dir="ltr"
                    {...inputProps}
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
