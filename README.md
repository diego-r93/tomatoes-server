# Projeto Tomatoes - Server para Raspberry Pi

Este README descreve como configurar e executar um projeto no Raspberry Pi usando Docker-Compose. Siga as instruções abaixo para configurar e utilizar o projeto.

## Pré-requisitos

- Raspberry Pi com sistema operacional baseado em Linux (ex: Raspbian, Raspberry Pi OS).
- Acesso à internet.
- Conhecimento básico de terminal Linux.

## Instalação

### 1. Instalando o Docker

```bash
# Add Docker's official GPG key:
sudo apt update
sudo apt install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null 
```
To install the latest version, run:
```
sudo apt update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Para mais informações consulte: 
[Docker Docs](https://docs.docker.com/engine/install/debian/)

### 2. Instalando o Docker-Compose

```bash
sudo apt update
sudo apt install docker-compose-plugin
docker-compose --version
```

#### Configuração
##### 1. Clonando o repositório

```bash
git clone git@github.com:diego-r93/tomatoes-server.git
cd tomatoes-server
```
Lembre-se de substituir URL_DO_REPOSITÓRIO_DO_GITHUB pelo URL do seu repositório e NOME_DO_REPOSITÓRIO pelo nome do diretório do projeto clonado.

##### 2. Configurando o projeto

Certifique-se de verificar qualquer arquivo de configuração específico ou variáveis de ambiente que precisem ser ajustadas antes de prosseguir.

##### 3. Executando o projeto

Com o Docker e o Docker-Compose instalados e o projeto clonado e configurado, você pode iniciar o projeto com:

```bash
sudo docker-compose up
```
ou
```bash
sudo docker-compose up -d
```

##### 4. Interromper o projeto

Para interromper um projeto em execução digite:

```bash
sudo docker-compose down
```

## Comandos Principais do Docker-Compose

Iniciar o projeto: ``docker-compose up``
Iniciar o projeto em background: ``docker-compose up -d``
Parar o projeto: ``docker-compose down``
Visualizar logs: ``docker container logs`` ou ``docker container logs -f`` para seguir os logs em tempo real.
Executar um serviço específico: ``docker-compose run NOME_DO_SERVIÇO COMANDO``