import DashBoard from "@/views/DashBoard"
import ChartViewComponent from "@/views/dashboard/ChartViewComponent"
import ChartEditComponent from "@/views/dashboard/ChartEditComponent"

export default [
  {
    path: "/dashboard",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: DashBoard,
  },
  {
    path: "/dashboard/viewPanel/:id",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: ChartViewComponent,
  },
  {
    path: "/dashboard/editPanel/:id",
    meta: {
      requiresAuth: true,
      layout: "default",
    },
    component: ChartEditComponent,
  },
]