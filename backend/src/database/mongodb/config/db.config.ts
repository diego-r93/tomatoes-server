import dotenv from 'dotenv';

dotenv.config();

const username: string = process.env.MONGO_USERNAME || '';
const password: string = process.env.MONGO_PASSWORD || '';
const clusterName: string = process.env.MONGO_CLUSTER_NAME || '';
const databaseName: string = process.env.MONGO_DATABASE_NAME || '';

export const url: string = `mongodb+srv://${username}:${password}@${clusterName}.mongodb.net/${databaseName}?retryWrites=true&w=majority`;
