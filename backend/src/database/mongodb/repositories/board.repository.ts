import type { BoardScheduleRepository } from '../../../boards/scheduleService';
import Board from '../models/board.model';

export const boardRepository: BoardScheduleRepository = {
  create: fields => new Board(fields).save(),
  findAll: () => Board.find().exec(),
  findOne: id => Board.findOne({ _id: id }).exec(),
  update: (id, fields) => Board.findOneAndUpdate({ _id: id }, fields, { new: true }).exec(),
  async editDriveTimes(id, edit) {
    const board = await Board.findById(id);
    if (!board || !edit(board)) return false;
    await board.save();
    return true;
  },
  deleteOne: id => Board.findOneAndDelete({ _id: id }).exec(),
  async deleteAll() {
    return (await Board.deleteMany({})).deletedCount;
  },
};
