<template>
  <div class="trade-board-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Shift Trade Board</h1>
        <p class="page-subtitle">Pick up open shifts or request shift coverage</p>
      </div>
    </section>

    <div class="tab-row">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="tab-button"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="board-grid">
      <v-card
        v-for="trade in filteredTrades"
        :key="trade.id"
        class="trade-card"
        elevation="0"
      >
        <div class="trade-card-top">
          <div class="trade-chip-row">
            <div class="department-pill" :class="trade.departmentTheme">
              <span class="department-dot" />
              {{ trade.department }}
            </div>
            <div class="request-pill" :class="trade.requestType">
              {{ requestTypeLabel(trade.requestType) }}
            </div>
          </div>

          <div class="status-pill" :class="trade.status">
            {{ statusLabel(trade.status) }}
          </div>
        </div>

        <div class="trade-role">{{ trade.position }}</div>

        <div class="trade-meta-list">
          <div class="trade-meta">
            <v-icon size="20" class="trade-meta-icon">mdi-calendar-blank-outline</v-icon>
            <span>{{ trade.dateLabel }}</span>
          </div>
          <div class="trade-meta">
            <v-icon size="20" class="trade-meta-icon">mdi-clock-outline</v-icon>
            <span>{{ trade.timeRange }}</span>
          </div>
          <div class="trade-meta">
            <v-icon size="20" class="trade-meta-icon">mdi-map-marker-outline</v-icon>
            <span>{{ trade.location }}</span>
          </div>
        </div>

        <div v-if="trade.reason" class="trade-reason">
          {{ trade.reason }}
        </div>

        <div class="trade-footer">
          <div class="approval-note">
            {{ approvalCopy(trade.requestType) }}
          </div>

          <v-btn
            v-if="showClaimAction(trade)"
            class="claim-button"
            size="large"
            block
            @click="claimShift(trade.id)"
          >
            Claim This Shift
          </v-btn>
        </div>
      </v-card>
    </div>

    <div v-if="filteredTrades.length === 0" class="empty-state">
      <h2 class="empty-title">No trade requests match your filters</h2>
      <p class="empty-copy">There are no shifts to show right now.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const tabs = [
  { label: "Available Shifts", value: "available" },
  { label: "My Requests", value: "my-requests" },
];

const tradeRequests = ref([
  {
    id: 1,
    department: "The Brew",
    departmentTheme: "brew",
    position: "Barista",
    dateLabel: "Tuesday, Mar 3",
    timeRange: "8:00 AM - 12:00 PM",
    location: "The Brew - Main Campus",
    requestType: "pickup",
    status: "claimed",
    reason: "Morning class conflict, need someone to cover opening shift.",
    owner: "me",
    openForClaim: false,
  },
  {
    id: 2,
    department: "Fitness Center",
    departmentTheme: "fitness",
    position: "Lifeguard",
    dateLabel: "Wednesday, Mar 4",
    timeRange: "2:00 PM - 6:00 PM",
    location: "Gaylord Fitness Center - Pool",
    requestType: "giveaway",
    status: "pending",
    reason: "Pool supervision - certification required",
    owner: "other",
    openForClaim: true,
  },
  {
    id: 3,
    department: "Campus Dining",
    departmentTheme: "dining",
    position: "Cashier",
    dateLabel: "Thursday, Mar 5",
    timeRange: "11:00 AM - 3:00 PM",
    location: "Student Center Dining Hall",
    requestType: "swap",
    status: "approved",
    reason: "Looking to trade for an evening shift this week.",
    owner: "me",
    openForClaim: false,
  },
  {
    id: 4,
    department: "Library",
    departmentTheme: "library",
    position: "Desk Assistant",
    dateLabel: "Friday, Mar 6",
    timeRange: "6:00 PM - 9:00 PM",
    location: "Mabee Library - Front Desk",
    requestType: "pickup",
    status: "pending",
    reason: "Evening help needed for event setup.",
    owner: "other",
    openForClaim: true,
  },
  {
    id: 5,
    department: "Mail Services",
    departmentTheme: "mail",
    position: "Sorting Clerk",
    dateLabel: "Monday, Mar 9",
    timeRange: "9:00 AM - 1:00 PM",
    location: "Mail Center",
    requestType: "giveaway",
    status: "denied",
    reason: "Coverage request denied due to staffing minimums.",
    owner: "me",
    openForClaim: false,
  },
]);

const activeTab = ref("available");

const filteredTrades = computed(() => {
  return tradeRequests.value.filter((trade) => {
    if (activeTab.value === "available" && !trade.openForClaim) {
      return false;
    }

    if (activeTab.value === "my-requests" && trade.owner !== "me") {
      return false;
    }

    return true;
  });
});

