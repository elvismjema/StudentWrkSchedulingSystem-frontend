<template>
  <div class="trade-board-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Shift Trade Board</h1>
        <p class="page-subtitle">Pick up open shifts or request shift coverage</p>
      </div>

      <v-btn class="post-button" size="large" @click="postDialogOpen = true">
        <v-icon start size="20">mdi-hand-back-right-outline</v-icon>
        Post My Shift
      </v-btn>
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

    <section class="filters-card">
      <div class="filter-group">
        <label class="filter-label" for="department-filter">Department</label>
        <v-select
          id="department-filter"
          v-model="selectedDepartment"
          :items="departmentOptions"
          variant="outlined"
          density="comfortable"
          hide-details
          class="filter-control"
        />
      </div>

      <div class="filter-group">
        <label class="filter-label" for="request-filter">Request Type</label>
        <v-select
          id="request-filter"
          v-model="selectedRequestType"
          :items="requestTypeOptions"
          variant="outlined"
          density="comfortable"
          hide-details
          class="filter-control"
        />
      </div>

      <div class="filter-group search-group">
        <label class="filter-label" for="trade-search">Search</label>
        <v-text-field
          id="trade-search"
          v-model="searchQuery"
          variant="outlined"
          density="comfortable"
          hide-details
          placeholder="Search by role, location, or reason"
          prepend-inner-icon="mdi-magnify"
          class="filter-control"
        />
      </div>
    </section>

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
      <p class="empty-copy">Try a different department, request type, or search term.</p>
    </div>

    <v-dialog v-model="postDialogOpen" max-width="640">
      <v-card class="post-dialog">
        <div class="dialog-header">
          <h2 class="dialog-title">Post a Shift Trade</h2>
          <p class="dialog-copy">Create a trade request for coverage, swap, or pickup.</p>
        </div>

        <div class="dialog-body">
          <v-select
            v-model="draftTrade.shiftId"
            :items="shiftOptions"
            item-title="label"
            item-value="value"
            label="Shift"
            variant="outlined"
            density="comfortable"
          />

          <v-select
            v-model="draftTrade.requestType"
            :items="postTypeOptions"
            label="Request Type"
            variant="outlined"
            density="comfortable"
          />

          <v-textarea
            v-model="draftTrade.reason"
            label="Reason (optional)"
            variant="outlined"
            density="comfortable"
            rows="3"
          />
        </div>

        <div class="dialog-actions">
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn class="submit-button" @click="submitTrade">Post Request</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";

const tabs = [
  { label: "Available Shifts", value: "available" },
  { label: "My Requests", value: "my-requests" },
  { label: "All Activity", value: "activity" },
];

const tradeRequests = ref([
  {
    id: 1,
    department: "The Brew",
    departmentTheme: "brew",
    position: "Barista",
    dateLabel: "Tuesday, Mar 3",
    timeRange: "08:00 - 12:00",
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
    timeRange: "14:00 - 18:00",
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
    timeRange: "11:00 - 15:00",
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
    timeRange: "18:00 - 21:00",
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
    timeRange: "09:00 - 13:00",
    location: "Mail Center",
    requestType: "giveaway",
    status: "denied",
    reason: "Coverage request denied due to staffing minimums.",
    owner: "me",
    openForClaim: false,
  },
]);

const studentShifts = [
  {
    value: 101,
    label: "Barista • Tue, Mar 10 • 08:00 - 12:00",
    department: "The Brew",
    departmentTheme: "brew",
    position: "Barista",
    dateLabel: "Tuesday, Mar 10",
    timeRange: "08:00 - 12:00",
    location: "The Brew - Main Campus",
  },
  {
    value: 102,
    label: "Desk Assistant • Fri, Mar 13 • 18:00 - 21:00",
    department: "Library",
    departmentTheme: "library",
    position: "Desk Assistant",
    dateLabel: "Friday, Mar 13",
    timeRange: "18:00 - 21:00",
    location: "Mabee Library - Front Desk",
  },
];

const activeTab = ref("available");
const selectedDepartment = ref("All Departments");
const selectedRequestType = ref("All Request Types");
const searchQuery = ref("");
const postDialogOpen = ref(false);

const draftTrade = reactive({
  shiftId: studentShifts[0].value,
  requestType: "giveaway",
  reason: "",
});

const departmentOptions = [
  "All Departments",
  "The Brew",
  "Fitness Center",
  "Campus Dining",
  "Library",
  "Mail Services",
];

const requestTypeOptions = [
  "All Request Types",
  "Swap",
  "Giveaway",
  "Pickup",
];

const postTypeOptions = [
  { title: "Swap", value: "swap" },
  { title: "Giveaway", value: "giveaway" },
  { title: "Pickup", value: "pickup" },
];

const shiftOptions = studentShifts;

const filteredTrades = computed(() => {
  const search = searchQuery.value.trim().toLowerCase();

  return tradeRequests.value.filter((trade) => {
    if (activeTab.value === "available" && !trade.openForClaim) {
      return false;
    }

    if (activeTab.value === "my-requests" && trade.owner !== "me") {
      return false;
    }

    if (
      selectedDepartment.value !== "All Departments" &&
      trade.department !== selectedDepartment.value
    ) {
      return false;
    }

    if (
      selectedRequestType.value !== "All Request Types" &&
      requestTypeLabel(trade.requestType) !== selectedRequestType.value
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      trade.department,
      trade.position,
      trade.location,
      trade.reason,
      trade.dateLabel,
      trade.timeRange,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search));
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

const closeDialog = () => {
  postDialogOpen.value = false;
  draftTrade.shiftId = studentShifts[0].value;
  draftTrade.requestType = "giveaway";
  draftTrade.reason = "";
};

const submitTrade = () => {
  const selectedShift = studentShifts.find((shift) => shift.value === draftTrade.shiftId);

  if (!selectedShift) {
    return;
  }

  tradeRequests.value.unshift({
    id: Date.now(),
    department: selectedShift.department,
    departmentTheme: selectedShift.departmentTheme,
    position: selectedShift.position,
    dateLabel: selectedShift.dateLabel,
    timeRange: selectedShift.timeRange,
    location: selectedShift.location,
    requestType: draftTrade.requestType,
    status: draftTrade.requestType === "pickup" ? "approved" : "pending",
    reason: draftTrade.reason || "No extra details provided.",
    owner: "me",
    openForClaim: draftTrade.requestType !== "pickup",
  });

  activeTab.value = "my-requests";
  closeDialog();
};
</script>

<style scoped>
.trade-board-page {
  min-height: 100%;
  padding: 24px;
  background: #f3f3f4;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
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

.post-button,
.submit-button {
  min-height: 48px;
  padding: 0 20px;
  border-radius: 12px;
  background: #98002e;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  text-transform: none;
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

.filters-card {
  display: grid;
  grid-template-columns: 220px 220px minmax(260px, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-group {
  max-width: 420px;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #6f7685;
}

.filter-control :deep(.v-field) {
  border-radius: 12px;
  background: #ffffff;
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
