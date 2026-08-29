import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const PinSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
        type: ObjectId,
        ref: 'User',
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
            type: String
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
