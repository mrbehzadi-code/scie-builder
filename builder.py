import argparse
from pathlib import Path
import yaml

MISSION_FILE = Path("mission.yaml")

def load():
    with open(MISSION_FILE,"r",encoding="utf-8") as f:
        return yaml.safe_load(f)

def status():
    m=load()

    print("="*60)
    print("SCIE Builder")
    print("="*60)
    print("Mission :",m["mission"]["goal"])
    print("Phase   :",m["phase"]["name"])
    print("Task    :",m["task"]["current"])
    print("Status  :",m["status"])
    print("="*60)

def mission():
    print(load()["mission"]["goal"])

def planner():

    tasks=[
        "Initialize Discovery Engine",
        "Create Web Crawlers",
        "Build Extraction Engine",
        "Entity Resolution",
        "Knowledge Graph",
        "Dashboard"
    ]

    print()
    print("SCIE Planner")
    print("-"*60)

    for i,t in enumerate(tasks,1):
        print(f"[{i}] {t}")

    print()

def cont():
    planner()

def main():

    parser=argparse.ArgumentParser()

    parser.add_argument(
        "command",
        nargs="?",
        default="status",
        choices=[
            "status",
            "mission",
            "planner",
            "continue"
        ]
    )

    args=parser.parse_args()

    if args.command=="status":
        status()

    elif args.command=="mission":
        mission()

    elif args.command=="planner":
        planner()

    elif args.command=="continue":
        cont()

if __name__=="__main__":
    main()
