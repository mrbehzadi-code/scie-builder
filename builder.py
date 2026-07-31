import argparse

from core.cli import run

def main():
    parser = argparse.ArgumentParser(prog="builder")

    parser.add_argument(
        "command",
        nargs="?",
        default="status"
    )

    args = parser.parse_args()

    run(args.command)

if __name__ == "__main__":
    main()
