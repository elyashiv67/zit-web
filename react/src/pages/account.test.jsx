import {describe, expect, it} from 'vitest';
import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN, findHeading, makeUser, renderApp, ROLES, TITLES, UNIT} from '../test/utils.jsx';

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

    it('the name is the title of each row; old records without one say so', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([diff('a', {name: 'מצלמה כניסה'}), diff('b')])}});
        const rows = await screen.findAllByRole('listitem');
        expect(rows[0].querySelector('.row-title')).toHaveTextContent('מצלמה כניסה');
        expect(rows[1].querySelector('.row-title')).toHaveTextContent('ללא שם');
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

    it('a diff with a location opens to a map and a "save as pin" link with its place and name', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([
            diff('a', {name: 'מצלמה כניסה', location: {lat: 32.6, lng: 35.29}}),
            diff('b', {name: 'בלי מיקום'}),
        ])}});
        const toggle = await screen.findByRole('button', {name: /מצלמה כניסה/});
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();

        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const [withPlace] = screen.getAllByRole('listitem');
        expect(await within(withPlace).findByTestId('map')).toHaveAttribute('data-picked', '32.6,35.29');
        const href = within(withPlace).getByRole('link', {name: /שמירה כנקודה/}).getAttribute('href');
        const url = new URL(href, 'http://x');
        expect(url.pathname).toBe('/pins/new');
        expect(Object.fromEntries(url.searchParams)).toEqual({lat: '32.6', lng: '35.29', name: 'מצלמה כניסה'});

        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('map')).not.toBeInTheDocument();
    });

    it('a diff without a location has nothing to open', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([diff('b', {name: 'בלי מיקום'})])}});
        await screen.findByText('בלי מיקום');
        expect(screen.queryByRole('button', {name: /בלי מיקום/})).not.toBeInTheDocument();
        expect(screen.queryByRole('link', {name: /שמירה כנקודה/})).not.toBeInTheDocument();
    });

    it('"save as pin" opens the new pin form filled with the place and the name', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([diff('a', {name: 'מצלמה כניסה', location: {lat: 32.6, lng: 35.29}})])}});
        await userEvent.click(await screen.findByRole('button', {name: /מצלמה כניסה/}));
        await userEvent.click(screen.getByRole('link', {name: /שמירה כנקודה/}));
        await findHeading('נקודה חדשה');
        expect(screen.getByLabelText('שם הנקודה')).toHaveValue('מצלמה כניסה');
        expect(screen.getByLabelText('קו רוחב')).toHaveValue('32.6');
        expect(screen.getByLabelText('קו אורך')).toHaveValue('35.29');
    });

    it('an old record without a name sends only the place (the pin form asks for a name)', async () => {
        renderApp('/history', {user, api: {'GET /timeDiff/my': page([diff('a', {location: {lat: 32.6, lng: 35.29}})])}});
        await userEvent.click(await screen.findByRole('button', {name: /ללא שם/}));
        const url = new URL(screen.getByRole('link', {name: /שמירה כנקודה/}).getAttribute('href'), 'http://x');
        expect(Object.fromEntries(url.searchParams)).toEqual({lat: '32.6', lng: '35.29'});
    });
});

