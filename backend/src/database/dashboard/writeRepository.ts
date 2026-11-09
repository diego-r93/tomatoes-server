import Dashboard from './models/dashboard.model';
import type { validateDashboard } from './validation';

type DashboardFields = ReturnType<typeof validateDashboard>;

export function insertDashboard(id: string, fields: DashboardFields) {
  return Dashboard.create({ _id: id, ...fields, revision: 1 });
}

export function updateDashboardAtRevision(id: string, revision: number, fields: DashboardFields) {
  return Dashboard.findOneAndUpdate(
    { _id: id, revision },
    { $set: fields, $inc: { revision: 1 } },
    { new: true },
  ).lean();
}

export async function deleteDashboardAtRevision(id: string, revision: number) {
  const result = await Dashboard.deleteOne({ _id: id, revision });
  return Boolean(result.deletedCount);
}
