import mongoose, { Document, Schema, Model } from 'mongoose';

interface IDriveTime {
  time: string;
  state: boolean;
}

export interface IBoard extends Document {
  pumperCode: string;
  pumperName: string;
  pulseDuration: number;
  driveTimes: IDriveTime[];
}

class BoardModel {
  private model: Model<IBoard>;

  constructor() {
    const driveTimeSchema = new Schema<IDriveTime>({
      time: { type: String, required: true },
      state: { type: Boolean, required: true }
    }, { _id: false }); // _id: false é opcional, use se você não quiser ids para subdocumentos
    
    const schema = new Schema<IBoard>(
      {
        pumperCode: { type: String, required: true },
        pumperName: { type: String, required: true },
        pulseDuration: { type: Number, required: true },
        driveTimes: { type: [driveTimeSchema], required: true },       
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