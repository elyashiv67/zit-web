import mongoose from 'mongoose';

const connectDB = async () => {
  const db = mongoose.connection;

  db.on('error', (err) => {
    console.log(err);
  });

  db.once('connected', () => {
    console.log(`MongoDB Connected and listening on port ${process.env.PORT}  ✅ ✅`);
  });
  await mongoose.connect(process.env.DB);
}

export default connectDB;