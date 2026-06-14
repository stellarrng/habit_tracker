# Habit Tracker Pro - Capstone Requirements

## Overview
Habit Tracker Pro is a web application that helps users build, track, and analyze their daily habits and personal goals. This capstone focuses on real-life business logic, state management, derived data, and user experience.

## 1. Habit Management
Users can manage all the habits they want to build. Each habit includes:
* **Habit name**
* **Category:** Health, Study, Work, Mindfulness, Other
* **Frequency:** Daily, Specific days of the week
* **Target per day** (for example: drink water 8 times)
* **Priority:** Low, Medium, High
* **Status:** Active, Paused, Archived

Users can:
* Add / edit / delete habits
* Pause, resume, or archive a habit
* Filter habits by: Category, Frequency, Priority, Status

## 2. Daily Check-in Tracking
Users can record progress for each habit on each day. Each check-in includes:
* Habit reference
* Date
* Completed count (for example: 5 of 8)
* Completion status: Not Started, In Progress, Completed

Users can:
* Mark a habit as done for the day
* Increase or decrease the completed count
* Edit check-ins for the current day
* View check-ins grouped by date

**Crucial UI Requirement:** Habits with a missed check-in for the current day must be visually highlighted. The system must show daily completion progress in real time.

## 3. Goals & Progress Rules
Users can set a measurable goal for each habit. Each goal includes:
* Target type: Streak target (for example: 30 days in a row) or Total completions target (for example: 100 sessions)
* Target value
* Current progress (derived)

For each goal:
* At 80% of the target: show an encouragement message
* At 100% of the target: show a goal-achieved alert
* UI must clearly indicate goal status.

## 4. Streaks & Statistics Dashboard
A dedicated dashboard shows:
* Habits grouped by category
* Key indicators per habit: Current streak, Longest streak, Total completions, Completion rate over the last 7 days
* Overall indicators: % of habits completed today, Number of active habits, Number of habits at risk of breaking a streak

## 5. Data Persistence & Technical Constraints
* Frontend: React
* No authentication
* No real backend (Note: Optional MongoDB backend is being implemented alongside this constraint).
* State management must be clear and maintainable.
* Component structure must be logical and reusable.
* Data must persist using localStorage or mocked JSON after page refresh.
* Required Persisted Entities: Habits, Check-ins, Goals, Progress and streak state

## 6. Derived State & Performance
* Avoid duplicated state.
* All streaks, totals, percentages, and warnings must be derived from source data.
* Clear separation between raw data (habits and check-ins) and computed values (streaks, completion rates, goal progress).

## 7. Undo / Reset Logic
Support at least one of the following:
* Undo last check-in action
* Reset all data to initial state
Logic must be clearly implemented and explained.

## 8. UX & Error Handling
Validate user input:
* Required fields cannot be empty
* Target value and counts cannot be negative
* Completed count cannot exceed the daily target
* A future date cannot be checked in
* Show clear error messages.

UI must handle empty states gracefully:
* No habits
* No check-ins for the selected day
* No goals set