"use client";

import { useFeedbackPageLocation, type FeedbackPageLocation } from "@/lib/feedbackPageContext";

/** Invisible helper — registers where the user is for the feedback widget. */
export default function FeedbackPageLocationSetter(props: FeedbackPageLocation) {
  useFeedbackPageLocation(props);
  return null;
}
