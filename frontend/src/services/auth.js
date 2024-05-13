class Authentication {
  constructor() {
    this.authenticated = false;
    this.tokenRenewalInterval = null; // Guarda a referência do intervalo para renovação do token
    this.initialize();
  }

  initialize() {
    if (this.isAuthenticated()) {
      this.startTokenRenewal();
      console.log('Usuário autenticado, renovação do token iniciada após o refresh.');
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('tomatoesAccessToken');
    const expiration = localStorage.getItem('tomatoesExpiration');
    const currentTime = new Date().getTime();

    this.authenticated = token && expiration && currentTime < parseInt(expiration);

    return this.authenticated;
  }

  login() {
    this.authenticated = true;
    this.startTokenRenewal(); // Inicia a renovação do token
    console.log('Login efetuado, início da renovação do token.');
  }

  logout() {
    localStorage.removeItem('tomatoesAccessToken')
    localStorage.removeItem('tomatoesExpiration')
    localStorage.removeItem('tomatoesUserId')
    localStorage.removeItem('tomatoesUserData')
    localStorage.removeItem('tomatoesDashboard')
    this.stopTokenRenewal(); // Para a renovação do token
    this.authenticated = false;
    console.log('Logout efetuado, renovação do token parada.');
  }

  startTokenRenewal() {
    if (this.tokenRenewalInterval) {
      clearInterval(this.tokenRenewalInterval);
    }

    // Define o intervalo para renovar o token a cada 5 minutos
    this.tokenRenewalInterval = setInterval(() => {
      this.renewToken();
    }, 5 * 60 * 1000);
    console.log('Renovação do token iniciada.');
  }

  stopTokenRenewal() {
    if (this.tokenRenewalInterval) {
      clearInterval(this.tokenRenewalInterval);
      this.tokenRenewalInterval = null;
      console.log('Renovação do token parada.');
    }
  }

  renewToken() {
    // Aqui você adicionaria a lógica para obter um novo token da API
    // Simulando uma chamada de API para renovar o token
    console.log("Renovando token...");

    // Suponha que a nova expiração seja de mais 1 hora
    const newExpiration = new Date().getTime() + (60 * 60 * 1000); // Adiciona 1 hora ao tempo atual
    localStorage.setItem('tomatoesExpiration', newExpiration);

    // Aqui você também atualizaria o 'accessToken' com o novo token recebido
    console.log('Token renovado. Nova expiração: ' + newExpiration);
  }
}

export default new Authentication();