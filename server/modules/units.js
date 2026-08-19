import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const UnitSchema = new mongoose.Schema({
    district: {
        type: String,
        required: true,
        unique: true,
    },
    merhav: {
        type: String,
        required: true,
        unique: true,
    },
    station: {
        type: String,
        required: true,
        unique: true,
    }
},
    {
        timestamps: true
    }
);

export default mongoose.model("Unit", UnitSchema);
