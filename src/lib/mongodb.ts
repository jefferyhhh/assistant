/**
 * MongoDB 客户端单例
 * 开发环境热重载安全：将实例挂在 globalThis 上避免重复创建连接
 */

import { MongoClient } from "mongodb";
import { config } from "./config";

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
};

function createMongoClient(): MongoClient {
  return new MongoClient(config.mongodb.uri);
}

export function getMongoClient(): MongoClient {
  if (!globalForMongo.mongoClient) {
    globalForMongo.mongoClient = createMongoClient();
  }
  return globalForMongo.mongoClient;
}

/**
 * 确保 MongoDB 连接就绪
 * 在使用 checkpointer 之前调用
 */
export async function ensureMongoConnected(): Promise<MongoClient> {
  const client = getMongoClient();
  // ping 一下确认连接可用
  try {
    await client.db(config.mongodb.dbName).command({ ping: 1 });
  } catch {
    await client.connect();
  }
  return client;
}
