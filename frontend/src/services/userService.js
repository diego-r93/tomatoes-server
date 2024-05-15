import { http, httpWithAuthorization, setAuthorizationHeader } from "./http-common"

class UserService {
  // Buscar todos os usuários
  getAll() {
    return http.get("/api/users")
  }

  // Buscar um usuário específico pelo ID
  get(id, token) {
    setAuthorizationHeader(token)
    return httpWithAuthorization.get(`/api/users/${id}`)
  }

  // Criar um novo usuário
  create(data) {
    return http.post("/api/users", data)
  }

  // Login de usuário
  login(data) {
    return http.post("/api/users/login", data)
  }

  // Atualizar as informações de um usuário específico
  update(id, data, token) {
    setAuthorizationHeader(token);
    return httpWithAuthorization.put(`/api/users/${id}`, data);
  }

  // Atualizar a senha do usuário
  updatePassword(data, token) {
    setAuthorizationHeader(token);
    return httpWithAuthorization.put("/api/users/update-password", data);
  }

  // Deletar um usuário específico
  delete(id, token) {
    setAuthorizationHeader(token);
    return httpWithAuthorization.delete(`/api/users/${id}`);
  }
}

export default new UserService()