# Custom Event Calendar

A customizable drag-and-drop event calendar built using **React**, **react-big-calendar**, and **date-fns**, with support for recurring events, category filtering, and local storage persistence.

## 🚀 Features

- Add, edit, delete events with title, description, category, start/end time.
- Recurrence options: None, Daily, Weekly, Monthly, Custom.
- Filter events by category.
- Search events by title or description.
- Drag-and-drop event rescheduling.

## 🛠️ Tech Stack

- React
- react-big-calendar
- react-modal
- date-fns
- uuid

## 📦 Installation

 **Clone the repository**

```bash
git clone https://github.com/your-username/custom-event-calendar.git
cd custom-event-calendar
npm install
npm start
```

## 🎯 Usage

- Click or select a slot on the calendar to add a new event.
- Click an existing event to edit or delete it.
- Use the search bar and category dropdown to filter visible events.
- Drag and drop events to reschedule them.
- Events are saved automatically in your browser’s local storage.

## 📝 Notes

- Recurrence currently supports basic custom intervals with optional weekly day selections.
- Events overlapping in time will show a conflict warning before saving.

