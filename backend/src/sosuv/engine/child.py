"""Runs inside the subprocess: `python -m sosuv.engine.child`. Step 5.

1. read StartMessage from stdin
2. registry.discover(), build NodeContext with a stdout JSON-lines log sink
3. run the node with InProcessExecutor logic
4. print ResultMessage and exit
"""


def main() -> None:
    raise NotImplementedError("The child process entry point is implemented in step 5")


if __name__ == "__main__":
    main()
