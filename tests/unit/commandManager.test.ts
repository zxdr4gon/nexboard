import { describe, expect, it } from 'vitest';
import { CommandManager } from '../../src/commands/CommandManager';
import type { Command } from '../../src/commands/Command';

function makeCounterCommand(counter: { value: number }, delta: number): Command {
  return {
    label: 'increment',
    execute: () => {
      counter.value += delta;
    },
    undo: () => {
      counter.value -= delta;
    },
  };
}

describe('CommandManager', () => {
  it('executes a command and supports undo/redo', () => {
    const counter = { value: 0 };
    const manager = new CommandManager();
    manager.execute(makeCounterCommand(counter, 5));
    expect(counter.value).toBe(5);

    manager.undo();
    expect(counter.value).toBe(0);

    manager.redo();
    expect(counter.value).toBe(5);
  });

  it('clears the redo stack when a new command is executed after an undo', () => {
    const counter = { value: 0 };
    const manager = new CommandManager();
    manager.execute(makeCounterCommand(counter, 1));
    manager.execute(makeCounterCommand(counter, 2));
    manager.undo(); // back to 1
    expect(counter.value).toBe(1);

    manager.execute(makeCounterCommand(counter, 10));
    expect(counter.value).toBe(11);
    expect(manager.canRedo()).toBe(false);
  });

  it('reports canUndo/canRedo correctly', () => {
    const counter = { value: 0 };
    const manager = new CommandManager();
    expect(manager.canUndo()).toBe(false);
    manager.execute(makeCounterCommand(counter, 1));
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    manager.undo();
    expect(manager.canRedo()).toBe(true);
  });
});
