import { CanvasOp } from "@sketchroom/shared";

export class OpLog {
  private ops: CanvasOp[] = [];
  private undoneOps: CanvasOp[] = [];

  public addOp(op: CanvasOp): void {
    this.ops.push(op);
    this.undoneOps = []; // Clear redo stack on new operation
  }

  public undo(): CanvasOp | null {
    if (this.ops.length === 0) return null;
    const op = this.ops.pop()!;
    this.undoneOps.push(op);
    return op;
  }

  public redo(): CanvasOp | null {
    if (this.undoneOps.length === 0) return null;
    const op = this.undoneOps.pop()!;
    this.ops.push(op);
    return op;
  }

  public clear(): void {
    const clearOp: CanvasOp = {
      type: "clear",
      id: `clear-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    this.ops.push(clearOp);
    this.undoneOps = [];
  }

  public reset(): void {
    this.ops = [];
    this.undoneOps = [];
  }

  public getOps(): CanvasOp[] {
    return [...this.ops];
  }
}
