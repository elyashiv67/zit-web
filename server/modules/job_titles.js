import mongoose from "mongoose";

// a user's job title (e.g. ראש צוות). Only a name: it gives no permissions (those come from the role)
const JobTitleSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("JobTitle", JobTitleSchema);
