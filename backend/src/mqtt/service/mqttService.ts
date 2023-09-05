import * as mqtt from "mqtt";
import { IClientOptions, MqttClient } from "mqtt";

type MessageCallbackType = (topic: string, message: Buffer) => void;

class MQTTService {
  private mqttClient: MqttClient | null = null;
  private readonly host: string;
  private readonly username: string;
  private readonly password: string;
  private messageCallback: MessageCallbackType | null;
  private subscriptions: string[] = [];

  constructor(host: string, username: string, password: string, messageCallback: MessageCallbackType) {
    this.host = host;
    this.username = username;
    this.password = password;
    this.messageCallback = messageCallback;
  }

  setMessageCallback(callback: (topic: string, message: Buffer) => void): void {
    this.messageCallback = callback;
  }

  connect(): void {
    const options: IClientOptions = {
      username: this.username,
      password: this.password
    };

    this.mqttClient = mqtt.connect(this.host, options);

    this.mqttClient.on("error", (err: Error) => {
      console.log(err);
      this.mqttClient!.end();
    });

    this.mqttClient.on("connect", () => {
      console.log(`MQTT client connected`);
    });

    this.mqttClient.on("message", (topic: string, message: Buffer) => {
      if (this.messageCallback) this.messageCallback(topic, message);
      else console.log(message.toString());
    });

    this.mqttClient.on("close", () => {
      console.log(`MQTT client disconnected`);
    });
  }

  publish(topic: string, message: string, options?: IClientOptions): void {
    this.mqttClient!.publish(topic, message, options);
  }

  subscribe(topic: string, options?: IClientOptions): void {
    this.mqttClient!.subscribe(topic, options);
    this.subscriptions.push(topic);
  }

  unsubscribe(topic: string): void {
    this.mqttClient!.unsubscribe(topic);
    this.subscriptions = this.subscriptions.filter((t) => t !== topic);
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((topic) => {
      this.mqttClient!.unsubscribe(topic);
    });
    this.subscriptions = [];
  }
}

export default MQTTService;
