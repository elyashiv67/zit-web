import {describe, expect, it} from 'vitest';
import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN, findHeading, makeUser, renderApp, ROLES, UNIT} from '../test/utils.jsx';

const user = makeUser();

function diff(id, overrides = {}) {
    return {
        _id: id, owner: 'u1', assigned_unit: 'unit1', offset_ms: 205000,
        real_time: '2026-11-04T08:00:00Z', dvr_time: '2026-11-04T08:03:25Z', createdAt: '2026-11-04T08:00:00Z', ...overrides,
    };
}
const page = (items, page = 1, pages = 1, total = items.length) => ({items, page, limit: 20, total, pages});

describe('history', () => {
    it('lists my saved diffs in words', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([diff('a'), diff('b', {offset_ms: -(86400000 + 3600000)})])}});
        await findHeading('היסטוריה');
        expect(await screen.findByText('2 חישובים שמורים')).toBeInTheDocument();
        const rows = screen.getAllByRole('listitem');
        expect(rows[0]).toHaveTextContent('ה-DVR מקדים ב- 00:03:25');
        expect(rows[1]).toHaveTextContent('ה-DVR מאחר ב- 01:00:00 ועוד יום אחד');
    });

    it('asks the server for pages of 20 and loads more on demand', async () => {
        const {server} = renderApp('/history', {user, api: {
            'GET /timeDiff/my': req => (req.query.page === '1' ? page([diff('a')], 1, 2, 2) : page([diff('b')], 2, 2, 2)),
        }});
        await screen.findByText('2 חישובים שמורים');
        expect(server.callsTo('GET', '/timeDiff/my')[0].query).toEqual({page: '1', limit: '20'});
        await userEvent.click(screen.getByRole('button', {name: /עוד חישובים/}));
        await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
        expect(screen.queryByRole('button', {name: /עוד חישובים/})).not.toBeInTheDocument();
    });

    it('unit tab: marks mine, and only mine can be deleted', async () => {
        renderApp('/history', {user, api: {
            'GET /timeDiff/my': page([]),
            'GET /timeDiff/allUnit': page([diff('a'), diff('b', {owner: 'someoneElse'})]),
        }});
        await screen.findByText('עוד אין חישובים שמורים');
        await userEvent.click(screen.getByRole('tab', {name: 'כל היחידה'}));
        await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
        const [mine, theirs] = screen.getAllByRole('listitem');
        expect(within(mine).getByText('שלי')).toBeInTheDocument();
        expect(within(mine).getByRole('button', {name: 'מחיקת הרשומה'})).toBeInTheDocument();
        expect(within(theirs).queryByRole('button', {name: 'מחיקת הרשומה'})).not.toBeInTheDocument();
    });

    it('deletes a record after confirming', async () => {
        const {server} = renderApp('/history', {user, api: {
            'GET /timeDiff/my': page([diff('a'), diff('b')]),
            'DELETE /timeDiff/a': {id: 'a'},
        }});
        await screen.findByText('2 חישובים שמורים');
        await userEvent.click(screen.getAllByRole('button', {name: 'מחיקת הרשומה'})[0]);
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'מחיקה'}));
        expect(await screen.findByText('הרשומה נמחקה')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(screen.getByText('1 חישובים שמורים')).toBeInTheDocument();
        expect(server.callsTo('DELETE', '/timeDiff/a')).toHaveLength(1);
    });

    it('empty history: icon and a way to the calculator', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([])}});
        expect(await screen.findByText('עוד אין חישובים שמורים')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: 'לחישוב הפרש זמנים'})).toHaveAttribute('href', '/');
    });
});

