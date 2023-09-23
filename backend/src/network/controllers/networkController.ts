import { Request, Response } from 'express';
import { Network } from '../models/networkModel';
import { CONFIG_PATHS } from '../config/networkConfig';
import { exec } from 'child_process';

export const getConfig = async (req: Request, res: Response) => {
  const type = req.params.type;

  if (type in CONFIG_PATHS) {
    const network = new Network(type as keyof typeof CONFIG_PATHS);

    try {
      const data = await network.getConfig();
      return res.send({ data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      return res.status(500).send({ error: errorMessage });
    }
  } else {
    return res.status(400).send({ error: 'Config type not found' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  const type = req.params.type;
  const data = req.body.data;

  if (type in CONFIG_PATHS) {
    const network = new Network(type as keyof typeof CONFIG_PATHS);

    try {
      await network.updateConfig(data);
      return res.send({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      return res.status(500).send({ error: errorMessage });
    }
  } else {
    return res.status(400).send({ error: 'Config type not found' });
  }
};

export const getDevices = async (req: Request, res: Response) => {
  exec("arp -a | grep wlan1", (error, stdout, stderr) => {
      if (error) {
          return res.status(500).send({ error: "Failed to execute arp command" });
      }

      const devices = stdout.split('\n').filter(line => line.trim() !== ''); // Filtra linhas vazias
      return res.send({ devices });
  });
};
