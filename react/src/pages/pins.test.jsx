import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN, findHeading, makePin, makeUser, renderApp} from '../test/utils.jsx';

const user = makeUser();

describe('pins list', () => {
    it('lists the unit pins with a photo, or an icon when there are none', async () => {
        renderApp('/pins', {user, api: {'GET /pin/allUnit': [
            makePin({_id: 'a', name: 'שער ראשי', image: ['x.jpg']}),
            makePin({_id: 'b', name: 'חניון', image: [], dvr: {}}),
        ]}});
        const list = await screen.findByRole('list');
        const rows = within(list).getAllByRole('link');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveAttribute('href', '/pins/a');
        expect(rows[0].querySelector('img')).toHaveAttribute('src', '/api/pin/a/images/x.jpg');
        // no photos -> an icon, not a text placeholder
        expect(within(rows[1]).getByRole('img', {name: 'אין תמונות'})).toBeInTheDocument();
        expect(within(rows[0]).getByText('DVR')).toBeInTheDocument();
        expect(within(rows[1]).queryByText('DVR')).not.toBeInTheDocument();
        expect(screen.getByText('2 נקודות ביחידה')).toBeInTheDocument();
    });

    it('puts every pin on the map', async () => {
        renderApp('/pins', {user, api: {'GET /pin/allUnit': [makePin({_id: 'a'}), makePin({_id: 'b'})]}});
        expect(await screen.findByTestId('map')).toHaveAttribute('data-pins', '2');
    });

    it('search filters the list and the map', async () => {
        renderApp('/pins', {user, api: {'GET /pin/allUnit': [makePin({_id: 'a', name: 'שער ראשי'}), makePin({_id: 'b', name: 'חניון'})]}});
        await screen.findByText('שער ראשי');
        await userEvent.type(screen.getByPlaceholderText('חיפוש לפי שם נקודה או בעלים'), 'חני');
        expect(screen.queryByText('שער ראשי')).not.toBeInTheDocument();
        expect(screen.getByText('חניון')).toBeInTheDocument();
        expect(screen.getByTestId('map')).toHaveAttribute('data-pins', '1');
        await userEvent.clear(screen.getByPlaceholderText('חיפוש לפי שם נקודה או בעלים'));
        await userEvent.type(screen.getByPlaceholderText('חיפוש לפי שם נקודה או בעלים'), 'zzz');
        expect(screen.getByText('לא נמצאה נקודה בשם הזה')).toBeInTheDocument();
    });

    it('search also finds a pin by its DVR owner', async () => {
        renderApp('/pins', {user, api: {'GET /pin/allUnit': [
            makePin({_id: 'a', name: 'שער ראשי'}), makePin({_id: 'b', name: 'חניון', dvr_owner: {name: 'משה כהן'}}),
        ]}});
        await screen.findByText('שער ראשי');
        await userEvent.type(screen.getByPlaceholderText('חיפוש לפי שם נקודה או בעלים'), 'משה');
        expect(screen.queryByText('שער ראשי')).not.toBeInTheDocument();
        expect(screen.getByText('חניון')).toBeInTheDocument();
    });

    it('empty unit: an icon and a button to add the first pin', async () => {
        renderApp('/pins', {user, api: {'GET /pin/allUnit': []}});
        expect(await screen.findByText('אין עדיין נקודות ביחידה')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: /^הוספת נקודה$/, hidden: false})).toBeInTheDocument();
    });

    it('a failed load shows the error and retries', async () => {
        let calls = 0;
        renderApp('/pins', {user, api: {'GET /pin/allUnit': () => (++calls === 1
            ? {status: 503, body: {message: 'database is unavailable, try again in a moment'}}
            : [makePin()])}});
        expect(await screen.findByText('השרת לא זמין כרגע. נסו שוב בעוד רגע')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: /נסו שוב/}));
        expect(await screen.findByText('שער ראשי')).toBeInTheDocument();
    });

    it('admins can switch to every unit', async () => {
        const {server} = renderApp('/pins', {user: ADMIN, api: {'GET /pin/allUnit': [makePin()], 'GET /pin': [makePin(), makePin({_id: 'z', name: 'אחר'})]}});
        await screen.findByText('שער ראשי');
        await userEvent.click(screen.getByRole('tab', {name: 'כל היחידות'}));
        expect(await screen.findByText('אחר')).toBeInTheDocument();
        expect(server.callsTo('GET', '/pin')).toHaveLength(1);
    });

    it('regular users do not get the all-units switch', async () => {
        renderApp('/pins', {user, api: {'GET /pin/allUnit': [makePin()]}});
        await screen.findByText('שער ראשי');
        expect(screen.queryByRole('tab', {name: 'כל היחידות'})).not.toBeInTheDocument();
    });
});

