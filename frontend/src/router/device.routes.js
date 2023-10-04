import DeviceComponent from "@/views/DeviceConfiguration.vue"
import OTAComponent from "@/views/device/OTAComponent"
import InfoComponent from "@/views/device/InfoComponent"

export default [
  {
    path: "/device",
    meta: {
      requiresAuth: true,
      category: "Device",
      layout: "ui",
    },
    component: DeviceComponent,
  },
  {
    path: "/device/:id",
    meta: {
      requiresAuth: true,
      category: "Device",
      layout: "default",
    },
    component: OTAComponent,
  },
  {
    path: "/device/:id/info",
    meta: {
      requiresAuth: true,
      category: "Device",
      layout: "default",
    },
    component: InfoComponent,
  }
]