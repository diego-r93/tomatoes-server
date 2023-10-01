import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBoard extends Document {
  pumperCode: string;
  pumperName: string;
  pulseDuration: number;
  driveTimes: any[]; // Ajuste para o tipo correto se driveTimes não for um array de any
}

class BoardModel {
  private model: Model<IBoard>;

  constructor() {
    const schema = new Schema<IBoard>(
      {
        pumperCode: String,
        pumperName: String,
        pulseDuration: Number,
        driveTimes: Array,       
      },
      { timestamps: true }
    );

    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    this.model = mongoose.model<IBoard>('board', schema);
  }

  getModel(): Model<IBoard> {
    return this.model;
  }
}

export default new BoardModel().getModel();