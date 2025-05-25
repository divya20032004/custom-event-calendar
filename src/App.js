import React, { useState, useEffect } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Views,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import Modal from "react-modal";
import { v4 as uuidv4 } from "uuid";

import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DragAndDropCalendar = withDragAndDrop(Calendar);

const CATEGORY_COLORS = {
  Work: "#3a87ad",
  Personal: "#f0ad4e",
  Other: "#5bc0de",
};

const RECURRENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

function formatDateTimeLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const modalStyles = {
  content: {
    maxWidth: "480px",
    width: "90vw",
    maxHeight: "90vh",
    overflowY: "auto",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
};

function App() {
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem("events");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((ev) => ({
          ...ev,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    start: formatDateTimeLocal(new Date()),
    end: formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
    category: "Work",
    recurrenceType: "none",
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [],
  });

  // New state for filtering and searching
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
  }, [events]);

  const handleSelectSlot = ({ start }) => {
    setEditingEvent(null);
    setForm({
      id: null,
      title: "",
      description: "",
      start: formatDateTimeLocal(start),
      end: formatDateTimeLocal(new Date(new Date(start).getTime() + 60 * 60 * 1000)),
      category: "Work",
      recurrenceType: "none",
      recurrenceInterval: 1,
      recurrenceDaysOfWeek: [],
    });
    setModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setEditingEvent(event);
    setForm({
      ...event,
      start: formatDateTimeLocal(event.start),
      end: formatDateTimeLocal(event.end),
      recurrenceInterval: event.recurrenceInterval || 1,
      recurrenceDaysOfWeek: event.recurrenceDaysOfWeek || [],
    });
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "recurrenceDaysOfWeek") {
      const val = parseInt(value, 10);
      setForm((f) => {
        let days = f.recurrenceDaysOfWeek || [];
        if (checked) {
          if (!days.includes(val)) days = [...days, val];
        } else {
          days = days.filter((d) => d !== val);
        }
        return { ...f, recurrenceDaysOfWeek: days };
      });
    } else if (type === "number") {
      setForm((f) => ({ ...f, [name]: Number(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // Check for conflicts between new or edited event and existing events
  const isConflict = (newEvent, excludeId = null) => {
    const newStart = new Date(newEvent.start);
    const newEnd = new Date(newEvent.end);
    if (newStart >= newEnd) return true;

    return events.some((ev) => {
      if (ev.id === excludeId) return false;
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      // Check if time intervals overlap
      return newStart < evEnd && newEnd > evStart;
    });
  };

  const handleSave = () => {
    if (new Date(form.end) <= new Date(form.start)) {
      alert("End time must be after start time.");
      return;
    }
    if (isConflict(form, form.id)) {
      if (!window.confirm("This event conflicts with another. Continue?")) return;
    }

    if (editingEvent) {
      setEvents((evs) =>
        evs.map((ev) =>
          ev.id === editingEvent.id
            ? { ...form, start: new Date(form.start), end: new Date(form.end) }
            : ev
        )
      );
    } else {
      setEvents((evs) => [
        ...evs,
        { ...form, id: uuidv4(), start: new Date(form.start), end: new Date(form.end) },
      ]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (editingEvent) {
      if (window.confirm("Delete this event?")) {
        setEvents((evs) => evs.filter((ev) => ev.id !== editingEvent.id));
        setModalOpen(false);
      }
    }
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = CATEGORY_COLORS[event.category] || "#3174ad";
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        color: "white",
        border: "none",
        padding: "2px 4px",
        fontSize: "0.75rem",
      },
    };
  };

  const onEventDrop = ({ event, start, end }) => {
    const updatedEvent = { ...event, start, end };

    if (isConflict(updatedEvent, event.id)) {
      alert("Cannot move event: it conflicts with an existing event.");
      return;
    }

    setEvents((evs) =>
      evs.map((ev) => (ev.id === event.id ? updatedEvent : ev))
    );
  };

  // Filtering events by category and search term
  const filteredEvents = events.filter((ev) => {
    const matchesCategory =
      filterCategory === "All" || ev.category === filterCategory;

    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(lowerSearch) ||
      (ev.description && ev.description.toLowerCase().includes(lowerSearch));

    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ margin: 20 }}>
      <h1>Custom Event Calendar</h1>

      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: "8px",
            fontSize: "1rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: "8px",
            fontSize: "1rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
            width: "150px",
          }}
        >
          <option value="All">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <DragAndDropCalendar
        localizer={localizer}
        events={filteredEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        onEventDrop={onEventDrop}
        resizable={false}
        defaultView={Views.MONTH}
      />

      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        style={modalStyles}
        ariaHideApp={false}
        contentLabel="Event Form"
      >
        <h2 style={{ textAlign: "center" }}>
          {editingEvent ? "Edit Event" : "Add Event"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div style={{ marginBottom: 15 }}>
            <label>
              Title: <br />
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label>
              Description: <br />
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: 15,
              flexWrap: "wrap",
            }}
          >
            <label style={{ flex: 1 }}>
              Start: <br />
              <input
                type="datetime-local"
                name="start"
                value={form.start}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>

            <label style={{ flex: 1 }}>
              End: <br />
              <input
                type="datetime-local"
                name="end"
                value={form.end}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label>
              Category: <br />
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              >
                {Object.keys(CATEGORY_COLORS).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Recurrence */}
          <div style={{ marginBottom: 15 }}>
            <label>
              Recurrence: <br />
              <select
                name="recurrenceType"
                value={form.recurrenceType}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              >
                {RECURRENCE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.recurrenceType === "custom" && (
            <>
              <div style={{ marginBottom: 15 }}>
                <label>
                  Interval (every X days/weeks/months): <br />
                  <input
                    type="number"
                    name="recurrenceInterval"
                    min={1}
                    value={form.recurrenceInterval}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "1rem",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: 15 }}>
                <label>Days of Week (for weekly recurrence):</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <label key={day}>
                      <input
                        type="checkbox"
                        name="recurrenceDaysOfWeek"
                        value={day}
                        checked={form.recurrenceDaysOfWeek.includes(day)}
                        onChange={handleChange}
                      />{" "}
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            {editingEvent && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  backgroundColor: "#d9534f",
                  border: "none",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            )}

            <div style={{ marginLeft: "auto" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  marginRight: 10,
                  padding: "10px 20px",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  backgroundColor: "#f5f5f5",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  backgroundColor: "#5cb85c",
                  border: "none",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default App;