describe('loading skeletons', () => {
    it('stay hidden on a fast load and appear only after 300ms', async () => {
        vi.useFakeTimers();
        let resolve;
        renderApp('/pins', {user, api: {'GET /pin/allUnit': () => new Promise(r => { resolve = r; })}});
        await act(async () => { await vi.advanceTimersByTimeAsync(50); });
        expect(screen.queryByRole('status', {name: 'טוען'})).not.toBeInTheDocument();
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
        expect(screen.getByRole('status', {name: 'טוען'})).toBeInTheDocument();
        await act(async () => { resolve([makePin()]); await vi.advanceTimersByTimeAsync(10); });
        expect(screen.queryByRole('status', {name: 'טוען'})).not.toBeInTheDocument();
        expect(screen.getByText('שער ראשי')).toBeInTheDocument();
        vi.useRealTimers();
    });
});

describe('pin details', () => {
    const detail = makePin({image: ['one.jpg', 'two.jpg'], dvr: {user_name: 'dvradmin', password: 's3cret'}});

    it('shows the pin, its creator, navigation and photos', async () => {
        renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': detail}});
        await findHeading('שער ראשי');
        expect(screen.getByText('דנה כהן')).toBeInTheDocument();
        expect(screen.getByRole('link', {name: /ניווט ב-Waze/})).toHaveAttribute('href', 'https://waze.com/ul?ll=32.6,35.29&navigate=yes');
        expect(screen.getAllByRole('button', {name: 'הגדלת התמונה'})).toHaveLength(2);
        expect(screen.getByText('2/10')).toBeInTheDocument();
    });

    it('hides the DVR password until asked, and copies it', async () => {
        const writeText = vi.fn().mockResolvedValue();
        Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});
        renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': detail}});
        await findHeading('שער ראשי');
        expect(screen.getByTestId('dvr-password')).toHaveTextContent('••••••••');
        await userEvent.click(screen.getByRole('button', {name: 'הצגת הסיסמה'}));
        expect(screen.getByTestId('dvr-password')).toHaveTextContent('s3cret');
        await userEvent.click(screen.getByRole('button', {name: 'העתקת הסיסמה'}));
        expect(writeText).toHaveBeenCalledWith('s3cret');
        expect(await screen.findByText('הסיסמה הועתק')).toBeInTheDocument();
    });

    it('no photos and no DVR -> icon + plain text', async () => {
        renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': makePin({dvr: {}})}});
        await findHeading('שער ראשי');
        expect(screen.getByText('אין עדיין תמונות')).toBeInTheDocument();
        expect(screen.getByText('אין פרטי DVR לנקודה הזאת.')).toBeInTheDocument();
        expect(screen.getByText('לא נשמר בעל DVR לנקודה הזאת.')).toBeInTheDocument();
    });

    it('shows the DVR owner, with a call button for the phone', async () => {
        renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': makePin({
            dvr_owner: {name: 'משה כהן', id_number: '123456789', phone: '0521234567', notes: 'זמין רק בבוקר'},
        })}});
        const section = (await screen.findByRole('heading', {name: 'בעל ה-DVR'})).closest('section');
        expect(section).toHaveTextContent('משה כהן');
        expect(section).toHaveTextContent('123456789');
        expect(section).toHaveTextContent('זמין רק בבוקר');
        expect(screen.getByRole('link', {name: 'התקשרות אל משה כהן'})).toHaveAttribute('href', 'tel:0521234567');
    });

    it('an owner with only a name shows just the name', async () => {
        renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': makePin({dvr_owner: {name: 'רינה'}})}});
        const section = (await screen.findByRole('heading', {name: 'בעל ה-DVR'})).closest('section');
        expect(section).toHaveTextContent('רינה');
        expect(section).not.toHaveTextContent('טלפון');
        expect(screen.queryByRole('link', {name: /התקשרות/})).not.toBeInTheDocument();
    });

    it('uploads photos as multipart "images", showing a placeholder tile meanwhile', async () => {
        let finish;
        const {server} = renderApp('/pins/pin1', {user, api: {
            'GET /pin/pin1': detail,
            'POST /pin/pin1/images': () => new Promise(r => { finish = r; }),
        }});
        await findHeading('שער ראשי');
        const files = [new File(['a'], 'a.jpg', {type: 'image/jpeg'}), new File(['b'], 'b.jpg', {type: 'image/jpeg'})];
        fireEvent.change(screen.getByTestId('image-input'), {target: {files}});
        expect(await screen.findAllByTestId('uploading-tile')).toHaveLength(2);
        const sent = server.callsTo('POST', '/pin/pin1/images')[0].body;
        expect(sent.getAll('images')).toHaveLength(2);
        await act(async () => finish({status: 201, body: {pin: {...detail, dvr: {user_name: 'dvradmin'}, image: ['one.jpg', 'two.jpg', 'c.jpg', 'd.jpg']}}}));
        expect(await screen.findByText('2 תמונות נוספו')).toBeInTheDocument();
        expect(screen.getAllByRole('button', {name: 'הגדלת התמונה'})).toHaveLength(4);
        // the decrypted DVR password from the first load is kept
        await userEvent.click(screen.getByRole('button', {name: 'הצגת הסיסמה'}));
        expect(screen.getByTestId('dvr-password')).toHaveTextContent('s3cret');
    });

    it('refuses more photos than the pin has room for, without calling the server', async () => {
        const full = makePin({image: Array.from({length: 9}, (_, i) => `${i}.jpg`)});
        const {server} = renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': full}});
        await findHeading('שער ראשי');
        fireEvent.change(screen.getByTestId('image-input'), {target: {files: [new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg')]}});
        expect(await screen.findByText('אפשר להוסיף עוד 1 תמונות בלבד')).toBeInTheDocument();
        expect(server.callsTo('POST', '/pin/pin1/images')).toHaveLength(0);
    });

    it('a pin with 10 photos has no upload button', async () => {
        renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': makePin({image: Array.from({length: 10}, (_, i) => `${i}.jpg`)})}});
        await findHeading('שער ראשי');
        expect(screen.queryByTestId('image-input')).not.toBeInTheDocument();
    });

    it('opens a photo and deletes it after confirming', async () => {
        const {server} = renderApp('/pins/pin1', {user, api: {
            'GET /pin/pin1': detail,
            'DELETE /pin/pin1/images/one.jpg': {pin: {...detail, image: ['two.jpg']}},
        }});
        await findHeading('שער ראשי');
        await userEvent.click(screen.getAllByRole('button', {name: 'הגדלת התמונה'})[0]);
        await userEvent.click(within(screen.getByRole('dialog', {name: 'תמונה'})).getByRole('button', {name: /מחיקה/}));
        const confirm = screen.getByRole('alertdialog');
        expect(within(confirm).getByText('למחוק את התמונה?')).toBeInTheDocument();
        await userEvent.click(within(confirm).getByRole('button', {name: 'מחיקת התמונה'}));
        expect(await screen.findByText('התמונה נמחקה')).toBeInTheDocument();
        expect(server.callsTo('DELETE', '/pin/pin1/images/one.jpg')).toHaveLength(1);
        expect(screen.getAllByRole('button', {name: 'הגדלת התמונה'})).toHaveLength(1);
    });

    it('cancel in the confirm dialog deletes nothing', async () => {
        const {server} = renderApp('/pins/pin1', {user, api: {'GET /pin/pin1': detail}});
        await findHeading('שער ראשי');
        await userEvent.click(screen.getByRole('button', {name: /מחיקת הנקודה/}));
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'ביטול'}));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(server.calls.filter(c => c.method === 'DELETE')).toHaveLength(0);
    });

    it('deleting the pin goes back to the list', async () => {
        const {router} = renderApp('/pins/pin1', {user, api: {
            'GET /pin/pin1': detail, 'DELETE /pin/pin1': {id: 'pin1'}, 'GET /pin/allUnit': [],
        }});
        await findHeading('שער ראשי');
        await userEvent.click(screen.getByRole('button', {name: /מחיקת הנקודה/}));
        await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'מחיקת הנקודה'}));
        await waitFor(() => expect(router.state.location.pathname).toBe('/pins'));
        expect(await screen.findByText('הנקודה נמחקה')).toBeInTheDocument();
    });

    it('a deleted / unknown pin shows "not found" without a retry', async () => {
        renderApp('/pins/gone', {user, api: {'GET /pin/gone': {status: 404, body: {message: 'pin not found'}}}});
        expect(await screen.findByText('הנקודה לא נמצאה. ייתכן שהיא נמחקה')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /נסו שוב/})).not.toBeInTheDocument();
    });

    it('another unit\'s pin: the server says 403 and the page says so', async () => {
        renderApp('/pins/other', {user, api: {'GET /pin/other': {status: 403, body: {message: 'user is not authorized'}}}});
        expect(await screen.findByText('אין לך הרשאה לפעולה הזאת')).toBeInTheDocument();
    });
});

