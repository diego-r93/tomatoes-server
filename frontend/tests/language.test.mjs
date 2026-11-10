import test from 'node:test';
import assert from 'node:assert/strict';
import { computed } from 'vue';
import { databaseMessages } from '../src/locales/database.ts';
import { boardConnection } from '../src/composables/boardConnectionUtils.ts';
import { pulseLabel } from '../src/composables/boardScheduleUtils.ts';
import { dashboardMessages } from '../src/locales/dashboard.ts';
import { interfaceMessages } from '../src/locales/interface.ts';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const { useLanguage } = await import('../src/composables/useLanguage.ts');

test('English is the default, language changes update computed labels and preserve identifiers', () => {
  const { language, setLanguage, t } = useLanguage();
  assert.equal(language.value, 'en');
  const label = computed(() => t('Back online, firmware {fw}', { fw: '2365e10' }));
  assert.equal(label.value, 'Back online, firmware 2365e10');
  setLanguage('pt-BR');
  assert.notEqual(label.value, 'Back online, firmware 2365e10');
  assert.ok(label.value.includes('2365e10'));
  assert.equal(values.get('TomatoesLanguage'), 'pt-BR');
  setLanguage('es');
  assert.notEqual(t('Devices'), 'Devices');
  assert.equal(t('esp32s3-07945C'), 'esp32s3-07945C');
  assert.equal(t('ON'), 'ON');
  assert.equal(t('OFF'), 'OFF');
  setLanguage('unsupported');
  assert.equal(language.value, 'es');
  setLanguage('en');
});

test('translation catalogs have matching keys and preserve every interpolation parameter', () => {
  assert.deepEqual(Object.keys(interfaceMessages['pt-BR']).sort(), Object.keys(interfaceMessages.es).sort());
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(item => item[1]).sort();
  for (const catalog of Object.values(interfaceMessages)) {
    for (const [key, value] of Object.entries(catalog)) assert.deepEqual(parameters(value), parameters(key), key);
  }
});

test('storage failure keeps language functional in memory', () => {
  const { setLanguage, language, languageStorageUnavailable, t } = useLanguage();
  const original = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('Storage blocked'); };
  setLanguage('pt-BR');
  assert.equal(language.value, 'pt-BR');
  assert.equal(languageStorageUnavailable.value, true);
  assert.equal(t('GPIO {gpio}', { gpio: 3 }), 'GPIO 3');
  globalThis.localStorage.setItem = original;
  setLanguage('en');
  assert.equal(languageStorageUnavailable.value, false);
});


test('Dashboard translations react immediately and preserve placeholders and canonical query text', () => {
 const {setLanguage,t}=useLanguage();const label=computed(()=>t('Latest sample'));
 for(const language of ['pt-BR','es']) {
  setLanguage(language); assert.notEqual(label.value,'Latest sample');
  assert.equal(t('from(bucket: "tomatoes")'),'from(bucket: "tomatoes")');
  assert.ok(t('Older than {seconds}s',{seconds:120}).includes('120'));
 }
 assert.deepEqual(Object.keys(dashboardMessages['pt-BR']).sort(),Object.keys(dashboardMessages.es).sort());
 const parameters=text=>[...text.matchAll(/\{(\w+)\}/g)].map(item=>item[1]).sort();
 for(const catalog of Object.values(dashboardMessages)) for(const [key,value] of Object.entries(catalog)) assert.deepEqual(parameters(value),parameters(key),key);
 setLanguage('en');assert.equal(label.value,'Latest sample');
});

test('Database labels, connection details and pulse durations follow the chosen language', () => {
  const { language, setLanguage, t } = useLanguage();
  const code = 'esp32s3-07945C#01';
  const heading = computed(() => t('Pump schedules'));
  const connection = computed(() => boardConnection(code, null, 0, t));
  const duration = computed(() => pulseLabel(90000, 'minutes', language.value));

  try {
    setLanguage('en');
    assert.equal(heading.value, 'Pump schedules');
    assert.equal(duration.value, '1.5 min');
    setLanguage('pt-BR');
    assert.equal(heading.value, 'Horários das bombas');
    assert.equal(t('Manage {code}', { code }), 'Gerenciar ' + code);
    assert.equal(connection.value.label, 'Desconhecido');
    assert.match(connection.value.detail, /Aguardando informações da conexão/);
    assert.equal(duration.value, '1,5 min');
    setLanguage('es');
    assert.equal(heading.value, 'Horarios de las bombas');
    assert.equal(t('Manage {code}', { code }), 'Gestionar ' + code);
    assert.equal(connection.value.label, 'Desconocido');
    assert.match(connection.value.detail, /Esperando información de la conexión/);
    assert.equal(duration.value, '1,5 min');
  } finally { setLanguage('en'); }

  assert.deepEqual(Object.keys(databaseMessages['pt-BR']).sort(), Object.keys(databaseMessages.es).sort());
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(item => item[1]).sort();
  for (const catalog of Object.values(databaseMessages)) {
    for (const [key, value] of Object.entries(catalog)) assert.deepEqual(parameters(value), parameters(key), key);
  }
});
