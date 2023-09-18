# Comandos de Rede para Raspberry Pi

Raspberry Pi utiliza principalmente o sistema operacional Raspberry Pi OS (baseado no Debian), então muitos dos comandos que funcionam para Debian/Ubuntu também funcionarão para Raspbian. Aqui estão alguns dos comandos de rede mais comuns:

## Visualizando Configurações de Rede

### ifconfig
Para visualizar informações sobre interfaces de rede:
```bash
ifconfig
```
Se você não tiver o ifconfig, pode ser necessário instalá-lo ou usar o comando:
```bash
ip a
```
## Testando a Conexão de Rede

### ping
Para testar a conectividade com um endereço IP ou domínio:
```bash
  ping exemplo.com
```

## Gerenciando Serviços de Rede
### wpa_supplicant
Para iniciar o wpa_supplicant manualmente:
```bash
  sudo wpa_supplicant -Dwext -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf
```

### dhclient
Se você precisar renovar um endereço DHCP:
```bash
  sudo dhclient -r
  sudo dhclient
```

### Restartando serviços
#### Para reiniciar o serviço DHCP:
```bash
  sudo service dhcpcd restart
```

#### Para reiniciar o wpa_supplicant:
```bash
  sudo systemctl restart wpa_supplicant
```

## Outros comandos úteis
### netstat
Para visualizar as conexões de rede:
```bash
  netstat -tuln
```

### traceroute
Para rastrear a rota de pacotes para um domínio ou IP:
```bash
  traceroute exemplo.com
```