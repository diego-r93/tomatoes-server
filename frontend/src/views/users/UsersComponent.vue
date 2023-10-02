<template>
  <v-container class="py-16 px-16" fluid>
    <v-table>
      <thead>
        <tr>
          <th class="text-left">
            Login
          </th>
          <th class="text-left">
            Email
          </th>
          <th class="text-left">
            Name
          </th>
          <th class="text-left">
            Profile
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in desserts" :key="item.name">
          <td>{{ item.login }}</td>
          <td>{{ item.email }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.profile }}</td>
        </tr>
      </tbody>
    </v-table>    
  </v-container>
</template>

<script setup>

const desserts = [
  {
    login: 'diego',
    email: 'diego@teste',
    profile: 'admin',
  },
]
</script>