describe('profile', () => {
    it('shows who I am', async () => {
        renderApp('/profile', {user});
        await findHeading('דנה כהן');
        expect(screen.getByText('עפולה, עמקים, צפון')).toBeInTheDocument();
        expect(screen.getByText('dana')).toBeInTheDocument();
    });

    it('saves only the changed details', async () => {
        const {server} = renderApp('/profile', {user, api: {'PATCH /user/u1': {user}}});
        await findHeading('דנה כהן');
        const save = screen.getByRole('button', {name: /שמירת הפרטים/});
        expect(save).toBeDisabled();
        await userEvent.clear(screen.getByLabelText('טלפון'));
        await userEvent.type(screen.getByLabelText('טלפון'), '0509999999');
        await userEvent.click(save);
        expect(await screen.findByText('הפרטים עודכנו')).toBeInTheDocument();
        expect(server.callsTo('PATCH', '/user/u1')[0].body).toEqual({phone: '0509999999'});
    });

    it('bad phone is caught before sending', async () => {
        const {server} = renderApp('/profile', {user});
        await findHeading('דנה כהן');
        await userEvent.clear(screen.getByLabelText('טלפון'));
        await userEvent.type(screen.getByLabelText('טלפון'), '050-12');
        await userEvent.click(screen.getByRole('button', {name: /שמירת הפרטים/}));
        expect(screen.getByText('עד 10 ספרות, בלי מקפים')).toBeInTheDocument();
        expect(server.callsTo('PATCH', '/user/u1')).toHaveLength(0);
    });

    it('password change: mismatch is caught, wrong current password is shown, success clears the form', async () => {
        let attempt = 0;
        const {server} = renderApp('/profile', {user, api: {
            'PATCH /user/u1/password': () => (++attempt === 1
                ? {status: 400, body: {message: 'current password is wrong'}}
                : {message: 'Password changed successfully'}),
        }});
        await findHeading('דנה כהן');
        await userEvent.type(screen.getByLabelText('סיסמה נוכחית'), 'old');
        await userEvent.type(screen.getByLabelText('סיסמה חדשה'), 'newpass1');
        await userEvent.type(screen.getByLabelText('אימות הסיסמה החדשה'), 'newpass2');
        await userEvent.click(screen.getByRole('button', {name: 'שינוי הסיסמה'}));
        expect(screen.getByText('הסיסמאות לא זהות')).toBeInTheDocument();
        expect(server.callsTo('PATCH', '/user/u1/password')).toHaveLength(0);

        await userEvent.clear(screen.getByLabelText('אימות הסיסמה החדשה'));
        await userEvent.type(screen.getByLabelText('אימות הסיסמה החדשה'), 'newpass1');
        await userEvent.click(screen.getByRole('button', {name: 'שינוי הסיסמה'}));
        expect(await screen.findByText('הסיסמה הנוכחית שגויה')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'שינוי הסיסמה'}));
        expect(await screen.findByText('הסיסמה שונתה. מכשירים אחרים נותקו')).toBeInTheDocument();
        expect(screen.getByLabelText('סיסמה נוכחית')).toHaveValue('');
        expect(server.callsTo('PATCH', '/user/u1/password')[1].body).toEqual({current_password: 'old', new_password: 'newpass1'});
    });
});

