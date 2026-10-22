import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const TimeDiffSchema = new mongoose.Schema({
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
