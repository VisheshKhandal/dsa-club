import mongoose from "mongoose";

type GlobalMongoose = typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
  mongooseListenersAttached?: boolean;
};
const globalMongoose = globalThis as GlobalMongoose;

if (!globalMongoose.mongooseListenersAttached) {
  mongoose.set("bufferTimeoutMS", 2500);
  mongoose.connection.on("disconnected", () => {
    globalMongoose.mongooseConnection = undefined;
  });
  mongoose.connection.on("error", () => {
    globalMongoose.mongooseConnection = undefined;
  });
  mongoose.connection.on("close", () => {
    globalMongoose.mongooseConnection = undefined;
  });
  globalMongoose.mongooseListenersAttached = true;
}

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required to access the database");

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (
    !globalMongoose.mongooseConnection ||
    mongoose.connection.readyState === 0 ||
    mongoose.connection.readyState === 3
  ) {
    globalMongoose.mongooseConnection = mongoose.connect(mongoUri, {
      autoIndex: false,
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      heartbeatFrequencyMS: 10_000,
    }).catch(err => {
      // Clear the cache so the next request can retry rather than reuse a broken connection.
      globalMongoose.mongooseConnection = undefined;
      throw err;
    });
  }
  await globalMongoose.mongooseConnection;
  return mongoose;
}
