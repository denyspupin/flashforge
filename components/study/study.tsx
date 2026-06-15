"use client"

import {
  StudyProvider,
  StudySummaryProvider,
  useStudyContext,
  useStudySummary,
} from "./study-context"
import type { StudyDeckInfo } from "./study-context"
import {
  StudyFrame,
  StudyHeader,
  StudyProgressBar,
  StudyCardArea,
  StudyActionControls,
  StudyHint,
} from "./study-frame"

export { StudyProvider, StudySummaryProvider, useStudyContext, useStudySummary }
export type { StudyDeckInfo }

export const Study = {
  Provider: StudyProvider,
  SummaryProvider: StudySummaryProvider,
  Frame: StudyFrame,
  Header: StudyHeader,
  Progress: StudyProgressBar,
  Card: StudyCardArea,
  Controls: StudyActionControls,
  Hint: StudyHint,
}
