import { createElement, type ComponentType } from 'react';
import type { Challenge } from '@/engine';
import type { WorldModule } from '@/game/worlds/modules';
import { ChooseBoard } from './boards/ChooseBoard';
import { PairsBoard } from './boards/PairsBoard';
import { SelectBoard } from './boards/SelectBoard';
import { SequenceBoard } from './boards/SequenceBoard';
import type { BoardProps } from './frame';

/** The boards every world can use, by the kind of task they are for. A world may bring more of its own. */
const TASK_BOARDS: Readonly<Record<string, ComponentType<BoardProps>>> = {
  select: SelectBoard,
  order: SequenceBoard,
  echo: SequenceBoard,
  pairs: PairsBoard,
};

/** What a challenge is played on: the world's own board for it, where it has one, or one of the frame's. */
export function boardFor(module: WorldModule, challenge: Challenge): ComponentType<BoardProps> {
  if (challenge.kind === 'make') {
    const { type } = challenge.task;
    const board = module.boards?.[type] ?? TASK_BOARDS[type];
    if (!board) throw new Error(`There is no board for a "${type}" task.`);
    return board;
  }
  const { stimulus } = challenge.prompt;
  const own = stimulus.type === 'scene' ? module.boards?.[`scene:${stimulus.scene}`] : undefined;
  return own ?? ChooseBoard;
}

/** The middle and the foot of the lesson frame, for whatever the current step is. */
export function Stage(props: BoardProps) {
  // The board is looked up, not made: the same step always gets the same one.
  return createElement(boardFor(props.module, props.state.view.challenge), props);
}
