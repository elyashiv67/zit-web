import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const UserSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
        },
        user_name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        pass: {
            type: String,
            required: true,
        },
        TZ: {
            type: String,
            required: true,
            unique: true,
        },
        police_id: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            maxLength: 10
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        role: {
            type: ObjectId,
            ref: 'Role',
            required: true
        },
        unit: {
            type: ObjectId,
            ref: 'Unit',
            required: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("User", UserSchema);