const requestTypeLabel = (type) => {
  if (type === "swap") {
    return "Swap";
  }

  if (type === "giveaway") {
    return "Giveaway";
  }

  return "Pickup";
};

const statusLabel = (status) => {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "denied") {
    return "Denied";
  }

  if (status === "claimed") {
    return "Claimed";
  }

  return "Pending";
};

const approvalCopy = (requestType) => {
  if (requestType === "pickup") {
    return "Pickups are auto-approved once claimed.";
  }

  if (requestType === "swap") {
    return "Manager approval required for swaps.";
  }

  return "Giveaway requests are reviewed before final approval.";
};

const showClaimAction = (trade) =>
  activeTab.value !== "my-requests" && trade.openForClaim && trade.status === "pending";

const claimShift = (tradeId) => {
  tradeRequests.value = tradeRequests.value.map((trade) =>
    trade.id === tradeId
      ? {
          ...trade,
          status: trade.requestType === "pickup" ? "approved" : "claimed",
          openForClaim: false,
        }
      : trade
  );
};
</script>

<style scoped>
.trade-board-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f3f4;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  color: #202228;
}

.page-subtitle {
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 24px;
  color: #6f7685;
}

.tab-row {
  display: inline-flex;
  gap: 0;
  padding: 4px;
  border-radius: 16px;
  background: #ececef;
  margin-bottom: 24px;
}

.tab-button {
  min-width: 180px;
  min-height: 56px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #6f7685;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  cursor: pointer;
  transition: 0.2s ease;
}

.tab-button.active {
  background: #ffffff;
  color: #202228;
  box-shadow: 0 1px 4px rgba(25, 30, 38, 0.08);
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 24px;
}

.trade-card {
  border: 1px solid #d4d7dd;
  border-radius: 18px;
  background: #f7f7f8;
  box-shadow: 0 2px 8px rgba(26, 33, 46, 0.08);
  padding: 24px;
}

.trade-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.trade-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.department-pill,
.request-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.department-pill {
  border: 1px solid transparent;
}

.department-pill.brew {
  color: #f27a21;
  background: #fbefe6;
  border-color: #f1b38e;
}

.department-pill.fitness {
  color: #27b957;
  background: #edf9ef;
  border-color: #addfb8;
}

.department-pill.dining {
  color: #6e56cf;
  background: #f1ecff;
  border-color: #cdbef9;
}

.department-pill.library {
  color: #1c7ed6;
  background: #ebf5ff;
  border-color: #b7d7f5;
}

.department-pill.mail {
  color: #9c36b5;
  background: #f7ecfb;
  border-color: #dec0ea;
}

.department-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: currentColor;
}

.request-pill.swap {
  color: #9a3412;
  background: #fff3e8;
}

.request-pill.giveaway {
  color: #7c3aed;
  background: #f3edff;
}

.request-pill.pickup {
  color: #0f766e;
  background: #eafaf8;
}

.status-pill.pending {
  color: #d18a00;
  background: #fff4d6;
}

.status-pill.approved {
  color: #1f9d49;
  background: #e8f8ed;
}

.status-pill.denied {
  color: #d64545;
  background: #fdecec;
}

.status-pill.claimed {
  color: #1f6fd6;
  background: #ebf3ff;
}

.trade-role {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  color: #202228;
}

.trade-meta-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.trade-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  line-height: 24px;
  color: #6f7685;
}

.trade-meta-icon {
  color: #717887;
}

.trade-reason {
  margin-top: 20px;
  padding: 16px;
  border-radius: 12px;
  background: #f0f1f4;
  font-size: 14px;
  line-height: 20px;
  color: #6f7685;
}

.trade-footer {
  margin-top: 24px;
}

.approval-note {
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #6f7685;
}

.claim-button {
  min-height: 48px;
  border-radius: 12px;
  background: #98002e;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  text-transform: none;
}

.empty-state {
  padding: 40px 24px;
  text-align: center;
}

.empty-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  color: #202228;
}

.empty-copy {
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 24px;
  color: #6f7685;
}

.post-dialog {
  border-radius: 20px;
  padding: 24px;
}

.dialog-header {
  margin-bottom: 24px;
}

.dialog-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
  color: #202228;
}

.dialog-copy {
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 24px;
  color: #6f7685;
}

.dialog-body {
  display: grid;
  gap: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
  }

  .filters-card {
    grid-template-columns: 1fr;
  }

  .search-group {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .trade-board-page {
    padding: 24px 16px;
  }

  .tab-row {
    display: grid;
    width: 100%;
  }

  .tab-button {
    min-width: 0;
  }

  .trade-card {
    padding: 20px;
  }

  .trade-card-top {
    flex-direction: column;
  }
}
</style>
