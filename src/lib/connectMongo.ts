import mongoose from "mongoose";

const connectMongo = async () => {
  const MongoURL = process.env.MONGO_URL;

  if (mongoose.connections[0].readyState) {
    console.log("MongoDB already connected", MongoURL);
    return;
  }

  if (!MongoURL) {
    throw new Error("MongoURL is not defined");
  }

  console.log("Connecting to MongoDB", MongoURL);
  await mongoose.connect(MongoURL);
  // connect to database

  console.log("MongoDB connected");
};

export default connectMongo;
