import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const RoleSchema = new mongoose.Schema({
        level: {
            type: Number,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            enum: ["admin", "user"],
            required: true,
            unique: true,
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Role", RoleSchema);