interface DriveTime {
  time: string;
  state: boolean;
}

interface BoardSchedule {
  pumperCode: string;
  pumperName: string;
  pulseDuration: number;
  driveTimes: DriveTime[];
}

export interface BoardScheduleRepository {
  create(fields: Record<string, unknown>): Promise<BoardSchedule>;
  findAll(): Promise<BoardSchedule[]>;
  findOne(id: string): Promise<BoardSchedule | null>;
  update(id: string, fields: Record<string, unknown>): Promise<BoardSchedule | null>;
  editDriveTimes(id: string, edit: (board: Pick<BoardSchedule, 'driveTimes'>) => boolean): Promise<boolean>;
  deleteOne(id: string): Promise<BoardSchedule | null>;
  deleteAll(): Promise<number>;
}

export function createBoardScheduleService(repository: BoardScheduleRepository, requestSync: () => void) {
  async function persist<T>(write: Promise<T>): Promise<T> {
    const result = await write;
    if (result !== null && result !== false) requestSync();
    return result;
  }

  function editDriveTime(id: string, index: number, edit: (times: DriveTime[], index: number) => void) {
    return persist(repository.editDriveTimes(id, ({ driveTimes }) => {
      if (!(index >= 0 && index < driveTimes.length)) return false;
      edit(driveTimes, index);
      return true;
    }));
  }

  function replaceDriveTimes(id: string, driveTimes: DriveTime[]) {
    return persist(repository.editDriveTimes(id, board => {
      board.driveTimes = driveTimes;
      return true;
    }));
  }

  return {
    create: (fields: Record<string, unknown>) => persist(repository.create(fields)),
    findAll: () => repository.findAll(),
    findOne: (id: string) => repository.findOne(id),
    update: (id: string, fields: Record<string, unknown>) => persist(repository.update(id, fields)),
    editDriveTimeState: (id: string, index: number, state: boolean) => editDriveTime(id, index, (times, position) => { times[position].state = state; }),
    editDriveTime: (id: string, index: number, time: string) => editDriveTime(id, index, (times, position) => { times[position].time = time; }),
    deleteDriveTimeAtIndex: (id: string, index: number) => editDriveTime(id, index, (times, position) => { times.splice(position, 1); }),
    replaceDriveTimes,
    deleteAllDriveTimes: (id: string) => replaceDriveTimes(id, []),
    deleteOne: (id: string) => persist(repository.deleteOne(id)),
    deleteAll: () => persist(repository.deleteAll()),
  };
}

export type BoardScheduleService = ReturnType<typeof createBoardScheduleService>;
