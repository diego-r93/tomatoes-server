import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const url: string = process.env.MONGODB_URI || '';

if (!url) {
  throw new Error('MONGODB_URI is not set in .env');
}