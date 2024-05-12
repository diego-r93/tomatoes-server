class Authentication {
  constructor() {
    this.authenticated = false;
    this.tokenRenewalInterval = null; // Guarda a referência do intervalo para renovação do token
  }

  isAuthenticated() {
    const token = localStorage.getItem('TomatoesAccessToken');
    const expiration = localStorage.getItem('TomatoesExpiration');
    const currentTime = new Date().getTime();

    this.authenticated = token && expiration && currentTime < parseInt(expiration);

    return this.authenticated;
  }

  login() {
    this.authenticated = true;
    this.startTokenRenewal(); // Inicia a renovação do token
  }

  logout() {
    localStorage.removeItem('TomatoesAccessToken')
    localStorage.removeItem('TomatoesExpiration')
    localStorage.removeItem('userId')
    localStorage.removeItem('userData')
    this.stopTokenRenewal(); // Para a renovação do token
    this.authenticated = false;
  }

  startTokenRenewal() {
    // Define o intervalo para renovar o token a cada 5 minutos, por exemplo
    this.tokenRenewalInterval = setInterval(() => {
      this.renewToken();
    }, 5 * 60 * 1000);
  }

  stopTokenRenewal() {
    if (this.tokenRenewalInterval) {
      clearInterval(this.tokenRenewalInterval);
      this.tokenRenewalInterval = null;
    }
  }

  renewToken() {
    // Aqui você adicionaria a lógica para obter um novo token da API
    // Simulando uma chamada de API para renovar o token
    console.log("Renovando token...");

    // Suponha que a nova expiração seja de mais 1 hora
    const newExpiration = new Date().getTime() + (60 * 60 * 1000); // Adiciona 1 hora ao tempo atual
    localStorage.setItem('expiration', newExpiration);

    // Aqui você também atualizaria o 'accessToken' com o novo token recebido
  }
}

export default new Authentication();