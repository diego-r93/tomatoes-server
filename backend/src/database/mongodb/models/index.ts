import mongoose from 'mongoose';
import { url } from '../config/db.config';
import BoardModel from './board.model';

mongoose.Promise = global.Promise;

const db = {
  mongoose,
  url: url,
  board: BoardModel,
};

export default db;
