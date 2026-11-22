import {
  advanceDemo,
  createSession,
  getHint,
  getNextChallenge,
  submitAttempt,
  summarizeSession,
  type ChallengeView,
  type ContentPack,
  type Feedback,
  type Hint,
  type Lesson,
  type LessonSession,
  type SessionSummary,
} from '@/engine';
import { StorageError, type Repository } from '@/storage';

/**
 * Runs one sitting of one lesson for one player: the glue between the pure engine, storage and the screen.
 *
 * The engine decides everything about the lesson; this class only carries its decisions to storage and to whoever is
 * listening. A failed save never interrupts a child: the lesson carries on in memory and the state says so.
 */

export type RunnerState =
  | {
      phase: 'playing';
      view: ChallengeView;
      /** The result of the latest answer to this challenge, if there has been one. */
      feedback: Feedback | null;
      /** The choice the latest answer picked. */
      picked: string | null;
      /** The hint most recently asked for on this challenge. */
      hint: Hint | null;
      /** True once the challenge has been answered correctly and the lesson is waiting for "next". */
      answered: boolean;
      saved: boolean;
    }
  | { phase: 'finished'; summary: SessionSummary; stepCount: number; saved: boolean };

export interface RunnerDeps {
  repository: Repository;
  pack: ContentPack;
  lesson: Lesson;
  profileId: string;
  now: () => number;
  newId: () => string;
  newSeed: () => number;
  localDay: (at: number) => string;
  /** Milliseconds from a steady clock, for response times. */
  elapsed: () => number;
  onSaveError?: (error: unknown) => void;
}

export class LessonRunner {
  private session: LessonSession;
  private state: RunnerState;
  private saved = true;
  private busy = false;
  private shownAt: number;
  private readonly listeners = new Set<() => void>();

  private constructor(
    private readonly deps: RunnerDeps,
    session: LessonSession,
  ) {
    this.session = session;
    this.shownAt = deps.elapsed();
    this.state = this.present();
  }

  /** Pick up the player's unfinished sitting of this lesson, or begin a new one. */
  static async start(deps: RunnerDeps): Promise<LessonRunner> {
    const { repository, lesson, pack, profileId } = deps;
    let saved = true;
    let session: LessonSession | null = null;
    try {
      const existing = await repository.findActiveSession(profileId, lesson.id);
      if (existing) {
        const current =
          existing.lessonVersion === lesson.version &&
          existing.contentVersion === pack.contentVersion;
        // A sitting of an older version of the lesson cannot be resumed; its answers stay in the record.
        if (current) session = existing;
        else await repository.discardSession(existing.id);
      }
      if (!session) {
        session = LessonRunner.fresh(deps);
        await repository.saveProgress(session);
      }
    } catch (error) {
      deps.onSaveError?.(error);
      saved = false;
      session ??= LessonRunner.fresh(deps);
    }
    const runner = new LessonRunner(deps, session);
    runner.saved = saved;
    runner.state = runner.present();
    return runner;
  }

  private static fresh(deps: RunnerDeps): LessonSession {
    return createSession(deps.lesson, {
      id: deps.newId(),
      profileId: deps.profileId,
      seed: deps.newSeed(),
      now: deps.now(),
      contentVersion: deps.pack.contentVersion,
    });
  }

  getState = (): RunnerState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(next: RunnerState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  /** The state for whatever the session says comes next. */
  private present(): RunnerState {
    const view = getNextChallenge(this.session, this.deps.lesson);
    if (!view) {
      return {
        phase: 'finished',
        summary: summarizeSession(this.session, this.deps.lesson),
        stepCount: this.session.steps.length,
        saved: this.saved,
      };
    }
    return {
      phase: 'playing',
      view,
      feedback: null,
      picked: null,
      hint: null,
      answered: false,
      saved: this.saved,
    };
  }

  private async persist(write: () => Promise<void>): Promise<void> {
    try {
      await write();
    } catch (error) {
      if (error instanceof StorageError && error.code === 'conflict') {
        // Another tab has already moved this sitting on. Its version is the one that was saved: follow it.
        const stored = await this.deps.repository
          .findActiveSession(this.deps.profileId, this.deps.lesson.id)
          .catch(() => null);
        if (stored) {
          this.session = stored;
          this.shownAt = this.deps.elapsed();
          this.setState(this.present());
          return;
        }
      }
      this.saved = false;
      this.deps.onSaveError?.(error);
      this.setState({ ...this.state, saved: false });
    }
  }

  /** The child picked a choice. Ignored while a previous answer is still being handled, or after a correct one. */
  async answer(choiceId: string): Promise<void> {
    const state = this.state;
    if (this.busy || state.phase !== 'playing' || state.answered || state.view.stage === 'demo') {
      return;
    }
    const at = this.deps.now();
    const result = submitAttempt(this.session, this.deps.lesson, {
      key: state.view.key,
      choiceId,
      now: at,
      day: this.deps.localDay(at),
      durationMs: this.deps.elapsed() - this.shownAt,
    });
    if (!result.accepted) return;

    this.busy = true;
    this.session = result.session;
    this.shownAt = this.deps.elapsed();
    if (result.feedback.outcome === 'correct') {
      // Keep the answered challenge on screen until the child moves on.
      this.setState({ ...state, feedback: result.feedback, picked: choiceId, answered: true });
    } else {
      const retry = getNextChallenge(this.session, this.deps.lesson);
      if (retry) {
        this.setState({ ...state, view: retry, feedback: result.feedback, picked: choiceId });
      }
    }
    try {
      await this.persist(() => this.deps.repository.saveProgress(result.session, result.attempt));
    } finally {
      this.busy = false;
    }
  }

  /** Show the next rung of help for the current challenge. */
  async hint(): Promise<void> {
    const state = this.state;
    if (this.busy || state.phase !== 'playing' || state.answered) return;
    const result = getHint(this.session, this.deps.lesson, this.deps.now());
    if (!result.hint) return;
    this.session = result.session;
    const view = getNextChallenge(this.session, this.deps.lesson);
    if (!view) return;
    this.setState({ ...state, view, hint: result.hint, feedback: null, picked: null });
    await this.persist(() => this.deps.repository.saveProgress(result.session));
  }

  /** Move on: past a demonstration, or from an answered challenge to the next one. */
  async next(): Promise<void> {
    const state = this.state;
    if (this.busy || state.phase !== 'playing') return;
    if (state.view.stage === 'demo') {
      this.session = advanceDemo(this.session, this.deps.lesson, this.deps.now());
      const session = this.session;
      this.shownAt = this.deps.elapsed();
      this.setState(this.present());
      await this.persist(() => this.deps.repository.saveProgress(session));
      return;
    }
    if (!state.answered) return;
    this.shownAt = this.deps.elapsed();
    this.setState(this.present());
  }

  /** Start the lesson again from the beginning, as a new sitting with a new seed. */
  async restart(): Promise<void> {
    if (this.busy) return;
    this.session = LessonRunner.fresh(this.deps);
    const session = this.session;
    this.shownAt = this.deps.elapsed();
    this.setState(this.present());
    await this.persist(() => this.deps.repository.saveProgress(session));
  }
}
