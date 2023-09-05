### Guia de Instalação e Configuração do Mosquitto no Raspberry Pi

#### Pré-requisitos

- Raspberry Pi rodando uma versão atual do Raspberry Pi OS.
- Acesso SSH ou terminal ao Raspberry Pi.

#### Passos

1. **Atualização e Upgrade**:

   Primeiro, atualize os repositórios e pacotes existentes:

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Instalação do Mosquitto**:

   Instale o broker MQTT Mosquitto e os utilitários cliente:

   ```bash
   sudo apt install -y mosquitto mosquitto-clients
   ```

3. **Configuração Básica de Segurança**:

   Para aumentar a segurança, vamos configurar o Mosquitto para exigir um nome de usuário e senha.

   - **Criar um usuário**:
     
     ```bash
     sudo mosquitto_passwd -c /etc/mosquitto/passwd nome_do_usuario
     ```

     Substitua `nome_do_usuario` pelo nome de usuário desejado e defina a senha quando solicitado.

   - **Configurar Mosquitto para usar autenticação**:

     Crie ou edite um arquivo de configuração personalizado:

     ```bash
     sudo nano /etc/mosquitto/conf.d/auth.conf
     ```

     Adicione as seguintes linhas:

     ```conf
     allow_anonymous false
     password_file /etc/mosquitto/passwd
     listener 1887
     ```

     Salve e feche o arquivo (Ctrl + O, Enter, Ctrl + X).

4. **Permissões de Arquivo**:

   Ajuste as permissões para garantir que o Mosquitto possa acessar o arquivo de senha:

   ```bash
   sudo chown mosquitto: /etc/mosquitto/passwd
   ```

5. **Reiniciar o Mosquitto**:

   Após fazer as configurações, reinicie o Mosquitto:

   ```bash
   sudo systemctl restart mosquitto
   ```

6. **Ativar o Mosquitto na Inicialização**:

   Para que o Mosquitto inicie automaticamente com o Raspberry Pi:

   ```bash
   sudo systemctl enable mosquitto
   ```

7. **Testar a Conexão**:

   Agora, teste a conexão localmente no Raspberry Pi:

   ```bash
   mosquitto_pub -h localhost -p 1887 -t test -m "hello" -u "nome_do_usuario" -P "sua_senha"
   mosquitto_sub -h localhost -p 1887 -t test -u "nome_do_usuario" -P "sua_senha"
   ```

   Lembre-se de substituir `nome_do_usuario` e `sua_senha` pelos valores que você configurou anteriormente.