describe('admin', () => {
    const units = [UNIT, {_id: 'unit2', district: 'צפון', merhav: 'עמקים', station: 'נצרת'}];
    const people = [
        {_id: 'admin1', name: 'אבי לוי', user_name: 'avi', TZ: '1', police_id: '1', phone: '0500000001', email: 'a@t.l', role: 'roleAdmin', unit: 'unit1'},
        {_id: 'u1', name: 'דנה כהן', user_name: 'dana', TZ: '2', police_id: '2', phone: '0500000002', email: 'd@t.l', role: 'roleUser', unit: 'unit1'},
    ];
    const baseApi = () => ({
        'GET /role': ROLES,
        'GET /unit': units,
        'GET /user': {items: people, page: 1, limit: 20, total: 2, pages: 1},
    });

    it('lists users with role and unit names, and no delete button on myself', async () => {
        renderApp('/admin', {user: ADMIN, api: baseApi()});
        await findHeading('ניהול');
        const rows = await screen.findAllByRole('listitem');
        expect(rows[0]).toHaveTextContent('אבי לוי (את/ה)');
        expect(rows[0]).toHaveTextContent('מנהל');
        expect(rows[1]).toHaveTextContent('משתמש');
        expect(within(rows[0]).queryByRole('button', {name: /מחיקת/})).not.toBeInTheDocument();
        expect(within(rows[1]).getByRole('button', {name: 'מחיקת דנה כהן'})).toBeInTheDocument();
    });

    it('creates a user, checking fields first and showing a duplicate from the server', async () => {
        let attempt = 0;
        const {server} = renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'POST /auth/register': () => (++attempt === 1
                ? {status: 409, body: {message: 'user_name already exists', field: 'user_name', fields: ['user_name']}}
                : {status: 201, body: {user: {_id: 'n1'}}}),
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: /משתמש חדש/}));
        const sheet = screen.getByRole('dialog', {name: 'משתמש חדש'});
        await userEvent.click(within(sheet).getByRole('button', {name: 'יצירת המשתמש'}));
        expect(within(sheet).getByText('צריך למלא שם')).toBeInTheDocument();
        expect(within(sheet).getByText('צריך לבחור יחידה')).toBeInTheDocument();
        expect(server.callsTo('POST', '/auth/register')).toHaveLength(0);

        const fill = async (label, text) => userEvent.type(within(sheet).getByLabelText(label), text);
        await fill('שם מלא', 'משה');
        await fill('שם משתמש', 'moshe');
        await fill('סיסמה ראשונית', 'secret1');
        await fill('תעודת זהות', '3');
        await fill('מספר אישי', '3');
        await fill('טלפון', '0500000003');
        await fill('אימייל', 'm@t.l');
        await userEvent.selectOptions(within(sheet).getByLabelText('תפקיד'), 'roleUser');
        await userEvent.selectOptions(within(sheet).getByLabelText('יחידה'), 'unit2');
        await userEvent.click(within(sheet).getByRole('button', {name: 'יצירת המשתמש'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('שם המשתמש כבר קיים במערכת');

        await userEvent.click(within(sheet).getByRole('button', {name: 'יצירת המשתמש'}));
        expect(await screen.findByText('המשתמש נוצר')).toBeInTheDocument();
        expect(server.callsTo('POST', '/auth/register')[1].body).toEqual({
            name: 'משה', user_name: 'moshe', pass: 'secret1', TZ: '3', police_id: '3',
            phone: '0500000003', email: 'm@t.l', role: 'roleUser', unit: 'unit2',
        });
        expect(screen.queryByRole('dialog', {name: 'משתמש חדש'})).not.toBeInTheDocument();
    });

    it('moves a user to another unit, sending only that', async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'PATCH /user/u1': {user: {...people[1], unit: units[1], role: ROLES[1]}},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: 'עריכת דנה כהן'}));
        const sheet = screen.getByRole('dialog', {name: 'עריכת דנה כהן'});
        await userEvent.selectOptions(within(sheet).getByLabelText('יחידה'), 'unit2');
        await userEvent.click(within(sheet).getByRole('button', {name: 'שמירת השינויים'}));
        expect(await screen.findByText('המשתמש עודכן')).toBeInTheDocument();
        expect(server.callsTo('PATCH', '/user/u1')[0].body).toEqual({unit: 'unit2'});
        expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('נצרת');
    });

    it('the last admin cannot be demoted: the server\'s 409 is shown in Hebrew', async () => {
        renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'PATCH /user/admin1': {status: 409, body: {message: 'Cannot change the role of the last admin'}},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: 'עריכת אבי לוי'}));
        const sheet = screen.getByRole('dialog', {name: 'עריכת אבי לוי'});
        await userEvent.selectOptions(within(sheet).getByLabelText('תפקיד'), 'roleUser');
        await userEvent.click(within(sheet).getByRole('button', {name: 'שמירת השינויים'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('אי אפשר לשנות את התפקיד של המנהל האחרון');
    });

    it('resets a password without the current one', async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: {...baseApi(), 'PATCH /user/u1/password': {message: 'ok'}}});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: 'איפוס הסיסמה של דנה כהן'}));
        const sheet = screen.getByRole('dialog');
        await userEvent.type(within(sheet).getByLabelText('סיסמה חדשה'), 'temp1234');
        await userEvent.type(within(sheet).getByLabelText('אימות הסיסמה'), 'temp1234');
        await userEvent.click(within(sheet).getByRole('button', {name: /איפוס הסיסמה/}));
        expect(await screen.findByText(/הסיסמה של דנה כהן אופסה/)).toBeInTheDocument();
        expect(server.callsTo('PATCH', '/user/u1/password')[0].body).toEqual({new_password: 'temp1234'});
    });

    it('deletes a user after confirming', async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: {...baseApi(), 'DELETE /user/u1': {id: 'u1'}}});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: 'מחיקת דנה כהן'}));
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'מחיקת המשתמש'}));
        expect(await screen.findByText(/המשתמש נמחק/)).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(server.callsTo('DELETE', '/user/u1')).toHaveLength(1);
    });

    it('units: add, edit and a blocked delete', async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'POST /unit': {status: 201, body: {unit: {_id: 'unit3', district: 'צפון', merhav: 'גליל', station: 'טבריה'}}},
            'PATCH /unit/unit2': {unit: {...units[1], station: 'נצרת עילית'}},
            'DELETE /unit/unit1': {status: 409, body: {message: 'Cannot delete unit: still assigned to one or more users'}},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('tab', {name: 'יחידות'}));
        expect(screen.getAllByRole('listitem')).toHaveLength(2);

        await userEvent.click(screen.getByRole('button', {name: /יחידה חדשה/}));
        let sheet = screen.getByRole('dialog', {name: 'יחידה חדשה'});
        await userEvent.type(within(sheet).getByLabelText('מחוז'), 'צפון');
        await userEvent.type(within(sheet).getByLabelText('מרחב'), 'גליל');
        await userEvent.type(within(sheet).getByLabelText('תחנה'), 'טבריה');
        await userEvent.click(within(sheet).getByRole('button', {name: 'הוספת היחידה'}));
        await screen.findByText('היחידה נוספה');
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(server.callsTo('POST', '/unit')[0].body).toEqual({district: 'צפון', merhav: 'גליל', station: 'טבריה'});

        await userEvent.click(screen.getByRole('button', {name: 'עריכת נצרת'}));
        sheet = screen.getByRole('dialog', {name: 'עריכת נצרת'});
        await userEvent.clear(within(sheet).getByLabelText('תחנה'));
        await userEvent.type(within(sheet).getByLabelText('תחנה'), 'נצרת עילית');
        await userEvent.click(within(sheet).getByRole('button', {name: 'שמירת השינויים'}));
        expect(await screen.findByText('נצרת עילית')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'מחיקת עפולה'}));
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'מחיקת היחידה'}));
        expect(await screen.findByText('אי אפשר למחוק יחידה שיש בה משתמשים')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('closing a form with Esc or the X discards it', async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: baseApi()});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: /משתמש חדש/}));
        await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'סגירה'}));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: /משתמש חדש/}));
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(server.calls.filter(c => c.method !== 'GET')).toHaveLength(0);
    });
});
