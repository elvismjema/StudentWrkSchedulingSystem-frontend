<template>
  <div class="manager-dashboard">
    <div class="dashboard-top">
      <div>
        <h1 class="dashboard-title">Dashboard</h1>
        <p class="dashboard-date">{{ todayLabel }}</p>
      </div>

      <div class="dashboard-actions">
        <v-btn class="create-shift-btn" size="x-large" prepend-icon="mdi-plus">
          Create Shift
        </v-btn>
        <v-btn class="export-btn" size="x-large" prepend-icon="mdi-file-document-outline" variant="outlined">
          Export Schedule
        </v-btn>
      </div>
    </div>

    <div class="stats-grid">
      <v-card class="stat-card" elevation="0">
        <div class="stat-icon stat-green">
          <v-icon size="30">mdi-account-group-outline</v-icon>
        </div>
        <div>
          <div class="stat-count">0</div>
          <div class="stat-label">Working Now</div>
        </div>
      </v-card>

      <v-card class="stat-card" elevation="0">
        <div class="stat-icon stat-blue">
          <v-icon size="30">mdi-clock-outline</v-icon>
        </div>
        <div>
          <div class="stat-count">0</div>
          <div class="stat-label">Shifts Today</div>
        </div>
      </v-card>

      <v-card class="stat-card" elevation="0">
        <div class="stat-icon stat-gold">
          <v-icon size="30">mdi-calendar-alert-outline</v-icon>
        </div>
        <div>
          <div class="stat-count">2</div>
          <div class="stat-label">Unfilled Shifts</div>
        </div>
      </v-card>

      <v-card class="stat-card" elevation="0">
        <div class="stat-icon stat-red">
          <v-icon size="30">mdi-alert-outline</v-icon>
        </div>
        <div>
          <div class="stat-count">2</div>
          <div class="stat-label">Alerts</div>
        </div>
      </v-card>
    </div>

    <v-card class="panel-card" elevation="0">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Who's Working Now</h2>
          <p class="panel-subtitle">Currently clocked-in workers</p>
        </div>
        <span class="panel-dot" />
      </div>
      <div class="panel-empty">No one is currently working</div>
    </v-card>

    <v-card class="panel-card" elevation="0">
      <div class="panel-header panel-header-tight">
        <div>
          <h2 class="panel-title">Alerts</h2>
          <p class="panel-subtitle">Issues needing attention</p>
        </div>
      </div>

      <v-alert variant="tonal" color="error" class="alert-item">
        <template #prepend>
          <v-icon>mdi-clock-alert-outline</v-icon>
        </template>
        <div class="alert-text">
          <div class="alert-main">Michael Chen is 8 minutes late for their shift</div>
          <div class="alert-time">10 min ago</div>
        </div>
      </v-alert>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from "vue";

const todayLabel = computed(() =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  })
);
</script>

<style scoped>
.manager-dashboard {
  padding: 28px 36px 36px;
  background: #f4f5f7;
  min-height: calc(100vh - 76px);
}

.dashboard-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  flex-wrap: wrap;
}

.dashboard-title {
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
  color: #1f2328;
  margin: 0;
}

.dashboard-date {
  margin: 10px 0 0;
  font-size: 26px;
  line-height: 1.1;
  color: #667085;
}

.dashboard-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.create-shift-btn {
  background: #930033;
  color: #fff;
  font-size: 16px;
  text-transform: none;
  font-weight: 600;
  padding: 0 20px;
  border-radius: 12px;
}

.export-btn {
  text-transform: none;
  font-size: 16px;
  font-weight: 500;
  border-color: #d3d5d8;
  color: #24292f;
  border-radius: 12px;
}

.stats-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 18px;
}

.stat-card {
  border: 1px solid #d8dade;
  border-radius: 14px;
  background: #fff;
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.stat-green {
  background: #e8f8ef;
  color: #17a85d;
}

.stat-blue {
  background: #e8f0ff;
  color: #2d6ceb;
}

.stat-gold {
  background: #fff4de;
  color: #e19412;
}

.stat-red {
  background: #fdeceb;
  color: #e23c3c;
}

.stat-count {
  color: #1f2328;
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  margin-top: 6px;
  color: #586173;
  font-size: 16px;
  line-height: 1.1;
}

.panel-card {
  margin-top: 18px;
  border: 1px solid #d8dade;
  border-radius: 14px;
  background: #fff;
  padding: 28px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.panel-header-tight {
  margin-bottom: 16px;
}

.panel-title {
  margin: 0;
  color: #1f2328;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.panel-subtitle {
  margin: 12px 0 0;
  color: #667085;
  font-size: 16px;
  line-height: 1.1;
}

.panel-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #79cf96;
}

.panel-empty {
  margin: 88px 0 70px;
  text-align: center;
  color: #6b7280;
  font-size: 20px;
}

.alert-item {
  border: 1px solid #f4b2b2;
  border-radius: 14px;
  background: #fff8f8;
}

.alert-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-main {
  color: #24292f;
  font-size: 18px;
  line-height: 1.1;
}

.alert-time {
  color: #667085;
  font-size: 14px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(170px, 1fr));
  }
}

@media (max-width: 960px) {
  .manager-dashboard {
    padding: 18px;
  }

  .dashboard-title {
    font-size: 36px;
  }

  .dashboard-date {
    font-size: 24px;
  }

  .stat-count {
    font-size: 32px;
  }

  .stat-label {
    font-size: 16px;
  }

  .panel-title {
    font-size: 22px;
  }

  .panel-subtitle {
    font-size: 16px;
  }

  .panel-empty {
    font-size: 20px;
    margin: 48px 0;
  }

  .alert-main {
    font-size: 18px;
  }

  .alert-time {
    font-size: 14px;
  }
}

@media (max-width: 700px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
