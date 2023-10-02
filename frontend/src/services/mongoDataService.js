import { http } from "./http-common"

class MongoDataService {
  getAllBoards() {
    return http.get("/boards")
  }

  getBoard(id) {
    return http.get(`/boards/${id}`)
  }

  createBoard(data) {
    return http.post("/boards", data)
  }

  updateBoard(id, data) {
    return http.put(`/boards/${id}`, data)
  }

  deleteBoard(id) {
    return http.delete(`/boards/${id}`)
  }
}

export default new MongoDataService()