import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const TimeDiffSchema = new mongoose.Schema({
    // what was checked (e.g. a camera or a place), the title in the history.
    // Required on save (TimeDiff_S.js); records saved before it existed have none
    name: {
        type: String
    },
    owner: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    assigned_unit: {
        type: ObjectId,
        ref: 'Unit',
        required: true
    },
    real_time: {
        type: Date,
        required: true
    },
    dvr_time: {
        type: Date,
        required: true
    },
    // dvr_time - real_time (negative = DVR is behind)
    offset_ms: {
        type: Number,
        required: true
    },
    dvr_lastSave: {
        type: Date
    },
    // where the DVR is, optional (the history offers to save it as a pin)
    location: {
        type: new mongoose.Schema({lat: {type: Number, required: true}, lng: {type: Number, required: true}}, {_id: false}),
        default: undefined
    }
},
    {
        timestamps: true
    }
);

// GET /timeDiff/my and /timeDiff/allUnit, newest first
TimeDiffSchema.index({owner: 1, createdAt: -1});
TimeDiffSchema.index({assigned_unit: 1, createdAt: -1});

export default mongoose.model("TimeDiff", TimeDiffSchema);
