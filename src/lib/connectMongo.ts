import mongoose from "mongoose";

const connectMongo = async () => {
  const MongoURL = process.env.MONGO_URL;

  if (mongoose.connections[0].readyState) {
    return;
  }

  if (!MongoURL) {
    throw new Error("MongoURL is not defined");
  }

  await mongoose.connect(MongoURL);
  // connect to database
};

export default connectMongo;
