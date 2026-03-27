<template>
  <div class="tasks-page">
    <v-card class="tasks-card" elevation="0">
      <div class="tasks-header">
        <div>
          <h1 class="tasks-title">My Tasks</h1>
          <p class="tasks-description">
            This screen is ready for student task assignments and follow-up actions.
          </p>
        </div>
      </div>

      <div class="empty-state">
        <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
        <h2>No Tasks Yet</h2>
        <p>Your assigned tasks will show up here once they are available.</p>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.tasks-page {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.tasks-card {
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: white;
  padding: 24px;
}

.tasks-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.tasks-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.tasks-description {
  margin: 8px 0 0;
  font-size: 15px;
  color: #666;
  line-height: 1.5;
}

.empty-state {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
}

.empty-state h2 {
  margin: 16px 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .tasks-page {
    padding: 16px;
  }

  .tasks-card {
    padding: 20px;
  }

  .tasks-title {
    font-size: 24px;
  }
}
</style>
