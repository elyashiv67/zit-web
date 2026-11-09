import env from './env.js';
import {hashPassword} from './passwords.js';
import User from '../modules/users.js';
import Role from '../modules/roles.js';
import Unit from '../modules/units.js';
import JobTitle from '../modules/job_titles.js';

// A fresh database (the Docker deploy without Atlas) has no users, so nobody could log in to create one.
// When FIRST_ADMIN_PASSWORD is set and there are no users yet, create what a first login needs:
// the two roles (read-only in the API), a unit and a job title (reused if they exist), and one admin.
// The owner then creates their real admin in the app and deletes this one. Once any user exists, it does nothing.
const FIRST_UNIT = {district: 'צפון', merhav: 'עמקים', station: 'עפולה'};
const FIRST_JOB_TITLE = 'מנהל מערכת';

async function ensureRole(name, level) {
    return Role.findOneAndUpdate({name}, {$setOnInsert: {name, level}}, {upsert: true, new: true});
}

export default async function createFirstAdmin() {
    if (!env.FIRST_ADMIN_PASSWORD) return;
    if (await User.exists({})) return;

    const user_name = env.FIRST_ADMIN_USERNAME ?? 'admin';
    const adminRole = await ensureRole('admin', 1);
    await ensureRole('user', 2);
    const unit = await Unit.findOne() ?? await Unit.create(FIRST_UNIT);
    const jobTitle = await JobTitle.findOne() ?? await JobTitle.create({name: FIRST_JOB_TITLE});

    // placeholder details (they must be unique); this account is meant to be deleted soon
    await User.create({
        name: user_name,
        user_name,
        pass: await hashPassword(env.FIRST_ADMIN_PASSWORD),
        TZ: '000000000',
        police_id: 'first-admin',
        phone: '0000000000',
        email: `${user_name}@first-admin.invalid`,
        role: adminRole._id,
        unit: unit._id,
        job_title: jobTitle._id,
    });
    console.log(`First admin "${user_name}" created. Log in, create your own admin user, log in as it, `
        + 'delete this one, and remove FIRST_ADMIN_PASSWORD from the env file.');
}
