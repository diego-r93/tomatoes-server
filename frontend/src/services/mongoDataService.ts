import { http } from './http-common';

export interface DriveTime {
  time: string;
  state: boolean;
}
export interface PumpSettings {
  pumperName: string;
  pulseDuration: number;
  pumperCode: string;
  driveTimes: DriveTime[];
}
export interface PumpSchedule extends PumpSettings {
  _id: string;
  id?: string;
  __v?: number;
}

class MongoDataService {
  // Get all Boards
  getAllBoards() {
    return http.get<PumpSchedule[]>("/boards");
  }

  // Get a single Board by id
  getBoard(id: string) {
    return http.get<PumpSchedule>(`/boards/${id}`);
  }

  // Create a new Board
  createBoard(data: PumpSettings) {
    return http.post<PumpSchedule>("/boards", data);
  }

  // Update a Board (full replacement)
  updateBoard(id: string, data: Omit<PumpSettings, 'pumperCode'>) {
    return http.put<PumpSchedule>(`/boards/${id}`, data);
  }

  // Delete a Board by id
  deleteBoard(id: string) {
    return http.delete(`/boards/${id}`);
  }

  // Edit the state of a specific driveTime
  editDriveTimeState(id: string, index: number, state: boolean) {
    return http.patch(`/boards/${id}/driveTimes/${index}/state`, { state });
  }

  // Edit the time of a specific driveTime
  editDriveTime(id: string, index: number, time: string) {
    return http.patch(`/boards/${id}/driveTimes/${index}/time`, { time });
  }

  // Delete a specific driveTime
  deleteDriveTimeAtIndex(id: string, index: number) {
    return http.delete(`/boards/${id}/driveTimes/${index}`);
  }

  // Delete all driveTimes of a Board
  deleteAllDriveTimes(id: string) {
    return http.delete(`/boards/${id}/driveTimes`);
  }

  // Replace all driveTimes of a Board
  replaceDriveTimes(id: string, driveTimes: DriveTime[]) {
    return http.put(`/boards/${id}/driveTimes`, { driveTimes });
  }
}

export default new MongoDataService();
