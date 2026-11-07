// Run from backend after loading the same environment as the backend service.
const path = require('node:path');
require('dotenv').config({path: path.resolve(__dirname, '../../.env')});
require('tsx/cjs/api').register({tsconfig: path.resolve(__dirname, '../tsconfig.json')});
const mongoose = require('mongoose');
const {migrateCharts} = require('../src/database/dashboard/migrate');
(async()=>{
 if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required.');
 await mongoose.connect(process.env.MONGODB_URI);
 try{console.log(await migrateCharts(path.resolve(__dirname,'../src/database/dashboard/config/charts.json')));}
 finally{await mongoose.disconnect();}
})().catch(error=>{console.error('Dashboard migration failed:',error.name);process.exitCode=1;});
