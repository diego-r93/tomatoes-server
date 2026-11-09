import type { RouteRecordRaw } from 'vue-router';

export default [{
 path:'/alerting',redirect:'/alerting/rules',meta:{requiresAuth:true,category:'Alerting',layout:'ui'},
 component:()=>import('@/views/AlertingConfiguration.vue'),
 children:[...['rules','contacts','silences','history'].map(path=>({path,component:{render:()=>null}})),{path:'modes',redirect:'/alerting/contacts'},{path:'config',redirect:'/alerting/history'}],
}] satisfies RouteRecordRaw[];
