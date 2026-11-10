import type { RouteRecordRaw } from 'vue-router';

import Dashboard from '@/views/DashBoard.vue';
export default [
 {path:'/dashboard',component:Dashboard,meta:{requiresAuth:true,layout:'ui'}},
 {path:'/dashboard/viewPanel/:id',redirect:to=>({path:'/dashboard/existing-charts',query:{panel:to.params.id}})},
 {path:'/dashboard/editPanel/:id',redirect:to=>({path:'/dashboard/existing-charts',query:{edit:to.params.id}})},
 {path:'/dashboard/:dashboardId/:panelEditor(panel)?/:panelId?',name:'dashboard-workspace',beforeEnter:to=>!to.params.panelEditor && to.params.panelId ? {name:'dashboard-workspace',params:{dashboardId:to.params.dashboardId}} : true,component:Dashboard,meta:{requiresAuth:true,layout:'ui'}},
] satisfies RouteRecordRaw[];
