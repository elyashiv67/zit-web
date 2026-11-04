import mongoose from "mongoose";
import {encrypt, decrypt} from "../config/secretBox.js";

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
        // encrypted in the DB, decrypted when sent (only GET /pin/:id selects it)
        password: {
            type: String,
            select: false,
            set: encrypt,
            get: decrypt
        }
    },
    assigned_unit: {
        type: ObjectId,
        ref: 'Unit',
        required: true
    }
},
    {
        timestamps: true,
        id: false, // no extra "id" next to _id when getters are applied
        toJSON: {getters: true}
    }
);

// every unit list (GET /pin/allUnit) searches by unit
PinSchema.index({assigned_unit: 1});

export default mongoose.model("Pin", PinSchema);
