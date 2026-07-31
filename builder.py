import argparse
from pathlib import Path

import yaml


MISSION_FILE = Path("mission.yaml")


def load_mission():
    with open(MISSION_FILE, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def show_status():
    mission = load_mission()

    print("=" * 50)
    print("SCIE Builder")
    print("=" * 50)
    print("Mission :", mission["mission"]["goal"])
    print("Phase   :", mission["phase"]["name"])
    print("Task    :", mission["task"]["current"])
    print("Status  :", mission["status"])
    print("=" * 50)


def show_mission():
    mission = load_mission()

    print()
    print(mission["mission"]["goal"])
    print()


def main():

    parser = argparse.ArgumentParser(
        prog="builder",
        description="SCIE Builder CLI"
    )

    parser.add_argument(
        "command",
        nargs="?",
        default="status",
        choices=[
            "status",
            "mission",
            "continue"
        ]
    )

    args = parser.parse_args()

    if args.command == "status":
        show_status()

    elif args.command == "mission":
        show_mission()

    elif args.command == "continue":
        print()
        print("Next Task:")
        print("Build Planner")
        print()


if __name__ == "__main__":
    main()
    