/**
 * The learning engine's public surface. Headless, deterministic TypeScript: see docs/ARCHITECTURE.md.
 */
export * from './schema';
export { createRng, hashString, rngFor, type Rng } from './random';
export {
  EngineError,
  advanceDemo,
  createSession,
  getHint,
  getNextChallenge,
  submitAttempt,
  summarizeSession,
  type ChallengeView,
  type ChoiceView,
  type CreateSessionInput,
  type Feedback,
  type HintResult,
  type RejectionReason,
  type SessionSummary,
  type SubmitInput,
  type SubmitResult,
} from './session';
export {
  DEFAULT_EVIDENCE_POLICY,
  getSkillEvidence,
  isIndependentProbe,
  isIndependentSuccess,
  type EvidencePolicy,
  type EvidenceStatus,
  type SkillEvidence,
} from './evidence';
