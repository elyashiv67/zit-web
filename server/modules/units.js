import mongoose from "mongoose";

const UnitSchema = new mongoose.Schema({
        district: {
            type: String,
            required: true,
        },
        merhav: {
            type: String,
            required: true,
        },
        station: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
);

// a district/merhav has many stations, so only the full combination is unique
UnitSchema.index({district: 1, merhav: 1, station: 1}, {unique: true});

export default mongoose.model("Unit", UnitSchema);
