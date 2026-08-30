import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

import Role from '../modules/roles.js';
import Unit from '../modules/units.js';
import User from '../modules/users.js';

// password for the seeded admin login. Override with SEED_ADMIN_PASSWORD in .env
// if you want; otherwise it is the value below.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '6752!';

async function seed() {
    if (!process.env.DB) {
        console.error('DB is not set — check your .env');
        process.exit(1);
    }

    await mongoose.connect(process.env.DB);
    console.log(`connected to "${mongoose.connection.name}"`);

    // role: admin
    const role = await Role.findOneAndUpdate(
        { name: 'admin' },
        { $setOnInsert: { name: 'admin', level: 1 } },
        { new: true, upsert: true }
    );
    console.log(`role  -> ${role.name} (${role._id})`);

    // unit: dev
    const unit = await Unit.findOneAndUpdate(
        { district: 'dev' },
        { $setOnInsert: { district: 'dev', merhav: 'dev', station: 'dev' } },
        { new: true, upsert: true }
    );
    console.log(`unit  -> ${unit.district} (${unit._id})`);

    // user: admin  (pass is reset every run so the login is always known)
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const user = await User.findOneAndUpdate(
        { user_name: 'admin' },
        {
            $set: { pass: hashed, role: role._id, unit: unit._id },
            $setOnInsert: {
                name: 'Admin',
                user_name: 'admin',
                TZ: '000000000',
                police_id: '0000',
                phone: '0500000000',
                email: 'admin@zit.local',
            },
        },
        { new: true, upsert: true }
    );
    console.log(`user  -> ${user.user_name} (${user._id})`);

    console.log(`\nlogin with  user_name: admin   password: ${ADMIN_PASSWORD}`);

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(async (err) => {
    console.error('seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