describe('profile', () => {
    it('shows who I am, with my job title and not my permission', async () => {
        renderApp('/profile', {user});
        await findHeading('דנה כהן');
        expect(screen.getByText('עפולה, עמקים, צפון')).toBeInTheDocument();
        expect(screen.getByText('dana')).toBeInTheDocument();
        expect(screen.getByText('תפקיד').closest('.details-row')).toHaveTextContent('חוקר זיט');
        expect(screen.queryByText('משתמש')).not.toBeInTheDocument();
    });

    it('an admin also sees only the job title, never "מנהל"', async () => {
        renderApp('/profile', {user: makeUser({role: ROLES[0], is_admin: true, job_title: TITLES[1]})});
        await findHeading('דנה כהן');
        expect(screen.getByText('תפקיד').closest('.details-row')).toHaveTextContent('ראש צוות');
        expect(screen.queryByText('מנהל')).not.toBeInTheDocument();
    });

    it('no job title yet (an old session): the row is simply not shown', async () => {
        renderApp('/profile', {user: makeUser({job_title: null})});
        await findHeading('דנה כהן');
        expect(screen.queryByText('תפקיד')).not.toBeInTheDocument();
        expect(screen.getByText('עפולה, עמקים, צפון')).toBeInTheDocument();
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
        {_id: 'admin1', name: 'אבי לוי', user_name: 'avi', TZ: '1', police_id: '1', phone: '0500000001', email: 'a@t.l', role: 'roleAdmin', unit: 'unit1', job_title: 'jt2'},
        {_id: 'u1', name: 'דנה כהן', user_name: 'dana', TZ: '2', police_id: '2', phone: '0500000002', email: 'd@t.l', role: 'roleUser', unit: 'unit1', job_title: 'jt1'},
    ];
    const baseApi = () => ({
        'GET /role': ROLES,
        'GET /unit': units,
        'GET /jobTitle': TITLES,
        'GET /user': {items: people, page: 1, limit: 20, total: 2, pages: 1},
    });

    it('lists users with job title, admin mark and unit names, and no delete button on myself', async () => {
        renderApp('/admin', {user: ADMIN, api: baseApi()});
        await findHeading('ניהול');
        const rows = await screen.findAllByRole('listitem');
        expect(rows[0]).toHaveTextContent('אבי לוי (את/ה)');
        expect(rows[0]).toHaveTextContent('ראש צוות');
        expect(rows[0]).toHaveTextContent('מנהל');
        expect(rows[1]).toHaveTextContent('חוקר זיט');
        expect(rows[1]).not.toHaveTextContent('מנהל');
        expect(rows[1]).not.toHaveTextContent('משתמש');
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
        expect(within(sheet).getByLabelText('תפקיד')).toHaveAccessibleDescription('צריך לבחור תפקיד');
        expect(within(sheet).getByLabelText('הרשאה')).toHaveAccessibleDescription('צריך לבחור הרשאה');
        expect(server.callsTo('POST', '/auth/register')).toHaveLength(0);

        const fill = async (label, text) => userEvent.type(within(sheet).getByLabelText(label), text);
        await fill('שם מלא', 'משה');
        await fill('שם משתמש', 'moshe');
        await fill('סיסמה ראשונית', 'secret12');
        await fill('תעודת זהות', '3');
        await fill('מספר אישי', '3');
        await fill('טלפון', '0500000003');
        await fill('אימייל', 'm@t.l');
        await userEvent.selectOptions(within(sheet).getByLabelText('תפקיד'), 'jt2');
        await userEvent.selectOptions(within(sheet).getByLabelText('הרשאה'), 'roleUser');
        await userEvent.selectOptions(within(sheet).getByLabelText('יחידה'), 'unit2');
        await userEvent.click(within(sheet).getByRole('button', {name: 'יצירת המשתמש'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('שם המשתמש כבר קיים במערכת');

        await userEvent.click(within(sheet).getByRole('button', {name: 'יצירת המשתמש'}));
        expect(await screen.findByText('המשתמש נוצר')).toBeInTheDocument();
        expect(server.callsTo('POST', '/auth/register')[1].body).toEqual({
            name: 'משה', user_name: 'moshe', pass: 'secret12', TZ: '3', police_id: '3',
            phone: '0500000003', email: 'm@t.l', role: 'roleUser', unit: 'unit2', job_title: 'jt2',
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
        await userEvent.selectOptions(within(sheet).getByLabelText('הרשאה'), 'roleUser');
        await userEvent.click(within(sheet).getByRole('button', {name: 'שמירת השינויים'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('אי אפשר לשנות את ההרשאה של המנהל האחרון');
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

    it('a user without a job title is flagged in the list', async () => {
        renderApp('/admin', {user: ADMIN, api: {...baseApi(),
            'GET /user': {items: [people[0], {...people[1], job_title: undefined}], page: 1, limit: 20, total: 2, pages: 1}}});
        const rows = await screen.findAllByRole('listitem');
        expect(rows[1]).toHaveTextContent('חסר תפקיד');
    });

    it("changes a user's job title, sending only that", async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'PATCH /user/u1': {user: {...people[1], job_title: TITLES[1], unit: UNIT, role: ROLES[1]}},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('button', {name: 'עריכת דנה כהן'}));
        const sheet = screen.getByRole('dialog', {name: 'עריכת דנה כהן'});
        expect(within(sheet).getByLabelText('תפקיד')).toHaveValue('jt1');
        await userEvent.selectOptions(within(sheet).getByLabelText('תפקיד'), 'jt2');
        await userEvent.click(within(sheet).getByRole('button', {name: 'שמירת השינויים'}));
        expect(await screen.findByText('המשתמש עודכן')).toBeInTheDocument();
        expect(server.callsTo('PATCH', '/user/u1')[0].body).toEqual({job_title: 'jt2'});
        expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('ראש צוות');
    });

    it('job titles: add, rename (users list follows without a reload) and delete', async () => {
        const {server} = renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'POST /jobTitle': {status: 201, body: {jobTitle: {_id: 'jt3', name: 'סייר'}}},
            'PATCH /jobTitle/jt1': {jobTitle: {_id: 'jt1', name: 'חוקר זיט בכיר'}},
            'DELETE /jobTitle/jt3': {id: 'jt3'},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('tab', {name: 'תפקידים'}));
        expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(['חוקר זיט', 'ראש צוות']);

        await userEvent.click(screen.getByRole('button', {name: /תפקיד חדש/}));
        let sheet = screen.getByRole('dialog', {name: 'תפקיד חדש'});
        await userEvent.click(within(sheet).getByRole('button', {name: 'הוספת התפקיד'}));
        expect(within(sheet).getByLabelText('שם התפקיד')).toHaveAccessibleDescription('צריך למלא שם לתפקיד');
        await userEvent.type(within(sheet).getByLabelText('שם התפקיד'), '  סייר ');
        await userEvent.click(within(sheet).getByRole('button', {name: 'הוספת התפקיד'}));
        await screen.findByText('התפקיד נוסף');
        expect(server.callsTo('POST', '/jobTitle')[0].body).toEqual({name: 'סייר'});
        expect(screen.getAllByRole('listitem')).toHaveLength(3);

        await userEvent.click(screen.getByRole('button', {name: 'עריכת חוקר זיט'}));
        sheet = screen.getByRole('dialog', {name: 'עריכת חוקר זיט'});
        await userEvent.clear(within(sheet).getByLabelText('שם התפקיד'));
        await userEvent.type(within(sheet).getByLabelText('שם התפקיד'), 'חוקר זיט בכיר');
        await userEvent.click(within(sheet).getByRole('button', {name: 'שמירת השינויים'}));
        await screen.findByText('התפקיד עודכן');
        expect(server.callsTo('PATCH', '/jobTitle/jt1')[0].body).toEqual({name: 'חוקר זיט בכיר'});

        await userEvent.click(screen.getByRole('button', {name: 'מחיקת סייר'}));
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'מחיקת התפקיד'}));
        await screen.findByText('התפקיד נמחק');
        expect(screen.getAllByRole('listitem')).toHaveLength(2);

        // the users tab shows the renamed title right away
        await userEvent.click(screen.getByRole('tab', {name: 'משתמשים'}));
        expect((await screen.findAllByRole('listitem'))[1]).toHaveTextContent('חוקר זיט בכיר');
        expect(server.callsTo('GET', '/jobTitle')).toHaveLength(1);
    });

    it("job titles: a title still given to users cannot be deleted, and the server's reason is shown in Hebrew", async () => {
        renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'DELETE /jobTitle/jt1': {status: 409, body: {message: 'Cannot delete job title: still assigned to one or more users'}},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('tab', {name: 'תפקידים'}));
        await userEvent.click(screen.getByRole('button', {name: 'מחיקת חוקר זיט'}));
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'מחיקת התפקיד'}));
        expect(await screen.findByText('אי אפשר למחוק תפקיד שמשויך למשתמשים')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('job titles: a duplicate name is explained in the form', async () => {
        renderApp('/admin', {user: ADMIN, api: {
            ...baseApi(),
            'POST /jobTitle': {status: 409, body: {message: 'name already exists', field: 'name', fields: ['name']}},
        }});
        await screen.findAllByRole('listitem');
        await userEvent.click(screen.getByRole('tab', {name: 'תפקידים'}));
        await userEvent.click(screen.getByRole('button', {name: /תפקיד חדש/}));
        const sheet = screen.getByRole('dialog', {name: 'תפקיד חדש'});
        await userEvent.type(within(sheet).getByLabelText('שם התפקיד'), 'ראש צוות');
        await userEvent.click(within(sheet).getByRole('button', {name: 'הוספת התפקיד'}));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('תפקיד בשם הזה כבר קיים');
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
