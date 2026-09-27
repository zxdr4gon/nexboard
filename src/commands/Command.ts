// Spec section 59: the command manager's contract.
export interface Command {
  label: string;
  execute(): void;
  undo(): void;
}
