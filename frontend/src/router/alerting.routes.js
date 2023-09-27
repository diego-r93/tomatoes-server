import RulesComponent from "@/views/alerting/RulesComponent"
import ModesComponent from "@/views/alerting/ModesComponent"
import SilencesComponent from "@/views/alerting/SilencesComponent"
import ConfigurationComponent from "@/views/alerting/ConfigurationComponent"

export default [
  {
    path: "/alerting",
    redirect: '/alerting/rules',
    meta: {
      requiresAuth: true,
      category: "Alerting",
      layout: "ui",
    }, 
    children: [
      {
        path: "rules",
        component: RulesComponent
      },
      {
        path: "modes",
        component: ModesComponent
      },
      {
        path: "silences",
        component: SilencesComponent
      },
      {
        path: "config",
        component: ConfigurationComponent
      },
    ],   
    component: () => import("@/views/AlertingConfiguration"),
  },  
]