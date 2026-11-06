import { Express, Router } from 'express';
import { authenticate, context, endpoint, requireAdmin, userError } from '../users/http';
import * as store from '../alerts/store';
import { alertSettings } from '../alerts/engine';
import { knownDevices } from '../alerts/sources';
import { integer } from '../alerts/types';
export default function setupAlerts(app:Express) {
 const router=Router();router.use(authenticate);
 const id=(value:unknown)=>integer(value,1,Number.MAX_SAFE_INTEGER,'ID');
 const actor=(res:Parameters<typeof context>[0])=>context(res).user.username;
 router.get('/rules',endpoint(async(_req,res)=>{res.json(await store.listRules());}));
 router.get('/settings',endpoint(async(_req,res)=>{res.json({...alertSettings(),canManage:Boolean(context(res).user.is_admin),devices:await knownDevices()});}));
 router.get('/silences',endpoint(async(_req,res)=>{res.json(await store.listSilences());}));
 router.get('/history',endpoint(async(req,res)=>{res.json(await store.getHistory(integer(req.query.offset??0,0,1000000,'offset')));}));
 router.use(requireAdmin);
 router.get('/contacts',endpoint(async(_req,res)=>{res.json(await store.listContacts());}));
 router.get('/deliveries',endpoint(async(_req,res)=>{res.json(await store.getDeliveries());}));
 router.post('/rules',endpoint(async(req,res)=>{res.status(201).json(await store.saveRule(null,req.body,actor(res)));}));
 router.put('/rules/:id',endpoint(async(req,res)=>{res.json(await store.saveRule(id(req.params.id),req.body,actor(res)));}));
 router.patch('/rules/:id',endpoint(async(req,res)=>{res.json(await store.enableRule(id(req.params.id),req.body.enabled,actor(res)));}));
 router.delete('/rules/:id',endpoint(async(req,res)=>{await store.removeRule(id(req.params.id),actor(res));res.sendStatus(204);}));
 router.post('/contacts',endpoint(async(req,res)=>{res.status(201).json(await store.saveContact(null,req.body,actor(res)));}));
 router.put('/contacts/:id',endpoint(async(req,res)=>{res.json(await store.saveContact(id(req.params.id),req.body,actor(res)));}));
 router.delete('/contacts/:id',endpoint(async(req,res)=>{await store.removeContact(id(req.params.id),actor(res));res.sendStatus(204);}));
 router.post('/silences',endpoint(async(req,res)=>{await store.createSilence(req.body,actor(res));res.sendStatus(201);}));
 router.delete('/silences/:id',endpoint(async(req,res)=>{await store.endSilence(id(req.params.id),actor(res));res.sendStatus(204);}));
 app.use('/api/alerts',router,userError);
}
