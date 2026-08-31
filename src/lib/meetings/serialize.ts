import type { Meeting, MeetingActionItem, MeetingSpeaker } from "@prisma/client";
import {
  parseAttendees,
  parseSegments,
  type SerializedMeeting,
  type SerializedMeetingActionItem,
  type SerializedMeetingSpeaker,
} from "./types";

export function serializeMeeting(m: Meeting): SerializedMeeting {
  return {
    ...m,
    attendees: parseAttendees(m.attendees),
    segments: parseSegments(m.segments),
    meetingDate: m.meetingDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function serializeMeetingActionItem(i: MeetingActionItem): SerializedMeetingActionItem {
  return {
    ...i,
    dueDate: i.dueDate?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export function serializeMeetingSpeaker(s: MeetingSpeaker): SerializedMeetingSpeaker {
  return { ...s, createdAt: s.createdAt.toISOString() };
}
