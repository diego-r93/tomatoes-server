import mongoose from 'mongoose';

// Mixed keeps the existing chart JSON intact, including uPlot options.
const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  folder: { type: String, default: 'General' },
  tags: { type: [String], default: [] },
  favorite: { type: Boolean, default: false },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  charts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  revision: { type: Number, default: 1 },
}, { timestamps: true, versionKey: false, collection: 'dashboards' });

export default mongoose.model('Dashboard', schema);
