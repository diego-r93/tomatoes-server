import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const CHARTS_FILE_PATH = path.resolve(__dirname, '../config/charts.json');

// Helper function to read charts from JSON file
const readChartsFromFile = (): any[] => {
  if (fs.existsSync(CHARTS_FILE_PATH)) {
    const data = fs.readFileSync(CHARTS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  }
  return [];
};

// Helper function to write charts to JSON file
const writeChartsToFile = (charts: any[]): void => {
  fs.writeFileSync(CHARTS_FILE_PATH, JSON.stringify(charts, null, 2));
};

export const getcharts = async (req: Request, res: Response) => {
    const charts = readChartsFromFile();
    res.json(charts);
};

export const saveCharts = async (req: Request, res: Response) => {
    const chartsJSON = req.body;
    writeChartsToFile(chartsJSON);
    res.json({ message: "Charts saved successfully!" });
};