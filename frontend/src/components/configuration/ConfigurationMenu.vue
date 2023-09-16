<template>
  <v-container class="fill-height">
    <v-responsive class="d-flex align-center text-center fill-height">

      <v-row class="d-flex align-center justify-center">
        <v-col cols="auto"> <v-btn color="primary"> Primary </v-btn> </v-col>
        <v-col cols="auto">
          <v-btn color="secondary"> Secondary </v-btn>
        </v-col>
        <v-col cols="auto"> <v-btn color="error"> Error </v-btn> </v-col>
      </v-row>

      <v-row justify="center">
        <v-col cols="12" sm="8" md="10">
          <v-card class="mx-auto">
            <v-toolbar color="dark">
              <v-toolbar-title>Settings</v-toolbar-title>
              <v-spacer></v-spacer>
            </v-toolbar>

            <v-list lines="three" select-strategy="classic">
              <v-list-subheader>General</v-list-subheader>

              <p>UI Theme</p>
              <v-btn-toggle v-model="selectedTheme">
                <v-btn v-for="themeName in myThemes" :key="themeName" :value="themeName" @click="setTheme">
                  {{ themeName }}
                </v-btn>
              </v-btn-toggle>

              <v-list-item value="timezone">
                <v-select :items="locations" label="Timezone"></v-select>
              </v-list-item>

              <v-list-item value="sidebar">
                <template v-slot:prepend="{ isActive }">

                  <v-list-item-action start>
                    <v-checkbox-btn :model-value="isActive"></v-checkbox-btn>
                  </v-list-item-action>
                </template>

                <v-list-item-title>Hide sidebar</v-list-item-title>

                <v-list-item-subtitle>
                  Hide or show items on sidebar menu
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item value="sound">
                <template v-slot:prepend="{ isActive }">
                  <v-list-item-action start>
                    <v-checkbox-btn :model-value="isActive"></v-checkbox-btn>
                  </v-list-item-action>
                </template>

                <v-list-item-title>Sound On</v-list-item-title>

                <v-list-item-subtitle>
                  Turn on/off sound effects in application
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </v-responsive>
  </v-container>
</template>

<script>
import { ref } from "vue";

import { useAppStore } from '@/store/appConfiguration'

export default {
  setup() {
    const userTheme = useAppStore()    
    const myThemes = ["light", "dark", "customLightTheme", "customDarkTheme"]
    const selectedTheme = ref(userTheme.theme)

    const setTheme = () => {
      userTheme.theme = selectedTheme.value
      localStorage.setItem('theme', userTheme.theme)
    };

    return {
      // theme,
      myThemes,
      selectedTheme,
      setTheme,
    }
  },
  data: () => ({
    locations: [
      'GMT-03:00',
      'GMT-02:00',
      'GMT-01:00',
      'GMT+00:00',
      'GMT+01:00',
      'GMT+02:00',
      'GMT+03:00',
    ]
  })
}
</script>