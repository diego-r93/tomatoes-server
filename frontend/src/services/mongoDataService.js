import { http } from "./http-common"

class MongoDataService {
  // Get all Boards
  getAllBoards() {
    return http.get("/boards");
  }

  // Get a single Board by id
  getBoard(id) {
    return http.get(`/boards/${id}`);
  }

  // Create a new Board
  createBoard(data) {
    return http.post("/boards", data);
  }

  // Update a Board (full replacement)
  updateBoard(id, data) {
    return http.put(`/boards/${id}`, data);
  }

  // Delete a Board by id
  deleteBoard(id) {
    return http.delete(`/boards/${id}`);
  }

  // Edit the state of a specific driveTime
  editDriveTimeState(id, index, state) {
    return http.patch(`/boards/${id}/driveTimes/${index}/state`, { state });
  }

  // Edit the time of a specific driveTime
  editDriveTime(id, index, time) {
    return http.patch(`/boards/${id}/driveTimes/${index}/time`, { time });
  }

  // Delete a specific driveTime
  deleteDriveTimeAtIndex(id, index) {
    return http.delete(`/boards/${id}/driveTimes/${index}`);
  }

  // Delete all driveTimes of a Board
  deleteAllDriveTimes(id) {
    return http.delete(`/boards/${id}/driveTimes`);
  }

  // Replace all driveTimes of a Board
  replaceDriveTimes(id, driveTimes) {
    return http.put(`/boards/${id}/driveTimes`, { driveTimes });
  }
}

export default new MongoDataService();
