"use client"

import { Calendar, dateFnsLocalizer } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import enUS from "date-fns/locale/en-US"
import { useState } from "react"
import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
  "en-US": enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
})

const initialEvents = [
  {
    title: "Team Standup",
    start: new Date(2025, 7, 21, 9, 0), // Aug 21, 2025 9:00 AM
    end: new Date(2025, 7, 21, 10, 0),
  },
  {
    title: "Project Deadline",
    start: new Date(2025, 7, 25, 23, 59),
    end: new Date(202
