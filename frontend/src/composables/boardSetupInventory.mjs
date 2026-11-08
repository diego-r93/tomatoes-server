// Chip detection is not proof of an installed, valid probe.
export function approvedSetupBoards(registry, reports) {
  if (!Array.isArray(registry) || !Array.isArray(reports)) throw new Error('Invalid board inventory');
  const byHost = new Map(reports.map(report => [report.host, report]));
  return registry.filter(board => board.status === 'approved')
    .map(board => ({ ...board, report: byHost.get(board.host) || null }))
    .sort((a, b) => a.host.localeCompare(b.host));
}
export function chipPresence(report, sensor) {
  const value = report?.sensors?.[sensor];
  return value === true ? 'Detected' : value === false ? 'Not detected' : 'Not reported';
}
export function reportedPumpChannels(board) {
  return Object.entries(board?.report?.ports || {}).filter(([code]) =>
    code.startsWith(`${board.host}#`) && /^0[1-4]$/.test(code.split('#')[1])
  ).map(([code, port]) => ({ code, label: port.name || port.pumperName || code, gpio: port.gpio }));
}
