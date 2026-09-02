import type { Meeting, MeetingActionItem, MeetingSpeaker } from "@prisma/client";
import {
  parseAttendees,
  parseAudioChunks,
  parseChapters,
  parseTechnicalDeliverable,
  type SerializedMeeting,
  type SerializedMeetingActionItem,
  type SerializedMeetingSpeaker,
} from "./types";

/**
 * `segmentCount` viaja aparte porque los segmentos ya no están en la fila de
 * `Meeting`: quien lo tenga a mano (un `_count`) lo pasa, y el listado, que solo
 * necesita el número, no paga traerse la transcripción entera.
 */
export function serializeMeeting(m: Meeting, segmentCount = 0): SerializedMeeting {
  // `segments` es la columna legacy del backfill de 0025: no se lee ni se manda
  // al cliente, que se quedaría con una copia vieja de la transcripción.
  const { segments: _legacy, ...rest } = m;
  void _legacy;
  return {
    ...rest,
    attendees: parseAttendees(m.attendees),
    chapters: parseChapters(m.chapters),
    technicalDeliverable: parseTechnicalDeliverable(m.technicalDeliverable),
    audioChunks: parseAudioChunks(m.audioChunks),
    segmentCount,
    meetingDate: m.meetingDate.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    minutesSentAt: m.minutesSentAt?.toISOString() ?? null,
    proposalDraftedAt: m.proposalDraftedAt?.toISOString() ?? null,
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
