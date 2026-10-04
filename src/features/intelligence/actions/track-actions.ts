"use server";

import { requireUserId } from "@/lib/auth-guard";
import {
  getPublishedTracks,
  getTrackBySlug,
  enrollInTrack,
  getTrackAdaptiveSheetData,
} from "../services/track.service";
import { revalidatePath } from "next/cache";
import { serializeForClient } from "@/lib/utils";

export async function getPublishedTracksAction() {
  const tracks = await getPublishedTracks();
  return { ok: true, tracks: serializeForClient(tracks) };
}

export async function getTrackDetailsAction(trackSlug: string) {
  const track = await getTrackBySlug(trackSlug);
  if (!track) {
    return { ok: false, error: "Track not found" };
  }
  return { ok: true, track: serializeForClient(track) };
}

export async function enrollInTrackAction(trackSlug: string) {
  const userId = await requireUserId();
  const result = await enrollInTrack({ userId, trackSlug });

  revalidatePath("/tracks");
  revalidatePath(`/tracks/${trackSlug}`);
  revalidatePath("/dashboard");

  return {
    ok: true,
    enrollment: serializeForClient(result.enrollment),
    isNewEnrollment: result.isNewEnrollment,
  };
}

export async function getTrackAdaptiveSheetAction(trackSlug: string) {
  const userId = await requireUserId();
  const data = await getTrackAdaptiveSheetData(userId, trackSlug);

  return { ok: true, data: serializeForClient(data) };
}

