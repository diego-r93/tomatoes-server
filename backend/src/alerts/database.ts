import { access, run } from '../users/database';
export const alertsReady = access(async () => {
 const definitions = [
 `CREATE TABLE IF NOT EXISTS alert_rules (id INTEGER PRIMARY KEY,name TEXT NOT NULL,config TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'No data',since INTEGER,latched INTEGER NOT NULL DEFAULT 0,incident_open INTEGER NOT NULL DEFAULT 0,value REAL,sample_at INTEGER,evaluated_at INTEGER,reason TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,next_at INTEGER NOT NULL DEFAULT 0,last_notified_at INTEGER,created_at INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS alert_contacts (id INTEGER PRIMARY KEY,config TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS alert_silences (id INTEGER PRIMARY KEY,rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,reason TEXT NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,actor TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS alert_history (id INTEGER PRIMARY KEY,rule_id INTEGER,name TEXT NOT NULL,kind TEXT NOT NULL,description TEXT NOT NULL,created_at INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS alert_devices (host TEXT PRIMARY KEY,payload TEXT NOT NULL,received_at INTEGER NOT NULL,outputs TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS alert_outbox (id INTEGER PRIMARY KEY,rule_id INTEGER REFERENCES alert_rules(id) ON DELETE CASCADE,revision INTEGER,contact_id INTEGER NOT NULL REFERENCES alert_contacts(id) ON DELETE CASCADE,recipient TEXT NOT NULL,phase TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,created_at INTEGER NOT NULL,reason TEXT NOT NULL DEFAULT '',provider_id TEXT)`,
 `CREATE INDEX IF NOT EXISTS alert_outbox_due ON alert_outbox(status,next_at)`,
 `CREATE INDEX IF NOT EXISTS alert_history_time ON alert_history(created_at)`
 ];
 for (const definition of definitions) await run(definition);
 await migrateTelegramContacts();
 // A process restart breaks proof of a continuous breach or continuous GPIO ON.
 await run("UPDATE alert_rules SET since=NULL,next_at=0 WHERE state='Pending'");
 await run("UPDATE alert_outbox SET status='pending',reason='Worker restarted before provider acceptance was recorded.' WHERE status='sending'");
},true);

export async function migrateTelegramContacts() {
 // Preserve rule references. Phone numbers cannot be reused as Telegram chat IDs.
 await run("UPDATE alert_outbox SET status='cancelled',reason='WhatsApp contact replaced by Telegram.' WHERE status IN ('pending','sending') AND contact_id IN (SELECT id FROM alert_contacts WHERE json_extract(config,'$.kind')='whatsapp')");
 await run("UPDATE alert_contacts SET config=json_remove(json_set(config,'$.kind','telegram','$.enabled',json('false'),'$.consent',json('false'),'$.recipients',json('[]')),'$.template','$.language') WHERE json_extract(config,'$.kind')='whatsapp'");
}
