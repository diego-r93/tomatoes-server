import axios from "axios"

const baseURL = "http://192.168.1.10:3333";

const http = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-type": "application/json"
  }
})

const httpWithAuthorization = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-type": "application/json"
  }
})

// Função para definir o cabeçalho de autorização
export function setAuthorizationHeader(token) {
  httpWithAuthorization.defaults.headers.common['Authorization'] = token
}

export { http, httpWithAuthorization }