import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const PinSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    // who made the pin — for tracking only, permissions go by assigned_unit.
    // creator_name is a snapshot so it still shows after the user is deleted
    creator: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    creator_name: {
        type: String,
        required: true
    },
    location: {
        lng: {
            type: Number,
            required: true
        },
        lat: {
            type: Number,
            required: true
        }
    },
    image: {
        type: [String],
        default: []
    },
    dvr: {
        user_name: {
            type: String
        },
        password: {
            type: String,
            select: false
        }
    },
    assigned_unit: {
        type: ObjectId,
        ref: 'Unit',
        required: true
    }
},
    {
        timestamps: true
    }
);

export default mongoose.model("Pin", PinSchema);