describe('pin form', () => {
    it('flags missing name and location before sending', async () => {
        const {server} = renderApp('/pins/new', {user});
        await findHeading('נקודה חדשה');
        await userEvent.click(screen.getByRole('button', {name: /הוספת הנקודה/}));
        expect(screen.getByText('צריך לתת לנקודה שם')).toBeInTheDocument();
        expect(screen.getByText(/קו רוחב בין/)).toBeInTheDocument();
        expect(server.callsTo('POST', '/pin')).toHaveLength(0);
    });

    it('creates a pin from a map click, with DVR details and photos', async () => {
        const created = makePin({_id: 'new1', name: 'מחסום'});
        const {server, router} = renderApp('/pins/new', {user, api: {
            'POST /pin': {status: 201, body: {pin: created}},
            'POST /pin/new1/images': {status: 201, body: {pin: {...created, image: ['p.jpg']}}},
            'GET /pin/new1': {...created, image: ['p.jpg']},
        }});
        await findHeading('נקודה חדשה');
        await userEvent.type(screen.getByLabelText('שם הנקודה'), 'מחסום');
        await userEvent.click(await screen.findByRole('button', {name: 'pick on map'}));
        expect(screen.getByLabelText('קו רוחב')).toHaveValue('32.5');
        await userEvent.type(screen.getByLabelText('שם משתמש'), 'admin');
        await userEvent.type(screen.getByLabelText('סיסמה'), 'pw');
        fireEvent.change(screen.getByTestId('new-pin-images'), {target: {files: [new File(['p'], 'p.jpg', {type: 'image/jpeg'})]}});
        expect(screen.getByText('נבחרו 1 תמונות')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', {name: /הוספת הנקודה/}));

        await waitFor(() => expect(router.state.location.pathname).toBe('/pins/new1'));
        expect(server.callsTo('POST', '/pin')[0].body).toEqual({
            name: 'מחסום', location: {lat: 32.5, lng: 35.1}, dvr: {user_name: 'admin', password: 'pw'},
        });
        expect(server.callsTo('POST', '/pin/new1/images')).toHaveLength(1);
        expect(await screen.findByText('הנקודה נוספה')).toBeInTheDocument();
    });

    it('"my location" fills the coordinates from the phone', async () => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {getCurrentPosition: ok => ok({coords: {latitude: 32.61234567, longitude: 35.29876543}})},
        });
        renderApp('/pins/new', {user});
        await findHeading('נקודה חדשה');
        await userEvent.click(screen.getByRole('button', {name: /המיקום שלי/}));
        expect(screen.getByLabelText('קו רוחב')).toHaveValue('32.612346');
        expect(screen.getByLabelText('קו אורך')).toHaveValue('35.298765');
    });

    it('edit sends only what changed; an emptied DVR password is removed (null)', async () => {
        const pin = makePin({dvr: {user_name: 'dvradmin', password: 'old'}});
        const {server} = renderApp('/pins/pin1/edit', {user, api: {
            'GET /pin/pin1': pin,
            'PATCH /pin/pin1': {pin},
        }});
        await findHeading('עריכת נקודה');
        expect(screen.getByLabelText('שם הנקודה')).toHaveValue('שער ראשי');
        await userEvent.clear(screen.getByLabelText('סיסמה'));
        await userEvent.click(screen.getByRole('button', {name: /שמירת השינויים/}));
        await screen.findByText('הנקודה עודכנה');
        expect(server.callsTo('PATCH', '/pin/pin1')[0].body).toEqual({
            name: 'שער ראשי', location: {lat: 32.6, lng: 35.29}, dvr: {password: null},
        });
    });

    it('creates a pin with a DVR owner: only the filled fields, phone / ID as digits', async () => {
        const created = makePin({_id: 'new1'});
        const {server} = renderApp('/pins/new', {user, api: {'POST /pin': {status: 201, body: {pin: created}}, 'GET /pin/new1': created}});
        await findHeading('נקודה חדשה');
        await userEvent.type(screen.getByLabelText('שם הנקודה'), 'מכולת');
        await userEvent.click(await screen.findByRole('button', {name: 'pick on map'}));
        await userEvent.type(screen.getByLabelText('שם הבעלים'), ' משה כהן ');
        await userEvent.type(screen.getByLabelText('טלפון (לא חובה)'), '052-123 4567');
        await userEvent.type(screen.getByLabelText('הערות (לא חובה)'), 'זמין בבוקר');
        await userEvent.click(screen.getByRole('button', {name: /הוספת הנקודה/}));
        await screen.findByText('הנקודה נוספה');
        expect(server.callsTo('POST', '/pin')[0].body).toEqual({
            name: 'מכולת', location: {lat: 32.5, lng: 35.1},
            dvr_owner: {name: 'משה כהן', phone: '0521234567', notes: 'זמין בבוקר'},
        });
    });

    it('owner details without a name are stopped before sending', async () => {
        const {server} = renderApp('/pins/new', {user});
        await findHeading('נקודה חדשה');
        await userEvent.type(screen.getByLabelText('שם הנקודה'), 'מכולת');
        await userEvent.click(await screen.findByRole('button', {name: 'pick on map'}));
        await userEvent.type(screen.getByLabelText('טלפון (לא חובה)'), '0521234567');
        await userEvent.type(screen.getByLabelText('ת״ז (לא חובה)'), '12a');
        await userEvent.click(screen.getByRole('button', {name: /הוספת הנקודה/}));
        expect(screen.getByLabelText('שם הבעלים')).toHaveAccessibleDescription('צריך למלא את שם הבעלים');
        expect(screen.getByLabelText('ת״ז (לא חובה)')).toHaveAccessibleDescription('עד 9 ספרות');
        expect(server.callsTo('POST', '/pin')).toHaveLength(0);
    });

    it('edit: a changed owner is sent whole, an emptied owner is removed (null)', async () => {
        const pin = makePin({dvr_owner: {name: 'משה כהן', phone: '0521234567', notes: 'בבוקר'}});
        const {server} = renderApp('/pins/pin1/edit', {user, api: {'GET /pin/pin1': pin, 'PATCH /pin/pin1': {pin}}});
        await findHeading('עריכת נקודה');
        expect(screen.getByLabelText('שם הבעלים')).toHaveValue('משה כהן');
        await userEvent.clear(screen.getByLabelText('הערות (לא חובה)'));
        await userEvent.click(screen.getByRole('button', {name: /שמירת השינויים/}));
        await screen.findByText('הנקודה עודכנה');
        expect(server.callsTo('PATCH', '/pin/pin1')[0].body.dvr_owner).toEqual({name: 'משה כהן', phone: '0521234567'});
    });

    it('edit: clearing every owner field removes the owner', async () => {
        const pin = makePin({dvr_owner: {name: 'משה כהן', phone: '0521234567'}});
        const {server} = renderApp('/pins/pin1/edit', {user, api: {'GET /pin/pin1': pin, 'PATCH /pin/pin1': {pin}}});
        await findHeading('עריכת נקודה');
        await userEvent.clear(screen.getByLabelText('שם הבעלים'));
        await userEvent.clear(screen.getByLabelText('טלפון (לא חובה)'));
        await userEvent.click(screen.getByRole('button', {name: /שמירת השינויים/}));
        await screen.findByText('הנקודה עודכנה');
        expect(server.callsTo('PATCH', '/pin/pin1')[0].body.dvr_owner).toBeNull();
    });

    it('edit: an untouched owner is not sent', async () => {
        const pin = makePin({dvr_owner: {name: 'משה כהן'}});
        const {server} = renderApp('/pins/pin1/edit', {user, api: {'GET /pin/pin1': pin, 'PATCH /pin/pin1': {pin}}});
        await findHeading('עריכת נקודה');
        await userEvent.type(screen.getByLabelText('שם הנקודה'), '2');
        await userEvent.click(screen.getByRole('button', {name: /שמירת השינויים/}));
        await screen.findByText('הנקודה עודכנה');
        expect(server.callsTo('PATCH', '/pin/pin1')[0].body).not.toHaveProperty('dvr_owner');
    });

    it('a server error stays on the form with the message', async () => {
        renderApp('/pins/new', {user, api: {'POST /pin': {status: 400, body: {message: 'invalid name'}}}});
        await findHeading('נקודה חדשה');
        await userEvent.type(screen.getByLabelText('שם הנקודה'), 'x');
        await userEvent.type(screen.getByLabelText('קו רוחב'), '32');
        await userEvent.type(screen.getByLabelText('קו אורך'), '35');
        await userEvent.click(screen.getByRole('button', {name: /הוספת הנקודה/}));
        expect(await screen.findByRole('alert')).toHaveTextContent('חלק מהפרטים לא תקינים');
    });
});
