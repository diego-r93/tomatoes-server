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
sudo apt update
```
To install the latest version, run:
```bash
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Para mais informações consulte: 
[Docker Docs](https://docs.docker.com/engine/install/debian/)

### 2. Instalando o Docker-Compose

```bash
sudo apt update
sudo apt install docker-compose
docker-compose --version
```

#### Configuração
##### 1. Instalando o Git
```bash
sudo apt update
sudo apt install git
```
##### 2. Clonando o repositório

```bash
git clone git@github.com:diego-r93/tomatoes-server.git
cd tomatoes-server
```
Lembre-se de substituir URL_DO_REPOSITÓRIO_DO_GITHUB pelo URL do seu repositório e NOME_DO_REPOSITÓRIO pelo nome do diretório do projeto clonado.

##### 3. Configurando o projeto

Antes da primeira inicialização, crie sua configuração local a partir do exemplo:

```bash
cp .env_example .env
chmod 600 .env
```

Execute a cópia somente em uma instalação nova, sem um `.env` existente. Edite o `.env` e substitua **todos** os valores `CHANGE_ME` antes de iniciar os serviços. Use credenciais únicas por instalação. Para gerar cada senha, segredo JWT ou token, execute `openssl rand -hex 32` separadamente. Uma senha hexadecimal evita problemas de codificação na URI do MongoDB.

O Compose expande as referências `${VARIAVEL}` do exemplo. Mantenha os aliases `MONGO_INITDB_ROOT_USERNAME` e `MONGO_INITDB_ROOT_PASSWORD` alinhados com `MONGO_ROOT_USERNAME` e `MONGO_ROOT_PASSWORD`. O backend atual utiliza a conta root do MongoDB; não há script de criação automática de um usuário de aplicação.

Os nomes `mongo`, `mosquitto` e `influxdb` são endereços internos do Compose. Mantenha `BACKEND_PORT=3333` alinhado com o Nginx e `DOCKER_INFLUXDB_INIT_PORT=8086` alinhado com o Telegraf. Confira também o endereço MQTT em `telegraf/telegraf.conf`: ele ainda é configurado separadamente e não utiliza `MQTT_HOST_NAME`.

A retenção inicial do bucket é de **180 dias**, definida por `DOCKER_INFLUXDB_INIT_RETENTION=4320h`. Alterar essa variável não atualiza um bucket existente; nesse caso, aplique a retenção pela API ou CLI do InfluxDB.

O `.env` está ignorado pelo Git. Versione somente `.env_example`, sem credenciais reais.

##### 4. Executando o projeto

*Com o Docker e o Docker-Compose instalados e o projeto clonado e configurado, você pode iniciar o projeto com:*

```bash
sudo docker-compose up
```
ou
```bash
sudo docker-compose up -d
```

##### 5. Interromper o projeto

Para interromper um projeto em execução digite:

```bash
sudo docker-compose down
```

## Comandos Principais do Docker-Compose

- **Iniciar o projeto:** 

  ```bash
  sudo docker-compose up
  ```
- **Iniciar o projeto em background:** 

  ```bash 
  sudo docker-compose up -d
  ```
- **Parar o projeto:** 

  ```bash
  sudo docker-compose down
  ```
- **Visualizar logs:** 

  ```bash
  sudo docker container logs
  ``` 
  *para seguir os logs em tempo real.*

  ```bash
  sudo docker container logs -f  ``` 
  

- **Executar um serviço específico:** 

  ```bash
  sudo docker-compose run NOME_DO_SERVIÇO COMANDO
  ```

- **Abrir o terminal em um serviço específico:**

  ```bash
  sudo docker-compose exec NOME_DO_SERVIÇO bash
  ```
## User management

See [Users, groups and invitations](docs/user-management.md) for account migration, sessions, email setup and the current authorization scope.

### Alerting

See [Alerting setup and rule behavior](docs/alerting.md) for background monitoring, sources, contact points and optional WhatsApp Cloud API configuration.


## Automatic startup after a reboot

After configuring .env and creating the containers with docker compose up -d, install the host startup service once.

```sh
sudo sh scripts/install-autostart.sh
```

The service reads the published host addresses from the resolved Compose configuration, waits until those addresses can be bound, and starts the existing containers. This retries startup after Docker encounters an address that is unavailable early in boot. It uses the addresses configured through .env and does not rebuild or recreate containers.

Check its state with sudo systemctl status tomatoes-compose.service and its log with sudo journalctl -u tomatoes-compose.service -b. Run docker compose up -d when creating an installation or applying Compose changes.
