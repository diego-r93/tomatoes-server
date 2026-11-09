import Dashboard from './models/dashboard.model';

export function listDashboardSummaries() {
  return Dashboard.aggregate([
    { $sort: { updatedAt: -1 } },
    { $project: {
      name: 1, description: 1, folder: 1, tags: 1, favorite: 1,
      revision: 1, createdAt: 1, updatedAt: 1,
      panelCount: { $size: { $ifNull: ['$charts', []] } },
    } },
  ]);
}

export function findDashboard(id: string) {
  return Dashboard.findById(id).lean();
}

export function findDashboardCharts(id: string) {
  return Dashboard.findById(id).select('charts').lean();
}
