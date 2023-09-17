import LanComponent from "@/views/network/LanComponent"
import DNSComponent from "@/views/network/DNSComponent"
import WPAComponent from "@/views/network/WPAComponent"
import DHCPComponent from "@/views/network/DHCPComponent"

export default [
  {
    path: "/network",
    redirect: '/network/lan',
    meta: {
      requiresAuth: true,
      category: "Network",
      layout: "ui",
    }, 
    children: [
      {
        path: "lan",
        component: LanComponent
      },
      {
        path: "dns",
        component: DNSComponent
      },
      {
        path: "wpa",
        component: WPAComponent
      },
      {
        path: "dhcp",
        component: DHCPComponent
      },
    ],   
    component: () => import("@/views/NetworkConfiguration.vue"),
  },  
]