describe("Student availability class-sync lock behavior", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/user-departments/user/*", {
      statusCode: 200,
      body: {
        success: true,
        data: [{ department_id: 9, is_active: true }],
      },
    }).as("getUserDepartments");

    cy.intercept("GET", "**/department-hours*", {
      statusCode: 200,
      body: {
        success: true,
        data: [
          { day_of_week: 1, open_time: "08:00:00", close_time: "22:00:00" },
        ],
      },
    }).as("getDepartmentHours");

    cy.intercept("POST", "**/student/availability/sync-class-schedule", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          synced: true,
          termCode: "2026SP",
          lastSyncedAt: "2026-04-13T10:00:00.000Z",
          created: 1,
          updated: 1,
          deleted: 0,
          unchanged: 0,
        },
      },
    }).as("syncClassSchedule");

    cy.intercept("GET", "**/availabilities/user/*", {
      statusCode: 200,
      body: [
        {
          id: 9001,
          userId: 44,
          dayOfWeek: 1,
          startTime: "09:00:00",
          endTime: "10:00:00",
          availabilityType: "unavailable",
          specificDate: null,
          isRecurring: true,
          sourceType: "class_schedule",
          recurrencePattern: "class_schedule",
          isSystemManaged: true,
          sourceRef: "CS101-M-0900-1000",
        },
      ],
    }).as("getAvailability");

    cy.intercept("GET", "**/student/availability/class-sync-status", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          status: "success",
          lastSyncedAt: "2026-04-13T10:00:00.000Z",
          termCode: "2026SP",
          totalClassBlocks: 1,
          updated: 1,
          error: null,
        },
      },
    }).as("getSyncStatus");
  });

  it("renders locked class blocks and prevents edit via click", () => {
    cy.visit("/student/availability", {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "user",
          JSON.stringify({
            id: 44,
            userId: 44,
            role: "student",
            token: "fake-token",
            email: "student@school.edu",
          })
        );
      },
    });

    cy.wait("@getUserDepartments");
    cy.wait("@getDepartmentHours");
    cy.wait("@syncClassSchedule");
    cy.wait("@getAvailability");
    cy.wait("@getSyncStatus");

    cy.contains("Class Schedule Sync: Synced").should("be.visible");
    cy.contains("Updated this sync: 1").should("be.visible");

    cy.get(".class-synced-event").should("have.length.at.least", 1).first().click({ force: true });
    cy.contains("Class-synced blocks are locked. Update your course schedule and re-sync.").should("be.visible");
  });
});
