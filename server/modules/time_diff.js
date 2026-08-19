import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const TimeDiffSchema = new mongoose.Schema({
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
    offset_ms: {
        type: Date,
        required: true
    },
    dvr_lastSave: {
        type: Date,
        required: true
    }
},
    {
        timestamps: true
    }
);

export default mongoose.model("TimeDiff", TimeDiffSchema);