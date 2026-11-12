import Dashboard from './models/dashboard.model';
import type { validateDashboard } from './validation';

type DashboardFields = ReturnType<typeof validateDashboard>;

export function insertDashboard(id: string, fields: DashboardFields) {
  return Dashboard.create({ _id: id, ...fields, revision: 1 });
}

type DashboardSave = { revision: number; message: string; author: string; savedAt: Date };

export function updateDashboardAtRevision(id: string, revision: number, fields: DashboardFields, entry?: DashboardSave) {
  return Dashboard.findOneAndUpdate(
    { _id: id, revision },
    {
      $set: fields,
      $inc: { revision: 1 },
      ...(entry && { $push: { saveHistory: { $each: [entry], $position: 0, $slice: 20 } } }),
    },
    { new: true },
  ).lean();
}

export async function deleteDashboardAtRevision(id: string, revision: number) {
  const result = await Dashboard.deleteOne({ _id: id, revision });
  return Boolean(result.deletedCount);
}
