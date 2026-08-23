import router from "../routes/Main_R.js";

async function validValues(req, res, next) {
    try {
        const { level, name } = req.body;

        if (name === undefined || level === undefined) {
            return res.status(400).json({ message: "Need to add all data" });
        }

        if (typeof name !== 'string') {
            return res.status(400).json({ message: "Name must be a string" });
        }

        if (typeof level !== 'number') {
            return res.status(400).json({ message: "Level must be a number" });
        }

        next();
    } catch (e) {
        res.status(500).json({ message: `Server error: ${e.message}` });
    }
}

export { validValues};