<template>
  <v-container class="py-6 px-2" fluid>
    <v-col>
      <v-row>
        <v-col cols="12">
          <v-card class="mt-4 mx-auto" color="#121212" max-width="1400" variant="flat">
            <template v-slot:title>
              <v-icon color="#bdbdbd" icon="mdi-cog" size="x-large"></v-icon>
              <span class="ml-4 text-h5" style="color: #bdbdbd">
                Configuration
              </span>
            </template>
          </v-card>
          <v-card class="mt-4 mx-auto custom-border" max-width="1400">
            <p class="pt-6 px-4">Preferences</p>

            <v-list lines="three" select-strategy="classic">
              <v-list-subheader>General</v-list-subheader>

              <div class="px-4">
                <p class="pb-4">UI Theme</p>
                <v-btn-toggle class="pa-1 me-2 text-none rounded-xs custom-border" variant="flat" v-model="selectedTheme">
                  <v-btn v-for="themeName in myThemes" :key="themeName" :value="themeName" @click="setTheme">
                    {{ themeName }}
                  </v-btn>
                </v-btn-toggle>
              </div>

              <v-col class="px-4 pt-10" cols="6">                
                <v-select variant="outlined" density="comfortable" :items="locations" label="Timezone"></v-select>
              </v-col>

              <v-col class="pa-0" cols="6">
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
              </v-col>

              <v-col class="px-0" cols="6">
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
              </v-col>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
      <v-row class="d-flex align-center justify-center">
        <v-col cols="auto">
          <v-btn color="primary">
            Primary
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="secondary">
            Secondary
          </v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="error">
            Error
          </v-btn>
        </v-col>
      </v-row>

    </v-col>
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
      'Default',
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
