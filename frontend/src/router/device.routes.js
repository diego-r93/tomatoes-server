import DeviceComponent from "@/views/DeviceConfiguration.vue"
import OTAComponent from "@/views/device/OTAComponent"

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
  }
]