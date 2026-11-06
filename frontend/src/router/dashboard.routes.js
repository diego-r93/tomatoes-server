import Dashboard from '@/views/DashBoard.vue';
export default [
 {path:'/dashboard',component:Dashboard,meta:{requiresAuth:true,layout:'ui'}},
 {path:'/dashboard/viewPanel/:id',redirect:to=>({path:'/dashboard/existing-charts',query:{panel:to.params.id}})},
 {path:'/dashboard/editPanel/:id',redirect:to=>({path:'/dashboard/existing-charts',query:{edit:to.params.id}})},
 {path:'/dashboard/:dashboardId',component:Dashboard,meta:{requiresAuth:true,layout:'ui'}},
];
